import { HttpError } from '../http/errors';

const DEFAULT_TIMEOUT_MS = 180_000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function openrouterChat(options: {
  apiKey: string;
  model: string;
  prompt: string;
  imageBase64?: string;
  json?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const key = options.apiKey.trim();
  if (!key) {
    throw new HttpError(400, 'Clé OpenRouter manquante. Ajoute-la dans Réglages.');
  }

  const content: unknown[] = [{ type: 'text', text: options.prompt }];
  if (options.imageBase64) {
    const url = options.imageBase64.startsWith('data:')
      ? options.imageBase64
      : `data:image/jpeg;base64,${options.imageBase64}`;
    content.push({ type: 'image_url', image_url: { url } });
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': 'https://github.com/LordD9/gobelin_cellar',
        'X-Title': 'Goblin Cellar',
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content }],
        temperature: 0.1,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new HttpError(504, "OpenRouter n'a pas répondu à temps.");
    }
    throw new HttpError(502, 'Impossible de joindre OpenRouter.');
  }

  const text = await response.text();
  let data: {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new HttpError(502, 'Réponse OpenRouter illisible');
  }

  if (!response.ok) {
    const message = data.error?.message || `OpenRouter a renvoyé une erreur (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(400, 'Clé OpenRouter refusée. Vérifie-la dans Réglages.');
    }
    throw new HttpError(response.status === 429 ? 429 : 502, message);
  }

  const raw = data.choices?.[0]?.message?.content;
  const contentText = Array.isArray(raw)
    ? raw.map((part) => part.text ?? '').join('').trim()
    : (raw ?? '').trim();
  if (!contentText) {
    throw new HttpError(502, 'Le modèle OpenRouter a renvoyé une réponse vide');
  }
  return contentText;
}
