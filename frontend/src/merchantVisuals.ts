import { Merchant } from './types';

/**
 * Category imagery for merchant cards. The merchant identity is real
 * OpenStreetMap data, so imagery is matched by MCC rather than by shop ID.
 */
const categoryImages: Record<string, string> = {
  '5462': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  '5812': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  '5411': 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
  '5912': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80',
  '5732': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=600&q=80',
  '5651': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
  '7011': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
  '5499': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80'
};

const defaultImage = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80';

export const getMerchantImage = (merchant: Pick<Merchant, 'mcc' | 'imageUrl'>): string =>
  merchant.imageUrl || categoryImages[merchant.mcc] || defaultImage;

export const SYNTHETIC_RISK_BADGE = 'Identity: OpenStreetMap · Risk profile: synthetic demo';
