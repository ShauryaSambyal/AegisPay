import { Router, Request, Response } from 'express';
import { OsmService, OSM_CATEGORIES } from '../services/osmService.js';

const router = Router();

/**
 * GET /api/osm/status
 * Reports the Overpass configuration and where the current dataset came from.
 * Overpass needs no API key, so this endpoint also answers "what do I need?".
 */
router.get('/status', (_req: Request, res: Response) => {
  const config = OsmService.getConfig();
  const cached = OsmService.getSnapshotShops();

  res.json({
    success: true,
    data: {
      provider: 'OpenStreetMap / Overpass API',
      requiresApiKey: false,
      credentialNote:
        'Overpass is free and key-less. You only need a descriptive User-Agent. ' +
        'Optional commercial upgrades (Geoapify, Foursquare, Google Places, Mapbox) require keys.',
      config,
      categories: OSM_CATEGORIES.map(c => ({
        key: c.key,
        label: c.label,
        mcc: c.mcc,
        mccDescription: c.mccDescription,
        overpassFilter: c.overpassFilter,
      })),
      bundledSnapshot: cached
        ? {
            generatedAt: cached.generatedAt,
            city: cached.city,
            state: cached.state,
            count: cached.count,
          }
        : null,
    },
  });
});

/**
 * GET /api/osm/shops?category=bakery
 * Returns normalized real businesses sourced from OpenStreetMap.
 * Risk scores are NOT part of this payload; they live in the synthetic demo layer.
 */
router.get('/shops', async (req: Request, res: Response): Promise<void> => {
  try {
    const refresh = String(req.query.refresh ?? '') === 'true';
    const dataset = await OsmService.getShops({ refresh });
    const category = String(req.query.category ?? '').trim();

    let shops = dataset.shops;
    if (category) {
      shops = shops.filter(shop => shop.category === category);
    }

    res.json({
      success: true,
      source: dataset.source,
      generatedAt: dataset.generatedAt,
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: 'Unable to load OpenStreetMap shops',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/osm/refresh
 * Forces a live Overpass fetch and refreshes the normalized cache.
 */
router.post('/refresh', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dataset = await OsmService.getShops({ refresh: true });
    res.json({
      success: true,
      message: 'OpenStreetMap shops refreshed from Overpass',
      source: dataset.source,
      generatedAt: dataset.generatedAt,
      count: dataset.count,
      data: dataset.shops,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message: 'Overpass refresh failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
