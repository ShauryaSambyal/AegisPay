import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable, PassThrough } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  process.env.DATASET_STORAGE_DIR || 'storage/datasets'
);

// Ensure local storage root directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

/**
 * Checks whether an S3 bucket is configured (e.g. provided by Antideploy or AWS).
 * Antideploy sets AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * AWS_ENDPOINT_URL_S3 and AWS_REGION.
 */
export function isS3Configured(): boolean {
  return Boolean(process.env.AWS_S3_BUCKET);
}

let s3ClientInstance: S3Client | null = null;
export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    s3ClientInstance = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          }
        : {}),
    });
  }
  return s3ClientInstance;
}

/**
 * Sanitizes a filename to prevent path traversal and shell injection.
 */
export function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Generates an unpredictable, cryptographically random storage filename.
 */
export function generateStorageKey(providerId: string, originalName: string): string {
  const clean = sanitizeFilename(originalName);
  const ext = path.extname(clean).toLowerCase() || '.csv';
  const randomHex = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${providerId}_${timestamp}_${randomHex}${ext}`;
}

/**
 * Resolves the full server-side path for a given storage key and verifies
 * that it stays within the storage root boundary.
 */
export function getStorageFilePath(storageKey: string): string {
  const normalized = path.normalize(storageKey);
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new Error('Access denied: Invalid storage path traversal attempt');
  }
  const safeKey = path.basename(normalized);
  const fullPath = path.resolve(STORAGE_ROOT, safeKey);

  // Security guard against path traversal
  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new Error('Access denied: Invalid storage path traversal attempt');
  }

  return fullPath;
}

/**
 * Saves a file buffer to S3 (when AWS_S3_BUCKET is set) or private local storage.
 */
export async function saveFile(
  storageKey: string,
  buffer: Buffer
): Promise<{ storagePath: string; size: number }> {
  if (isS3Configured()) {
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET!;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: 'text/csv',
      })
    );
    return {
      storagePath: storageKey,
      size: buffer.length,
    };
  }

  const filePath = getStorageFilePath(storageKey);
  await fs.promises.writeFile(filePath, buffer);
  const stat = await fs.promises.stat(filePath);
  return {
    storagePath: storageKey,
    size: stat.size,
  };
}

/**
 * Checks if a file exists in S3 or private local storage.
 */
export async function fileExists(storageKey: string): Promise<boolean> {
  if (isS3Configured()) {
    try {
      const client = getS3Client();
      await client.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: storageKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  try {
    const filePath = getStorageFilePath(storageKey);
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a readable stream for processing a dataset without loading
 * the entire file into memory. Compatible with both S3 and local files.
 */
export function createReadStream(storageKey: string): Readable {
  if (isS3Configured()) {
    const pass = new PassThrough();
    const client = getS3Client();
    client
      .send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: storageKey,
        })
      )
      .then((response) => {
        if (response.Body && 'pipe' in response.Body) {
          (response.Body as Readable).pipe(pass);
        } else {
          pass.destroy(new Error('S3 object body is not a readable stream'));
        }
      })
      .catch((err) => {
        pass.destroy(err);
      });
    return pass;
  }

  const filePath = getStorageFilePath(storageKey);
  return fs.createReadStream(filePath);
}

/**
 * Deletes a file from S3 or local storage safely.
 */
export async function deleteFile(storageKey: string): Promise<boolean> {
  if (isS3Configured()) {
    try {
      const client = getS3Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: storageKey,
        })
      );
      return true;
    } catch (err) {
      console.warn(`[Storage] Failed to delete S3 object ${storageKey}:`, err);
      return false;
    }
  }

  try {
    const filePath = getStorageFilePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[Storage] Failed to delete file ${storageKey}:`, err);
    return false;
  }
}
