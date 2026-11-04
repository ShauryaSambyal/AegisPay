import { Merchant, MerchantStatus, RiskTier, Transaction } from '../types/index.js';

/**
 * Merchant identities in this dataset are real records published on
 * OpenStreetMap (retrieved through the Overpass API).
 *
 * Everything layered on top of that identity — legal entity, tax IDs, risk
 * score, transaction history and interventions — is SYNTHETIC DEMO DATA used
 * to illustrate the "Follow the Money" challenge. No real business is being
 * accused of fraud.
 */

type RiskProfile = 'SAFE' | 'MONITOR' | 'RESTRICT' | 'QUARANTINE';

interface MerchantSeed {
  id: string;
  name: string;
  osmId: number;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  mcc: string;
  mccDescription: string;
  declaredTurnoverMonthly: number;
  onboardedAt: string;
  riskProfile: RiskProfile;
  demoRiskScore: number;
  riskFactors: string[];
  metrics: Merchant['metrics'];
}

const tierByProfile: Record<RiskProfile, RiskTier> = {
  SAFE: 'TIER_0_SAFE',
  MONITOR: 'TIER_1_MONITOR',
  RESTRICT: 'TIER_2_RESTRICT',
  QUARANTINE: 'TIER_3_QUARANTINE'
};

const statusByProfile: Record<RiskProfile, MerchantStatus> = {
  SAFE: 'ACTIVE',
  MONITOR: 'ACTIVE',
  RESTRICT: 'RESTRICTED',
  QUARANTINE: 'SUSPENDED'
};

const interventionsByProfile: Record<RiskProfile, Merchant['interventions']> = {
  SAFE: {
    rollingReservePercent: 0,
    maxTransactionLimit: 100000,
    smartGeoFenceActive: false,
    videoPosRequested: false,
    strFiled: false
  },
  MONITOR: {
    rollingReservePercent: 0,
    maxTransactionLimit: 25000,
    smartGeoFenceActive: false,
    videoPosRequested: false,
    strFiled: false
  },
  RESTRICT: {
    rollingReservePercent: 25,
    maxTransactionLimit: 1000,
    smartGeoFenceActive: true,
    videoPosRequested: true,
    strFiled: false
  },
  QUARANTINE: {
    rollingReservePercent: 50,
    maxTransactionLimit: 500,
    smartGeoFenceActive: true,
    videoPosRequested: true,
    strFiled: true
  }
};

