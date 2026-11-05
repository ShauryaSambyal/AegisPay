/**
 * Frontend mirror of the backend contract (backend/src/types/index.ts).
 *
 * Field parity table is documented in docs/API_CONTRACT.md. The discriminated
 * union is the point: `RealMerchant` has no risk field, and risk-bearing
 * records reference `SimMerchantId` only.
 */

export type DataOrigin = 'real_osm' | 'simulated';
export type RealMerchantId = `OSM-${string}`;
export type SimMerchantId = `SIM-${string}`;
export type MerchantStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'SUSPENDED';
export type RiskTier = 'TIER_0_SAFE' | 'TIER_1_MONITOR' | 'TIER_2_RESTRICT' | 'TIER_3_QUARANTINE';
export type PaymentMethod = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING';

/** Real OpenStreetMap business. Display-only directory record. */
export interface RealMerchant {
  id: RealMerchantId;
  dataOrigin: 'real_osm';
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  osmRef: string;
  name: string;
  category: string;
  categoryLabel: string;
  address: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  source: 'OpenStreetMap';
  license: 'ODbL-1.0';
  attribution: '© OpenStreetMap contributors';
  displayOnly: true;
}

export interface SimBaseline {
  avgTicket: number;
  nightShare: number;
  roundShare: number;
  repeatPayerShare: number;
  sampledDays: number;
  source: 'onboarding_90d' | 'category_fallback';
}

export interface SimulatorMetrics {
  totalVolume30d: number;
  transactionCount30d: number;
  avgTicketSize: number;
  outOfStateRatio: number;
  nightTimeRatio: number;
  roundAmountRatio: number;
  repeatPayerRatio: number;
  matchHourSpikeRatio: number;
}

export interface SimInterventions {
  rollingReservePercent: number;
  maxTransactionLimit: number;
  smartGeoFenceActive: boolean;
  videoPosRequested: boolean;
  strFiled: boolean;
}

/** Anonymized simulated merchant. The only merchant type that carries risk. */
export interface SimulatedMerchant {
  id: SimMerchantId;
  dataOrigin: 'simulated';
  displayName: string;
  category: string;
  categoryLabel: string;
  mcc: string;
  mccDescription: string;
  city: string;
  state: string;
  declaredTurnoverMonthly: number;
  onboardedAt: string;
  status: MerchantStatus;
  riskScore: number;
  riskTier: RiskTier;
  driftScore: number;
  isBettingFront: boolean;
  network: string | null;
  baseline: SimBaseline;
  metrics: SimulatorMetrics;
  riskFactors: string[];
  interventions: SimInterventions;
}

export type Merchant = RealMerchant | SimulatedMerchant;

export interface Transaction {
  id: string;
  dataOrigin: 'simulated';
  merchantId: SimMerchantId;
  merchantName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  payerId: string;
  payerCity: string;
  payerState: string;
  timestamp: string;
  isRoundAmount: boolean;
  isNightTime: boolean;
  isMatchWindow: boolean;
  riskScore: number;
  anomalyFlags: string[];
}

export interface DriftBreakdown {
  dataOrigin: 'simulated';
  merchantId: SimMerchantId;
  compositeScore: number;
  tier: RiskTier;
  components: {
    temporalAnomaly: { score: number; weight: number; detail: string; peakHours: string[] };
    geographicEntropy: {
      score: number;
      weight: number;
      detail: string;
      topPayerRegions: { region: string; count: number }[];
    };
    amountDistribution: { score: number; weight: number; detail: string; roundNumberPct: number };
    payerEntropy: { score: number; weight: number; detail: string; oneOffPayerPct: number };
    baselineDeviation: {
      score: number;
      weight: number;
      detail: string;
      baselineSource: SimBaseline['source'];
    };
  };
  recommendedAction: string;
  falsePositiveSafetyAssessment: string;
}

