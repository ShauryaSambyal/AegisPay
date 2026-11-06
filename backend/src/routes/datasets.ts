import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, requireProvider, requireProviderApproval, requireRole } from '../middleware/auth.js';
import { Dataset } from '../models/Dataset.js';
import { Transaction } from '../models/Transaction.js';
import { saveFile, generateStorageKey, deleteFile } from '../services/storageService.js';
import { validateDataset, processDataset } from '../services/datasetService.js';
import { logAudit } from '../services/auditService.js';
import { sendError } from '../lib/errors.js';
import { isDatabaseConnected } from '../config/database.js';
import { Types } from 'mongoose';

const router = Router();

// Configure Multer for secure CSV uploads in memory before streaming to storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only CSV files (.csv) are accepted for transaction datasets'));
    }
    cb(null, true);
  },
});

// All dataset endpoints require authentication, provider context, and active approval
router.use(requireAuth, requireProvider);

/**
 * POST /api/datasets/upload
 * Upload a CSV transaction dataset for the authenticated provider.
 */
router.post(
  '/upload',
  requireProviderApproval,
  requireRole('owner', 'analyst', 'admin'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      if (!req.file) {
        sendError(res, 400, 'NO_FILE_UPLOADED', 'Please select a CSV file to upload');
        return;
      }

      const originalName = req.file.originalname;
      const storageKey = generateStorageKey(String(req.provider!._id), originalName);

      // Save file securely to private storage
      const { storagePath, size } = await saveFile(storageKey, req.file.buffer);

      // Create Dataset document scoped to authenticated provider
      const dataset = await Dataset.create({
        providerId: req.provider!._id,
        uploadedBy: req.user!.uid,
        fileName: storageKey,
        originalFileName: originalName,
        storagePath,
        fileType: 'text/csv',
        fileSize: size,
        status: 'UPLOADED',
        processingStatus: 'uploaded',
      });

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'DATASET_UPLOADED',
        resourceType: 'dataset',
        resourceId: String(dataset._id),
        ipAddress: req.ip,
        metadata: {
          originalFileName: originalName,
          fileSize: size,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Dataset uploaded successfully. Ready for validation.',
        data: dataset,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'UPLOAD_FAILED', `Failed to upload dataset: ${msg}`);
    }
  }
);

/**
 * GET /api/datasets
 * List transaction datasets belonging strictly to the authenticated provider.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { status, page = '1', limit = '20' } = req.query;
    const query: Record<string, unknown> = {
      providerId: req.provider!._id,
    };

    if (status) {
      query.status = String(status);
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [datasets, total] = await Promise.all([
      Dataset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Dataset.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      count: datasets.length,
      data: datasets,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'DATASETS_FETCH_FAILED', `Failed to retrieve datasets: ${msg}`);
  }
});

/**
 * GET /api/datasets/:datasetId
 * Get dataset details and validation status. Enforces provider ownership.
 */
router.get('/:datasetId', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { datasetId } = req.params;
    if (!Types.ObjectId.isValid(datasetId)) {
      sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
      return;
    }

    const dataset = await Dataset.findOne({
      _id: new Types.ObjectId(datasetId),
      providerId: req.provider!._id,
    });

    if (!dataset) {
      sendError(res, 404, 'DATASET_NOT_FOUND', 'Dataset not found or access denied for this provider');
      return;
    }

    res.json({
      success: true,
      data: dataset,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'DATASET_FETCH_FAILED', `Failed to fetch dataset: ${msg}`);
  }
});

/**
 * POST /api/datasets/:datasetId/validate
 * Validate dataset structure and flexible column mapping. Enforces provider ownership.
 */
router.post(
  '/:datasetId/validate',
  requireProviderApproval,
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const { datasetId } = req.params;
      const { columnMapping } = req.body || {};

      if (!Types.ObjectId.isValid(datasetId)) {
        sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
        return;
      }

      const summary = await validateDataset(
        datasetId,
        String(req.provider!._id),
        columnMapping
      );

      res.json({
        success: true,
        message: 'Dataset validated successfully',
        data: summary,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 400, 'VALIDATION_FAILED', `Dataset validation error: ${msg}`);
    }
  }
);