const merchantSeeds: MerchantSeed[] = [
  // ---------------------------------------------------------------- Bakeries
  {
    id: 'MERC-BAKE-001',
    name: "Thom's Bakery",
    osmId: 343089650,
    address: '# 1/2, Wheeler Road, Bengaluru, 560005',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9915471,
    longitude: 77.614181,
    mcc: '5462',
    mccDescription: 'Retail Bakeries & Pastry Shops',
    declaredTurnoverMonthly: 350000,
    onboardedAt: '2024-06-18',
    riskProfile: 'QUARANTINE',
    demoRiskScore: 84,
    riskFactors: [
      'Demo signal: 62% of payment volume lands between 10:30 PM and 2:00 AM, concentrated on cricket match nights.',
      'Demo signal: 86% of payers are registered outside Karnataka although the bakery has no delivery service.',
      'Demo signal: 88% of tickets are exact ₹1,000 / ₹5,000 / ₹10,000 denominations.',
      'Demo signal: only 3.5% repeat payers; 96.5% are one-time UPI IDs from online channels.',
      'Demo signal: ₹42.0L processed in 30 days against ₹3.5L declared at onboarding (12x).'
    ],
    metrics: {
      totalVolume30d: 4200000,
      transactionCount30d: 2270,
      avgTicketSize: 1850,
      outOfStateRatio: 0.86,
      nightTimeRatio: 0.62,
      roundAmountRatio: 0.88,
      repeatPayerRatio: 0.035,
      matchHourSpikeRatio: 0.55
    }
  },
  {
    id: 'MERC-BAKE-002',
    name: 'Old Madras Baking Company',
    osmId: 428457212,
    address: "Saint Mark's Road, Bangalore, 560001",
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9697383,
    longitude: 77.6003775,
    openingHours: '08:00-23:00',
    mcc: '5462',
    mccDescription: 'Retail Bakeries & Pastry Shops',
    declaredTurnoverMonthly: 900000,
    onboardedAt: '2023-02-09',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: daytime trading with 44% repeat neighbourhood payers.',
      'Demo signal: 95% of volume stays inside Karnataka and ticket sizes vary naturally.',
      'Demo signal: ₹11.5L processed against ₹9.0L declared — inside the normal seasonal range.'
    ],
    metrics: {
      totalVolume30d: 1150000,
      transactionCount30d: 2212,
      avgTicketSize: 520,
      outOfStateRatio: 0.05,
      nightTimeRatio: 0.04,
      roundAmountRatio: 0.16,
      repeatPayerRatio: 0.44,
      matchHourSpikeRatio: 0.03
    }
  },
  {
    id: 'MERC-BAKE-003',
    name: 'Daily Bread',
    osmId: 1420105905,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9724613,
    longitude: 77.6391823,
    mcc: '5462',
    mccDescription: 'Retail Bakeries & Pastry Shops',
    declaredTurnoverMonthly: 600000,
    onboardedAt: '2025-03-27',
    riskProfile: 'MONITOR',
    demoRiskScore: 32,
    riskFactors: [
      'Demo signal: 30% late-evening volume and 22% match-hour correlation — above the bakery baseline but not conclusive.',
      'Demo signal: 30% out-of-state payers, consistent with online cake pre-orders.',
      'Demo signal: ₹19.0L processed against ₹6.0L declared; invoice itemisation requested.'
    ],
    metrics: {
      totalVolume30d: 1900000,
      transactionCount30d: 2111,
      avgTicketSize: 900,
      outOfStateRatio: 0.30,
      nightTimeRatio: 0.30,
      roundAmountRatio: 0.55,
      repeatPayerRatio: 0.22,
      matchHourSpikeRatio: 0.22
    }
  },

  // ------------------------------------------------------------- Restaurants
  {
    id: 'MERC-REST-004',
    name: "Koshy's",
    osmId: 349291886,
    address: "39, Saint Mark's Road, Shanthala Nagar, Bangalore, 560001",
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9756318,
    longitude: 77.6014761,
    openingHours: '09:00 - 23:00',
    mcc: '5812',
    mccDescription: 'Eating Places & Restaurants',
    declaredTurnoverMonthly: 1800000,
    onboardedAt: '2022-11-04',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 52% repeat diners and 94% in-state payers.',
      'Demo signal: average ticket ₹650 with a natural price distribution.',
      'Demo signal: volume broadly matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 1900000,
      transactionCount30d: 2923,
      avgTicketSize: 650,
      outOfStateRatio: 0.06,
      nightTimeRatio: 0.03,
      roundAmountRatio: 0.14,
      repeatPayerRatio: 0.52,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-REST-005',
    name: 'Adyar Ananda Bhavan',
    osmId: 317119985,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9543746,
    longitude: 77.5930172,
    openingHours: 'PH,Mo-Su 07:00-22:30',
    mcc: '5812',
    mccDescription: 'Eating Places & Restaurants',
    declaredTurnoverMonthly: 2400000,
    onboardedAt: '2021-08-16',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: high daily footfall with 47% repeat payers.',
      'Demo signal: 92% of payments originate in Karnataka.',
      'Demo signal: ₹27.0L processed against ₹24.0L declared — normal variance.'
    ],
    metrics: {
      totalVolume30d: 2700000,
      transactionCount30d: 6429,
      avgTicketSize: 420,
      outOfStateRatio: 0.08,
      nightTimeRatio: 0.05,
      roundAmountRatio: 0.20,
      repeatPayerRatio: 0.47,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-REST-006',
    name: 'Nandhana',
    osmId: 312595492,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9558995,
    longitude: 77.6411692,
    mcc: '5812',
    mccDescription: 'Eating Places & Restaurants',
    declaredTurnoverMonthly: 500000,
    onboardedAt: '2025-09-02',
    riskProfile: 'RESTRICT',
    demoRiskScore: 67,
    riskFactors: [
      'Demo signal: 55% of volume arrives after 10:30 PM, unusual for a dine-in restaurant.',
      'Demo signal: 82% out-of-state payers and 86% round-denomination tickets.',
      'Demo signal: ₹36.0L processed against ₹5.0L declared (7.2x).',
      'Demo signal: only 5% repeat payers; payer IDs overlap with a suspected betting cluster.'
    ],
    metrics: {
      totalVolume30d: 3600000,
      transactionCount30d: 2250,
      avgTicketSize: 1600,
      outOfStateRatio: 0.82,
      nightTimeRatio: 0.55,
      roundAmountRatio: 0.86,
      repeatPayerRatio: 0.05,
      matchHourSpikeRatio: 0.05
    }
  },

  // ---------------------------------------------------------- Grocery stores
  {
    id: 'MERC-GROC-007',
    name: 'Spencers Express',
    osmId: 312504777,
    address: '7th Cross Road, Bangalore, 560071',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9591813,
    longitude: 77.6382984,
    website: 'https://www.spencers.in/',
    mcc: '5411',
    mccDescription: 'Grocery Stores & Supermarkets',
    declaredTurnoverMonthly: 3200000,
    onboardedAt: '2022-04-21',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 55% repeat households and 93% in-state payers.',
      'Demo signal: average basket ₹480 with steady daily traffic.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 3400000,
      transactionCount30d: 7083,
      avgTicketSize: 480,
      outOfStateRatio: 0.07,
      nightTimeRatio: 0.04,
      roundAmountRatio: 0.12,
      repeatPayerRatio: 0.55,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-GROC-008',
    name: 'Reliance Fresh',
    osmId: 571124364,
    address: 'Sampige Road, Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 13.0042882,
    longitude: 77.5710889,
    mcc: '5411',
    mccDescription: 'Grocery Stores & Supermarkets',
    declaredTurnoverMonthly: 2800000,
    onboardedAt: '2024-01-30',
    riskProfile: 'MONITOR',
    demoRiskScore: 33,
    riskFactors: [
      'Demo signal: 30% of volume after 10 PM, attributed to bulk kirana restocking.',
      'Demo signal: 55% out-of-state payers and 55% round tickets — needs invoice evidence.',
      'Demo signal: ₹75.0L processed against ₹28.0L declared (2.7x).'
    ],
    metrics: {
      totalVolume30d: 7500000,
      transactionCount30d: 10000,
      avgTicketSize: 750,
      outOfStateRatio: 0.55,
      nightTimeRatio: 0.30,
      roundAmountRatio: 0.55,
      repeatPayerRatio: 0.15,
      matchHourSpikeRatio: 0.05
    }
  },

  // --------------------------------------------------------------- Pharmacies
  {
    id: 'MERC-PHAR-009',
    name: 'Apollo Pharmacy',
    osmId: 316999477,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9686175,
    longitude: 77.6489441,
    mcc: '5912',
    mccDescription: 'Drug Stores & Pharmacies',
    declaredTurnoverMonthly: 2000000,
    onboardedAt: '2021-12-11',
    riskProfile: 'SAFE',
    demoRiskScore: 1,
    riskFactors: [
      'Demo signal: 62% repeat patients and 95% in-state payers.',
      'Demo signal: low round-ticket ratio (10%) and daytime-heavy volume.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 2100000,
      transactionCount30d: 6176,
      avgTicketSize: 340,
      outOfStateRatio: 0.05,
      nightTimeRatio: 0.03,
      roundAmountRatio: 0.10,
      repeatPayerRatio: 0.62,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-PHAR-010',
    name: 'Sathya Medicals',
    osmId: 454142399,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 13.0183245,
    longitude: 77.6364269,
    mcc: '5912',
    mccDescription: 'Drug Stores & Pharmacies',
    declaredTurnoverMonthly: 700000,
    onboardedAt: '2025-06-07',
    riskProfile: 'MONITOR',
    demoRiskScore: 30,
    riskFactors: [
      'Demo signal: 28% night volume and 50% out-of-state payers, consistent with online medicine orders.',
      'Demo signal: 52% round tickets; prescription matching requested.',
      'Demo signal: ₹19.0L processed against ₹7.0L declared (2.7x).'
    ],
    metrics: {
      totalVolume30d: 1900000,
      transactionCount30d: 4222,
      avgTicketSize: 450,
      outOfStateRatio: 0.50,
      nightTimeRatio: 0.28,
      roundAmountRatio: 0.52,
      repeatPayerRatio: 0.16,
      matchHourSpikeRatio: 0.05
    }
  },

  // ------------------------------------------------------- Electronics shops
  {
    id: 'MERC-ELEC-011',
    name: 'Girias Electronics',
    osmId: 1685654244,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9417196,
    longitude: 77.5853932,
    mcc: '5732',
    mccDescription: 'Electronics Stores',
    declaredTurnoverMonthly: 4500000,
    onboardedAt: '2023-07-19',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 38% repeat buyers and 91% in-state payers.',
      'Demo signal: high-value but naturally distributed ticket sizes.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 4800000,
      transactionCount30d: 565,
      avgTicketSize: 8500,
      outOfStateRatio: 0.09,
      nightTimeRatio: 0.04,
      roundAmountRatio: 0.15,
      repeatPayerRatio: 0.38,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-ELEC-012',
    name: 'Samsung',
    osmId: 3370028970,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9784108,
    longitude: 77.6370964,
    mcc: '5732',
    mccDescription: 'Electronics Stores',
    declaredTurnoverMonthly: 6000000,
    onboardedAt: '2022-09-23',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 42% repeat buyers and 88% in-state payers.',
      'Demo signal: EMI and card transactions show natural ticket variance.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 6400000,
      transactionCount30d: 533,
      avgTicketSize: 12000,
      outOfStateRatio: 0.12,
      nightTimeRatio: 0.03,
      roundAmountRatio: 0.18,
      repeatPayerRatio: 0.42,
      matchHourSpikeRatio: 0.05
    }
  },

  // ---------------------------------------------------------- Clothing stores
  {
    id: 'MERC-CLTH-013',
    name: "Levi's",
    osmId: 677286837,
    address: 'Lavelle Road, Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9710106,
    longitude: 77.598276,
    mcc: '5651',
    mccDescription: 'Family Clothing Stores',
    declaredTurnoverMonthly: 3800000,
    onboardedAt: '2023-05-14',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 40% repeat buyers and 90% in-state payers.',
      'Demo signal: seasonal discount tickets show natural price distribution.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 4100000,
      transactionCount30d: 1281,
      avgTicketSize: 3200,
      outOfStateRatio: 0.10,
      nightTimeRatio: 0.04,
      roundAmountRatio: 0.14,
      repeatPayerRatio: 0.40,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-CLTH-014',
    name: 'Mysore Resham Emporium',
    osmId: 677286824,
    address: 'KH Road (Double Road), Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9554112,
    longitude: 77.5918509,
    mcc: '5651',
    mccDescription: 'Family Clothing Stores',
    declaredTurnoverMonthly: 900000,
    onboardedAt: '2025-01-12',
    riskProfile: 'MONITOR',
    demoRiskScore: 30,
    riskFactors: [
      'Demo signal: 26% night volume and 52% out-of-state payers, attributed to wholesale silk orders.',
      'Demo signal: 50% round tickets; GST invoice matching requested.',
      'Demo signal: ₹23.0L processed against ₹9.0L declared (2.6x).'
    ],
    metrics: {
      totalVolume30d: 2300000,
      transactionCount30d: 1278,
      avgTicketSize: 1800,
      outOfStateRatio: 0.52,
      nightTimeRatio: 0.26,
      roundAmountRatio: 0.50,
      repeatPayerRatio: 0.17,
      matchHourSpikeRatio: 0.05
    }
  },

  // ------------------------------------------------------------------ Hotels
  {
    id: 'MERC-HOTL-015',
    name: 'Hotel Maurya',
    osmId: 1006462322,
    address: '22/4, Race Course Road, Gandhi Nagar, Bangalore, 560009',
    city: 'Gandhi Nagar, Bangalore',
    state: 'Karnataka',
    latitude: 12.980921,
    longitude: 77.576491,
    phone: '+91-80-22254111',
    website: 'https://www.hotelmaurya.com/',
    mcc: '7011',
    mccDescription: 'Hotels & Lodging',
    declaredTurnoverMonthly: 3500000,
    onboardedAt: '2022-03-08',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 34% repeat corporate bookings and 88% in-state payers.',
      'Demo signal: room tariffs and F&B tickets show natural variance.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 3700000,
      transactionCount30d: 712,
      avgTicketSize: 5200,
      outOfStateRatio: 0.12,
      nightTimeRatio: 0.05,
      roundAmountRatio: 0.10,
      repeatPayerRatio: 0.34,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-HOTL-016',
    name: 'The Capitol',
    osmId: 663683086,
    address: 'Raj Bhavan Road, Bangalore, 560001',
    city: 'Bangalore',
    state: 'Karnataka',
    latitude: 12.9822391,
    longitude: 77.594459,
    mcc: '7011',
    mccDescription: 'Hotels & Lodging',
    declaredTurnoverMonthly: 2600000,
    onboardedAt: '2024-10-05',
    riskProfile: 'MONITOR',
    demoRiskScore: 34,
    riskFactors: [
      'Demo signal: 34% night volume and 58% out-of-state payers, partly explained by OTA bookings.',
      'Demo signal: 55% round tickets; OTA settlement reconciliation requested.',
      'Demo signal: ₹72.0L processed against ₹26.0L declared (2.8x).'
    ],
    metrics: {
      totalVolume30d: 7200000,
      transactionCount30d: 1500,
      avgTicketSize: 4800,
      outOfStateRatio: 0.58,
      nightTimeRatio: 0.34,
      roundAmountRatio: 0.55,
      repeatPayerRatio: 0.14,
      matchHourSpikeRatio: 0.05
    }
  },

  // ------------------------------------------------------- Convenience stores
  {
    id: 'MERC-CONV-017',
    name: 'HOPCOMS',
    osmId: 574254132,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 13.00559,
    longitude: 77.570496,
    mcc: '5499',
    mccDescription: 'Convenience Stores',
    declaredTurnoverMonthly: 800000,
    onboardedAt: '2023-11-22',
    riskProfile: 'SAFE',
    demoRiskScore: 2,
    riskFactors: [
      'Demo signal: 49% repeat households and 92% in-state payers.',
      'Demo signal: small basket sizes with natural price distribution.',
      'Demo signal: volume matches declared turnover.'
    ],
    metrics: {
      totalVolume30d: 850000,
      transactionCount30d: 3864,
      avgTicketSize: 220,
      outOfStateRatio: 0.08,
      nightTimeRatio: 0.06,
      roundAmountRatio: 0.16,
      repeatPayerRatio: 0.49,
      matchHourSpikeRatio: 0.05
    }
  },
  {
    id: 'MERC-CONV-018',
    name: 'Neelam Stores',
    osmId: 1851701331,
    address: 'Bengaluru, Karnataka',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9583088,
    longitude: 77.6022126,
    mcc: '5499',
    mccDescription: 'Convenience Stores',
    declaredTurnoverMonthly: 400000,
    onboardedAt: '2026-02-17',
    riskProfile: 'RESTRICT',
    demoRiskScore: 66,
    riskFactors: [
      'Demo signal: 60% of volume arrives after 11 PM for a neighbourhood convenience store.',
      'Demo signal: 78% out-of-state payers and 82% exact round tickets.',
      'Demo signal: ₹29.0L processed against ₹4.0L declared (7.25x).',
      'Demo signal: only 6% repeat payers; shared device fingerprint with two other demo merchants.'
    ],
    metrics: {
      totalVolume30d: 2900000,
      transactionCount30d: 3053,
      avgTicketSize: 950,
      outOfStateRatio: 0.78,
      nightTimeRatio: 0.60,
      roundAmountRatio: 0.82,
      repeatPayerRatio: 0.06,
      matchHourSpikeRatio: 0.05
    }
  }
];

