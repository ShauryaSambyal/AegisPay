/**
 * Overpass sync utility.
 *
 *   npm run osm:sync             # live Overpass fetch -> normalized JSON
 *   npm run osm:sync -- --snapshot   # use bundled snapshot, no network
 *
 * Writes:
 *   backend/src/data/osm_shops.json  (runtime cache)
 *   ../osm_shops.json                (handy copy at repo root, next to the PDF)
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { OsmService } from '../services/osmService.js';

dotenv.config();

const main = async (): Promise<void> => {
  const useSnapshot = process.argv.includes('--snapshot');

  console.log(
    useSnapshot
      ? '[osm:sync] Normalizing bundled snapshot (offline)...'
      : '[osm:sync] Fetching live data from Overpass...'
  );

  const dataset = useSnapshot
    ? OsmService.getSnapshotShops()
    : await OsmService.getShops({ refresh: true });

  if (!dataset) {
    throw new Error(
      'No snapshot found. Run scripts/build_osm_snapshot.py first or use a live sync.'
    );
  }

  const cachePath = path.resolve(process.cwd(), 'src/data/osm_shops.json');
  const rootPath = path.resolve(process.cwd(), '..', 'osm_shops.json');

  OsmService.writeNormalized(dataset, cachePath);
  OsmService.writeNormalized(dataset, rootPath);

  const byCategory = new Map<string, number>();
  for (const shop of dataset.shops) {
    byCategory.set(shop.category, (byCategory.get(shop.category) ?? 0) + 1);
  }

  console.log(`[osm:sync] Source      : ${dataset.source}`);
  console.log(`[osm:sync] City        : ${dataset.city}, ${dataset.state}`);
  console.log(`[osm:sync] BBox        : ${dataset.bbox}`);
  console.log(`[osm:sync] Total shops : ${dataset.count}`);
  for (const [category, count] of byCategory) {
    console.log(`[osm:sync]   - ${category.padEnd(12)} ${count}`);
  }
  console.log(`[osm:sync] Wrote ${cachePath}`);
  console.log(`[osm:sync] Wrote ${rootPath}`);
};

main().catch(error => {
  console.error('[osm:sync] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
