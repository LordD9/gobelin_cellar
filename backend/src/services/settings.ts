import { all, getDb, run } from '../db';
import { envLocksBasePath, normalizeBasePath } from '../basePath';
import { badRequest } from '../http/errors';
import {
  DEFAULT_LLM_MODEL,
  DEFAULT_VLM_MODEL,
  SUGGESTED_LLM_MODELS,
  SUGGESTED_OPENROUTER_LLM,
  SUGGESTED_OPENROUTER_VLM,
  SUGGESTED_VLM_MODELS,
  type AppSettings,
  type SettingsResponse,
} from '../types/settings';
import { getOllamaStatus } from './ollama';

interface SettingRow {
  key: string;
  value: string;
}

export function defaultOllamaUrl(): string {
  if (process.env.OLLAMA_URL) {
    return normalizeUrl(process.env.OLLAMA_URL);
  }
  if (process.env.NODE_ENV === 'production') {
    return 'http://host.docker.internal:11434';
  }
  return 'http://127.0.0.1:11434';
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await all<SettingRow>(getDb(), 'SELECT key, value FROM app_settings');
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    ai_provider: map.ai_provider === 'openrouter' ? 'openrouter' : 'ollama',
    ollama_url: map.ollama_url ? normalizeUrl(map.ollama_url) : defaultOllamaUrl(),
    vlm_model: map.vlm_model?.trim() || process.env.OLLAMA_VLM_MODEL?.trim() || DEFAULT_VLM_MODEL,
    llm_model: map.llm_model?.trim() || process.env.OLLAMA_LLM_MODEL?.trim() || DEFAULT_LLM_MODEL,
    searxng_url: emptyToNull(map.searxng_url ?? process.env.SEARXNG_URL ?? null),
    openrouter_api_key: (map.openrouter_api_key || process.env.OPENROUTER_API_KEY || '').trim(),
    base_path: normalizeBasePath(process.env.BASE_PATH || map.base_path || ''),
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const entries: Array<[keyof AppSettings, string | null]> = [];
  if (patch.ai_provider !== undefined) {
    entries.push(['ai_provider', patch.ai_provider === 'openrouter' ? 'openrouter' : 'ollama']);
  }
  if (patch.ollama_url !== undefined) {
    entries.push(['ollama_url', requireHttpUrl(patch.ollama_url, 'ollama_url')]);
  }
  if (patch.vlm_model !== undefined) {
    entries.push(['vlm_model', requireModelName(patch.vlm_model, 'vlm_model')]);
  }
  if (patch.llm_model !== undefined) {
    entries.push(['llm_model', requireModelName(patch.llm_model, 'llm_model')]);
  }
  if (patch.searxng_url !== undefined) {
    entries.push([
      'searxng_url',
      patch.searxng_url ? requireHttpUrl(patch.searxng_url, 'searxng_url') : '',
    ]);
  }
  if (patch.openrouter_api_key !== undefined) {
    entries.push(['openrouter_api_key', patch.openrouter_api_key.trim()]);
  }
  if (patch.base_path !== undefined) {
    if (envLocksBasePath()) {
      throw badRequest('Le chemin d’URL est fixé par la variable d’environnement BASE_PATH');
    }
    entries.push(['base_path', normalizeBasePath(patch.base_path)]);
  }

  for (const [key, value] of entries) {
    await run(
      getDb(),
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value ?? ''],
    );
  }

  return getSettings();
}

export async function getSettingsResponse(): Promise<SettingsResponse> {
  const settings = await getSettings();
  const ollama = settings.ai_provider === 'ollama'
    ? await getOllamaStatus(settings.ollama_url)
    : { online: false, version: null, models: [], error: null };
  const openrouter = settings.ai_provider === 'openrouter';
  const { openrouter_api_key, ...publicSettings } = settings;
  return {
    ...publicSettings,
    openrouter_api_key_set: Boolean(openrouter_api_key),
    base_path_locked: envLocksBasePath(),
    suggested_vlm: openrouter ? SUGGESTED_OPENROUTER_VLM : SUGGESTED_VLM_MODELS,
    suggested_llm: openrouter ? SUGGESTED_OPENROUTER_LLM : SUGGESTED_LLM_MODELS,
    ollama,
  };
}

export function requireHttpUrl(raw: string, field: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw badRequest(`Le champ « ${field} » est obligatoire`);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw badRequest(`« ${field} » n'est pas une URL valide`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw badRequest(`« ${field} » doit commencer par http:// ou https://`);
  }
  parsed.hash = '';
  const href = parsed.toString();
  return href.endsWith('/') && parsed.pathname === '/' ? href.slice(0, -1) : href.replace(/\/$/, '');
}

function requireModelName(raw: string, field: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw badRequest(`Le champ « ${field} » est obligatoire`);
  }
  if (!/^[A-Za-z0-9._:\/-]+$/.test(trimmed)) {
    throw badRequest(`« ${field} » contient des caractères invalides`);
  }
  return trimmed;
}

function normalizeUrl(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

function emptyToNull(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : normalizeUrl(trimmed);
}
