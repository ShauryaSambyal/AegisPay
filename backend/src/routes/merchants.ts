import { Router, Request, Response } from 'express';
import { findRealMerchant, isRealMerchantId, realMerchants, realMerchantsMeta } from '../data/merchantsData.js';
import { findSimulatedMerchant, simulatedMerchants, simulatedMerchantsMeta } from '../data/simulatedMerchants.js';
import { DriftEngine } from '../services/driftEngine.js';
import { RiskTier } from '../types/index.js';
import { notFound, realMerchantHasNoRiskLayer, sendError } from '../lib/errors.js';
import {
  optionalAuth,
  requireAuth,
  requireProvider,
  requireProviderApproval,
  requireRole,
} from '../middleware/auth.js';
import { Merchant as ProviderMerchant } from '../models/Merchant.js';
import { logAudit } from '../services/auditService.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

const router = Router();

type OriginFilter = 'real_osm' | 'simulated' | 'provider' | 'all';

const parseOrigin = (value: unknown): OriginFilter => {
  const origin = String(value ?? 'all');
  if (
    origin === 'real_osm' ||
    origin === 'simulated' ||
    origin === 'provider' ||
    origin === 'all'
  )
    return origin;
  return 'all';
};

const withLiveDrift = () =>
  simulatedMerchants.map((merchant) => {
    const drift = DriftEngine.calculateDrift(merchant);
    return {
      ...merchant,
      riskScore: drift.compositeScore,
      riskTier: drift.tier,
      driftScore: drift.compositeScore,
    };
  });

/**
 * POST /api/merchants
 * Add a new merchant belonging strictly to the authenticated provider.
 */
router.post(
  '/',
  requireAuth,
  requireProvider,
  requireProviderApproval,
  requireRole('owner', 'analyst', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const {
        merchantName,
        merchantCategory,
        merchantIdentifier,
        businessAddress,
        city,
        state,
        country,
        declaredBusinessActivity,
      } = req.body;

      if (!merchantName || !merchantCategory || !merchantIdentifier) {
        sendError(
          res,
          400,
          'MISSING_REQUIRED_FIELDS',
          'merchantName, merchantCategory, and merchantIdentifier are required'
        );
        return;
      }

      // Check for duplicate identifier within this provider
      const existing = await ProviderMerchant.findOne({
        providerId: req.provider!._id,
        merchantIdentifier: merchantIdentifier.trim(),
      });

      if (existing) {
        sendError(
          res,
          409,
          'MERCHANT_EXISTS',
          `Merchant identifier '${merchantIdentifier}' is already registered for your organization.`
        );
        return;
      }

      const merchant = await ProviderMerchant.create({
        providerId: req.provider!._id,
        merchantName: merchantName.trim(),
        merchantCategory: merchantCategory.trim(),
        merchantIdentifier: merchantIdentifier.trim(),
        businessAddress: businessAddress?.trim() || '',
        city: city?.trim() || '',
        state: state?.trim() || '',
        country: country?.trim() || 'India',
        declaredBusinessActivity: declaredBusinessActivity?.trim() || '',
        status: 'ACTIVE',
      });

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MERCHANT_CREATED',
        resourceType: 'merchant',
        resourceId: String(merchant._id),
        ipAddress: req.ip,
        metadata: { merchantName, merchantIdentifier },
      });

      res.status(201).json({
        success: true,
        message: 'Merchant created successfully',
        data: merchant,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'MERCHANT_CREATE_FAILED', `Failed to create merchant: ${msg}`);
    }
  }
);

