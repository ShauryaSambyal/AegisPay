import { Router, Request, Response } from 'express';

/**
 * Express proxy to the Python ML service.
 *
 * The base URL is configurable so the service can run anywhere:
 *   ML_SERVICE_URL=http://127.0.0.1:8001
 * Requests time out after 4s and return 502 when the service is unreachable.
 */

const router = Router();

const ML_BASE = (): string => process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8001';
const TIMEOUT_MS = 4000;

interface ProxyResult {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
}

const callMl = async (
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<ProxyResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${ML_BASE()}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text; the ML service always returns JSON for its own routes
    }
    return { ok: response.ok, status: response.status, body: parsed };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `ML service timed out after ${TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    return { ok: false, status: 502, body: null, error: message };
  } finally {
    clearTimeout(timer);
  }
};

const unavailable = (res: Response, detail: string): void => {
  res.status(502).json({
    error: {
      code: 'ML_SERVICE_UNAVAILABLE',
      message: `ML service is not reachable at ${ML_BASE()}. Start it with: ml-service\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001`,
      details: detail,
    },
  });
};

const forward = async (
  res: Response,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<void> => {
  const result = await callMl(path, method, body);
  if (result.status === 502) {
    unavailable(res, result.error ?? 'unknown transport error');
    return;
  }
  res.status(result.status).json(result.body);
};

router.get('/health', async (_req: Request, res: Response) => {
  await forward(res, '/health', 'GET');
});

router.get('/model/info', async (_req: Request, res: Response) => {
  await forward(res, '/model/info', 'GET');
});

router.get('/datasets', async (_req: Request, res: Response) => {
  await forward(res, '/datasets', 'GET');
});

router.post('/score/transaction', async (req: Request, res: Response) => {
  await forward(res, '/score/transaction', 'POST', req.body ?? {});
});

router.post('/score/merchant', async (req: Request, res: Response) => {
  await forward(res, '/score/merchant', 'POST', req.body ?? {});
});

export default router;
