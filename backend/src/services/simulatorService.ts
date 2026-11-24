import { Transaction, PaymentMethod } from '../types/index.js';
import { simulatedMerchants, findSimulatedMerchant, tierForScore } from '../data/simulatedMerchants.js';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';

/**
 * Synthetic payment simulator.
 *
 * Every record references a SIM-* merchant with a fictional display name. Real
 * OpenStreetMap identities cannot enter this service: the id type and the
 * runtime guard in `assertSimulated` both prevent it.
 */

export class RealMerchantRiskError extends Error {
  constructor(public readonly merchantId: string) {
    super(
      'Real OpenStreetMap merchants are display-only and cannot be given transactions or risk data.'
    );
    this.name = 'RealMerchantRiskError';
  }
}

const assertSimulated = (merchantId: string): void => {
  if (isRealMerchantId(merchantId) || findRealMerchant(merchantId)) {
    throw new RealMerchantRiskError(merchantId);
  }
  if (!findSimulatedMerchant(merchantId)) {
    throw new Error(`Unknown simulated merchant ${merchantId}`);
  }
};

/** Deterministic PRNG so the demo stream is reproducible for a fixed seed. */
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(rng: () => number, values: T[]): T => values[Math.floor(rng() * values.length)];

const CITIES_OUT_OF_STATE = [
  { city: 'New Delhi', state: 'Delhi' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Chandigarh', state: 'Punjab' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Hyderabad', state: 'Telangana' },
];

const paymentMethods: PaymentMethod[] = ['UPI', 'UPI', 'UPI', 'CREDIT_CARD', 'NET_BANKING'];

const buildInitialTransactions = (): Transaction[] => {
  const rng = mulberry32(20261104);
  const now = Date.now();
  const transactions: Transaction[] = [];

  simulatedMerchants.forEach((merchant, merchantIndex) => {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const suspicious = merchant.riskScore >= 56;
      const place = suspicious && rng() < 0.6 ? pick(rng, CITIES_OUT_OF_STATE) : { city: merchant.city, state: merchant.state };
      const amount = suspicious
        ? pick(rng, [1000, 2500, 5000, 10000, 5000, 1000])
        : Math.round(merchant.baseline.avgTicket * (0.6 + rng() * 1.1));

      // Distribute dates across the last 7 days up to today (Nov 18 - Nov 24, 2026)
      const dayOffset = (merchantIndex * 2 + i) % 7;
      const timestamp = new Date(now - dayOffset * 86_400_000);

      // Varied hours providing a natural, balanced mix of AM and PM
      let hour: number;
      if (suspicious) {
        // Suspicious activity: night-time match bursts (PM/AM) and occasional mid-day testing
        const hoursCycle = [23, 0, 1, 14]; // 11 PM, 12 AM, 1 AM, 2 PM
        hour = (hoursCycle[i % hoursCycle.length] + Math.floor(rng() * 2)) % 24;
      } else {
        // Honest retail: morning rush (AM), lunch/afternoon (PM), evening shopping (PM), early morning (AM)
        const hoursCycle = [9, 13, 18, 10]; // 9 AM, 1 PM, 6 PM, 10 AM
        hour = (hoursCycle[i % hoursCycle.length] + Math.floor(rng() * 2)) % 24;
      }

      const minute = Math.floor(rng() * 60);
      const second = 10 + Math.floor(rng() * 49);
      timestamp.setHours(hour, minute, second, 0);

      const isNight = hour >= 22 || hour <= 4;
      const isMatch = suspicious && (hour >= 20 || hour <= 2);

      transactions.push({
        id: `TXN-SIM-${merchant.id.slice(4)}-${String(i + 1).padStart(3, '0')}`,
        dataOrigin: 'simulated',
        merchantId: merchant.id,
        merchantName: merchant.displayName,
        osmRef: merchant.osmRef,
        osmAddress: merchant.osmAddress,
        osmNodeId: merchant.osmNodeId,
        amount,
        currency: 'INR',
        paymentMethod: pick(rng, paymentMethods),
        payerId: suspicious
          ? `PYR-EXT-${1000 + Math.floor(rng() * 9000)}`
          : `PYR-LOC-${100 + Math.floor(rng() * 800)}`,
        payerCity: place.city,
        payerState: place.state,
        timestamp: timestamp.toISOString(),
        isRoundAmount: amount % 500 === 0 && amount >= 500,
        isNightTime: isNight,
        isMatchWindow: isMatch,
        riskScore: suspicious ? tierForScore(merchant.riskScore) && Math.min(99, merchant.riskScore + 5) : Math.max(2, merchant.riskScore),
        anomalyFlags: suspicious
          ? ['SIMULATED_MATCH_WINDOW_BURST', 'SIMULATED_OUT_OF_STATE_PAYER']
          : [],
      });
    }
  });

  return transactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 200);
};