export interface RiskAssessment {
  dataOrigin: 'simulated';
  merchantId: SimMerchantId;
  score: number;
  tier: RiskTier;
  reasons: string[];
  components: Record<string, number>;
  computedAt: string;
  coldStart: boolean;
}

export type SyndicateInfraId = `CLUSTER-${string}` | `HUB-${string}` | `INFRA-${string}`;
export type SyndicateNodeId = SimMerchantId | SyndicateInfraId;

export interface SyndicateNode {
  id: SyndicateNodeId;
  dataOrigin: 'simulated';
  name: string;
  type: 'MERCHANT' | 'PAYER_CLUSTER' | 'SYNDICATE_AGGREGATOR' | 'IP_SUBNET';
  riskScore: number;
  category: string;
  details: string;
}

export interface SyndicateLink {
  source: SyndicateNodeId;
  target: SyndicateNodeId;
  value: number;
  relationship: 'FUNDS_ROUTED' | 'SHARED_DEVICE' | 'COMMON_PAYER_CLUSTER' | 'BURST_SYNCHRONIZED';
}

export interface SyndicateGraphType {
  dataOrigin: 'simulated';
  nodes: SyndicateNode[];
  links: SyndicateLink[];
}

export interface AIInvestigationReport {
  dataOrigin: 'simulated';
  merchantId: SimMerchantId;
  merchantName: string;
  investigationDate: string;
  executiveSummary: string;
  driftVerdict: 'CONFIRMED_BETTING_FRONT' | 'GENUINE_SEASONAL_SURGE' | 'NEEDS_FURTHER_MONITORING';
  confidenceScore: number;
  evidenceItems: {
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  regulatoryDossier: {
    fiuSuspiciousCategory: string;
    narrative: string;
    statutoryViolations: string[];
  };
  actionableRemediations: string[];
}

/* ---------------------------------------------------------------- ML service */

export interface SplitMetrics {
  name?: string;
  n: number;
  positives: number;
  threshold?: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  roc_auc: number | null;
  pr_auc: number | null;
  confusion_matrix?: number[][] | null;
  notes?: string[];
  merchants?: string[];
}

export interface MlModelInfo {
  modelCard: {
    name: string;
    version: string;
    trainedAt: string;
    modelType: string;
    calibration: string;
    featureCount: number;
    windowDays: number;
    evaluation: string;
    syntheticDataWarning: string;
    limitations: string[];
    trainingData: Record<string, unknown>;
    datasetSummary?: Record<string, number | string | boolean>;
  };
  metrics: {
    seed: number;
    modelVersion: string;
    calibration: string;
    operatingThreshold: number;
    syntheticEvaluation: boolean;
    caveat: string;
    splits: {
      train: { n: number; positives: number; merchants: string[]; windows: number[] };
      time_holdout: SplitMetrics | null;
      merchant_holdout: SplitMetrics | null;
    };
  };
  featureImportance?: {
    method?: string;
    features?: Record<string, number>;
    shapMeanAbs?: Record<string, number>;
  };
  provenance: Record<string, unknown>;
  limitations: string[];
  evaluation: string;
  disclaimer: string;
}

export interface DatasetEntry {
  name: string;
  canonicalUrl: string;
  access: string;
  available: boolean;
  license: string;
  licenseEvidence: string | null;
  schema?: string;
  usedForTraining: boolean;
  usedFor: string;
}

export interface MlDatasets {
  datasets: DatasetEntry[];
  environment: Record<string, unknown>;
  trainingProvenance: string;
  checkedAt: string;
}

export interface MerchantScoreResponse {
  merchantId: SimMerchantId;
  score: number;
  tier: RiskTier;
  reasons: string[];
  components: {
    rule: number;
    model: number;
    graph: number;
    weights: Record<string, number>;
    rules: Record<string, number>;
  };
  evaluatedAt: string;
  windowStart: string;
  transactionCount: number;
  synthetic: boolean;
  disclaimer: string;
  coldStart?: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