export let merchants: Merchant[] = merchantSeeds.map((seed, index) => {
  const sequence = String(index + 1).padStart(4, '0');
  return {
    id: seed.id,
    name: seed.name,
    // Clearly synthetic placeholders — these are NOT real registrations.
    legalEntity: `${seed.name} (Synthetic Demo Entity)`,
    mcc: seed.mcc,
    mccDescription: seed.mccDescription,
    panNumber: `DEMO-PAN-${sequence}`,
    gstin: `DEMO-GSTIN-${sequence}`,
    onboardedAt: seed.onboardedAt,
    declaredTurnoverMonthly: seed.declaredTurnoverMonthly,
    city: seed.city,
    state: seed.state,
    physicalStoreVerified: true,
    status: statusByProfile[seed.riskProfile],
    currentTier: tierByProfile[seed.riskProfile],
    driftScore: seed.demoRiskScore,
    isBettingFront: seed.riskProfile === 'RESTRICT' || seed.riskProfile === 'QUARANTINE',
    riskFactors: seed.riskFactors,
    osmId: seed.osmId,
    osmType: 'node',
    osmRef: `node/${seed.osmId}`,
    address: seed.address,
    latitude: seed.latitude,
    longitude: seed.longitude,
    phone: seed.phone,
    website: seed.website,
    openingHours: seed.openingHours,
    dataSource: 'OpenStreetMap',
    riskProfile: seed.riskProfile,
    metrics: seed.metrics,
    interventions: { ...interventionsByProfile[seed.riskProfile] }
  };
});

