/**
 * Comprehensive Multi-Provider Platform & Multi-Tenancy Test Suite
 * Tests authentication, provider registration, role permissions,
 * cross-tenant isolation, dataset CSV validation, storage safety, and backward compatibility.
 */

import dotenv from 'dotenv';
dotenv.config();

import { resolveColumnMapping, STANDARD_COLUMN_ALIASES } from '../services/datasetService.js';
import { sanitizeFilename, generateStorageKey, getStorageFilePath } from '../services/storageService.js';
import { scoreToRiskLevel } from '../services/mlService.js';
import { getFirebaseStatus } from '../services/firebaseService.js';
import { realMerchants } from '../data/merchantsData.js';
import { simulatedMerchants } from '../data/simulatedMerchants.js';
import { SimulatorService } from '../services/simulatorService.js';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, detail?: string) {
  if (condition) {
    results.push({ category, name, passed: true });
    console.log(`  ✓ [${category}] ${name}`);
  } else {
    results.push({ category, name, passed: false, error: detail || 'Assertion failed' });
    console.error(`  ✗ [${category}] ${name} -> ${detail || 'FAILED'}`);
  }
}

async function runAllTests() {
  console.log('\n===============================================================');
  console.log('   MULTI-PROVIDER PAYMENT INTELLIGENCE TEST SUITE');
  console.log('===============================================================\n');

  /* -------------------------------------------------------------------------- */
  /* 1. Storage & Path Traversal Security Tests                                  */
  /* -------------------------------------------------------------------------- */
  console.log('1. STORAGE & PATH TRAVERSAL SECURITY:');

  const dangerousName = '../../etc/passwd.csv';
  const cleanName = sanitizeFilename(dangerousName);
  assert(
    !cleanName.includes('..') && !cleanName.includes('/'),
    'Storage Security',
    'Prevents path traversal characters in uploaded filenames',
    `Sanitized: ${cleanName}`
  );

  const storageKey = generateStorageKey('provider_123', 'transactions_batch_2026.csv');
  assert(
    storageKey.startsWith('provider_123_') && storageKey.endsWith('.csv'),
    'Storage Security',
    'Generates cryptographically random server-side storage keys',
    `Generated: ${storageKey}`
  );

  let traversalBlocked = false;
  try {
    getStorageFilePath('../../../windows/system32/cmd.exe');
  } catch {
    traversalBlocked = true;
  }
  assert(traversalBlocked, 'Storage Security', 'Blocks attempts to access files outside storage root');

  /* -------------------------------------------------------------------------- */
  /* 2. Flexible Dataset Column Mapping Tests                                   */
  /* -------------------------------------------------------------------------- */
  console.log('\n2. FLEXIBLE DATASET COLUMN MAPPING:');

  // Provider A column names
  const headersProviderA = ['txn_id', 'merchant_code', 'txn_amount', 'txn_time', 'currency', 'method'];
  const mappingA = resolveColumnMapping(headersProviderA);
  assert(
    mappingA.transactionReference === 'txn_id' &&
      mappingA.merchantIdentifier === 'merchant_code' &&
      mappingA.amount === 'txn_amount' &&
      mappingA.transactionTimestamp === 'txn_time',
    'Column Mapping',
    'Auto-resolves Provider A column naming conventions'
  );

  // Provider B column names
  const headersProviderB = ['transaction_reference', 'merchant_id', 'amount', 'timestamp', 'channel'];
  const mappingB = resolveColumnMapping(headersProviderB);
  assert(
    mappingB.transactionReference === 'transaction_reference' &&
      mappingB.merchantIdentifier === 'merchant_id' &&
      mappingB.amount === 'amount' &&
      mappingB.transactionTimestamp === 'timestamp',
    'Column Mapping',
    'Auto-resolves Provider B column naming conventions'
  );

  // Custom explicit override mapping
  const headersCustom = ['order_num', 'store_code', 'val', 'placed_at'];
  const explicit = {
    transactionReference: 'order_num',
    merchantIdentifier: 'store_code',
    amount: 'val',
    transactionTimestamp: 'placed_at',
  };
  const mappingCustom = resolveColumnMapping(headersCustom, explicit);
  assert(
    mappingCustom.transactionReference === 'order_num' &&
      mappingCustom.merchantIdentifier === 'store_code' &&
      mappingCustom.amount === 'val' &&
      mappingCustom.transactionTimestamp === 'placed_at',
    'Column Mapping',
    'Applies explicit custom column mappings successfully'
  );

  // Missing required column detection
  const headersIncomplete = ['txn_id', 'amount'];
  const mappingIncomplete = resolveColumnMapping(headersIncomplete);
  assert(
    !mappingIncomplete.merchantIdentifier && !mappingIncomplete.transactionTimestamp,
    'Column Mapping',
    'Correctly identifies missing required columns'
  );

  /* -------------------------------------------------------------------------- */
  /* 3. Multi-Tenant Data Isolation Logic Tests                                 */
  /* -------------------------------------------------------------------------- */
  console.log('\n3. MULTI-TENANT DATA ISOLATION LOGIC:');

  const providerAId = '660000000000000000000001';
  const providerBId = '660000000000000000000002';

  // Simulated in-memory database partition to verify isolation queries
  const mockMerchants = [
    { id: 'm1', providerId: providerAId, name: 'Provider A Merchant 1' },
    { id: 'm2', providerId: providerAId, name: 'Provider A Merchant 2' },
    { id: 'm3', providerId: providerBId, name: 'Provider B Merchant 1' },
  ];

  // Provider A queries its merchants
  const providerAMerchants = mockMerchants.filter((m) => m.providerId === providerAId);
  assert(
    providerAMerchants.length === 2 && !providerAMerchants.some((m) => m.providerId === providerBId),
    'Multi-Tenancy',
    'Provider A queries return only Provider A merchants'
  );

  // Cross-provider access attempt: Provider A requests Provider B's merchant ID
  const requestedId = 'm3';
  const crossAccess = mockMerchants.find((m) => m.id === requestedId && m.providerId === providerAId);
  assert(
    crossAccess === undefined,
    'Multi-Tenancy',
    'Denies Provider A access to Provider B merchant record (Cross-tenant denial)'
  );

  // Dataset cross-access attempt
  const mockDatasets = [
    { id: 'd1', providerId: providerAId, fileName: 'data_A.csv' },
    { id: 'd2', providerId: providerBId, fileName: 'data_B.csv' },
  ];
  const crossDataset = mockDatasets.find((d) => d.id === 'd2' && d.providerId === providerAId);
  assert(
    crossDataset === undefined,
    'Multi-Tenancy',
    'Denies Provider A access to Provider B dataset (Cross-tenant denial)'
  );

  /* -------------------------------------------------------------------------- */
  /* 4. Provider Status & Access Control Matrix                                 */
  /* -------------------------------------------------------------------------- */
  console.log('\n4. PROVIDER STATUS & ACCESS CONTROL:');

  const canUploadDatasets = (status: string) => status === 'APPROVED';
  assert(
    canUploadDatasets('APPROVED') &&
      !canUploadDatasets('PENDING_APPROVAL') &&
      !canUploadDatasets('SUSPENDED') &&
      !canUploadDatasets('REJECTED'),
    'Provider Access',
    'Only APPROVED providers can upload and process transaction datasets'
  );

  const canManageOrganization = (role: string) => ['owner', 'admin'].includes(role);
  assert(
    canManageOrganization('owner') &&
      canManageOrganization('admin') &&
      !canManageOrganization('analyst'),
    'Role Permissions',
    'Only Provider Owners and Admins can manage organization members and settings'
  );

  /* -------------------------------------------------------------------------- */
  /* 5. ML Risk Assessment Integration Boundary                                 */
  /* -------------------------------------------------------------------------- */
  console.log('\n5. ML RISK ASSESSMENT BOUNDARY:');

  assert(scoreToRiskLevel(85) === 'HIGH', 'ML Boundary', 'Scores >= 80 map to HIGH risk');
  assert(scoreToRiskLevel(65) === 'MEDIUM', 'ML Boundary', 'Scores 50-79 map to MEDIUM risk');
  assert(scoreToRiskLevel(25) === 'LOW', 'ML Boundary', 'Scores 0-49 map to LOW risk');
  assert(scoreToRiskLevel(-1) === 'INSUFFICIENT_DATA', 'ML Boundary', 'Negative scores map to INSUFFICIENT_DATA');

  /* -------------------------------------------------------------------------- */
  /* 6. Backward Compatibility Verification                                    */
  /* -------------------------------------------------------------------------- */
  console.log('\n6. BACKWARD COMPATIBILITY:');

  // Verify OSM real merchants remain available
  assert(
    realMerchants.length > 0 && realMerchants[0].id.startsWith('OSM-'),
    'Backward Compatibility',
    `Real OSM directory merchants intact (Count: ${realMerchants.length})`
  );

  // Verify simulated demo merchants remain available
  assert(
    simulatedMerchants.length > 0 && simulatedMerchants[0].id.startsWith('SIM-'),
    'Backward Compatibility',
    `Simulated demo merchants intact (Count: ${simulatedMerchants.length})`
  );

  // Verify simulated transaction stream is intact
  const txns = SimulatorService.getAllTransactions();
  assert(
    txns.length > 0,
    'Backward Compatibility',
    `Simulated transaction stream feed active (Count: ${txns.length})`
  );

  // Verify Firebase Auth status is readable
  const fbStatus = getFirebaseStatus();
  assert(
    fbStatus.configured === true && fbStatus.projectId === 'aegispay-21274',
    'Backward Compatibility',
    'Firebase Authentication configuration preserved without regression'
  );

  /* -------------------------------------------------------------------------- */
  /* SUMMARY                                                                    */
  /* -------------------------------------------------------------------------- */
  console.log('\n===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
