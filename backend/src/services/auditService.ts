import { AuditLog } from '../models/AuditLog.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

export interface AuditParams {
  providerId?: Types.ObjectId | string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

// Sensitive keys to redact from audit metadata
const REDACTED_KEYS = [
  'password',
  'token',
  'idtoken',
  'refreshtoken',
  'secret',
  'authorization',
  'key',
  'privatekey',
  'cardnumber',
  'cvv',
];

function sanitizeMetadata(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data) return {};
  const cleaned: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(data)) {
    if (REDACTED_KEYS.some((rk) => k.toLowerCase().includes(rk))) {
      cleaned[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      cleaned[k] = sanitizeMetadata(v as Record<string, unknown>);
    } else {
      cleaned[k] = v;
    }
  }

  return cleaned;
}

/**
 * Log an audit action to MongoDB.
 * Never throws an unhandled exception or blocks the calling operation.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  if (!isDatabaseConnected()) {
    console.log(`[Audit fallback] Action: ${params.action} by User: ${params.userId} on ${params.resourceType}`);
    return;
  }

  try {
    let pId: Types.ObjectId | undefined;
    if (params.providerId) {
      pId =
        typeof params.providerId === 'string'
          ? new Types.ObjectId(params.providerId)
          : params.providerId;
    }

    await AuditLog.create({
      providerId: pId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      metadata: sanitizeMetadata(params.metadata),
      timestamp: new Date(),
    });
  } catch (err) {
    console.warn('[Audit] Failed to persist audit log entry:', err);
  }
}
