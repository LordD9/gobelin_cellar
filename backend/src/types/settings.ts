export interface SuggestedModel {
  name: string;
  size: string;
  note: string;
}

/** Modèles vision adaptés pour des configurations standards (CPU ou GPU modeste). */
export const SUGGESTED_VLM_MODELS: SuggestedModel[] = [
  { name: 'ministral-3', size: '2.0 Go', note: 'Recommandé (3b - ~3 Go RAM)' },
  { name: 'ministral:8b', size: '4.5 Go', note: 'Plus performant (8b - ~6 Go RAM)' },
  { name: 'ministral:14b', size: '8.0 Go', note: 'Pour grosse configuration (14b - ~10 Go RAM)' },
  { name: 'qwen3-vl:2b', size: '1.9 Go', note: 'Recommandé — bon OCR d’étiquette' },
  { name: 'moondream', size: '1.7 Go', note: 'Le plus léger' },
  { name: 'qwen2.5vl:3b', size: '3.2 Go', note: 'Très lisible sur les labels' },
];

/** Petits LLM pour compléter la fiche après recherche web. */
export const SUGGESTED_LLM_MODELS: SuggestedModel[] = [
  { name: 'ministral-3', size: '2.0 Go', note: 'Recommandé (3b - ~3 Go RAM)' },
  { name: 'ministral:8b', size: '4.5 Go', note: 'Plus performant (8b - ~6 Go RAM)' },
  { name: 'ministral:14b', size: '8.0 Go', note: 'Pour grosse configuration (14b - ~10 Go RAM)' },
  { name: 'llama3.2:3b', size: '2.0 Go', note: 'Alternative — JSON fiable' },
  { name: 'qwen2.5:3b', size: '1.9 Go', note: 'Alternative — Bon en français' },
];

export const DEFAULT_VLM_MODEL = 'ministral-3';
export const DEFAULT_LLM_MODEL = 'ministral-3';

export interface AppSettings {
  ollama_url: string;
  vlm_model: string;
  llm_model: string;
  searxng_url: string | null;
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

export interface SettingsResponse extends AppSettings {
  suggested_vlm: SuggestedModel[];
  suggested_llm: SuggestedModel[];
  ollama: OllamaStatus;
}