/**
 * POST /api/datasets/:datasetId/process
 * Start batch processing and ingestion into Transaction collection.
 */
router.post(
  '/:datasetId/process',
  requireProviderApproval,
  requireRole('owner', 'analyst', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const { datasetId } = req.params;
      if (!Types.ObjectId.isValid(datasetId)) {
        sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
        return;
      }

      const result = await processDataset(datasetId, String(req.provider!._id));

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'DATASET_PROCESSED',
        resourceType: 'dataset',
        resourceId: datasetId,
        ipAddress: req.ip,
        metadata: result,
      });

      res.json({
        success: true,
        message: `Dataset processed: ${result.insertedCount} transactions ingested, ${result.duplicateCount} duplicates ignored.`,
        data: result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'PROCESSING_FAILED', `Failed to process dataset: ${msg}`);
    }
  }
);

/**
 * GET /api/datasets/:datasetId/status
 * Check upload, validation, and processing status.
 */
router.get('/:datasetId/status', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { datasetId } = req.params;
    if (!Types.ObjectId.isValid(datasetId)) {
      sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
      return;
    }

    const dataset = await Dataset.findOne(
      {
        _id: new Types.ObjectId(datasetId),
        providerId: req.provider!._id,
      },
      { status: 1, processingStatus: 1, processingProgress: 1, processingError: 1, recordCount: 1 }
    );

    if (!dataset) {
      sendError(res, 404, 'DATASET_NOT_FOUND', 'Dataset not found');
      return;
    }

    res.json({
      success: true,
      data: dataset,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'STATUS_FETCH_FAILED', `Failed to check status: ${msg}`);
  }
});

/**
 * GET /api/datasets/:datasetId/validation-report
 * Return comprehensive validation results.
 */
router.get('/:datasetId/validation-report', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConnected()) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
    return;
  }

  try {
    const { datasetId } = req.params;
    if (!Types.ObjectId.isValid(datasetId)) {
      sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
      return;
    }

    const dataset = await Dataset.findOne({
      _id: new Types.ObjectId(datasetId),
      providerId: req.provider!._id,
    });

    if (!dataset) {
      sendError(res, 404, 'DATASET_NOT_FOUND', 'Dataset not found');
      return;
    }

    res.json({
      success: true,
      data: dataset.validationSummary || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, 500, 'REPORT_FETCH_FAILED', `Failed to fetch validation report: ${msg}`);
  }
});

/**
 * DELETE /api/datasets/:datasetId
 * Delete a dataset and its associated transaction records.
 */
router.delete(
  '/:datasetId',
  requireRole('owner', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    if (!isDatabaseConnected()) {
      sendError(res, 503, 'DATABASE_UNAVAILABLE', 'MongoDB is not connected');
      return;
    }

    try {
      const { datasetId } = req.params;
      if (!Types.ObjectId.isValid(datasetId)) {
        sendError(res, 400, 'INVALID_DATASET_ID', 'Invalid dataset ID format');
        return;
      }

      const dataset = await Dataset.findOne({
        _id: new Types.ObjectId(datasetId),
        providerId: req.provider!._id,
      });

      if (!dataset) {
        sendError(res, 404, 'DATASET_NOT_FOUND', 'Dataset not found');
        return;
      }

      // Delete physical file from storage
      await deleteFile(dataset.storagePath);

      // Delete associated transactions
      const deleteResult = await Transaction.deleteMany({
        datasetId: dataset._id,
        providerId: req.provider!._id,
      });

      // Delete dataset record
      await Dataset.findByIdAndDelete(dataset._id);

      await logAudit({
        providerId: req.provider!._id as Types.ObjectId,
        userId: req.user!.uid,
        action: 'DATASET_DELETED',
        resourceType: 'dataset',
        resourceId: datasetId,
        ipAddress: req.ip,
        metadata: {
          deletedTransactions: deleteResult.deletedCount,
          fileName: dataset.fileName,
        },
      });

      res.json({
        success: true,
        message: `Dataset and ${deleteResult.deletedCount} associated transactions deleted successfully.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendError(res, 500, 'DELETE_FAILED', `Failed to delete dataset: ${msg}`);
    }
  }
);

export default router;
