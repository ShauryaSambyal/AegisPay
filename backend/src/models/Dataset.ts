import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DatasetStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'READY_FOR_PROCESSING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'PROCESSING_FAILED';

export interface IDatasetValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  missingRequiredFields: string[];
  columnNames: string[];
  warnings: string[];
  sampleErrors?: Array<{ row: number; reason: string }>;
  columnMapping?: Record<string, string>;
}

export interface IDataset extends Document {
  providerId: Types.ObjectId;
  uploadedBy: string; // Firebase UID
  fileName: string;
  originalFileName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  recordCount: number;
  status: DatasetStatus;
  validationSummary?: IDatasetValidationSummary;
  processingStatus: string;
  processingProgress?: number; // 0 - 100
  processingError?: string;
  uploadedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSchema = new Schema<IDataset>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      default: 'text/csv',
    },
    fileSize: {
      type: Number,
      required: true,
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'UPLOADED',
        'VALIDATING',
        'VALIDATION_FAILED',
        'READY_FOR_PROCESSING',
        'PROCESSING',
        'PROCESSED',
        'PROCESSING_FAILED',
      ],
      default: 'UPLOADED',
      index: true,
    },
    validationSummary: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      duplicateRows: { type: Number, default: 0 },
      missingRequiredFields: { type: [String], default: [] },
      columnNames: { type: [String], default: [] },
      warnings: { type: [String], default: [] },
      sampleErrors: [
        {
          row: Number,
          reason: String,
        },
      ],
      columnMapping: { type: Schema.Types.Mixed },
    },
    processingStatus: {
      type: String,
      default: 'pending',
    },
    processingProgress: {
      type: Number,
      default: 0,
    },
    processingError: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

DatasetSchema.index({ providerId: 1, createdAt: -1 });

export const Dataset: Model<IDataset> =
  mongoose.models.Dataset || mongoose.model<IDataset>('Dataset', DatasetSchema);
