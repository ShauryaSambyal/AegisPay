import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RiskTier,
  SimBaseline,
  SimInterventions,
  SimulatedMerchant,
  SimulatorMetrics,
  SimMerchantId,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SIMULATED merchants — anonymized ids with fictional display names.
 *
 * Nothing in this file is derived from, or attachable to, a real OpenStreetMap
 * identity. Names, volumes, baselines and risk factors are simulation
 * parameters. The catalogue itself lives in `simulated_merchants.json` so the
 * Python ML service reads exactly the same identities.
 */

interface ScenarioParameters {
  volumeMultiplier: number;
  ticketMultiplier: number;
  outOfStateRatio: number;
  nightTimeRatio: number;
  roundAmountRatio: number;
  repeatPayerRatio: number;
  matchHourSpikeRatio: number;
  baseRisk: number;
}

/**
 * Simulation parameters per scenario archetype. These are the only source of
 * the demo metrics; they are not measurements of any real business.
 */
export const SCENARIO_PARAMETERS: Record<string, ScenarioParameters> = {
  honest: {
    volumeMultiplier: 1.0,
    ticketMultiplier: 1.0,
    outOfStateRatio: 0.03,
    nightTimeRatio: 0.02,
    roundAmountRatio: 0.04,
    repeatPayerRatio: 0.4,
    matchHourSpikeRatio: 0.02,
    baseRisk: 8,
  },
  monitor: {
    volumeMultiplier: 1.3,
    ticketMultiplier: 1.2,
    outOfStateRatio: 0.12,
    nightTimeRatio: 0.09,
    roundAmountRatio: 0.1,
    repeatPayerRatio: 0.28,
    matchHourSpikeRatio: 0.05,
    baseRisk: 42,
  },
  drift: {
    volumeMultiplier: 3.1,
    ticketMultiplier: 2.2,
    outOfStateRatio: 0.55,
    nightTimeRatio: 0.42,
    roundAmountRatio: 0.62,
    repeatPayerRatio: 0.08,
    matchHourSpikeRatio: 0.3,
    baseRisk: 84,
  },
  syndicate: {
    volumeMultiplier: 2.6,
    ticketMultiplier: 2.0,
    outOfStateRatio: 0.62,
    nightTimeRatio: 0.38,
    roundAmountRatio: 0.7,
    repeatPayerRatio: 0.05,
    matchHourSpikeRatio: 0.34,
    baseRisk: 88,
  },
};

interface CatalogRow {
  id: SimMerchantId;
  displayName: string;
  category: string;
  mcc: string;
  mccDescription: string;
  declaredTurnoverMonthly: number;
  onboardedAt: string;
  baselineAvgTicket: number;
  baselineNightShare: number;
  scenario: keyof typeof SCENARIO_PARAMETERS;
  network: string | null;
  isBettingFront: boolean;
}

interface CatalogFile {
  version: string;
  city: string;
  state: string;
  merchants: CatalogRow[];
}

