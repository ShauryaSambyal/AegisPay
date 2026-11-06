import { Router, Request, Response } from 'express';
import { requireAuth, requirePlatformAdmin } from '../middleware/auth.js';
import { Provider, ProviderStatus } from '../models/Provider.js';
import { Merchant } from '../models/Merchant.js';
import { Dataset } from '../models/Dataset.js';
import { Transaction } from '../models/Transaction.js';
import { AuditLog } from '../models/AuditLog.js';
import { logAudit } from '../services/auditService.js';
import { sendError } from '../lib/errors.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

const router = Router();

// Apply auth and platform admin checks to all admin routes
router.use(requireAuth, requirePlatformAdmin);

/**
 * GET /api/admin/providers
 * List provider applications with filtering and pagination.
 */
router.get('/providers', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { status, page = '1', limit = '20', search } = req.query;
    const query: Record<string, unknown> = {};

    if (status) {
      query.status = String(status);
    }
    if (search) {
      query.$or = [
        { organisationName: { $regex: String(search), $options: 'i' } },
        { registeredBusinessName: { $regex: String(search), $options: 'i' } },
        { officialEmail: { $regex: String(search), $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [providers, total] = await Promise.all([
      Provider.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Provider.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      count: providers.length,
      data: providers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'ADMIN_FETCH_FAILED', `Failed to list providers: ${msg}`);
  }
});

/**
 * PATCH /api/admin/providers/:providerId/status
 * Approve, reject, suspend, or request information from a provider.
 */
router.patch('/providers/:providerId/status', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { providerId } = req.params;
    const { status, rejectionReason, reviewNotes } = req.body;

    if (!Types.ObjectId.isValid(providerId)) {
      sendError(res, 400, 'INVALID_PROVIDER_ID', 'Invalid provider ID format');
      return;
    }

    const validStatuses: ProviderStatus[] = [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
      'REQUIRES_MORE_INFORMATION',
    ];

    if (!status || !validStatuses.includes(status)) {
      sendError(
        res,
        400,
        'INVALID_STATUS',
        `Status must be one of: ${validStatuses.join(', ')}`
      );
      return;
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      sendError(res, 404, 'PROVIDER_NOT_FOUND', 'Provider organization not found');
      return;
    }

    const oldStatus = provider.status;
    provider.status = status;
    provider.reviewedBy = req.user!.uid;
    provider.reviewedAt = new Date();

    if (rejectionReason !== undefined) {
      provider.rejectionReason = rejectionReason;
    }
    if (reviewNotes !== undefined) {
      provider.reviewNotes = reviewNotes;
    }

    await provider.save();

    await logAudit({
      providerId: provider._id as Types.ObjectId,
      userId: req.user!.uid,
      action: `PROVIDER_STATUS_${status}`,
      resourceType: 'provider',
      resourceId: String(provider._id),
      ipAddress: req.ip,
      metadata: {
        oldStatus,
        newStatus: status,
        rejectionReason,
        reviewNotes,
      },
    });

    res.json({
      success: true,
      message: `Provider status updated from '${oldStatus}' to '${status}'`,
      data: provider,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'STATUS_UPDATE_FAILED', `Failed to update provider status: ${msg}`);
  }
});

/**
 * GET /api/admin/dashboard
 * Return platform-level statistics across all providers.
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const [
      pendingCount,
      approvedCount,
      suspendedCount,
      rejectedCount,
      totalMerchants,
      totalDatasets,
      totalTransactions,
      recentAudits,
    ] = await Promise.all([
      Provider.countDocuments({ status: 'PENDING_APPROVAL' }),
      Provider.countDocuments({ status: 'APPROVED' }),
      Provider.countDocuments({ status: 'SUSPENDED' }),
      Provider.countDocuments({ status: 'REJECTED' }),
      Merchant.countDocuments(),
      Dataset.countDocuments(),
      Transaction.countDocuments(),
      AuditLog.find().sort({ timestamp: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        providers: {
          pending: pendingCount,
          approved: approvedCount,
          suspended: suspendedCount,
          rejected: rejectedCount,
          total: pendingCount + approvedCount + suspendedCount + rejectedCount,
        },
        platformMetrics: {
          totalMerchants,
          totalDatasets,
          totalTransactions,
        },
        recentAudits,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'DASHBOARD_FETCH_FAILED', `Failed to fetch admin dashboard: ${msg}`);
  }
});

export default router;
