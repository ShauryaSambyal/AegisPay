import { Router, Request, Response } from 'express';
import { merchants } from '../data/merchantsData.js';
import { DriftEngine } from '../services/driftEngine.js';
import { GeminiService } from '../services/geminiService.js';

const router = Router();

// Trigger AI forensic investigation
router.post('/investigate/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant = merchants.find(m => m.id === req.params.id);
    if (!merchant) {
      res.status(404).json({ success: false, message: 'Merchant not found' });
      return;
    }

    const drift = DriftEngine.calculateDrift(merchant);
    const report = await GeminiService.investigateMerchant(merchant, drift);

    res.json({
      success: true,
      data: report
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI investigation report',
      error: err.message
    });
  }
});

export default router;
