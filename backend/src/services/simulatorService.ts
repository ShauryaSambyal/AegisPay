import { Transaction } from '../types/index.js';
import { initialTransactions, merchants } from '../data/merchantsData.js';

let activeTransactions: Transaction[] = [...initialTransactions];

/**
 * Merchant names below come from real OpenStreetMap records. The payment
 * activity injected by these scenarios is synthetic demo data for the
 * "Follow the Money" challenge — it is not real transaction history.
 */
const merchantName = (id: string): string =>
  merchants.find(m => m.id === id)?.name ?? id;

export class SimulatorService {
  public static getAllTransactions(): Transaction[] {
    return activeTransactions;
  }

  public static addTransaction(txn: Transaction): void {
    activeTransactions.unshift(txn);
    if (activeTransactions.length > 200) {
      activeTransactions.pop();
    }
  }

  public static getStats() {
    const totalTxns = activeTransactions.length;
    const flaggedTxns = activeTransactions.filter(t => t.riskScore >= 70).length;
    const totalVolume = activeTransactions.reduce((acc, t) => acc + t.amount, 0);
    const avgRisk = Math.round(
      activeTransactions.reduce((acc, t) => acc + t.riskScore, 0) / (totalTxns || 1)
    );

    return {
      totalMonitoredTransactions: totalTxns,
      highRiskFlaggedTransactions: flaggedTxns,
      totalVolumeProcessed: totalVolume,
      averageRiskScore: avgRisk,
      merchantsMonitored: merchants.length,
      quarantinedMerchants: merchants.filter(m => m.currentTier === 'TIER_3_QUARANTINE').length,
      protectedLegitimateMerchants: merchants.filter(m => m.currentTier === 'TIER_0_SAFE').length
    };
  }

  public static triggerScenario(scenario: 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET') {
    if (scenario === 'RESET') {
      activeTransactions = [...initialTransactions];
      return { message: 'Simulator reset to initial state', addedCount: 0 };
    }

    const created: Transaction[] = [];
    const now = new Date();

    if (scenario === 'IPL_BETTING_BURST') {
      // Synthetic late-night cricket-stake burst on a real OSM bakery identity.
      const merchantId = 'MERC-BAKE-001';
      const bettingStakes = [1000, 2500, 5000, 10000, 15000, 20000];
      const cities = [
        { city: 'New Delhi', state: 'Delhi' },
        { city: 'Mumbai', state: 'Maharashtra' },
        { city: 'Jaipur', state: 'Rajasthan' },
        { city: 'Chandigarh', state: 'Punjab' },
        { city: 'Kolkata', state: 'West Bengal' },
        { city: 'Lucknow', state: 'Uttar Pradesh' }
      ];

      for (let i = 0; i < 8; i++) {
        const place = cities[i % cities.length];
        const stake = bettingStakes[Math.floor(Math.random() * bettingStakes.length)];
        const txn: Transaction = {
          id: `TXN-IPL-${Date.now()}-${i}`,
          merchantId,
          merchantName: merchantName(merchantId),
          amount: stake,
          currency: 'INR',
          paymentMethod: 'UPI',
          payerId: `USR-BET-${Math.floor(10000 + Math.random() * 90000)} (${place.city})`,
          payerState: place.state,
          payerCity: place.city,
          timestamp: new Date(now.getTime() - i * 15000).toISOString(),
          isRoundAmount: true,
          isNightTime: true,
          isMatchWindow: true,
          riskScore: Math.floor(92 + Math.random() * 7),
          anomalyFlags: [
            'MATCH_OVER_BURST',
            'OUT_OF_STATE_PAYER',
            'ROUND_AMOUNT_STAKE',
            'SUSPECTED_BET_DEPOSIT'
          ]
        };
        this.addTransaction(txn);
        created.push(txn);
      }

      // Update the synthetic risk layer for the demo narrative.
      const m = merchants.find(m => m.id === merchantId);
      if (m) {
        m.metrics.nightTimeRatio = 0.76;
        m.metrics.roundAmountRatio = 0.94;
        m.metrics.matchHourSpikeRatio = 0.88;
        m.driftScore = 96;
        m.currentTier = 'TIER_3_QUARANTINE';
        m.status = 'SUSPENDED';
        m.isBettingFront = true;
        m.riskProfile = 'QUARANTINE';
      }

      return {
        message: `Demo scenario: injected 8 late-night cricket match betting payments into ${merchantName(merchantId)}`,
        addedCount: created.length,
        transactions: created
      };
    }

    if (scenario === 'FESTIVE_BAKERY_RUSH') {
      // Honest-shop control: normal daytime cake orders from local customers.
      const merchantId = 'MERC-BAKE-002';
      const retailPrices = [240, 399, 485, 750, 1150, 1380];
      for (let i = 0; i < 6; i++) {
        const price = retailPrices[i % retailPrices.length];
        const txn: Transaction = {
          id: `TXN-CAKE-${Date.now()}-${i}`,
          merchantId,
          merchantName: merchantName(merchantId),
          amount: price,
          currency: 'INR',
          paymentMethod: i % 2 === 0 ? 'UPI' : 'CREDIT_CARD',
          payerId: `USR-LOC-${Math.floor(1000 + Math.random() * 9000)} (Bengaluru)`,
          payerState: 'Karnataka',
          payerCity: 'Bengaluru',
          timestamp: new Date(now.getTime() - i * 30000).toISOString(),
          isRoundAmount: false,
          isNightTime: false,
          isMatchWindow: false,
          riskScore: Math.floor(5 + Math.random() * 8),
          anomalyFlags: []
        };
        this.addTransaction(txn);
        created.push(txn);
      }

      return {
        message: `Demo scenario: injected 6 normal daytime cake orders for ${merchantName(merchantId)} (honest-shop control)`,
        addedCount: created.length,
        transactions: created
      };
    }

    if (scenario === 'MULE_RING_SMURF') {
      // Synchronized synthetic deposits across three real OSM merchant identities.
      const targetIds = ['MERC-BAKE-001', 'MERC-REST-006', 'MERC-CONV-018'];

      for (let i = 0; i < targetIds.length; i++) {
        const merchantId = targetIds[i];
        const txn: Transaction = {
          id: `TXN-SMURF-${Date.now()}-${i}`,
          merchantId,
          merchantName: merchantName(merchantId),
          amount: 5000,
          currency: 'INR',
          paymentMethod: 'UPI',
          payerId: 'USR-SYND-992 (Shared VPN Proxy)',
          payerState: 'Delhi',
          payerCity: 'New Delhi',
          timestamp: new Date(now.getTime() - i * 5000).toISOString(),
          isRoundAmount: true,
          isNightTime: true,
          isMatchWindow: true,
          riskScore: 97,
          anomalyFlags: [
            'CROSS_MERCHANT_SMURFING',
            'SHARED_VPN_IP',
            'SYNCHRONIZED_STAKE_DEPOSIT'
          ]
        };
        this.addTransaction(txn);
        created.push(txn);
      }

      const names = targetIds.map(merchantName).join(', ');
      return {
        message: `Demo scenario: injected simultaneous deposits across ${names} from the same synthetic betting account`,
        addedCount: created.length,
        transactions: created
      };
    }

    return { message: 'Unknown scenario', addedCount: 0 };
  }
}
