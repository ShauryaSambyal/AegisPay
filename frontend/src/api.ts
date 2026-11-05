import {
  AIInvestigationReport,
  DatasetEntry,
  Merchant,
  MerchantScoreResponse,
  MlDatasets,
  MlModelInfo,
  RiskTier,
  SimulatedMerchant,
  SyndicateGraphType,
  Transaction,
} from './types';

/** Thin fetch layer. Every call surfaces the backend error envelope. */

const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

const parse = async <T,>(response: Response): Promise<T> => {
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Request failed with status ${response.status}`,
      response.status
    );
  }
  return payload as T;
};

export const fetchRealMerchants = async (): Promise<Merchant[]> => {
  const response = await fetch(`${API_BASE}/api/merchants?origin=real_osm`);
  const payload = await parse<{ data: Merchant[] }>(response);
  return payload.data;
};

export const fetchSimulatedMerchants = async (): Promise<SimulatedMerchant[]> => {
  const response = await fetch(`${API_BASE}/api/merchants?origin=simulated`);
  const payload = await parse<{ data: SimulatedMerchant[] }>(response);
  return payload.data;
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await fetch(`${API_BASE}/api/transactions`);
  const payload = await parse<{ data: Transaction[] }>(response);
  return payload.data;
};

export const fetchSyndicateGraph = async (): Promise<SyndicateGraphType> => {
  const response = await fetch(`${API_BASE}/api/syndicate/graph`);
  const payload = await parse<{ data: SyndicateGraphType }>(response);
  return payload.data;
};

export type ScenarioName = 'IPL_BETTING_BURST' | 'FESTIVE_BAKERY_RUSH' | 'MULE_RING_SMURF' | 'RESET';

export const runScenario = async (scenario: ScenarioName): Promise<string> => {
  const response = await fetch(`${API_BASE}/api/simulator/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  const payload = await parse<{ message: string }>(response);
  return payload.message;
};

export const updateMerchantInterventions = async (
  merchantId: string,
  updates: Partial<SimulatedMerchant['interventions']> & { tier?: RiskTier }
): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/merchants/${merchantId}/tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  await parse<unknown>(response);
};

export const investigateMerchant = async (merchantId: string): Promise<AIInvestigationReport> => {
  const response = await fetch(`${API_BASE}/api/ai/investigate/${merchantId}`, { method: 'POST' });
  const payload = await parse<{ data: AIInvestigationReport }>(response);
  return payload.data;
};

/* ------------------------------------------------------------- ML endpoints */

export const fetchModelInfo = async (): Promise<MlModelInfo> => {
  const response = await fetch(`${API_BASE}/api/ml/model/info`);
  return parse<MlModelInfo>(response);
};

export const fetchMlDatasets = async (): Promise<MlDatasets> => {
  const response = await fetch(`${API_BASE}/api/ml/datasets`);
  return parse<MlDatasets>(response);
};

export const scoreMerchant = async (merchantId: string): Promise<MerchantScoreResponse> => {
  const response = await fetch(`${API_BASE}/api/ml/score/merchant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId }),
  });
  return parse<MerchantScoreResponse>(response);
};

export const datasetLabel = (entry: DatasetEntry): string =>
  entry.available ? 'available locally' : 'not available in this environment';
