import { Router } from 'express';
import { HttpError } from '../http/errors';
import { ollamaPullStream } from '../services/ollama';
import { getSettings, getSettingsResponse, updateSettings } from '../services/settings';
import { asRecord, optionalString } from '../validation';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  res.json(await getSettingsResponse());
});

settingsRouter.put('/', async (req, res) => {
  const body = asRecord(req.body);
  const searxngRaw = optionalString(body.searxng_url, 'searxng_url');
  const updated = await updateSettings({
    ollama_url: optionalString(body.ollama_url, 'ollama_url') ?? undefined,
    vlm_model: optionalString(body.vlm_model, 'vlm_model') ?? undefined,
    llm_model: optionalString(body.llm_model, 'llm_model') ?? undefined,
    searxng_url: searxngRaw === undefined ? undefined : searxngRaw,
  });
  res.json(await getSettingsResponse().then((full) => ({ ...full, ...updated })));
});

settingsRouter.get('/ollama', async (_req, res) => {
  res.json(await getSettingsResponse());
});

settingsRouter.post('/ollama/pull', async (req, res) => {
  const model = optionalString(asRecord(req.body).model, 'model');
  if (!model) {
    throw new HttpError(400, 'Le nom du modèle est obligatoire');
  }

  const settings = await getSettings();
  const upstream = await ollamaPullStream(settings.ollama_url, model);
  res.status(upstream.ok ? 200 : upstream.status);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');

  if (!upstream.body) {
    const text = await upstream.text();
    res.end(text || JSON.stringify({ error: 'Réponse Ollama vide' }));
    return;
  }

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      throw error;
    }
    res.end();
  }
});
