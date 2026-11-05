/**
 * Shared API types.
 *
 * The real/simulated boundary is enforced by the type system, not by comments:
 *
 *  - `RealMerchant` has NO risk-bearing field at all. If a real merchant could
 *    carry a score, the boundary would already be broken.
 *  - `SimulatedMerchant.id` is a `SimMerchantId` (`SIM-*`) and every financial
 *    or risk record references `SimMerchantId`, never `string`.
 *  - The two id types are disjoint template-literal types, so passing a real
 *    merchant id where a simulated id is required is a compile error.
 */

export type DataOrigin = 'real_osm' | 'simulated';

/** Real OpenStreetMap identity id, e.g. `OSM-N343089650`. */
export type RealMerchantId = `OSM-${string}`;

/** Anonymized simulation identity id, e.g. `SIM-0001`. */
export type SimMerchantId = `SIM-${string}`;

export type MerchantStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'SUSPENDED';

export type RiskTier =
  | 'TIER_0_SAFE'        // 0-25: normal business, zero friction
  | 'TIER_1_MONITOR'     // 26-55: subtle shift, soft friction
  | 'TIER_2_RESTRICT'    // 56-80: 20% rolling reserve, velocity cap
  | 'TIER_3_QUARANTINE'; // 81-100: payout hold, manual review

export type RealMerchantCategory =
  | 'bakery'
  | 'restaurant'
  | 'cafe'
  | 'grocery'
  | 'pharmacy'
  | 'electronics'
  | 'clothing'
  | 'hotel'
  | 'convenience';

/** A real business identity from OpenStreetMap. Display-only directory record. */
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

/** Onboarding baseline used by the drift engine (simulated merchants only). */
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

/** An anonymized simulated merchant. Every risk-bearing record uses this type. */
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

export type PaymentMethod = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING';

/** Simulated payment. `merchantId` is a SIM id, so real merchants cannot hold one. */
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

export interface DriftComponents {
  temporalAnomaly: { score: number; weight: number; detail: string; peakHours: string[] };
  geographicEntropy: {
    score: number;
    weight: number;
    detail: string;
    topPayerRegions: { region: string; count: number }[];
  };
  amountDistribution: { score: number; weight: number; detail: string; roundNumberPct: number };
  payerEntropy: { score: number; weight: number; detail: string; oneOffPayerPct: number };
  baselineDeviation: { score: number; weight: number; detail: string; baselineSource: SimBaseline['source'] };
}

export interface DriftBreakdown {
  dataOrigin: 'simulated';
  merchantId: SimMerchantId;
  compositeScore: number;
  tier: RiskTier;
  components: DriftComponents;
  recommendedAction: string;
  falsePositiveSafetyAssessment: string;
}

/** A risk assessment record; only simulated merchants can be assessed. */
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

export interface SyndicateGraph {
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

/** Standard error envelope for every API error response. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
