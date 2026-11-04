import { Router, Request, Response } from 'express';
import { SimulatorService } from '../services/simulatorService.js';

const router = Router();

// GET transactions
router.get('/', (req: Request, res: Response) => {
  const { merchantId, minRisk } = req.query;
  let txns = SimulatorService.getAllTransactions();

  if (merchantId) {
    txns = txns.filter(t => t.merchantId === merchantId);
  }
  if (minRisk) {
    const risk = Number(minRisk);
    txns = txns.filter(t => t.riskScore >= risk);
  }

  res.json({ success: true, count: txns.length, data: txns });
});

// GET aggregate stats
router.get('/stats', (_req: Request, res: Response) => {
  const stats = SimulatorService.getStats();
  res.json({ success: true, data: stats });
});

export default router;
