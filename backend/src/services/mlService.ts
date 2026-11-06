import { RiskAssessment, IRiskAssessment, RiskLevel } from '../models/RiskAssessment.js';
import { Merchant } from '../models/Merchant.js';
import { Transaction } from '../models/Transaction.js';
import { Types } from 'mongoose';

const ML_SERVICE_URL = (): string => process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
const ML_API_KEY = (): string | undefined => process.env.ML_SERVICE_API_KEY;
const ML_TIMEOUT_MS = 8000;

export interface AnalyzeMerchantInput {
  providerId: string;
  merchantId: string;
  datasetId?: string;
  userId: string;
}

export interface MlAssessmentResult {
  riskScore: number;
  riskLevel: RiskLevel;
  modelVersion: string;
  confidence: number;
  riskFactors: string[];
  explanation: Record<string, unknown>;
  disclaimer: string;
}

/**
 * Maps numeric risk scores (0-100) to standardized risk tiers.
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 0) return 'LOW';
  return 'INSUFFICIENT_DATA';
}

/**
 * Calls the Python ML service to perform forensic behavioural analysis on a merchant's transactions.
 * Enforces strict provider scoping and persists valid RiskAssessment records to MongoDB.
 */
export async function analyzeMerchant(input: AnalyzeMerchantInput): Promise<IRiskAssessment> {
  const pObjectId = new Types.ObjectId(input.providerId);
  const mObjectId = new Types.ObjectId(input.merchantId);

  // 1. Verify merchant belongs to authenticated provider
  const merchant = await Merchant.findOne({ _id: mObjectId, providerId: pObjectId });
  if (!merchant) {
    throw new Error('Merchant not found or access denied for this provider');
  }

  // 2. Aggregate transactions for this merchant under this provider
  const txns = await Transaction.find({
    providerId: pObjectId,
    merchantId: mObjectId,
  })
    .sort({ transactionTimestamp: -1 })
    .limit(500)
    .lean();

  if (txns.length === 0) {
    // Insufficient data handling without fabricating false scores
    const assessment = await RiskAssessment.create({
      providerId: pObjectId,
      merchantId: mObjectId,
      riskScore: 0,
      riskLevel: 'INSUFFICIENT_DATA',
      modelVersion: '1.0.0',
      analysisStatus: 'COMPLETED',
      confidence: 0,
      riskFactors: ['No transaction records uploaded for this merchant yet.'],
      explanation: {
        transactionCount: 0,
        notice: 'Upload a transaction dataset to enable forensic analysis.',
      },
    });
    return assessment;
  }

  // 3. Compute baseline statistics for ML payload
  const totalVolume = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
  const avgAmount = totalVolume / txns.length;
  const roundAmounts = txns.filter((t) => (t.amount || 0) % 100 === 0).length;
  const roundRatio = roundAmounts / txns.length;

  const payload = {
    merchantId: merchant.merchantIdentifier,
    category: merchant.merchantCategory,
    transactionCount: txns.length,
    totalVolume,
    avgTicketSize: avgAmount,
    roundAmountRatio: roundRatio,
    declaredBusinessActivity: merchant.declaredBusinessActivity || '',
  };

  // 4. Send request to Python ML Service with timeout and auth headers
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

  let mlResponseData: any = null;
  let serviceAvailable = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = ML_API_KEY();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(`${ML_SERVICE_URL()}/score/merchant`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.ok) {
      mlResponseData = await response.json();
      serviceAvailable = true;
    }
  } catch (err: unknown) {
    // ML service unreachable or timed out
    serviceAvailable = false;
  } finally {
    clearTimeout(timer);
  }

  // 5. Build standardized assessment without fabricating illegal activity claims
  let score = 15;
  let factors: string[] = [];
  let explanation: Record<string, unknown> = {};

  if (serviceAvailable && mlResponseData) {
    score = Number(mlResponseData.score ?? mlResponseData.riskScore ?? 15);
    factors = Array.isArray(mlResponseData.reasons) ? mlResponseData.reasons : [];
    explanation = {
      mlSource: 'FastAPI ML Engine',
      components: mlResponseData.components || {},
      features: mlResponseData.features || {},
    };
  } else {
    // Transparent statistical heuristics fallback
    factors.push(`Heuristic evaluation: ${txns.length} transactions analysed across provider records.`);
    if (roundRatio > 0.6) {
      score += 25;
      factors.push(`Elevated proportion of round amounts (${(roundRatio * 100).toFixed(1)}%).`);
    }
    if (avgAmount > 15000 && merchant.merchantCategory === 'bakery') {
      score += 35;
      factors.push('Average ticket size is significantly higher than typical category baseline.');
    }
    explanation = {
      mlSource: 'Heuristic Drift Assessment (Python ML service offline)',
      metrics: {
        totalVolume,
        transactionCount: txns.length,
        avgTicketSize: Math.round(avgAmount),
        roundAmountRatio: roundRatio,
      },
    };
  }

  score = Math.min(Math.max(Math.round(score), 0), 100);
  const riskLevel = scoreToRiskLevel(score);

  // 6. Save RiskAssessment to MongoDB scoped to this provider
  const assessment = await RiskAssessment.create({
    providerId: pObjectId,
    merchantId: mObjectId,
    datasetId: input.datasetId ? new Types.ObjectId(input.datasetId) : undefined,
    riskScore: score,
    riskLevel,
    modelVersion: '1.0.0',
    analysisStatus: 'COMPLETED',
    confidence: serviceAvailable ? 0.9 : 0.75,
    riskFactors: factors,
    explanation: {
      ...explanation,
      disclaimer:
        'Statistical behavioural analysis reflects purpose drift patterns. It does not constitute proof of illicit activity.',
    },
  });

  // Update merchant's current cached risk score & tier
  merchant.riskScore = score;
  merchant.riskTier =
    riskLevel === 'HIGH'
      ? 'TIER_3_QUARANTINE'
      : riskLevel === 'MEDIUM'
      ? 'TIER_2_RESTRICT'
      : 'TIER_0_SAFE';
  await merchant.save();

  return assessment;
}
