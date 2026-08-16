import type {
  ApogeeEstimate,
  DashboardStats,
  LocationResponse,
  LocationTreeNode,
  WineListFilters,
  WinePayload,
  WineResponse,
  WineType,
} from './types';

const API = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Erreur réseau';
    throw new Error(message);
  }
  return data as T;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  dashboard: (year?: number) =>
    request<DashboardStats>(`/dashboard${query({ year })}`),

  listWines: (filters: WineListFilters = {}) =>
    request<WineResponse[]>(
      `/wines${query({
        type: filters.type,
        location_id: filters.location_id,
        q: filters.q,
        drink: filters.drink,
      })}`,
    ),

  getWine: (id: number) => request<WineResponse>(`/wines/${id}`),

  createWine: (payload: WinePayload) =>
    request<WineResponse>('/wines', { method: 'POST', body: JSON.stringify(payload) }),

  updateWine: (id: number, payload: Partial<WinePayload>) =>
    request<WineResponse>(`/wines/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteWine: (id: number) => request<void>(`/wines/${id}`, { method: 'DELETE' }),

  recomputeApogee: (id: number) =>
    request<WineResponse>(`/wines/${id}/apogee`, { method: 'POST' }),

  estimateApogee: (params: {
    type: WineType;
    region?: string | null;
    appellation?: string | null;
    millesime: number;
  }) =>
    request<{ estimate: ApogeeEstimate | null }>(
      `/apogee/estimate${query({
        type: params.type,
        region: params.region ?? undefined,
        appellation: params.appellation ?? undefined,
        millesime: params.millesime,
      })}`,
    ),

  listLocations: () => request<LocationResponse[]>('/locations'),

  locationTree: () => request<LocationTreeNode[]>('/locations?tree=1'),

  createLocation: (payload: { name: string; parent_id?: number | null; description?: string | null }) =>
    request<LocationResponse>('/locations', { method: 'POST', body: JSON.stringify(payload) }),

  updateLocation: (
    id: number,
    payload: { name?: string; parent_id?: number | null; description?: string | null },
  ) => request<LocationResponse>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteLocation: (id: number) => request<void>(`/locations/${id}`, { method: 'DELETE' }),
};
