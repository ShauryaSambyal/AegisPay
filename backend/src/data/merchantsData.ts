import fs from 'node:fs';
import path from 'node:path';
import { RealMerchant, RealMerchantId } from '../types/index.js';

/**
 * REAL OpenStreetMap identities — display-only directory records.
 *
 * This module is the only place real businesses are loaded. There is no risk
 * score, tier, transaction, drift metric, fraud label or intervention here, and
 * the `RealMerchant` type makes adding one a compile error. All financial and
 * risk-bearing data lives in `simulatedMerchants.ts` under SIM-* ids with
 * fictional names.
 *
 * Source: OpenStreetMap, © OpenStreetMap contributors, licensed ODbL-1.0.
 * Snapshot written by scripts/normalize_osm.py.
 */

export interface OsmShopRecord {
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  osmRef: string;
  category: string;
  categoryLabel: string;
  name: string;
  address: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  source: 'OpenStreetMap';
}

export interface OsmShopsFile {
  generatedAt: string;
  city: string;
  state: string;
  bbox: string;
  source: string;
  license: string;
  attribution: string;
  count: number;
  shops: OsmShopRecord[];
}

const dataDir = (): string => {
  if (process.env.OSM_DATA_DIR) {
    return path.resolve(process.cwd(), process.env.OSM_DATA_DIR);
  }
  const backendData = path.resolve(process.cwd(), 'backend/src/data');
  if (fs.existsSync(backendData)) return backendData;
  return path.resolve(process.cwd(), 'src/data');
};

export const osmShopsPath = (): string => path.join(dataDir(), 'osm_shops.json');

const loadShopsFile = (): OsmShopsFile | null => {
  const file = osmShopsPath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as OsmShopsFile;
  } catch (error) {
    console.error('[merchantsData] Failed to parse OSM snapshot:', error);
    return null;
  }
};

export const realMerchantId = (osmRef: string, osmId: number): RealMerchantId =>
  `OSM-${osmRef.split('/')[0]?.[0]?.toUpperCase() ?? 'N'}${osmId}` as RealMerchantId;

const toRealMerchant = (shop: OsmShopRecord): RealMerchant => ({
  id: realMerchantId(shop.osmRef, shop.osmId),
  dataOrigin: 'real_osm',
  osmType: shop.osmType,
  osmId: shop.osmId,
  osmRef: shop.osmRef,
  name: shop.name,
  category: shop.category,
  categoryLabel: shop.categoryLabel,
  address: shop.address,
  postcode: shop.postcode,
  latitude: shop.latitude,
  longitude: shop.longitude,
  source: 'OpenStreetMap',
  license: 'ODbL-1.0',
  attribution: '© OpenStreetMap contributors',
  displayOnly: true,
});

const shopsFile = loadShopsFile();

/** Every real OSM identity in the bundled normalized snapshot. */
export const realMerchants: RealMerchant[] = (shopsFile?.shops ?? []).map(toRealMerchant);

export const realMerchantsMeta = {
  generatedAt: shopsFile?.generatedAt ?? null,
  city: shopsFile?.city ?? 'Bengaluru',
  state: shopsFile?.state ?? 'Karnataka',
  bbox: shopsFile?.bbox ?? '',
  source: shopsFile?.source ?? 'OpenStreetMap',
  license: shopsFile?.license ?? 'ODbL-1.0',
  attribution: shopsFile?.attribution ?? '© OpenStreetMap contributors',
  count: realMerchants.length,
};

export const findRealMerchant = (id: string): RealMerchant | undefined =>
  realMerchants.find(merchant => merchant.id === id);

export const isRealMerchantId = (id: string): boolean => id.startsWith('OSM-');
