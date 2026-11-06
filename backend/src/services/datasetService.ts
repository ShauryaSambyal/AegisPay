import { parse as parseCsv } from 'csv-parse';
import { createReadStream } from './storageService.js';
import { Dataset, IDatasetValidationSummary } from '../models/Dataset.js';
import { Transaction } from '../models/Transaction.js';
import { Merchant } from '../models/Merchant.js';
import { Types } from 'mongoose';

/**
 * Standard canonical transaction field aliases for flexible auto-mapping.
 */
export const STANDARD_COLUMN_ALIASES: Record<string, string[]> = {
  transactionReference: ['txn_id', 'transaction_id', 'transaction_reference', 'txnid', 'reference', 'ref', 'order_id'],
  merchantIdentifier: ['merchant_code', 'merchant_id', 'merchant_identifier', 'mid', 'merchant', 'store_id'],
  amount: ['txn_amount', 'amount', 'total_amount', 'payment_amount', 'value', 'price'],
  transactionTimestamp: ['txn_time', 'timestamp', 'date', 'datetime', 'transaction_time', 'created_at'],
  currency: ['currency', 'curr', 'txn_currency'],
  paymentMethod: ['payment_method', 'method', 'mode', 'payment_mode', 'channel'],
  sourceAccountToken: ['source_account', 'source_token', 'payer_id', 'card_token', 'upi_id', 'payer_account'],
  destinationAccountToken: ['destination_account', 'dest_token', 'payee_id', 'merchant_account'],
};

/**
 * Resolves column mapping by checking provided explicit mapping or auto-matching aliases.
 */
