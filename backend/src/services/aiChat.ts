import { HttpError } from '../http/errors';
import { ollamaChat } from './ollama';
import { openrouterChat } from './openrouter';
import { getSettings } from './settings';

export async function visionComplete(imageBase64: string, prompt: string): Promise<{ content: string; model: string }> {
  const settings = await getSettings();
  if (settings.ai_provider === 'openrouter') {
    const content = await openrouterChat({
      apiKey: settings.openrouter_api_key,
      model: settings.vlm_model,
      prompt,
      imageBase64,
      json: true,
    });
    return { content, model: settings.vlm_model };
  }
  const content = await ollamaChat({
    baseUrl: settings.ollama_url,
    model: settings.vlm_model,
    format: 'json',
    messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
  });
  return { content, model: settings.vlm_model };
}

export async function jsonComplete(prompt: string): Promise<{ content: string; model: string }> {
  const settings = await getSettings();
  if (settings.ai_provider === 'openrouter') {
    const content = await openrouterChat({
      apiKey: settings.openrouter_api_key,
      model: settings.llm_model,
      prompt,
      json: true,
    });
    return { content, model: settings.llm_model };
  }
  const content = await ollamaChat({
    baseUrl: settings.ollama_url,
    model: settings.llm_model,
    format: 'json',
    messages: [{ role: 'user', content: prompt }],
  });
  return { content, model: settings.llm_model };
}

export function assertProviderReady(settings: {
  ai_provider: string;
  openrouter_api_key: string;
}): void {
  if (settings.ai_provider === 'openrouter' && !settings.openrouter_api_key.trim()) {
    throw new HttpError(400, 'Choisis OpenRouter dans Réglages et renseigne la clé API.');
  }
}
