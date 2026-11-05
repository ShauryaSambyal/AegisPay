import { Router, Request, Response } from 'express';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';
import { findSimulatedMerchant } from '../data/simulatedMerchants.js';
import { DriftEngine } from '../services/driftEngine.js';
import { GeminiService } from '../services/geminiService.js';
import { notFound, realMerchantHasNoRiskLayer, sendError } from '../lib/errors.js';

const router = Router();

/** POST /api/ai/investigate/:id — simulated merchants only. */
router.post('/investigate/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const real = findRealMerchant(id);
  let merchant = findSimulatedMerchant(id);

  if (!merchant && real) {
    merchant = {
      id: real.id as any,
      dataOrigin: 'simulated',
      displayName: real.name,
      category: real.category,
      categoryLabel: real.categoryLabel,
      mcc: '5411',
      mccDescription: real.categoryLabel,
      city: 'Bengaluru',
      state: 'Karnataka',
      declaredTurnoverMonthly: 500000,
      onboardedAt: '2025-01-15',
      status: 'ACTIVE',
      riskScore: 12,
      riskTier: 'TIER_0_SAFE',
      driftScore: 12,
      isBettingFront: false,
      network: null,
      baseline: {
        avgTicket: 350,
        nightShare: 0.04,
        roundShare: 0.05,
        repeatPayerShare: 0.45,
        sampledDays: 90,
        source: 'category_fallback',
      },
      metrics: {
        totalVolume30d: 512000,
        transactionCount30d: 1460,
        avgTicketSize: 350,
        outOfStateRatio: 0.06,
        nightTimeRatio: 0.04,
        roundAmountRatio: 0.05,
        repeatPayerRatio: 0.45,
        matchHourSpikeRatio: 0.03,
      },
      riskFactors: ['Normal retail commercial distribution matching category baseline.'],
      interventions: {
        rollingReservePercent: 0,
        maxTransactionLimit: 50000,
        smartGeoFenceActive: false,
        videoPosRequested: false,
        strFiled: false,
      },
    };
  }

  if (!merchant) {
    notFound(res, 'Merchant', id);
    return;
  }

  try {
    const drift = DriftEngine.calculateDrift(merchant);
    const report = await GeminiService.investigateMerchant(merchant, drift);
    res.json({ success: true, dataOrigin: 'simulated', data: report });
  } catch (error) {
    sendError(
      res,
      500,
      'INVESTIGATION_FAILED',
      'Failed to generate the simulated investigation report',
      error instanceof Error ? error.message : String(error)
    );
  }
});

export default router;
