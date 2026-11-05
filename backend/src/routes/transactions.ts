import { Router, Request, Response } from 'express';
import { SimulatorService } from '../services/simulatorService.js';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';
import { notFound, realMerchantHasNoRiskLayer } from '../lib/errors.js';

const router = Router();

/**
 * GET /api/transactions?merchantId=SIM-0001&minRisk=70
 * Transactions exist only for simulated merchants.
 */
router.get('/', (req: Request, res: Response) => {
  const { merchantId, minRisk } = req.query;
  let transactions = SimulatorService.getAllTransactions();

  if (merchantId) {
    const id = String(merchantId);
    if (isRealMerchantId(id) || findRealMerchant(id)) {
      realMerchantHasNoRiskLayer(res, id);
      return;
    }
    transactions = transactions.filter(transaction => transaction.merchantId === id);
  }
  if (minRisk) {
    const risk = Number(minRisk);
    if (Number.isNaN(risk)) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'minRisk must be numeric' } });
      return;
    }
    transactions = transactions.filter(transaction => transaction.riskScore >= risk);
  }

  res.json({ success: true, dataOrigin: 'simulated', count: transactions.length, data: transactions });
});

/** GET /api/transactions/stats — simulated stream statistics only. */
router.get('/stats', (_req: Request, res: Response) => {
  res.json({ success: true, dataOrigin: 'simulated', data: SimulatorService.getStats() });
});

export default router;

export { notFound };
