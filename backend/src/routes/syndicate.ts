import { Router, Request, Response } from 'express';
import { SyndicateDetector } from '../services/syndicateDetector.js';

const router = Router();

router.get('/graph', (_req: Request, res: Response) => {
  const graph = SyndicateDetector.getSyndicateGraph();
  res.json({ success: true, data: graph });
});

export default router;