let activeTransactions: Transaction[] = buildInitialTransactions();
let injectionCounter = 0;

const nameOf = (id: string): string => findSimulatedMerchant(id)?.displayName ?? id;

export type ScenarioName = 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET';

export interface ScenarioResult {
  message: string;
  addedCount: number;
  transactions: Transaction[];
  targetMerchantIds: string[];
  dataOrigin: 'simulated';
}

export class SimulatorService {
  public static getAllTransactions(): Transaction[] {
    return activeTransactions;
  }

  public static getTransactionsFor(merchantId: string): Transaction[] {
    assertSimulated(merchantId);
    return activeTransactions.filter(transaction => transaction.merchantId === merchantId);
  }

  public static addTransaction(transaction: Transaction): void {
    assertSimulated(transaction.merchantId);
    activeTransactions.unshift(transaction);
    if (activeTransactions.length > 200) activeTransactions.pop();
  }

  public static getStats() {
    const total = activeTransactions.length;
    const flagged = activeTransactions.filter(transaction => transaction.riskScore >= 70).length;
    const volume = activeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const avgRisk = Math.round(
      activeTransactions.reduce((sum, transaction) => sum + transaction.riskScore, 0) / (total || 1)
    );

    return {
      dataOrigin: 'simulated' as const,
      totalMonitoredTransactions: total,
      highRiskFlaggedTransactions: flagged,
      totalVolumeProcessed: volume,
      averageRiskScore: avgRisk,
      simulatedMerchants: simulatedMerchants.length,
      quarantinedMerchants: simulatedMerchants.filter(merchant => merchant.riskTier === 'TIER_3_QUARANTINE').length,
      lowRiskMerchants: simulatedMerchants.filter(merchant => merchant.riskTier === 'TIER_0_SAFE').length,
    };
  }

  public static reset(): void {
    activeTransactions = buildInitialTransactions();
    injectionCounter = 0;
  }

