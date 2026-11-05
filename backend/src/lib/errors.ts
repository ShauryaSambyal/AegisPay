import { Response } from 'express';

/**
 * Standard error envelope shared by every route:
 * `{ "error": { "code", "message", "details"? } }`
 */
export const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void => {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
};

export const notFound = (res: Response, what: string, id: string): void =>
  sendError(res, 404, 'NOT_FOUND', `${what} ${id} was not found`, { id });

/**
 * A real OSM identity was used where simulated risk data is required.
 * 409 Conflict is deliberate: the resource exists but cannot carry risk data.
 */
export const realMerchantHasNoRiskLayer = (res: Response, id: string): void =>
  sendError(
    res,
    409,
    'REAL_MERCHANT_DISPLAY_ONLY',
    'Real OpenStreetMap merchants are display-only directory records and carry no risk, transaction, drift or syndicate data.',
    { merchantId: id, dataOrigin: 'real_osm', allowedOrigins: ['simulated'] }
  );

export const simulatedOnly = (res: Response, id: string): void =>
  sendError(
    res,
    409,
    'SIMULATED_ONLY',
    'This endpoint only accepts anonymized SIM-* simulated merchants.',
    { merchantId: id }
  );
