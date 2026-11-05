import { Merchant } from './types';

/**
 * Category imagery for merchant cards. Real OSM identities are display-only, so
 * imagery is matched by category label, never by shop id or risk profile.
 */
const categoryImages: Record<string, string> = {
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
  grocery: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
  pharmacy: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80',
  electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80',
  clothing: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
  convenience: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
};

const defaultImage =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80';

export const getMerchantImage = (merchant: Pick<Merchant, 'category'>): string =>
  categoryImages[merchant.category] ?? defaultImage;

export const REAL_OSM_BADGE = 'OSM · Display only';
export const SIMULATED_BADGE = 'Simulated';

export const tierLabel = (tier: string): string =>
  tier
    .replace('TIER_0_SAFE', 'Tier 0 · Safe')
    .replace('TIER_1_MONITOR', 'Tier 1 · Monitor')
    .replace('TIER_2_RESTRICT', 'Tier 2 · Restrict')
    .replace('TIER_3_QUARANTINE', 'Tier 3 · Quarantine');

export const tierClasses = (tier: string): string => {
  switch (tier) {
    case 'TIER_3_QUARANTINE':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'TIER_2_RESTRICT':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'TIER_1_MONITOR':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    default:
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  }
};
