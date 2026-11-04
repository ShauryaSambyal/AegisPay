import fs from 'node:fs';
import path from 'node:path';

/**
 * OpenStreetMap / Overpass integration.
 *
 * Merchant *identities* come from real, publicly mapped businesses. Everything
 * risk-related (scores, transactions, interventions) is a separate synthetic
 * layer, so the demo never accuses a real business of wrongdoing.
 *
 * Overpass is a free, key-less API. Config lives in backend/.env.
 */

export type OsmCategoryKey =
  | 'bakery'
  | 'restaurant'
  | 'grocery'
  | 'pharmacy'
  | 'electronics'
  | 'clothing'
  | 'hotel'
  | 'convenience';

export interface OsmCategoryConfig {
  key: OsmCategoryKey;
  label: string;
  overpassFilter: string;
  mcc: string;
  mccDescription: string;
  businessType: string;
}

export interface OsmShop {
  osmType: string;
  osmId: number;
  osmRef: string;
  category: OsmCategoryKey;
  categoryLabel: string;
  name: string;
  brand?: string;
  address: string;
  street?: string;
  city: string;
  state: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  openingHours?: string;
  mcc: string;
  mccDescription: string;
  businessType: string;
  source: 'OpenStreetMap';
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface OsmSnapshot {
  generatedAt: string;
  bbox: string;
  city: string;
  state: string;
  categories: Record<string, { elements: OverpassElement[] }>;
}

interface OsmCacheFile {
  generatedAt: string;
  city: string;
  state: string;
  bbox: string;
  source: 'live' | 'snapshot';
  count: number;
  shops: OsmShop[];
}

export const OSM_CATEGORIES: OsmCategoryConfig[] = [
  {
    key: 'bakery',
    label: 'Bakery',
    overpassFilter: 'node[shop=bakery]',
    mcc: '5462',
    mccDescription: 'Retail Bakeries & Pastry Shops',
    businessType: 'Bakery',
  },
  {
    key: 'restaurant',
    label: 'Restaurant',
    overpassFilter: 'node[amenity=restaurant]',
    mcc: '5812',
    mccDescription: 'Eating Places & Restaurants',
    businessType: 'Restaurant',
  },
  {
    key: 'grocery',
    label: 'Grocery Store',
    overpassFilter: 'node[shop=supermarket]',
    mcc: '5411',
    mccDescription: 'Grocery Stores & Supermarkets',
    businessType: 'Grocery',
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    overpassFilter: 'node[amenity=pharmacy]',
    mcc: '5912',
    mccDescription: 'Drug Stores & Pharmacies',
    businessType: 'Pharmacy',
  },
  {
    key: 'electronics',
    label: 'Electronics Store',
    overpassFilter: 'node[shop=electronics]',
    mcc: '5732',
    mccDescription: 'Electronics Stores',
    businessType: 'Electronics',
  },
  {
    key: 'clothing',
    label: 'Clothing Store',
    overpassFilter: 'node[shop=clothes]',
    mcc: '5651',
    mccDescription: 'Family Clothing Stores',
    businessType: 'Clothing',
  },
  {
    key: 'hotel',
    label: 'Hotel',
    overpassFilter: 'node[tourism=hotel]',
    mcc: '7011',
    mccDescription: 'Hotels & Lodging',
    businessType: 'Hospitality',
  },
  {
    key: 'convenience',
    label: 'Convenience Store',
    overpassFilter: 'node[shop=convenience]',
    mcc: '5499',
    mccDescription: 'Convenience Stores',
    businessType: 'Convenience',
  },
];

const env = (key: string, fallback: string): string => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const envInt = (key: string, fallback: number): number => {
  const parsed = Number(env(key, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dataDir = (): string =>
  path.resolve(process.cwd(), env('OSM_DATA_DIR', 'src/data'));

const snapshotPath = (): string => path.join(dataDir(), 'osm_raw_snapshot.json');
const cachePath = (): string => path.join(dataDir(), 'osm_shops.json');

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export class OsmService {
  public static getConfig() {
    return {
      endpoints: this.getEndpoints(),
      bbox: env('OSM_BBOX', '12.93,77.56,13.02,77.65'),
      city: env('OSM_CITY', 'Bengaluru'),
      state: env('OSM_STATE', 'Karnataka'),
      maxPerCategory: envInt('OSM_MAX_PER_CATEGORY', 8),
      timeoutSeconds: envInt('OVERPASS_TIMEOUT_SECONDS', 45),
      maxRetries: envInt('OVERPASS_MAX_RETRIES', 3),
      cacheTtlMinutes: envInt('OSM_CACHE_TTL_MINUTES', 720),
      requiresApiKey: false,
    };
  }

  private static getEndpoints(): string[] {
    const primary = env('OVERPASS_API_URL', 'https://overpass-api.de/api/interpreter');
    const fallbacks = env('OVERPASS_FALLBACK_URLS', '')
      .split(',')
      .map(url => url.trim())
      .filter(Boolean);
    return [primary, ...fallbacks].filter(
      (url, index, all) => all.indexOf(url) === index
    );
  }

  /** Build the Overpass QL for one category inside the configured bbox. */
  private static buildQuery(category: OsmCategoryConfig): string {
    const { bbox, timeoutSeconds, maxPerCategory } = this.getConfig();
    return [
      `[out:json][timeout:${timeoutSeconds}];`,
      `${category.overpassFilter}(${bbox});`,
      `out body ${maxPerCategory};`,
    ].join('');
  }

  /**
   * Query Overpass with endpoint failover and exponential backoff.
   * Uses GET because the public endpoint reliably accepts encoded queries.
   */
  private static async overpassQuery(ql: string): Promise<OverpassResponse> {
    const { timeoutSeconds, maxRetries } = this.getConfig();
    const endpoints = this.getEndpoints();
    const userAgent = env(
      'OVERPASS_USER_AGENT',
      'AegisPaySentinel/1.0 (IIM Bangalore hackathon demo)'
    );
    const backoffMs = envInt('OVERPASS_BACKOFF_MS', 3000);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      for (const endpoint of endpoints) {
        const url = `${endpoint}?data=${encodeURIComponent(ql)}`;
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          timeoutSeconds * 1000
        );
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': userAgent,
              Accept: 'application/json',
            },
            signal: controller.signal,
          });

          if (!response.ok) {
            lastError = new Error(
              `Overpass ${endpoint} returned HTTP ${response.status}`
            );
            continue;
          }

          const payload = (await response.json()) as OverpassResponse;
          if (!Array.isArray(payload.elements)) {
            throw new Error('Malformed Overpass response: missing elements[]');
          }
          return payload;
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error(String(error));
        } finally {
          clearTimeout(timer);
        }
      }