export function resolveColumnMapping(
  csvHeaders: string[],
  explicitMapping?: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = csvHeaders.map((h) => h.trim().toLowerCase());

  for (const [standardField, aliases] of Object.entries(STANDARD_COLUMN_ALIASES)) {
    // 1. Check explicit mapping first
    if (explicitMapping && explicitMapping[standardField]) {
      const target = explicitMapping[standardField];
      const matchIdx = lowerHeaders.indexOf(target.toLowerCase());
      if (matchIdx !== -1) {
        mapping[standardField] = csvHeaders[matchIdx];
        continue;
      }
    }

    // 2. Auto-detect from aliases
    for (const alias of aliases) {
      const matchIdx = lowerHeaders.indexOf(alias.toLowerCase());
      if (matchIdx !== -1) {
        mapping[standardField] = csvHeaders[matchIdx];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Validates a CSV dataset without inserting records into the database.
 * Reads via stream to prevent memory exhaustion.
 */
export async function validateDataset(
  datasetId: string,
  providerId: string,
  customMapping?: Record<string, string>
): Promise<IDatasetValidationSummary> {
  const dataset = await Dataset.findOne({
    _id: new Types.ObjectId(datasetId),
    providerId: new Types.ObjectId(providerId),
  });

  if (!dataset) {
    throw new Error('Dataset not found or access denied');
  }

  dataset.status = 'VALIDATING';
  await dataset.save();

  const stream = createReadStream(dataset.storagePath);
  const parser = stream.pipe(
    parseCsv({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  const sampleErrors: Array<{ row: number; reason: string }> = [];
  const warnings: string[] = [];
  const seenRefs = new Set<string>();

  let headersDetected = false;
  let headers: string[] = [];
  let mapping: Record<string, string> = {};

  for await (const row of parser) {
    totalRows++;

    if (!headersDetected) {
      headers = Object.keys(row);
      mapping = resolveColumnMapping(headers, customMapping);
      headersDetected = true;

      // Check required standard fields
      const requiredFields = ['transactionReference', 'merchantIdentifier', 'amount', 'transactionTimestamp'];
      const missing = requiredFields.filter((f) => !mapping[f]);
      if (missing.length > 0) {
        warnings.push(`Missing column mappings for required fields: ${missing.join(', ')}`);
      }
    }

    // Validate transaction reference
    const refKey = mapping.transactionReference;
    const refVal = refKey ? String(row[refKey] || '').trim() : '';
    if (!refVal) {
      invalidRows++;
      if (sampleErrors.length < 50) {
        sampleErrors.push({ row: totalRows, reason: 'Missing transaction reference' });
      }
      continue;
    }

    if (seenRefs.has(refVal)) {
      duplicateRows++;
      if (sampleErrors.length < 50) {
        sampleErrors.push({ row: totalRows, reason: `Duplicate transaction reference in file: ${refVal}` });
      }
      continue;
    }
    seenRefs.add(refVal);

    // Validate amount
    const amtKey = mapping.amount;
    const rawAmt = amtKey ? row[amtKey] : '';
    const numAmt = Number(String(rawAmt).replace(/[^0-9.-]+/g, ''));
    if (isNaN(numAmt) || numAmt < 0) {
      invalidRows++;
      if (sampleErrors.length < 50) {
        sampleErrors.push({ row: totalRows, reason: `Invalid amount value: '${rawAmt}'` });
      }
      continue;
    }

    // Validate timestamp
    const timeKey = mapping.transactionTimestamp;
    const rawTime = timeKey ? row[timeKey] : '';
    const parsedTime = Date.parse(rawTime);
    if (isNaN(parsedTime)) {
      invalidRows++;
      if (sampleErrors.length < 50) {
        sampleErrors.push({ row: totalRows, reason: `Invalid timestamp format: '${rawTime}'` });
      }
      continue;
    }

    // Validate merchant identifier
    const mKey = mapping.merchantIdentifier;
    const rawMid = mKey ? String(row[mKey] || '').trim() : '';
    if (!rawMid) {
      invalidRows++;
      if (sampleErrors.length < 50) {
        sampleErrors.push({ row: totalRows, reason: 'Missing merchant identifier' });
      }
      continue;
    }

    validRows++;
  }

  const missingRequired = ['transactionReference', 'merchantIdentifier', 'amount', 'transactionTimestamp'].filter(
    (f) => !mapping[f]
  );

  const summary: IDatasetValidationSummary = {
    totalRows,
    validRows,
    invalidRows,
    duplicateRows,
    missingRequiredFields: missingRequired,
    columnNames: headers,
    warnings,
    sampleErrors,
    columnMapping: mapping,
  };

  dataset.recordCount = totalRows;
  dataset.validationSummary = summary;
  dataset.status = missingRequired.length > 0 || validRows === 0 ? 'VALIDATION_FAILED' : 'READY_FOR_PROCESSING';
  await dataset.save();

  return summary;
}

/**
 * Processes a validated dataset into the Transaction collection in MongoDB.
 * Inserts in batches of 500, scopes to providerId, and links to Merchants.
 */
export async function processDataset(
  datasetId: string,
  providerId: string
): Promise<{ insertedCount: number; duplicateCount: number; merchantCount: number }> {
  const dataset = await Dataset.findOne({
    _id: new Types.ObjectId(datasetId),
    providerId: new Types.ObjectId(providerId),
  });

  if (!dataset) {
    throw new Error('Dataset not found or access denied');
  }

  if (dataset.status !== 'READY_FOR_PROCESSING' && dataset.status !== 'VALIDATION_FAILED') {
    // If not validated yet, run validation first
    await validateDataset(datasetId, providerId);
  }

  dataset.status = 'PROCESSING';
  dataset.processingStatus = 'processing';
  dataset.processingProgress = 0;
  await dataset.save();

  const mapping = dataset.validationSummary?.columnMapping || {};
  const stream = createReadStream(dataset.storagePath);
  const parser = stream.pipe(
    parseCsv({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  const pObjectId = new Types.ObjectId(providerId);
  const dObjectId = new Types.ObjectId(datasetId);

  // Cache existing merchants for fast lookup
  const existingMerchants = await Merchant.find({ providerId: pObjectId });
  const merchantMap = new Map<string, Types.ObjectId>();
  for (const m of existingMerchants) {
    merchantMap.set(m.merchantIdentifier.toLowerCase(), m._id as Types.ObjectId);
  }

  let batch: any[] = [];
  let totalInserted = 0;
  let totalDuplicates = 0;
  const BATCH_SIZE = 500;

  try {
    for await (const row of parser) {
      const ref = mapping.transactionReference ? String(row[mapping.transactionReference] || '').trim() : '';
      const rawAmt = mapping.amount ? row[mapping.amount] : '';
      const amount = Number(String(rawAmt).replace(/[^0-9.-]+/g, ''));
      const rawTime = mapping.transactionTimestamp ? row[mapping.transactionTimestamp] : '';
      const timestamp = new Date(rawTime);
      const mid = mapping.merchantIdentifier ? String(row[mapping.merchantIdentifier] || '').trim() : '';

      if (!ref || isNaN(amount) || isNaN(timestamp.getTime()) || !mid) {
        continue;
      }

      // Resolve or auto-register merchant if absent
      let merchantObjId = merchantMap.get(mid.toLowerCase());
      if (!merchantObjId) {
        const newMerchant = await Merchant.create({
          providerId: pObjectId,
          merchantIdentifier: mid,
          merchantName: `Merchant ${mid}`,
          merchantCategory: 'general_retail',
          status: 'ACTIVE',
        });
        merchantObjId = newMerchant._id as Types.ObjectId;
        merchantMap.set(mid.toLowerCase(), merchantObjId);
      }

      const currency = mapping.currency ? String(row[mapping.currency] || 'INR').trim().toUpperCase() : 'INR';
      const paymentMethod = mapping.paymentMethod ? String(row[mapping.paymentMethod] || 'UPI').trim().toUpperCase() : 'UPI';
      const sourceAccountToken = mapping.sourceAccountToken ? String(row[mapping.sourceAccountToken] || '').trim() : '';
      const destinationAccountToken = mapping.destinationAccountToken
        ? String(row[mapping.destinationAccountToken] || '').trim()
        : '';

      batch.push({
        providerId: pObjectId,
        datasetId: dObjectId,
        merchantId: merchantObjId,
        merchantIdentifier: mid,
        transactionReference: ref,
        transactionTimestamp: timestamp,
        amount,
        currency,
        transactionType: 'PAYMENT',
        transactionStatus: 'SUCCESS',
        paymentMethod,
        sourceAccountToken,
        destinationAccountToken,
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          const res = await Transaction.insertMany(batch, { ordered: false });
          totalInserted += res.length;
        } catch (insertErr: any) {
          // Ordered: false handles duplicate key errors without failing entire batch
          if (insertErr.insertedDocs) {
            totalInserted += insertErr.insertedDocs.length;
          }
          if (insertErr.writeErrors) {
            totalDuplicates += insertErr.writeErrors.length;
          }
        }
        batch = [];
      }
    }

    // Flush final batch
    if (batch.length > 0) {
      try {
        const res = await Transaction.insertMany(batch, { ordered: false });
        totalInserted += res.length;
      } catch (insertErr: any) {
        if (insertErr.insertedDocs) {
          totalInserted += insertErr.insertedDocs.length;
        }
        if (insertErr.writeErrors) {
          totalDuplicates += insertErr.writeErrors.length;
        }
      }
    }

    dataset.status = 'PROCESSED';
    dataset.processingStatus = 'completed';
    dataset.processingProgress = 100;
    dataset.processedAt = new Date();
    await dataset.save();

    return {
      insertedCount: totalInserted,
      duplicateCount: totalDuplicates,
      merchantCount: merchantMap.size,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    dataset.status = 'PROCESSING_FAILED';
    dataset.processingStatus = 'failed';
    dataset.processingError = errorMsg;
    await dataset.save();
    throw err;
  }
}
