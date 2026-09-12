export interface SuggestedModel {
  name: string;
  size: string;
  note: string;
}

/** Modèles vision adaptés pour des configurations standards (CPU ou GPU modeste). */
export const SUGGESTED_VLM_MODELS: SuggestedModel[] = [
  { name: 'gemma4:e4b', size: '~4 Go', note: 'Gemma 4 — vision compacte' },
  { name: 'gemma4:4b', size: '~4 Go', note: 'Gemma 4 4B' },
  { name: 'gemma3:4b', size: '3.3 Go', note: 'Gemma 3 multimodal' },
  { name: 'ministral-3', size: '2.0 Go', note: 'Léger (~3 Go RAM)' },
  { name: 'qwen3-vl:2b', size: '1.9 Go', note: 'Bon OCR d’étiquette' },
  { name: 'moondream', size: '1.7 Go', note: 'Le plus léger' },
];

/** Petits LLM pour compléter la fiche après recherche web. */
export const SUGGESTED_LLM_MODELS: SuggestedModel[] = [
  { name: 'gemma4', size: 'variable', note: 'Gemma 4 (tag Ollama)' },
  { name: 'gemma4:e4b', size: '~4 Go', note: 'Gemma 4 compact' },
  { name: 'gemma4:4b', size: '~4 Go', note: 'Gemma 4 4B' },
  { name: 'gemma3:4b', size: '3.3 Go', note: 'Gemma 3' },
  { name: 'ministral-3', size: '2.0 Go', note: 'Léger' },
  { name: 'llama3.2:3b', size: '2.0 Go', note: 'JSON fiable' },
];

export const SUGGESTED_OPENROUTER_VLM: SuggestedModel[] = [
  { name: 'google/gemma-3-12b-it', size: 'API', note: 'Gemma 3 vision' },
  { name: 'google/gemini-2.0-flash', size: 'API', note: 'Rapide, vision' },
  { name: 'qwen/qwen2.5-vl-7b-instruct', size: 'API', note: 'OCR étiquette' },
];

export const SUGGESTED_OPENROUTER_LLM: SuggestedModel[] = [
  { name: 'google/gemma-3-12b-it', size: 'API', note: 'Gemma 3' },
  { name: 'google/gemma-3-4b-it', size: 'API', note: 'Gemma 3 compact' },
  { name: 'openai/gpt-4o-mini', size: 'API', note: 'JSON fiable' },
];

export const DEFAULT_VLM_MODEL = 'gemma4:e4b';
export const DEFAULT_LLM_MODEL = 'gemma4';
export const DEFAULT_OPENROUTER_VLM = 'google/gemma-3-12b-it';
export const DEFAULT_OPENROUTER_LLM = 'google/gemma-3-12b-it';

export type AiProvider = 'ollama' | 'openrouter';

export interface AppSettings {
  ai_provider: AiProvider;
  ollama_url: string;
  vlm_model: string;
  llm_model: string;
  searxng_url: string | null;
  openrouter_api_key: string;
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

export interface SettingsResponse extends Omit<AppSettings, 'openrouter_api_key'> {
  openrouter_api_key_set: boolean;
  suggested_vlm: SuggestedModel[];
  suggested_llm: SuggestedModel[];
  ollama: OllamaStatus;
}
