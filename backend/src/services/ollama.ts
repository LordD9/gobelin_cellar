import { HttpError } from '../http/errors';
import type { OllamaModelInfo, OllamaStatus } from '../types/settings';

const DEFAULT_TIMEOUT_MS = 360_000;
const USER_AGENT = 'GoblinCellar/1.0';

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    size?: number;
    modified_at?: string;
    details?: { families?: string[]; family?: string };
  }>;
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export async function ollamaVersion(baseUrl: string, timeoutMs = 8_000): Promise<string | null> {
  const data = await ollamaJson<{ version?: string }>(baseUrl, '/api/version', { method: 'GET' }, timeoutMs);
  return data.version ?? null;
}

export async function ollamaTags(baseUrl: string, timeoutMs = 12_000): Promise<OllamaModelInfo[]> {
  const data = await ollamaJson<OllamaTagsResponse>(baseUrl, '/api/tags', { method: 'GET' }, timeoutMs);
  return (data.models ?? []).map((model) => {
    const name = model.name ?? model.model ?? '';
    const families = [
      ...(model.details?.families ?? []),
      model.details?.family ?? '',
      name,
    ]
      .join(' ')
      .toLowerCase();
    const vision = /vl|vision|llava|moondream|bakllava|minicpm|pixtral|ministral/.test(families);
    return {
      name,
      size: typeof model.size === 'number' ? model.size : null,
      modified_at: model.modified_at ?? null,
      vision,
    };
  }).filter((model) => model.name);
}

export async function getOllamaStatus(baseUrl: string): Promise<OllamaStatus> {
  try {
    const [version, models] = await Promise.all([ollamaVersion(baseUrl), ollamaTags(baseUrl)]);
    return { online: true, version, models, error: null };
  } catch (error) {
    return {
      online: false,
      version: null,
      models: [],
      error: error instanceof Error ? error.message : 'Ollama injoignable',
    };
  }
}

export async function ollamaChat(options: {
  baseUrl: string;
  model: string;
  messages: OllamaChatMessage[];
  format?: 'json';
  timeoutMs?: number;
}): Promise<string> {
  try {
    const data = await ollamaJson<OllamaChatResponse>(
      options.baseUrl,
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: false,
          format: options.format,
          keep_alive: 0,
          options: { temperature: 0.1 },
        }),
      },
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (data.error) {
      throw mapOllamaHttpError(data.error, options.model);
    }

    const content = data.message?.content?.trim() ?? '';
    if (!content) {
      throw new HttpError(502, 'Le modèle Ollama a renvoyé une réponse vide');
    }
    return content;
  } finally {
    await ollamaUnload(options.baseUrl, options.model);
  }
}

/** `keep_alive: 0` sur /api/chat ne suffit pas : Ollama ne décharge qu'avec /api/generate sans prompt. */
export async function ollamaUnload(baseUrl: string, model: string): Promise<void> {
  try {
    await ollamaJson(
      baseUrl,
      '/api/generate',
      {
        method: 'POST',
        body: JSON.stringify({ model, keep_alive: 0 }),
      },
      30_000,
    );
  } catch (error) {
    console.warn(`Déchargement Ollama (${model}) :`, error instanceof Error ? error.message : error);
  }
}

export async function ollamaPullStream(
  baseUrl: string,
  model: string,
): Promise<Response> {
  const url = joinUrl(baseUrl, '/api/pull');
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ name: model, stream: true }),
    });
  } catch (error) {
    throw mapFetchError(error, baseUrl);
  }
}

async function ollamaJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const url = joinUrl(baseUrl, path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw mapFetchError(error, baseUrl);
  }

  const text = await response.text();
  let data: T | { error?: string } = {} as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      if (!response.ok) {
        throw new HttpError(response.status, `Ollama a renvoyé une erreur (${response.status})`);
      }
      throw new HttpError(502, 'Réponse Ollama illisible');
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : `Ollama a renvoyé une erreur (${response.status})`;
    throw mapOllamaHttpError(message);
  }

  return data as T;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function mapFetchError(error: unknown, baseUrl: string): HttpError {
  if (error instanceof HttpError) return error;
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new HttpError(
      504,
      "Ollama n'a pas répondu à temps. Un modèle plus petit, ou une photo plus légère, aide beaucoup.",
    );
  }
  const cause = error instanceof Error ? error.message : 'erreur inconnue';
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|EHOSTUNREACH/i.test(cause)) {
    return new HttpError(
      502,
      `Ollama injoignable à ${baseUrl}. Vérifie l'URL dans Réglages et que le service tourne.`,
    );
  }
  return new HttpError(502, `Erreur Ollama : ${cause}`);
}

function mapOllamaHttpError(message: string, model?: string): HttpError {
  if (/not found|does not exist|pull/i.test(message)) {
    const hint = model ? ` Télécharge « ${model} » depuis Réglages.` : ' Télécharge le modèle depuis Réglages.';
    return new HttpError(400, `Modèle Ollama introuvable.${hint}`);
  }
  if (/unexpected eof|error was encountered while running the model/i.test(message)) {
    return new HttpError(
      502,
      "Le modèle a interrompu la lecture de la photo (souvent une image iPhone trop lourde ou HEIC). Réessaie : l'image est désormais réencodée côté serveur.",
    );
  }
  return new HttpError(502, message);
}
