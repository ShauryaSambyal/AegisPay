import { Router, Request, Response } from 'express';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';
import { findSimulatedMerchant } from '../data/simulatedMerchants.js';
import { DriftEngine } from '../services/driftEngine.js';
import { notFound, realMerchantHasNoRiskLayer } from '../lib/errors.js';
import { RiskAssessment } from '../types/index.js';

const router = Router();

/**
 * GET /api/risk/merchant/:id
 *
 * Simulated merchants only. A real OpenStreetMap id returns 409 because the
 * real merchant exists but is a display-only directory record with no risk
 * layer attached.
 */
router.get('/merchant/:id', (req: Request, res: Response) => {
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

  const drift = DriftEngine.calculateDrift(merchant);
  const reasons = Object.values(drift.components)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 4)
    .map(component => component.detail);

  const assessment: RiskAssessment = {
    dataOrigin: 'simulated',
    merchantId: merchant.id,
    score: drift.compositeScore,
    tier: drift.tier,
    reasons,
    components: {
      temporalAnomaly: drift.components.temporalAnomaly.score,
      geographicEntropy: drift.components.geographicEntropy.score,
      amountDistribution: drift.components.amountDistribution.score,
      payerEntropy: drift.components.payerEntropy.score,
      baselineDeviation: drift.components.baselineDeviation.score,
    },
    computedAt: new Date().toISOString(),
    coldStart: merchant.baseline.source !== 'onboarding_90d',
  };

  res.json({ success: true, data: assessment, breakdown: drift });
});

export default router;
