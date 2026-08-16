import type { Wine, WineType } from './types';

export type DrinkStatus = 'ready' | 'last_chance' | 'wait' | 'past' | 'unknown';

export const TYPE_LABELS: Record<WineType, string> = {
  rouge: 'Rouge',
  blanc: 'Blanc',
  rose: 'Rosé',
  petillant: 'Pétillant',
};

export const STATUS_LABELS: Record<DrinkStatus, string> = {
  ready: 'À boire',
  last_chance: 'Dernière année',
  wait: 'En garde',
  past: 'Dépassé',
  unknown: 'Sans apogée',
};

export function currentYear(): number {
  return new Date().getFullYear();
}

export function drinkStatus(wine: Pick<Wine, 'drink_from' | 'drink_until'>, year = currentYear()): DrinkStatus {
  const from = wine.drink_from;
  const until = wine.drink_until;
  if (from == null && until == null) return 'unknown';
  if (until != null && until < year) return 'past';
  if (from != null && from > year) return 'wait';
  if (until != null && until === year) return 'last_chance';
  if ((from == null || from <= year) && (until == null || until >= year)) return 'ready';
  return 'unknown';
}

export function wineTitle(wine: Pick<Wine, 'domaine' | 'cuvee'>): string {
  return wine.cuvee ? `${wine.domaine} — ${wine.cuvee}` : wine.domaine;
}

export function formatWindow(from: number | null, until: number | null): string {
  if (from != null && until != null) return `${from} – ${until}`;
  if (from != null) return `à partir de ${from}`;
  if (until != null) return `jusqu'en ${until}`;
  return 'Non renseignée';
}

export function bottlesLabel(count: number): string {
  return count <= 1 ? `${count} bouteille` : `${count} bouteilles`;
}
