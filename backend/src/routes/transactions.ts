import { Router, Request, Response } from 'express';
import { SimulatorService } from '../services/simulatorService.js';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';
import { notFound, realMerchantHasNoRiskLayer, sendError } from '../lib/errors.js';
import { optionalAuth, requireAuth, requireProvider } from '../middleware/auth.js';
import { Transaction as ProviderTransaction } from '../models/Transaction.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

const router = Router();

/**
 * GET /api/transactions
 * Returns provider-scoped transactions if authenticated as a provider,
 * or simulated transactions feed if unauthenticated (backward compatible).
 */
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const {
    merchantId,
    datasetId,
    status,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    page = '1',
    limit = '50',
    origin,
  } = req.query;

  // Path 1: Provider-scoped database transactions
  if (req.provider && (origin === 'provider' || !origin)) {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const query: Record<string, unknown> = {
        providerId: req.provider._id,
      };

      if (merchantId) {
        if (Types.ObjectId.isValid(String(merchantId))) {
          query.merchantId = new Types.ObjectId(String(merchantId));
        } else {
          query.merchantIdentifier = String(merchantId);
        }
      }

      if (datasetId && Types.ObjectId.isValid(String(datasetId))) {
        query.datasetId = new Types.ObjectId(String(datasetId));
      }

      if (status) {
        query.transactionStatus = String(status);
      }

      if (startDate || endDate) {
        const dateQuery: Record<string, Date> = {};
        if (startDate) dateQuery.$gte = new Date(String(startDate));
        if (endDate) dateQuery.$lte = new Date(String(endDate));
        query.transactionTimestamp = dateQuery;
      }

      if (minAmount || maxAmount) {
        const amtQuery: Record<string, number> = {};
        if (minAmount) amtQuery.$gte = Number(minAmount);
        if (maxAmount) amtQuery.$lte = Number(maxAmount);
        query.amount = amtQuery;
      }

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total] = await Promise.all([
        ProviderTransaction.find(query)
          .sort({ transactionTimestamp: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ProviderTransaction.countDocuments(query),
      ]);

      res.json({
        success: true,
        origin: 'provider',
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        count: transactions.length,
        data: transactions,
      });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'TRANSACTIONS_FETCH_FAILED', `Failed to query transactions: ${msg}`);
      return;
    }
  }

  // Path 2: Simulated transactions (backward compatible)
  const { minRisk } = req.query;
  let transactions = SimulatorService.getAllTransactions();

  if (merchantId) {
    const id = String(merchantId);
    if (isRealMerchantId(id) || findRealMerchant(id)) {
      realMerchantHasNoRiskLayer(res, id);
      return;
    }
    transactions = transactions.filter((transaction) => transaction.merchantId === id);
  }

  if (minRisk) {
    const risk = Number(minRisk);
    if (Number.isNaN(risk)) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'minRisk must be numeric' } });
      return;
    }
    transactions = transactions.filter((transaction) => transaction.riskScore >= risk);
  }

  res.json({ success: true, dataOrigin: 'simulated', count: transactions.length, data: transactions });
});

/**
 * GET /api/transactions/stats
 * Simulated stream statistics (backward compatible).
 */
router.get('/stats', (_req: Request, res: Response) => {
  res.json({ success: true, dataOrigin: 'simulated', data: SimulatorService.getStats() });
});

/**
 * GET /api/transactions/:transactionId
 * Return an individual transaction with strict provider ownership verification.
 */
router.get(
  '/:transactionId',
  requireAuth,
  requireProvider,
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const { transactionId } = req.params;
      if (!Types.ObjectId.isValid(transactionId)) {
        sendError(res, 400, 'INVALID_TRANSACTION_ID', 'Invalid transaction ID format');
        return;
      }

      const txn = await ProviderTransaction.findOne({
        _id: new Types.ObjectId(transactionId),
        providerId: req.provider!._id,
      }).lean();

      if (!txn) {
        sendError(
          res,
          404,
          'NOT_FOUND',
          `Transaction '${transactionId}' was not found or access denied for your provider`
        );
        return;
      }

      res.json({
        success: true,
        data: txn,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'FETCH_TRANSACTION_FAILED', `Failed to retrieve transaction: ${msg}`);
    }
  }
);

export default router;

export { notFound };
