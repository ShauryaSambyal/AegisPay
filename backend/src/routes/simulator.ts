import { Router, Request, Response } from 'express';
import { SimulatorService } from '../services/simulatorService.js';

const router = Router();

// Trigger a specific scenario
router.post('/scenario', (req: Request, res: Response): void => {
  const { scenario } = req.body;
  if (!scenario) {
    res.status(400).json({ success: false, message: 'Scenario name is required' });
    return;
  }

  const result = SimulatorService.triggerScenario(scenario);
  res.json({ success: true, ...result });
});

export default router;
