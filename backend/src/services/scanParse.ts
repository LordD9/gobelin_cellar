import { WINE_TYPES, type WineType } from '../types';
import type { WineIdentification } from '../types/scan';

export function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();

  const parsed = tryParse(candidate);
  if (parsed) return parsed;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const sliced = tryParse(candidate.slice(start, end + 1));
    if (sliced) return sliced;
  }

  throw new Error('Réponse du modèle illisible (JSON attendu)');
}

function tryParse(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeWineType(value: unknown): WineType | null {
  if (typeof value !== 'string') return null;
  const v = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z]/g, '');

  if (['rouge', 'red'].includes(v)) return 'rouge';
  if (['blanc', 'white'].includes(v)) return 'blanc';
  if (['rose'].includes(v)) return 'rose';
  if (
    ['petillant', 'sparkling', 'champagne', 'cremant', 'mousseux', 'effervescent', 'bubbly'].includes(v)
  ) {
    return 'petillant';
  }
  if ((WINE_TYPES as readonly string[]).includes(v)) return v as WineType;
  return null;
}

export function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|n\/?a|inconnu|unknown|-)$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function optionalYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value >= 1800 && value <= 2100 ? value : null;
  }
  if (typeof value === 'string') {
    const match = value.match(/\b(18|19|20)\d{2}\b/);
    if (!match) return null;
    const year = Number(match[0]);
    return year >= 1800 && year <= 2100 ? year : null;
  }
  return null;
}

export function optionalConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1 && value <= 100) return Math.min(1, value / 100);
    return Math.min(1, Math.max(0, value));
  }
  return 0.5;
}

export function identificationFromModel(raw: Record<string, unknown>): WineIdentification {
  return {
    domaine: optionalText(raw.domaine ?? raw.producer ?? raw.chateau),
    cuvee: optionalText(raw.cuvee ?? raw.name ?? raw.wine),
    type: normalizeWineType(raw.type ?? raw.color ?? raw.couleur),
    region: optionalText(raw.region),
    appellation: optionalText(raw.appellation ?? raw.aoc ?? raw.aop),
    millesime: optionalYear(raw.millesime ?? raw.vintage ?? raw.annee),
    cepages: optionalText(raw.cepages ?? raw.grapes ?? raw.varietal),
    raw_text: optionalText(raw.raw_text ?? raw.label_text ?? raw.ocr) ?? '',
    confidence: optionalConfidence(raw.confidence),
  };
}

export function parseImagePayload(image: unknown): { mime: string; base64: string } {
  if (typeof image !== 'string' || image.trim().length < 32) {
    throw new Error('Image manquante');
  }

  const dataUrl = image
    .trim()
    .match(/^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (dataUrl) {
    const mime = dataUrl[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : dataUrl[1].toLowerCase();
    return { mime, base64: dataUrl[2].replace(/\s/g, '') };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(image) && image.replace(/\s/g, '').length > 100) {
    return { mime: 'image/jpeg', base64: image.replace(/\s/g, '') };
  }

  throw new Error('Image invalide (JPEG, PNG, WebP ou HEIC en base64)');
}

export function assertImageSize(base64: string, maxBytes = 50 * 1024 * 1024): void {
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > maxBytes) {
    throw new Error(`Image trop lourde (${Math.round(bytes / 1024 / 1024)} Mo, max ${Math.round(maxBytes / 1024 / 1024)} Mo)`);
  }
}
