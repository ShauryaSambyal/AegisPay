import {
  AIInvestigationReport,
  DatasetEntry,
  Merchant,
  MerchantScoreResponse,
  MlDatasets,
  MlModelInfo,
  PredictMerchantRequest,
  RiskTier,
  SimulatedMerchant,
  SyndicateGraphType,
  Transaction,
  AuthResponse,
  AuthStatusResponse,
  AuthUser,
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

export const predictBusinessOutcome = async (
  request: string | PredictMerchantRequest
): Promise<MerchantScoreResponse> => {
  const body = typeof request === 'string' ? { merchantId: request } : request;
  const response = await fetch(`${API_BASE}/api/ml/score/merchant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parse<MerchantScoreResponse>(response);
};

export const scoreMerchant = predictBusinessOutcome;

export const datasetLabel = (entry: DatasetEntry): string =>
  entry.available ? 'available locally' : 'not available in this environment';

/* ----------------------------------------------------------- Auth endpoints */

export const fetchAuthStatus = async (): Promise<AuthStatusResponse> => {
  const response = await fetch(`${API_BASE}/api/auth/status`);
  return parse<AuthStatusResponse>(response);
};

export const registerUser = async (data: {
  email: string;
  password: string;
  displayName?: string;
  role?: string;
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parse<AuthResponse>(response);
};

export const loginUser = async (credentials: {
  email?: string;
  password?: string;
  idToken?: string;
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return parse<AuthResponse>(response);
};

export const fetchCurrentUser = async (idToken: string): Promise<{ success: boolean; user: AuthUser }> => {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return parse<{ success: boolean; user: AuthUser }>(response);
};

export const logoutUser = async (idToken?: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  return parse<{ success: boolean }>(response);
};