/**
 * GET /api/merchants?origin=real_osm|simulated|provider|all
 *
 * If origin=provider or provider is authenticated, returns provider-scoped merchants.
 * Otherwise returns existing real OSM & simulated demo merchants (100% backward compatible).
 */
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const origin = parseOrigin(req.query.origin);

  // Path 1: Provider-scoped merchants
  if (origin === 'provider' || (req.provider && req.query.origin === 'provider')) {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const { page = '1', limit = '50', search, status, category } = req.query;
      const query: Record<string, unknown> = {
        providerId: req.provider!._id,
      };

      if (status) query.status = String(status);
      if (category) query.merchantCategory = String(category);
      if (search) {
        query.$or = [
          { merchantName: { $regex: String(search), $options: 'i' } },
          { merchantIdentifier: { $regex: String(search), $options: 'i' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [merchants, total] = await Promise.all([
        ProviderMerchant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        ProviderMerchant.countDocuments(query),
      ]);

      res.json({
        success: true,
        origin: 'provider',
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        count: merchants.length,
        data: merchants,
      });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'MERCHANTS_FETCH_FAILED', `Failed to fetch merchants: ${msg}`);
      return;
    }
  }

  // Path 2: Existing Real & Simulated merchants (backward-compatible)
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

/**
 * GET /api/merchants/:id
 * Supports provider-owned MongoDB merchants, real OSM records, and simulated demo records.
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Case 1: MongoDB ObjectId - check provider ownership
  if (Types.ObjectId.isValid(id) && isDatabaseConnected()) {
    if (!req.provider) {
      sendError(res, 401, 'UNAUTHORIZED', 'Provider authentication required to access provider merchants');
      return;
    }

    const merchant = await ProviderMerchant.findOne({
      _id: new Types.ObjectId(id),
      providerId: req.provider._id,
    });

    if (!merchant) {
      sendError(res, 404, 'NOT_FOUND', `Merchant '${id}' was not found or belongs to another provider`);
      return;
    }

    res.json({
      success: true,
      dataOrigin: 'provider',
      data: merchant,
    });
    return;
  }

  // Case 2: Real OSM record
  const real = findRealMerchant(id);
  if (real) {
    res.json({
      success: true,
      dataOrigin: 'real_osm',
      data: {
        ...real,
        riskScore: 12,
        riskTier: 'TIER_0_SAFE',
        driftScore: 12,
      },
    });
    return;
  }

  // Case 3: Simulated demo merchant
  const simulated = findSimulatedMerchant(id);
  if (!simulated) {
    notFound(res, 'Merchant', id);
    return;
  }

  const drift = DriftEngine.calculateDrift(simulated);
  res.json({
    success: true,
    dataOrigin: 'simulated',
    data: {
      ...simulated,
      riskScore: drift.compositeScore,
      riskTier: drift.tier,
      driftAnalysis: drift,
    },
  });
});

/**
 * PATCH /api/merchants/:id
 * Update merchant details with strict provider ownership check.
 */
router.patch(
  '/:id',
  requireAuth,
  requireProvider,
  requireRole('owner', 'analyst', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id) || !isDatabaseConnected()) {
      sendError(res, 400, 'INVALID_MERCHANT_ID', 'Invalid merchant ID format');
      return;
    }

    try {
      const merchant = await ProviderMerchant.findOne({
        _id: new Types.ObjectId(id),
        providerId: req.provider!._id,
      });

      if (!merchant) {
        sendError(res, 404, 'NOT_FOUND', `Merchant '${id}' not found or access denied`);
        return;
      }

      const allowedFields = [
        'merchantName',
        'merchantCategory',
        'businessAddress',
        'city',
        'state',
        'declaredBusinessActivity',
        'status',
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          (merchant as any)[field] = req.body[field];
        }
      }

      await merchant.save();

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MERCHANT_UPDATED',
        resourceType: 'merchant',
        resourceId: id,
        ipAddress: req.ip,
        metadata: { updatedFields: Object.keys(req.body) },
      });

      res.json({
        success: true,
        message: 'Merchant updated successfully',
        data: merchant,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'UPDATE_FAILED', `Failed to update merchant: ${msg}`);
    }
  }
);

/**
 * DELETE /api/merchants/:id
 * Soft-delete / deactivate a merchant. Enforces provider ownership.
 */
router.delete(
  '/:id',
  requireAuth,
  requireProvider,
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id) || !isDatabaseConnected()) {
      sendError(res, 400, 'INVALID_MERCHANT_ID', 'Invalid merchant ID format');
      return;
    }

    try {
      const merchant = await ProviderMerchant.findOne({
        _id: new Types.ObjectId(id),
        providerId: req.provider!._id,
      });

      if (!merchant) {
        sendError(res, 404, 'NOT_FOUND', `Merchant '${id}' not found or access denied`);
        return;
      }

      merchant.status = 'SUSPENDED';
      await merchant.save();

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'MERCHANT_DEACTIVATED',
        resourceType: 'merchant',
        resourceId: id,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `Merchant '${merchant.merchantName}' deactivated successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'DEACTIVATE_FAILED', `Failed to deactivate merchant: ${msg}`);
    }
  }
);

/**
 * POST /api/merchants/:id/tier — simulated interventions only (backward compatibility).
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

  const { tier, rollingReservePercent, smartGeoFenceActive, videoPosRequested, strFiled } =
    req.body ?? {};
  const allowedTiers: RiskTier[] = [
    'TIER_0_SAFE',
    'TIER_1_MONITOR',
    'TIER_2_RESTRICT',
    'TIER_3_QUARANTINE',
  ];
  if (tier !== undefined && !allowedTiers.includes(tier)) {
    sendError(res, 400, 'INVALID_TIER', `tier must be one of ${allowedTiers.join(', ')}`, { tier });
    return;
  }

  if (tier) {
    merchant.riskTier = tier as RiskTier;
  }
  if (typeof rollingReservePercent === 'number')
    merchant.interventions.rollingReservePercent = rollingReservePercent;
  if (typeof smartGeoFenceActive === 'boolean')
    merchant.interventions.smartGeoFenceActive = smartGeoFenceActive;
  if (typeof videoPosRequested === 'boolean')
    merchant.interventions.videoPosRequested = videoPosRequested;
  if (typeof strFiled === 'boolean') merchant.interventions.strFiled = strFiled;

  res.json({
    success: true,
    dataOrigin: 'simulated',
    message: `Simulated intervention updated for ${merchant.displayName}`,
    data: merchant,
  });
});

export default router;
