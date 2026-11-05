import { Router, Request, Response } from 'express';
import { findRealMerchant, isRealMerchantId, realMerchants, realMerchantsMeta } from '../data/merchantsData.js';
import { findSimulatedMerchant, simulatedMerchants, simulatedMerchantsMeta } from '../data/simulatedMerchants.js';
import { DriftEngine } from '../services/driftEngine.js';
import { RiskTier } from '../types/index.js';
import { notFound, realMerchantHasNoRiskLayer, sendError } from '../lib/errors.js';

const router = Router();

type OriginFilter = 'real_osm' | 'simulated' | 'all';

const parseOrigin = (value: unknown): OriginFilter => {
  const origin = String(value ?? 'all');
  if (origin === 'real_osm' || origin === 'simulated' || origin === 'all') return origin;
  return 'all';
};

const withLiveDrift = () =>
  simulatedMerchants.map(merchant => {
    const drift = DriftEngine.calculateDrift(merchant);
    return {
      ...merchant,
      riskScore: drift.compositeScore,
      riskTier: drift.tier,
      driftScore: drift.compositeScore,
    };
  });

/**
 * GET /api/merchants?origin=real_osm|simulated|all
 *
 * `real_osm` items are OpenStreetMap identities with no risk fields whatsoever.
 * `simulated` items are anonymized SIM-* records that carry risk.
 */
router.get('/', (req: Request, res: Response) => {
  const origin = parseOrigin(req.query.origin);
  const real = origin === 'all' || origin === 'real_osm' ? realMerchants : [];
  const simulated = origin === 'all' || origin === 'simulated' ? withLiveDrift() : [];

  res.json({
    success: true,
    origin,
    realCount: real.length,
    simulatedCount: simulated.length,
    meta: {
      real: realMerchantsMeta,
      simulated: simulatedMerchantsMeta,
    },
    data: [...real, ...simulated],
  });
});

/** GET /api/merchants/:id — real records never include risk fields. */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const real = findRealMerchant(id);
  if (real) {
    res.json({ success: true, dataOrigin: 'real_osm', data: real });
    return;
  }

  const simulated = findSimulatedMerchant(id);
  if (!simulated) {
    notFound(res, 'Merchant', id);
    return;
  }

  const drift = DriftEngine.calculateDrift(simulated);
  res.json({
    success: true,
    dataOrigin: 'simulated',
    data: { ...simulated, riskScore: drift.compositeScore, riskTier: drift.tier, driftAnalysis: drift },
  });
});

/**
 * POST /api/merchants/:id/tier — simulated interventions only.
 * Real OSM ids return 409 because they carry no intervention state.
 */
router.post('/:id/tier', (req: Request, res: Response) => {
  const { id } = req.params;
  if (isRealMerchantId(id) || findRealMerchant(id)) {
    realMerchantHasNoRiskLayer(res, id);
    return;
  }

  const merchant = findSimulatedMerchant(id);
  if (!merchant) {
    notFound(res, 'Simulated merchant', id);
    return;
  }

  const { tier, rollingReservePercent, smartGeoFenceActive, videoPosRequested, strFiled } = req.body ?? {};
  const allowedTiers: RiskTier[] = ['TIER_0_SAFE', 'TIER_1_MONITOR', 'TIER_2_RESTRICT', 'TIER_3_QUARANTINE'];
  if (tier !== undefined && !allowedTiers.includes(tier)) {
    sendError(res, 400, 'INVALID_TIER', `tier must be one of ${allowedTiers.join(', ')}`, { tier });
    return;
  }

  if (tier) {
    merchant.riskTier = tier as RiskTier;
  }
  if (typeof rollingReservePercent === 'number') merchant.interventions.rollingReservePercent = rollingReservePercent;
  if (typeof smartGeoFenceActive === 'boolean') merchant.interventions.smartGeoFenceActive = smartGeoFenceActive;
  if (typeof videoPosRequested === 'boolean') merchant.interventions.videoPosRequested = videoPosRequested;
  if (typeof strFiled === 'boolean') merchant.interventions.strFiled = strFiled;

  res.json({
    success: true,
    dataOrigin: 'simulated',
    message: `Simulated intervention updated for ${merchant.displayName}`,
    data: merchant,
  });
});

export default router;