  public static triggerScenario(scenario: ScenarioName, requestedMerchantId?: string): ScenarioResult {
    if (scenario === 'RESET') {
      this.reset();
      return {
        message: 'Simulator reset to the initial simulated stream.',
        addedCount: 0,
        transactions: [],
        targetMerchantIds: [],
        dataOrigin: 'simulated',
      };
    }

    const targets =
      scenario === 'IPL_BETTING_BURST'
        ? ['SIM-0001']
        : scenario === 'FESTIVE_BAKERY_RUSH'
          ? ['SIM-0002']
          : ['SIM-0001', 'SIM-0003', 'SIM-0007'];

    if (requestedMerchantId) {
      assertSimulated(requestedMerchantId);
      targets.length = 0;
      targets.push(requestedMerchantId);
    }
    targets.forEach(assertSimulated);

    const rng = mulberry32(5000 + injectionCounter++);
    const now = Date.now();
    const created: Transaction[] = [];

    const push = (
      merchantId: string,
      amount: number,
      index: number,
      flags: string[],
      riskScore: number,
      suspicious: boolean,
      customTimestamp?: Date
    ): void => {
      const merchant = findSimulatedMerchant(merchantId);
      const place = suspicious ? pick(rng, CITIES_OUT_OF_STATE) : { city: 'Bengaluru', state: 'Karnataka' };
      const timestamp = customTimestamp || new Date(now - index * 12_000);
      const transaction: Transaction = {
        id: `TXN-${scenario}-${timestamp.getTime()}-${index}`,
        dataOrigin: 'simulated',
        merchantId: merchantId as Transaction['merchantId'],
        merchantName: nameOf(merchantId),
        osmRef: merchant?.osmRef,
        osmAddress: merchant?.osmAddress,
        osmNodeId: merchant?.osmNodeId,
        amount,
        currency: 'INR',
        paymentMethod: suspicious ? 'UPI' : pick(rng, paymentMethods),
        payerId: suspicious
          ? `PYR-RING-${String(100 + Math.floor(rng() * 899))}`
          : `PYR-LOC-${String(100 + Math.floor(rng() * 899))}`,
        payerCity: place.city,
        payerState: place.state,
        timestamp: timestamp.toISOString(),
        isRoundAmount: amount % 500 === 0 && amount >= 500,
        isNightTime: timestamp.getHours() >= 22 || timestamp.getHours() <= 4,
        isMatchWindow: suspicious,
        riskScore,
        anomalyFlags: flags,
      };
      this.addTransaction(transaction);
      created.push(transaction);
    };

    if (scenario === 'IPL_BETTING_BURST') {
      const merchantId = targets[0];
      // Burst across death-overs and midnight post-match settlements showing both PM and AM
      const burstHours = [
        { h: 23, m: 18, s: 24 }, // 11:18 PM
        { h: 23, m: 35, s: 12 }, // 11:35 PM
        { h: 23, m: 49, s: 45 }, // 11:49 PM
        { h: 23, m: 58, s: 30 }, // 11:58 PM
        { h: 0, m: 14, s: 15 },  // 12:14 AM
        { h: 0, m: 32, s: 50 },  // 12:32 AM
        { h: 0, m: 55, s: 10 },  // 12:55 AM
        { h: 1, m: 24, s: 40 },  // 01:24 AM
      ];
      for (let i = 0; i < 8; i++) {
        const timeConfig = burstHours[i];
        const date = new Date(now);
        date.setHours(timeConfig.h, timeConfig.m, timeConfig.s, 0);
        push(
          merchantId,
          pick(rng, [1000, 2500, 5000, 10000, 15000, 20000]),
          i,
          ['SIMULATED_MATCH_OVER_BURST', 'SIMULATED_OUT_OF_STATE_PAYER', 'SIMULATED_ROUND_STAKE'],
          92 + Math.floor(rng() * 7),
          true,
          date
        );
      }
      return {
        message: `Injected 8 simulated late-night stake payments into ${nameOf(merchantId)}.`,
        addedCount: created.length,
        transactions: created,
        targetMerchantIds: targets,
        dataOrigin: 'simulated',
      };
    }

    if (scenario === 'FESTIVE_BAKERY_RUSH') {
      const merchantId = targets[0];
      const festiveTimes = [
        { h: 8, m: 35, s: 20 },  // 08:35 AM
        { h: 9, m: 42, s: 15 },  // 09:42 AM
        { h: 10, m: 55, s: 40 }, // 10:55 AM
        { h: 11, m: 48, s: 10 }, // 11:48 AM
        { h: 13, m: 15, s: 35 }, // 01:15 PM
        { h: 14, m: 40, s: 22 }, // 02:40 PM
      ];
      [240, 399, 485, 750, 1150, 1380].forEach((amount, i) => {
        const timeConfig = festiveTimes[i];
        const date = new Date(now);
        date.setHours(timeConfig.h, timeConfig.m, timeConfig.s, 0);
        push(merchantId, amount, i, [], 5 + Math.floor(rng() * 8), false, date);
      });
      return {
        message: `Injected 6 simulated daytime café/bakery orders into ${nameOf(merchantId)} as the honest control.`,
        addedCount: created.length,
        transactions: created,
        targetMerchantIds: targets,
        dataOrigin: 'simulated',
      };
    }

    const smurfMinutes = [42, 43, 44];
    targets.forEach((merchantId, index) => {
      const date = new Date(now);
      date.setHours(23, smurfMinutes[index % smurfMinutes.length], 15 + index * 10, 0);
      push(
        merchantId,
        5000,
        index,
        ['SIMULATED_CROSS_MERCHANT_SMURFING', 'SIMULATED_SHARED_DEVICE', 'SIMULATED_SYNCHRONIZED_DEPOSIT'],
        97,
        true,
        date
      );
    });
    return {
      message: `Injected synchronized simulated deposits across ${targets.map(nameOf).join(', ')}.`,
      addedCount: created.length,
      transactions: created,
      targetMerchantIds: targets,
      dataOrigin: 'simulated',
    };
  }
}
