import type { Location } from './location';

/** Types de vin reconnus par l'application. */
export const WINE_TYPES = ['rouge', 'blanc', 'rose', 'petillant'] as const;
export type WineType = (typeof WINE_TYPES)[number];

/** Origine de la fenêtre d'apogée. */
export const APOGEE_SOURCES = ['auto', 'manual'] as const;
export type ApogeeSource = (typeof APOGEE_SOURCES)[number];

/**
 * Fiche vin stockée en base.
 *
 * Une ligne = une cuvée / millésime à un emplacement donné.
 * Si le même vin est réparti dans plusieurs lieux, on crée plusieurs fiches.
 */
export interface Wine {
  id: number;
  domaine: string;
  cuvee: string | null;
  type: WineType;
  region: string | null;
  appellation: string | null;
  millesime: number | null;
  quantity: number;
  location_id: number | null;

  cepages: string | null;
  domaine_info: string | null;
  accords: string | null;
  potentiel_garde: string | null;

  drink_from: number | null;
  drink_until: number | null;
  apogee_source: ApogeeSource;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewWine = Omit<Wine, 'id' | 'created_at' | 'updated_at'>;
export type WineUpdate = Partial<NewWine>;

export interface WineResponse extends Wine {
  location: Location | null;
  location_path: string | null;
}
