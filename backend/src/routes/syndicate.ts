import { Router, Request, Response } from 'express';
import { SyndicateDetector } from '../services/syndicateDetector.js';

const router = Router();

/** GET /api/syndicate/graph — simulated nodes only (SIM-*, CLUSTER-*, HUB-*, INFRA-*). */
router.get('/graph', (_req: Request, res: Response) => {
  const graph = SyndicateDetector.getSyndicateGraph();
  res.json({ success: true, dataOrigin: 'simulated', data: graph });
});

export default router;
