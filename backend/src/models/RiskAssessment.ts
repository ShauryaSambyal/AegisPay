import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'INSUFFICIENT_DATA';
export type ReviewStatus = 'UNREVIEWED' | 'FLAGGED' | 'CLEARED';

export interface IRiskAssessment extends Document {
  providerId: Types.ObjectId;
  merchantId: Types.ObjectId;
  datasetId?: Types.ObjectId;
  riskScore: number;
  riskLevel: RiskLevel;
  modelVersion: string;
  analysisStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  riskFactors: string[];
  explanation: Record<string, unknown>;
  confidence: number;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    datasetId: {
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
      index: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'INSUFFICIENT_DATA'],
      required: true,
      index: true,
    },
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
    analysisStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
    },
    riskFactors: {
      type: [String],
      default: [],
    },
    explanation: {
      type: Schema.Types.Mixed,
      default: {},
    },
    confidence: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1,
    },
    reviewStatus: {
      type: String,
      enum: ['UNREVIEWED', 'FLAGGED', 'CLEARED'],
      default: 'UNREVIEWED',
    },
    reviewedBy: String,
    reviewedAt: Date,
    reviewNotes: String,
  },
  {
    timestamps: true,
  }
);

RiskAssessmentSchema.index({ providerId: 1, merchantId: 1, createdAt: -1 });

export const RiskAssessment: Model<IRiskAssessment> =
  mongoose.models.RiskAssessment ||
  mongoose.model<IRiskAssessment>('RiskAssessment', RiskAssessmentSchema);
