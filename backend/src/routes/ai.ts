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

  if (isRealMerchantId(id) || findRealMerchant(id)) {
    realMerchantHasNoRiskLayer(res, id);
    return;
  }

  const merchant = findSimulatedMerchant(id);
  if (!merchant) {
    notFound(res, 'Simulated merchant', id);
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
