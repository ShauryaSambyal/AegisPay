import { Router, Request, Response } from 'express';
import { merchants } from '../data/merchantsData.js';
import { DriftEngine } from '../services/driftEngine.js';
import { RiskTier } from '../types/index.js';

const router = Router();

// GET all merchants
router.get('/', (_req: Request, res: Response) => {
  const result = merchants.map(m => {
    const drift = DriftEngine.calculateDrift(m);
    return {
      ...m,
      driftScore: drift.compositeScore,
      calculatedTier: drift.tier
    };
  });
  res.json({ success: true, data: result });
});

// GET merchant by ID
router.get('/:id', (req: Request, res: Response): void => {
  const merchant = merchants.find(m => m.id === req.params.id);
  if (!merchant) {
    res.status(404).json({ success: false, message: 'Merchant not found' });
    return;
  }
  const drift = DriftEngine.calculateDrift(merchant);
  res.json({
    success: true,
    data: {
      ...merchant,
      driftAnalysis: drift
    }
  });
});

// GET drift breakdown
router.get('/:id/drift', (req: Request, res: Response): void => {
  const merchant = merchants.find(m => m.id === req.params.id);
  if (!merchant) {
    res.status(404).json({ success: false, message: 'Merchant not found' });
    return;
  }
  const drift = DriftEngine.calculateDrift(merchant);
  res.json({ success: true, data: drift });
});

// POST update merchant tier / intervention
router.post('/:id/tier', (req: Request, res: Response): void => {
  const merchant = merchants.find(m => m.id === req.params.id);
  if (!merchant) {
    res.status(404).json({ success: false, message: 'Merchant not found' });
    return;
  }

  const { tier, rollingReservePercent, smartGeoFenceActive, videoPosRequested, strFiled } = req.body;
  if (tier) merchant.currentTier = tier as RiskTier;
  if (typeof rollingReservePercent === 'number') merchant.interventions.rollingReservePercent = rollingReservePercent;
  if (typeof smartGeoFenceActive === 'boolean') merchant.interventions.smartGeoFenceActive = smartGeoFenceActive;
  if (typeof videoPosRequested === 'boolean') merchant.interventions.videoPosRequested = videoPosRequested;
  if (typeof strFiled === 'boolean') merchant.interventions.strFiled = strFiled;

  res.json({
    success: true,
    message: `Intervention tier updated for ${merchant.name}`,
    data: merchant
  });
});

export default router;
