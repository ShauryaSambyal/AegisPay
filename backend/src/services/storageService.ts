import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  process.env.DATASET_STORAGE_DIR || 'storage/datasets'
);

// Ensure storage root directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
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
 * Saves a file buffer to private local storage.
 */
export async function saveFile(
  storageKey: string,
  buffer: Buffer
): Promise<{ storagePath: string; size: number }> {
  const filePath = getStorageFilePath(storageKey);
  await fs.promises.writeFile(filePath, buffer);
  const stat = await fs.promises.stat(filePath);
  return {
    storagePath: storageKey,
    size: stat.size,
  };
}

/**
 * Checks if a file exists in private storage.
 */
export async function fileExists(storageKey: string): Promise<boolean> {
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
 * the entire file into memory.
 */
export function createReadStream(storageKey: string): fs.ReadStream {
  const filePath = getStorageFilePath(storageKey);
  return fs.createReadStream(filePath);
}

/**
 * Deletes a file from storage safely.
 */
export async function deleteFile(storageKey: string): Promise<boolean> {
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
