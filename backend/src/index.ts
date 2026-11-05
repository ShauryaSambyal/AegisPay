import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import merchantsRouter from './routes/merchants.js';
import transactionsRouter from './routes/transactions.js';
import simulatorRouter from './routes/simulator.js';
import syndicateRouter from './routes/syndicate.js';
import riskRouter from './routes/risk.js';
import mlRouter from './routes/ml.js';
import aiRouter from './routes/ai.js';
import osmRouter from './routes/osm.js';
import { realMerchantsMeta } from './data/merchantsData.js';
import { simulatedMerchantsMeta } from './data/simulatedMerchants.js';
import { sendError } from './lib/errors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json());

// API routes
app.use('/api/merchants', merchantsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/syndicate', syndicateRouter);
app.use('/api/risk', riskRouter);
app.use('/api/ml', mlRouter);
app.use('/api/ai', aiRouter);
app.use('/api/osm', osmRouter);

/**
 * GET /api/health
 * Reports only what the process can actually observe. No capability claims:
 * the AI engine field states which engine is configured, and the risk layer is
 * labelled simulated.
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'AegisPay Sentinel API',
    dataModel: {
      realMerchants: { origin: 'real_osm', count: realMerchantsMeta.count, riskFields: false },
      simulatedMerchants: { origin: 'simulated', count: simulatedMerchantsMeta.count },
    },
    aiEngine: process.env.GEMINI_API_KEY ? 'Gemini configured (gemini-2.5-flash)' : 'Deterministic heuristic reports',
    mlServiceUrl: process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8001',
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'No route matches this request');
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error:', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Unexpected server error');
});

// A parent shell can export PORT=0 (dotenv never overrides an existing variable),
// so a non-positive value falls back to the documented port instead of binding a
// random one.
const requestedPort = Number(process.env.PORT ?? PORT);
const listenPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 5000;
const server = app.listen(listenPort, '0.0.0.0', () => {
  const bound = server.address();
  const port = typeof bound === 'object' && bound !== null ? bound.port : listenPort;
  console.log(`[AegisPay Sentinel] Backend listening on http://127.0.0.1:${port}`);
  console.log(`[AegisPay Sentinel] Real OSM merchants: ${realMerchantsMeta.count} (display only) | simulated: ${simulatedMerchantsMeta.count}`);
  console.log(`[AegisPay Sentinel] ML service: ${process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8001'}`);
});