      if (attempt < maxRetries) {
        await sleep(backoffMs * 2 ** attempt);
      }
    }

    throw lastError ?? new Error('Overpass request failed');
  }

  private static buildAddress(
    tags: Record<string, string>,
    city: string,
    state: string
  ): string {
    const parts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:suburb'] || tags['addr:neighbourhood'],
      tags['addr:city'] || city,
      tags['addr:postcode'] || tags['addr:state'] || state,
    ].filter(Boolean);

    return [...new Set(parts)].join(', ');
  }

  private static normalizeElements(
    elements: OverpassElement[],
    category: OsmCategoryConfig,
    city: string,
    state: string
  ): OsmShop[] {
    const shops: OsmShop[] = [];

    for (const element of elements) {
      const tags = element.tags ?? {};
      const name = tags.name || tags.brand || tags.operator;
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;

      // Unnamed or coordinate-less nodes are useless as merchant identities.
      if (!name || latitude === undefined || longitude === undefined) {
        continue;
      }

      shops.push({
        osmType: element.type,
        osmId: element.id,
        osmRef: `${element.type}/${element.id}`,
        category: category.key,
        categoryLabel: category.label,
        name,
        brand: tags.brand,
        address: this.buildAddress(tags, city, state),
        street: tags['addr:street'],
        city: tags['addr:city'] || city,
        state: tags['addr:state'] || state,
        postcode: tags['addr:postcode'],
        latitude,
        longitude,
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
        openingHours: tags.opening_hours,
        mcc: category.mcc,
        mccDescription: category.mccDescription,
        businessType: category.businessType,
        source: 'OpenStreetMap',
      });
    }

    return shops;
  }

  private static readSnapshot(): OsmSnapshot | null {
    const file = snapshotPath();
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as OsmSnapshot;
    } catch (error) {
      console.error('[osm] Failed to parse snapshot:', error);
      return null;
    }
  }

  private static readCache(): OsmCacheFile | null {
    const file = cachePath();
    if (!fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as OsmCacheFile;
    } catch (error) {
      console.error('[osm] Failed to parse cache:', error);
      return null;
    }
  }

  private static isFresh(cache: OsmCacheFile): boolean {
    const { cacheTtlMinutes } = this.getConfig();
    const ageMs = Date.now() - new Date(cache.generatedAt).getTime();
    return Number.isFinite(ageMs) && ageMs < cacheTtlMinutes * 60 * 1000;
  }

  private static writeCache(payload: OsmCacheFile): void {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify(payload, null, 2), 'utf-8');
  }

  private static shopsFromSnapshot(
    snapshot: OsmSnapshot
  ): OsmShop[] {
    const city = snapshot.city || env('OSM_CITY', 'Bengaluru');
    const state = snapshot.state || env('OSM_STATE', 'Karnataka');
    const shops: OsmShop[] = [];
    const seen = new Set<string>();

    for (const category of OSM_CATEGORIES) {
      const bucket = snapshot.categories[category.key];
      if (!bucket?.elements?.length) continue;

      for (const shop of this.normalizeElements(
        bucket.elements,
        category,
        city,
        state
      )) {
        if (seen.has(shop.osmRef)) continue;
        seen.add(shop.osmRef);
        shops.push(shop);
      }
    }

    return shops;
  }

  private static dedupe(shops: OsmShop[]): OsmShop[] {
    const seen = new Set<string>();
    return shops.filter(shop => {
      if (seen.has(shop.osmRef)) return false;
      seen.add(shop.osmRef);
      return true;
    });
  }

  /** Fetch every configured category from Overpass. */
  public static async fetchLive(): Promise<OsmCacheFile> {
    const { city, state, bbox } = this.getConfig();
    const collected: OsmShop[] = [];
    const delayMs = envInt('OVERPASS_CATEGORY_DELAY_MS', 1200);
    const failures: string[] = [];

    for (const category of OSM_CATEGORIES) {
      try {
        const payload = await this.overpassQuery(this.buildQuery(category));
        collected.push(
          ...this.normalizeElements(payload.elements, category, city, state)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${category.key}: ${message}`);
        console.warn(`[osm] ${category.key} failed - ${message}`);
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    if (!collected.length) {
      throw new Error(
        `Overpass returned no usable shops. ${failures.join(' | ')}`
      );
    }

    const cache: OsmCacheFile = {
      generatedAt: new Date().toISOString(),
      city,
      state,
      bbox,
      source: 'live',
      count: this.dedupe(collected).length,
      shops: this.dedupe(collected),
    };

    this.writeCache(cache);
    return cache;
  }

  /**
   * Resolve shops with graceful degradation:
   * fresh cache -> live fetch -> stale cache -> bundled snapshot.
   */
  public static async getShops(options?: {
    refresh?: boolean;
  }): Promise<OsmCacheFile> {
    if (!options?.refresh) {
      const cached = this.readCache();
      if (cached && this.isFresh(cached)) return cached;
    }

    try {
      return await this.fetchLive();
    } catch (error) {
      console.warn(
        '[osm] Live fetch failed, falling back to cached/snapshot data:',
        error instanceof Error ? error.message : error
      );
    }

    const stale = this.readCache();
    if (stale) return { ...stale, source: 'snapshot' };

    const snapshot = this.readSnapshot();
    if (snapshot) {
      const shops = this.shopsFromSnapshot(snapshot);
      return {
        generatedAt: snapshot.generatedAt,
        city: snapshot.city,
        state: snapshot.state,
        bbox: snapshot.bbox,
        source: 'snapshot',
        count: shops.length,
        shops,
      };
    }

    return {
      generatedAt: new Date().toISOString(),
      city: env('OSM_CITY', 'Bengaluru'),
      state: env('OSM_STATE', 'Karnataka'),
      bbox: env('OSM_BBOX', '12.93,77.56,13.02,77.65'),
      source: 'snapshot',
      count: 0,
      shops: [],
    };
  }

  /** Normalize the bundled snapshot without touching the network. */
  public static getSnapshotShops(): OsmCacheFile | null {
    const snapshot = this.readSnapshot();
    if (!snapshot) return null;
    const shops = this.shopsFromSnapshot(snapshot);
    return {
      generatedAt: snapshot.generatedAt,
      city: snapshot.city,
      state: snapshot.state,
      bbox: snapshot.bbox,
      source: 'snapshot',
      count: shops.length,
      shops,
    };
  }

  public static writeNormalized(
    payload: OsmCacheFile,
    destination: string
  ): void {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(
      destination,
      JSON.stringify(payload, null, 2),
      'utf-8'
    );
  }
}
