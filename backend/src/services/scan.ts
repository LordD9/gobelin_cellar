import { badRequest } from '../http/errors';
import type { EnrichScanResponse, LabelScanResponse, WineEnrichment, WineIdentification } from '../types/scan';
import { HttpError } from '../http/errors';
import { LABEL_IMAGE_MAX_SIDE, normalizeLabelImage } from './labelImage';
import { ollamaChat } from './ollama';
import {
  assertImageSize,
  extractJsonObject,
  identificationFromModel,
  optionalText,
  optionalYear,
  parseImagePayload,
} from './scanParse';
import { getSettings } from './settings';
import { searchWineSources } from './webSearch';

const VLM_PROMPT = `Tu lis l'étiquette d'une bouteille de vin. Extrais uniquement ce qui est visible sur la photo.
Réponds uniquement avec un objet JSON, sans markdown :
{
  "domaine": string|null,
  "cuvee": string|null,
  "type": "rouge"|"blanc"|"rose"|"petillant"|null,
  "region": string|null,
  "appellation": string|null,
  "millesime": number|null,
  "cepages": string|null,
  "raw_text": string,
  "confidence": number
}
Règles :
- raw_text = tout le texte lisible, lignes séparées par \\n
- type : rouge, blanc, rose (sans accent) ou petillant (champagne, crémant, mousseux)
- millesime = année à 4 chiffres si elle apparaît
- confidence entre 0 et 1
- Si un champ n'est pas lisible, mets null. N'invente rien.`;

function llmPrompt(identification: WineIdentification, sourcesText: string): string {
  return `Tu complètes une fiche de cave à vin. L'étiquette a déjà été lue. Les extraits web servent à remplir les trous.
Ne contredis pas l'étiquette (domaine, cuvée, millésime visibles). N'invente pas un cépage ou une appellation sans indice dans les sources.
Les accords et le potentiel de garde peuvent être des recommandations raisonnables pour ce style de vin.

Identification :
${JSON.stringify(identification, null, 2)}

Sources web :
${sourcesText || '(aucune source trouvée)'}

Réponds uniquement avec un objet JSON, sans markdown :
{
  "domaine": string|null,
  "cuvee": string|null,
  "type": "rouge"|"blanc"|"rose"|"petillant"|null,
  "region": string|null,
  "appellation": string|null,
  "millesime": number|null,
  "cepages": string|null,
  "domaine_info": string|null,
  "accords": string|null,
  "potentiel_garde": string|null,
  "uncertain_fields": string[]
}
domaine_info : 2 à 4 phrases sur le domaine / la cuvée.
accords : liste courte (mets typiques).
potentiel_garde : une phrase (ex. « 5 à 12 ans »).
uncertain_fields : noms des champs peu sûrs.`;
}

export async function analyzeLabel(image: unknown): Promise<LabelScanResponse> {
  const { base64 } = parseImageOrThrow(image);
  const settings = await getSettings();
  const prepared = await normalizeLabelImage(base64, LABEL_IMAGE_MAX_SIDE);

  const content = await askVision(settings.ollama_url, settings.vlm_model, prepared);

  const identification = identificationFromModel(extractJsonObject(content));
  if (!identification.domaine && !identification.raw_text) {
    throw badRequest("Impossible de lire l'étiquette. Reprends la photo de plus près, bien éclairée.");
  }

  return { identification, model: settings.vlm_model };
}

function askVision(baseUrl: string, model: string, imageBase64: string): Promise<string> {
  return ollamaChat({
    baseUrl,
    model,
    format: 'json',
    messages: [
      {
        role: 'user',
        content: VLM_PROMPT,
        images: [imageBase64],
      },
    ],
  });
}

export async function enrichIdentification(raw: unknown): Promise<EnrichScanResponse> {
  const identification = coerceIdentification(raw);
  if (!identification.domaine && !identification.raw_text && !identification.cuvee) {
    throw badRequest('Indique au moins un domaine ou le texte de l’étiquette avant d’enrichir.');
  }

  const settings = await getSettings();
  const sources = await searchWineSources(identification, settings.searxng_url, settings.ollama_url);
  const sourcesText = sources
    .map((source, index) => `${index + 1}. ${source.title}\n${source.url}\n${source.snippet}`)
    .join('\n\n');

  const content = await ollamaChat({
    baseUrl: settings.ollama_url,
    model: settings.llm_model,
    format: 'json',
    messages: [{ role: 'user', content: llmPrompt(identification, sourcesText) }],
  });

  const parsed = extractJsonObject(content);
  const merged = identificationFromModel({ ...identification, ...parsed });
  const uncertain = Array.isArray(parsed.uncertain_fields)
    ? parsed.uncertain_fields.filter((item): item is string => typeof item === 'string')
    : [];

  const enrichment: WineEnrichment = {
    ...preferKnown(identification, merged),
    domaine_info: optionalText(parsed.domaine_info),
    accords: optionalText(parsed.accords),
    potentiel_garde: optionalText(parsed.potentiel_garde),
    uncertain_fields: uncertain,
    sources,
  };

  return { enrichment, model: settings.llm_model };
}

function preferKnown(label: WineIdentification, filled: WineIdentification): WineIdentification {
  return {
    domaine: label.domaine ?? filled.domaine,
    cuvee: label.cuvee ?? filled.cuvee,
    type: label.type ?? filled.type,
    region: label.region ?? filled.region,
    appellation: label.appellation ?? filled.appellation,
    millesime: label.millesime ?? filled.millesime,
    cepages: label.cepages ?? filled.cepages,
    raw_text: label.raw_text || filled.raw_text,
    confidence: Math.max(label.confidence, filled.confidence),
  };
}

function coerceIdentification(raw: unknown): WineIdentification {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw badRequest('Identification invalide');
  }
  const record = raw as Record<string, unknown>;
  return identificationFromModel({
    ...record,
    millesime: record.millesime ?? optionalYear(record.millesime),
  });
}

function parseImageOrThrow(image: unknown): { mime: string; base64: string } {
  try {
    const parsed = parseImagePayload(image);
    assertImageSize(parsed.base64);
    return parsed;
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : 'Image invalide');
  }
}
