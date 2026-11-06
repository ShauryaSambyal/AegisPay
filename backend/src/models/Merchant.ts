import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type MerchantStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'RESTRICTED' | 'SUSPENDED';

export interface IMerchant extends Document {
  providerId: Types.ObjectId;
  merchantName: string;
  merchantCategory: string;
  merchantIdentifier: string; // Unique external MID or merchant code scoped to this provider
  businessAddress?: string;
  city?: string;
  state?: string;
  country: string;
  declaredBusinessActivity?: string;
  onboardingDate: Date;
  status: MerchantStatus;
  riskScore?: number;
  riskTier?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema<IMerchant>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    merchantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    merchantCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    merchantIdentifier: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessAddress: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    declaredBusinessActivity: {
      type: String,
      trim: true,
      default: '',
    },
    onboardingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UNDER_REVIEW', 'RESTRICTED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    riskTier: {
      type: String,
      default: 'TIER_0_SAFE',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique merchant identifier PER PROVIDER
MerchantSchema.index({ providerId: 1, merchantIdentifier: 1 }, { unique: true });
MerchantSchema.index({ providerId: 1, merchantName: 'text' });
MerchantSchema.index({ providerId: 1, status: 1 });

export const Merchant: Model<IMerchant> =
  mongoose.models.Merchant || mongoose.model<IMerchant>('Merchant', MerchantSchema);
