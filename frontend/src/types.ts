export type MerchantStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'SUSPENDED';

export type RiskTier = 
  | 'TIER_0_SAFE'        // Score 0-25: Normal business, zero friction
  | 'TIER_1_MONITOR'     // Score 26-55: Subtle shift / seasonal, soft friction
  | 'TIER_2_RESTRICT'    // Score 56-80: Suspected front, 20% reserve, velocity cap
  | 'TIER_3_QUARANTINE'; // Score 81-100: Confirmed syndicate, STR filing

export interface Merchant {
  id: string;
  name: string;
  legalEntity: string;
  mcc: string;
  mccDescription: string;
  panNumber: string;
  gstin: string;
  onboardedAt: string;
  declaredTurnoverMonthly: number;
  city: string;
  state: string;
  physicalStoreVerified: boolean;
  status: MerchantStatus;
  currentTier: RiskTier;
  driftScore: number;
  isBettingFront: boolean;
  imageUrl?: string;
  businessType?: string;
  riskFactors: string[];
  // --- OpenStreetMap provenance (real merchant identity) ---
  osmId?: number;
  osmType?: string;
  osmRef?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  dataSource?: 'OpenStreetMap';
  /** Synthetic demo risk archetype layered on top of the real OSM identity. */
  riskProfile?: 'SAFE' | 'MONITOR' | 'RESTRICT' | 'QUARANTINE';
  metrics: {
    totalVolume30d: number;
    transactionCount30d: number;
    avgTicketSize: number;
    outOfStateRatio: number;
    nightTimeRatio: number;
    roundAmountRatio: number;
    repeatPayerRatio: number;
    matchHourSpikeRatio: number;
  };
  interventions: {
    rollingReservePercent: number;
    maxTransactionLimit: number;
    smartGeoFenceActive: boolean;
    videoPosRequested: boolean;
    strFiled: boolean;
  };
}

export interface Transaction {
  id: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING';
  payerId: string;
  payerState: string;
  payerCity: string;
  timestamp: string;
  isRoundAmount: boolean;
  isNightTime: boolean;
  isMatchWindow: boolean;
  riskScore: number;
  anomalyFlags: string[];
}

export interface DriftBreakdown {
  merchantId: string;
  compositeScore: number;
  tier: RiskTier;
  components: {
    temporalAnomaly: {
      score: number;
      weight: number;
      detail: string;
      peakHours: string[];
    };
    geographicEntropy: {
      score: number;
      weight: number;
      detail: string;
      topPayerRegions: { region: string; count: number }[];
    };
    amountDistribution: {
      score: number;
      weight: number;
      detail: string;
      roundNumberPct: number;
    };
    payerEntropy: {
      score: number;
      weight: number;
      detail: string;
      oneOffPayerPct: number;
    };
    digitalFootprint: {
      score: number;
      weight: number;
      detail: string;
      webCatalogActive: boolean;
      mapsReviewVolume: number;
    };
  };
  recommendedAction: string;
  falsePositiveSafetyAssessment: string;
}

export interface SyndicateNode {
  id: string;
  name: string;
  type: 'MERCHANT' | 'PAYER_CLUSTER' | 'SYNDICATE_AGGREGATOR' | 'IP_SUBNET';
  riskScore: number;
  category: string;
  details: string;
}

export interface SyndicateLink {
  source: string;
  target: string;
  value: number;
  relationship: 'FUNDS_ROUTED' | 'SHARED_DEVICE' | 'COMMON_PAYER_CLUSTER' | 'BURST_SYNCHRONIZED';
}

export interface SyndicateGraph {
  nodes: SyndicateNode[];
  links: SyndicateLink[];
}

export interface AIInvestigationReport {
  merchantId: string;
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