const merchantName = (id: string): string =>
  merchants.find(m => m.id === id)?.name ?? id;

// Seeded demo transactions. Real merchants, synthetic payment activity.
export let initialTransactions: Transaction[] = [
  // Thom's Bakery — quarantine archetype (late-night match-window deposits)
  {
    id: 'TXN-OSM-BAKE-001-1',
    merchantId: 'MERC-BAKE-001',
    merchantName: merchantName('MERC-BAKE-001'),
    amount: 5000,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-88219 (New Delhi)',
    payerState: 'Delhi',
    payerCity: 'New Delhi',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 96,
    anomalyFlags: ['MATCH_OVER_BURST', 'OUT_OF_STATE_PAYER', 'ROUND_AMOUNT_STAKE', 'MULE_NETWORK_MATCH']
  },
  {
    id: 'TXN-OSM-BAKE-001-2',
    merchantId: 'MERC-BAKE-001',
    merchantName: merchantName('MERC-BAKE-001'),
    amount: 2500,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-34190 (Chandigarh)',
    payerState: 'Punjab',
    payerCity: 'Chandigarh',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 94,
    anomalyFlags: ['ROUND_AMOUNT_STAKE', 'OUT_OF_STATE_PAYER', 'MIDNIGHT_VELOCITY']
  },
  {
    id: 'TXN-OSM-BAKE-001-3',
    merchantId: 'MERC-BAKE-001',
    merchantName: merchantName('MERC-BAKE-001'),
    amount: 10000,
    currency: 'INR',
    paymentMethod: 'NET_BANKING',
    payerId: 'USR-77124 (Mumbai)',
    payerState: 'Maharashtra',
    payerCity: 'Mumbai',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 98,
    anomalyFlags: ['HIGH_DENOMINATION_STAKE', 'OUT_OF_STATE_PAYER', 'MATCH_WINDOW_PEAK']
  },

  // Nandhana — restrict archetype
  {
    id: 'TXN-OSM-REST-006-1',
    merchantId: 'MERC-REST-006',
    merchantName: merchantName('MERC-REST-006'),
    amount: 5000,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-55201 (Jaipur)',
    payerState: 'Rajasthan',
    payerCity: 'Jaipur',
    timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 88,
    anomalyFlags: ['ROUND_AMOUNT_STAKE', 'OUT_OF_STATE_PAYER', 'MATCH_WINDOW_PEAK']
  },
  {
    id: 'TXN-OSM-REST-006-2',
    merchantId: 'MERC-REST-006',
    merchantName: merchantName('MERC-REST-006'),
    amount: 10000,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-88219 (New Delhi)',
    payerState: 'Delhi',
    payerCity: 'New Delhi',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 91,
    anomalyFlags: ['CROSS_MERCHANT_SMURFING', 'HIGH_DENOMINATION_STAKE', 'OUT_OF_STATE_PAYER']
  },

  // Neelam Stores — restrict archetype
  {
    id: 'TXN-OSM-CONV-018-1',
    merchantId: 'MERC-CONV-018',
    merchantName: merchantName('MERC-CONV-018'),
    amount: 2000,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-40917 (Lucknow)',
    payerState: 'Uttar Pradesh',
    payerCity: 'Lucknow',
    timestamp: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 86,
    anomalyFlags: ['ROUND_AMOUNT_STAKE', 'OUT_OF_STATE_PAYER', 'MIDNIGHT_VELOCITY']
  },
  {
    id: 'TXN-OSM-CONV-018-2',
    merchantId: 'MERC-CONV-018',
    merchantName: merchantName('MERC-CONV-018'),
    amount: 5000,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-88219 (New Delhi)',
    payerState: 'Delhi',
    payerCity: 'New Delhi',
    timestamp: new Date(Date.now() - 1000 * 60 * 19).toISOString(),
    isRoundAmount: true,
    isNightTime: true,
    isMatchWindow: true,
    riskScore: 89,
    anomalyFlags: ['CROSS_MERCHANT_SMURFING', 'SHARED_DEVICE', 'ROUND_AMOUNT_STAKE']
  },

  // Old Madras Baking Company — safe archetype
  {
    id: 'TXN-OSM-BAKE-002-1',
    merchantId: 'MERC-BAKE-002',
    merchantName: merchantName('MERC-BAKE-002'),
    amount: 475,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-11029 (Bengaluru)',
    payerState: 'Karnataka',
    payerCity: 'Bengaluru',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    isRoundAmount: false,
    isNightTime: false,
    isMatchWindow: false,
    riskScore: 8,
    anomalyFlags: []
  },
  {
    id: 'TXN-OSM-BAKE-002-2',
    merchantId: 'MERC-BAKE-002',
    merchantName: merchantName('MERC-BAKE-002'),
    amount: 1250,
    currency: 'INR',
    paymentMethod: 'CREDIT_CARD',
    payerId: 'USR-11044 (Bengaluru)',
    payerState: 'Karnataka',
    payerCity: 'Bengaluru',
    timestamp: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
    isRoundAmount: false,
    isNightTime: false,
    isMatchWindow: false,
    riskScore: 12,
    anomalyFlags: []
  },

  // Koshy's — safe archetype
  {
    id: 'TXN-OSM-REST-004-1',
    merchantId: 'MERC-REST-004',
    merchantName: merchantName('MERC-REST-004'),
    amount: 640,
    currency: 'INR',
    paymentMethod: 'CREDIT_CARD',
    payerId: 'USR-22071 (Bengaluru)',
    payerState: 'Karnataka',
    payerCity: 'Bengaluru',
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    isRoundAmount: false,
    isNightTime: false,
    isMatchWindow: false,
    riskScore: 6,
    anomalyFlags: []
  },

  // Apollo Pharmacy — safe archetype
  {
    id: 'TXN-OSM-PHAR-009-1',
    merchantId: 'MERC-PHAR-009',
    merchantName: merchantName('MERC-PHAR-009'),
    amount: 342,
    currency: 'INR',
    paymentMethod: 'UPI',
    payerId: 'USR-66014 (Bengaluru)',
    payerState: 'Karnataka',
    payerCity: 'Bengaluru',
    timestamp: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    isRoundAmount: false,
    isNightTime: false,
    isMatchWindow: false,
    riskScore: 4,
    anomalyFlags: []
  }
];