const FALLBACK_CATALOG: CatalogFile = {
  version: '1.0.0',
  city: 'Bengaluru',
  state: 'Karnataka',
  merchants: [
    { id: 'SIM-0001', displayName: 'Aurora Bakehouse', category: 'bakery', mcc: '5462', mccDescription: 'Retail Bakeries & Pastry Shops', declaredTurnoverMonthly: 350000, onboardedAt: '2024-06-18', baselineAvgTicket: 205, baselineNightShare: 0.03, scenario: 'drift', network: 'RING-CRICKET', isBettingFront: true },
    { id: 'SIM-0002', displayName: 'Maple Crumb Bakery', category: 'bakery', mcc: '5462', mccDescription: 'Retail Bakeries & Pastry Shops', declaredTurnoverMonthly: 900000, onboardedAt: '2023-02-09', baselineAvgTicket: 240, baselineNightShare: 0.02, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0003', displayName: 'Nightowl Diner', category: 'restaurant', mcc: '5812', mccDescription: 'Eating Places & Restaurants', declaredTurnoverMonthly: 1500000, onboardedAt: '2024-01-22', baselineAvgTicket: 760, baselineNightShare: 0.18, scenario: 'syndicate', network: 'RING-CRICKET', isBettingFront: true },
    { id: 'SIM-0004', displayName: 'Copper Pot Kitchen', category: 'restaurant', mcc: '5812', mccDescription: 'Eating Places & Restaurants', declaredTurnoverMonthly: 2100000, onboardedAt: '2023-11-03', baselineAvgTicket: 890, baselineNightShare: 0.11, scenario: 'monitor', network: null, isBettingFront: false },
    { id: 'SIM-0005', displayName: 'Blue Kettle Cafe', category: 'cafe', mcc: '5814', mccDescription: 'Cafés, Coffee Shops & Fast Food', declaredTurnoverMonthly: 480000, onboardedAt: '2024-04-11', baselineAvgTicket: 310, baselineNightShare: 0.01, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0006', displayName: 'Corner Bean Roasters', category: 'cafe', mcc: '5814', mccDescription: 'Cafés, Coffee Shops & Fast Food', declaredTurnoverMonthly: 390000, onboardedAt: '2023-08-30', baselineAvgTicket: 285, baselineNightShare: 0.02, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0007', displayName: 'Green Crate Express', category: 'convenience', mcc: '5499', mccDescription: 'Miscellaneous Food Stores', declaredTurnoverMonthly: 620000, onboardedAt: '2024-02-17', baselineAvgTicket: 185, baselineNightShare: 0.12, scenario: 'syndicate', network: 'RING-CRICKET', isBettingFront: true },
    { id: 'SIM-0008', displayName: 'Sunrise Provisions', category: 'convenience', mcc: '5499', mccDescription: 'Miscellaneous Food Stores', declaredTurnoverMonthly: 740000, onboardedAt: '2023-06-05', baselineAvgTicket: 210, baselineNightShare: 0.05, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0009', displayName: 'Meridian Grocers', category: 'grocery', mcc: '5411', mccDescription: 'Grocery Stores & Supermarkets', declaredTurnoverMonthly: 4800000, onboardedAt: '2022-12-01', baselineAvgTicket: 640, baselineNightShare: 0.04, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0010', displayName: 'Lantern Pharmacy', category: 'pharmacy', mcc: '5912', mccDescription: 'Drug Stores & Pharmacies', declaredTurnoverMonthly: 1100000, onboardedAt: '2023-03-27', baselineAvgTicket: 470, baselineNightShare: 0.06, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0011', displayName: 'Pixel & Wire Electronics', category: 'electronics', mcc: '5732', mccDescription: 'Electronics Stores', declaredTurnoverMonthly: 2600000, onboardedAt: '2024-05-19', baselineAvgTicket: 6800, baselineNightShare: 0.03, scenario: 'monitor', network: null, isBettingFront: false },
    { id: 'SIM-0012', displayName: 'Loom & Thread Apparel', category: 'clothing', mcc: '5651', mccDescription: 'Family Clothing Stores', declaredTurnoverMonthly: 1700000, onboardedAt: '2023-09-14', baselineAvgTicket: 1850, baselineNightShare: 0.02, scenario: 'honest', network: null, isBettingFront: false },
    { id: 'SIM-0013', displayName: 'Harbour Rest Stop', category: 'hotel', mcc: '7011', mccDescription: 'Hotels & Motels', declaredTurnoverMonthly: 3400000, onboardedAt: '2023-05-08', baselineAvgTicket: 5400, baselineNightShare: 0.28, scenario: 'monitor', network: null, isBettingFront: false },
    { id: 'SIM-0014', displayName: 'Velvet Tiger Snack Bar', category: 'restaurant', mcc: '5812', mccDescription: 'Eating Places & Restaurants', declaredTurnoverMonthly: 980000, onboardedAt: '2024-03-02', baselineAvgTicket: 520, baselineNightShare: 0.15, scenario: 'drift', network: 'RING-CRICKET', isBettingFront: true },
  ],
};

export const catalogPath = (): string => {
  if (process.env.OSM_DATA_DIR) {
    const custom = path.resolve(process.cwd(), process.env.OSM_DATA_DIR, 'simulated_merchants.json');
    if (fs.existsSync(custom)) return custom;
  }
  const candidates = [
    path.resolve(process.cwd(), 'backend/src/data/simulated_merchants.json'),
    path.resolve(process.cwd(), 'src/data/simulated_merchants.json'),
    path.resolve(process.cwd(), 'backend/dist/data/simulated_merchants.json'),
    path.resolve(__dirname, 'simulated_merchants.json'),
    path.resolve(__dirname, '../../src/data/simulated_merchants.json'),
    path.resolve(__dirname, '../../../backend/src/data/simulated_merchants.json'),
    path.resolve(process.cwd(), '../backend/src/data/simulated_merchants.json'),
    path.resolve(process.cwd(), '../src/data/simulated_merchants.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
};

const loadCatalog = (): CatalogFile => {
  const file = catalogPath();
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as CatalogFile;
    } catch (err) {
      console.warn(`[simulatedMerchants] Failed to parse ${file}, using fallback:`, err);
    }
  }
  console.log(`[simulatedMerchants] Using bundled catalog fallback (not found on disk at: ${file})`);
  return FALLBACK_CATALOG;
};

export const tierForScore = (score: number): RiskTier => {
  if (score <= 25) return 'TIER_0_SAFE';
  if (score <= 55) return 'TIER_1_MONITOR';
  if (score <= 80) return 'TIER_2_RESTRICT';
  return 'TIER_3_QUARANTINE';
};

const statusForTier = (tier: RiskTier): SimulatedMerchant['status'] => {
  switch (tier) {
    case 'TIER_3_QUARANTINE':
      return 'SUSPENDED';
    case 'TIER_2_RESTRICT':
      return 'RESTRICTED';
    case 'TIER_1_MONITOR':
      return 'UNDER_REVIEW';
    default:
      return 'ACTIVE';
  }
};

const interventionsForTier = (tier: RiskTier): SimInterventions => {
  switch (tier) {
    case 'TIER_3_QUARANTINE':
      return {
        rollingReservePercent: 50,
        maxTransactionLimit: 500,
        smartGeoFenceActive: true,
        videoPosRequested: true,
        strFiled: true,
      };
    case 'TIER_2_RESTRICT':
      return {
        rollingReservePercent: 25,
        maxTransactionLimit: 1000,
        smartGeoFenceActive: true,
        videoPosRequested: true,
        strFiled: false,
      };
    case 'TIER_1_MONITOR':
      return {
        rollingReservePercent: 0,
        maxTransactionLimit: 25000,
        smartGeoFenceActive: false,
        videoPosRequested: false,
        strFiled: false,
      };
    default:
      return {
        rollingReservePercent: 0,
        maxTransactionLimit: 100000,
        smartGeoFenceActive: false,
        videoPosRequested: false,
        strFiled: false,
      };
  }
};

const buildMetrics = (row: CatalogRow, params: ScenarioParameters): SimulatorMetrics => {
  const totalVolume30d = Math.round(row.declaredTurnoverMonthly * params.volumeMultiplier);
  const avgTicketSize = Math.round(row.baselineAvgTicket * params.ticketMultiplier);
  return {
    totalVolume30d,
    transactionCount30d: Math.max(1, Math.round(totalVolume30d / Math.max(1, avgTicketSize))),
    avgTicketSize,
    outOfStateRatio: params.outOfStateRatio,
    nightTimeRatio: params.nightTimeRatio,
    roundAmountRatio: params.roundAmountRatio,
    repeatPayerRatio: params.repeatPayerRatio,
    matchHourSpikeRatio: params.matchHourSpikeRatio,
  };
};

const buildRiskFactors = (metrics: SimulatorMetrics, baseline: SimBaseline, params: ScenarioParameters): string[] => {
  const factors: string[] = [];
  if (metrics.nightTimeRatio > baseline.nightShare * 3) {
    factors.push(
      `Simulated signal: ${(metrics.nightTimeRatio * 100).toFixed(0)}% of synthetic volume arrives late at night versus ${(baseline.nightShare * 100).toFixed(0)}% in this merchant's onboarding baseline.`
    );
  }
  if (metrics.outOfStateRatio > 0.3) {
    factors.push(
      `Simulated signal: ${(metrics.outOfStateRatio * 100).toFixed(0)}% of synthetic payers are registered outside Karnataka.`
    );
  }
  if (metrics.roundAmountRatio > 0.3) {
    factors.push(
      `Simulated signal: ${(metrics.roundAmountRatio * 100).toFixed(0)}% of synthetic tickets are exact round amounts.`
    );
  }
  if (metrics.repeatPayerRatio < 0.15) {
    factors.push(
      `Simulated signal: only ${(metrics.repeatPayerRatio * 100).toFixed(0)}% of synthetic payer ids ever return.`
    );
  }
  if (metrics.matchHourSpikeRatio > 0.2) {
    factors.push(
      `Simulated signal: ${(metrics.matchHourSpikeRatio * 100).toFixed(0)}% of synthetic volume lands inside modelled match windows.`
    );
  }
  if (params.volumeMultiplier > 2) {
    factors.push(
      `Simulated signal: processed volume is ${params.volumeMultiplier.toFixed(1)}x the declared onboarding turnover.`
    );
  }
  if (factors.length === 0) {
    factors.push('Simulated signal: all behavioural metrics stay inside this category baseline.');
  }
  return factors;
};

const catalog = loadCatalog();

export const simulatedMerchants: SimulatedMerchant[] = catalog.merchants.map(row => {
  const params = SCENARIO_PARAMETERS[row.scenario] ?? SCENARIO_PARAMETERS.honest;
  const metrics = buildMetrics(row, params);
  const baseline: SimBaseline = {
    avgTicket: row.baselineAvgTicket,
    nightShare: row.baselineNightShare,
    roundShare: 0.05,
    repeatPayerShare: 0.38,
    sampledDays: 90,
    source: 'onboarding_90d',
  };
  const tier = tierForScore(params.baseRisk);
  return {
    id: row.id,
    dataOrigin: 'simulated',
    displayName: row.displayName,
    category: row.category,
    categoryLabel: row.category.charAt(0).toUpperCase() + row.category.slice(1),
    mcc: row.mcc,
    mccDescription: row.mccDescription,
    city: catalog.city,
    state: catalog.state,
    declaredTurnoverMonthly: row.declaredTurnoverMonthly,
    onboardedAt: row.onboardedAt,
    status: statusForTier(tier),
    riskScore: params.baseRisk,
    riskTier: tier,
    driftScore: params.baseRisk,
    isBettingFront: row.isBettingFront,
    network: row.network,
    baseline,
    metrics,
    riskFactors: buildRiskFactors(metrics, baseline, params),
    interventions: interventionsForTier(tier),
  };
});

export const simulatedMerchantsMeta = {
  version: catalog.version,
  city: catalog.city,
  state: catalog.state,
  count: simulatedMerchants.length,
};

export const findSimulatedMerchant = (id: string): SimulatedMerchant | undefined =>
  simulatedMerchants.find(merchant => merchant.id === id);

export const isSimulatedMerchantId = (id: string): boolean => id.startsWith('SIM-');

export const requireSimulatedMerchant = (id: string): SimulatedMerchant => {
  const merchant = findSimulatedMerchant(id);
  if (!merchant) {
    throw new Error(`Unknown simulated merchant: ${id}`);
  }
  return merchant;
};

export const simulatedName = (id: string): string => findSimulatedMerchant(id)?.displayName ?? id;
