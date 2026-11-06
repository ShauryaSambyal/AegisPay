import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITransaction extends Document {
  providerId: Types.ObjectId;
  datasetId?: Types.ObjectId;
  merchantId: Types.ObjectId;
  merchantIdentifier: string;
  transactionReference: string;
  transactionTimestamp: Date;
  amount: number;
  currency: string;
  transactionType: string;
  transactionStatus: string;
  sourceAccountToken?: string;
  destinationAccountToken?: string;
  paymentMethod: string;
  riskScore?: number;
  riskTier?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    merchantIdentifier: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    transactionReference: {
      type: String,
      required: true,
      trim: true,
    },
    transactionTimestamp: {
      type: Date,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    transactionType: {
      type: String,
      default: 'PAYMENT',
      trim: true,
    },
    transactionStatus: {
      type: String,
      default: 'SUCCESS',
      trim: true,
    },
    sourceAccountToken: {
      type: String,
      trim: true,
      default: '',
    },
    destinationAccountToken: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
      trim: true,
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    riskTier: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Provider-scoped unique transaction reference to prevent duplicate processing
TransactionSchema.index({ providerId: 1, transactionReference: 1 }, { unique: true });
TransactionSchema.index({ providerId: 1, transactionTimestamp: -1 });
TransactionSchema.index({ providerId: 1, merchantId: 1, transactionTimestamp: -1 });
TransactionSchema.index({ providerId: 1, datasetId: 1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
