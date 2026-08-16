export const WINE_TYPES = ['rouge', 'blanc', 'rose', 'petillant'] as const;
export type WineType = (typeof WINE_TYPES)[number];

export const APOGEE_SOURCES = ['auto', 'manual'] as const;
export type ApogeeSource = (typeof APOGEE_SOURCES)[number];

export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationResponse extends Location {
  path: string;
  children_count: number;
}

export interface LocationTreeNode extends LocationResponse {
  children: LocationTreeNode[];
}

export interface Wine {
  id: number;
  domaine: string;
  cuvee: string | null;
  type: WineType;
  region: string | null;
  appellation: string | null;
  millesime: number | null;
  quantity: number;
  location_id: number | null;
  cepages: string | null;
  domaine_info: string | null;
  accords: string | null;
  potentiel_garde: string | null;
  drink_from: number | null;
  drink_until: number | null;
  apogee_source: ApogeeSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WineResponse extends Wine {
  location: Location | null;
  location_path: string | null;
}

export interface WinePayload {
  domaine: string;
  cuvee?: string | null;
  type: WineType;
  region?: string | null;
  appellation?: string | null;
  millesime?: number | null;
  quantity: number;
  location_id?: number | null;
  cepages?: string | null;
  domaine_info?: string | null;
  accords?: string | null;
  potentiel_garde?: string | null;
  drink_from?: number | null;
  drink_until?: number | null;
  apogee_source?: ApogeeSource;
  notes?: string | null;
}

export interface TypeCount {
  type: WineType;
  bottles: number;
  references: number;
}

export interface DashboardStats {
  year: number;
  total_bottles: number;
  total_references: number;
  by_type: TypeCount[];
  drink_this_year: WineResponse[];
  past_peak: WineResponse[];
  not_ready: WineResponse[];
}

export interface ApogeeEstimate {
  drink_from: number;
  drink_until: number;
  rule_name: string;
  potentiel_garde: string;
}

export interface WineListFilters {
  type?: WineType;
  location_id?: number;
  q?: string;
  drink?: 'this_year' | 'past_peak' | 'not_ready';
}

export interface SuggestedModel {
  name: string;
  size: string;
  note: string;
}

export interface OllamaModelInfo {
  name: string;
  size: number | null;
  modified_at: string | null;
  vision: boolean;
}

export interface OllamaStatus {
  online: boolean;
  version: string | null;
  models: OllamaModelInfo[];
  error: string | null;
}

export interface AppSettings {
  ollama_url: string;
  vlm_model: string;
  llm_model: string;
  searxng_url: string | null;
}

export interface SettingsResponse extends AppSettings {
  suggested_vlm: SuggestedModel[];
  suggested_llm: SuggestedModel[];
  ollama: OllamaStatus;
}

export interface WineIdentification {
  domaine: string | null;
  cuvee: string | null;
  type: WineType | null;
  region: string | null;
  appellation: string | null;
  millesime: number | null;
  cepages: string | null;
  raw_text: string;
  confidence: number;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface WineEnrichment extends WineIdentification {
  domaine_info: string | null;
  accords: string | null;
  potentiel_garde: string | null;
  uncertain_fields: string[];
  sources: SearchSource[];
}

export interface LabelScanResponse {
  identification: WineIdentification;
  model: string;
}

export interface EnrichScanResponse {
  enrichment: WineEnrichment;
  model: string;
}
