import type { WineType } from './wine';

export interface WineIdentification {
  domaine: string | null;
  cuvee: string | null;
  type: WineType | null;
  region: string | null;
  appellation: string | null;
  millesime: number | null;
  cepages: string | null;
  raw_text: string;
  confidence: number;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface WineEnrichment extends WineIdentification {
  domaine_info: string | null;
  accords: string | null;
  potentiel_garde: string | null;
  uncertain_fields: string[];
  sources: SearchSource[];
}

export interface LabelScanResponse {
  identification: WineIdentification;
  model: string;
}

export interface EnrichScanResponse {
  enrichment: WineEnrichment;
  model: string;
}
