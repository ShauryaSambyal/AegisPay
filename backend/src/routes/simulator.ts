import { Router, Request, Response } from 'express';
import { RealMerchantRiskError, ScenarioName, SimulatorService } from '../services/simulatorService.js';
import { findRealMerchant, isRealMerchantId } from '../data/merchantsData.js';
import { findSimulatedMerchant } from '../data/simulatedMerchants.js';
import { notFound, realMerchantHasNoRiskLayer, sendError } from '../lib/errors.js';

const router = Router();

const SCENARIOS: ScenarioName[] = ['IPL_BETTING_BURST', 'FESTIVE_BAKERY_RUSH', 'MULE_RING_SMURF', 'RESET'];

const runScenario = (req: Request, res: Response): void => {
  const { scenario, merchantId } = req.body ?? {};
  if (!SCENARIOS.includes(scenario)) {
    sendError(res, 400, 'INVALID_SCENARIO', `scenario must be one of ${SCENARIOS.join(', ')}`, { scenario });
    return;
  }

  if (merchantId !== undefined) {
    const id = String(merchantId);
    if (isRealMerchantId(id) || findRealMerchant(id)) {
      realMerchantHasNoRiskLayer(res, id);
      return;
    }
    if (!findSimulatedMerchant(id)) {
      notFound(res, 'Simulated merchant', id);
      return;
    }
  }

  try {
    const result = SimulatorService.triggerScenario(scenario as ScenarioName, merchantId ? String(merchantId) : undefined);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof RealMerchantRiskError) {
      realMerchantHasNoRiskLayer(res, error.merchantId);
      return;
    }
    sendError(res, 500, 'SIMULATOR_ERROR', error instanceof Error ? error.message : String(error));
  }
};

/** POST /api/simulator/run — canonical scenario trigger. */
router.post('/run', runScenario);

/** POST /api/simulator/scenario — back-compatible alias for older clients. */
router.post('/scenario', runScenario);

/** POST /api/simulator/reset — restore the seeded initial stream. */
router.post('/reset', (_req: Request, res: Response) => {
  SimulatorService.reset();
  res.json({ success: true, dataOrigin: 'simulated', message: 'Simulator reset', addedCount: 0 });
});

export default router;
