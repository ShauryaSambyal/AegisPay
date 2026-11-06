import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProviderStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REQUIRES_MORE_INFORMATION';

export interface IProvider extends Document {
  organisationName: string;
  registeredBusinessName: string;
  officialEmail: string;
  contactPerson: string;
  contactNumber: string;
  country: string;
  state: string;
  city: string;
  website?: string;
  registrationIdentifier?: string;
  businessDescription: string;
  verificationDocuments: Array<{
    title: string;
    documentType: string;
    fileUrl?: string;
    verified?: boolean;
    uploadedAt: Date;
  }>;
  status: ProviderStatus;
  ownerUserId: string; // Firebase UID
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProvider>(
  {
    organisationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    registeredBusinessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    officialEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India',
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    registrationIdentifier: {
      type: String,
      trim: true,
      default: '',
    },
    businessDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    verificationDocuments: [
      {
        title: { type: String, required: true },
        documentType: { type: String, required: true },
        fileUrl: { type: String },
        verified: { type: Boolean, default: false },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REQUIRES_MORE_INFORMATION'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
    },
    reviewedAt: {
      type: Date,
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

ProviderSchema.index({ createdAt: -1 });

export const Provider: Model<IProvider> =
  mongoose.models.Provider || mongoose.model<IProvider>('Provider', ProviderSchema);
