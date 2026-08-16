export interface SuggestedModel {
  name: string;
  size: string;
  note: string;
}

/** Modèles vision assez petits pour ~16 Go de RAM (GTX 960 = peu de VRAM, souvent CPU). */
export const SUGGESTED_VLM_MODELS: SuggestedModel[] = [
  { name: 'qwen3-vl:2b', size: '1.9 Go', note: 'Recommandé — bon OCR d’étiquette' },
  { name: 'moondream', size: '1.7 Go', note: 'Le plus léger' },
  { name: 'qwen2.5vl:3b', size: '3.2 Go', note: 'Très lisible sur les labels' },
  { name: 'qwen3-vl:4b', size: '3.3 Go', note: 'Plus précis si la machine suit' },
];

/** Petits LLM pour compléter la fiche après recherche web. */
export const SUGGESTED_LLM_MODELS: SuggestedModel[] = [
  { name: 'llama3.2:3b', size: '2.0 Go', note: 'Recommandé — JSON fiable' },
  { name: 'qwen2.5:3b', size: '1.9 Go', note: 'Bon en français' },
  { name: 'gemma2:2b', size: '1.6 Go', note: 'Ultra léger' },
  { name: 'phi3:mini', size: '2.2 Go', note: 'Compact et structuré' },
];

export const DEFAULT_VLM_MODEL = 'qwen3-vl:2b';
export const DEFAULT_LLM_MODEL = 'llama3.2:3b';

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
