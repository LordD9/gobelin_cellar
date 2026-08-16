import type { WineType } from '../types';

export interface ApogeeRuleSeed {
  name: string;
  type: WineType | null;
  region: string | null;
  appellation: string | null;
  drink_from_offset: number;
  drink_until_offset: number;
  priority: number;
}

/**
 * Table de référence interne pour l'estimation d'apogée.
 * Les offsets s'ajoutent au millésime (ex. +5 / +15 → 2015 → 2020–2030).
 * Une règle plus spécifique (appellation) a une priorité plus haute.
 */
export const APOGEE_RULE_SEEDS: ApogeeRuleSeed[] = [
  { name: 'Pauillac', type: 'rouge', region: 'Bordeaux', appellation: 'Pauillac', drink_from_offset: 8, drink_until_offset: 25, priority: 100 },
  { name: 'Saint-Julien', type: 'rouge', region: 'Bordeaux', appellation: 'Saint-Julien', drink_from_offset: 7, drink_until_offset: 22, priority: 100 },
  { name: 'Margaux', type: 'rouge', region: 'Bordeaux', appellation: 'Margaux', drink_from_offset: 7, drink_until_offset: 22, priority: 100 },
  { name: 'Saint-Estèphe', type: 'rouge', region: 'Bordeaux', appellation: 'Saint-Estèphe', drink_from_offset: 7, drink_until_offset: 22, priority: 100 },
  { name: 'Saint-Émilion', type: 'rouge', region: 'Bordeaux', appellation: 'Saint-Émilion', drink_from_offset: 6, drink_until_offset: 20, priority: 100 },
  { name: 'Pomerol', type: 'rouge', region: 'Bordeaux', appellation: 'Pomerol', drink_from_offset: 6, drink_until_offset: 20, priority: 100 },
  { name: 'Sauternes', type: 'blanc', region: 'Bordeaux', appellation: 'Sauternes', drink_from_offset: 8, drink_until_offset: 30, priority: 100 },
  { name: 'Barsac', type: 'blanc', region: 'Bordeaux', appellation: 'Barsac', drink_from_offset: 8, drink_until_offset: 25, priority: 100 },
  { name: 'Bordeaux rouge de garde', type: 'rouge', region: 'Bordeaux', appellation: null, drink_from_offset: 5, drink_until_offset: 15, priority: 50 },
  { name: 'Bordeaux blanc', type: 'blanc', region: 'Bordeaux', appellation: null, drink_from_offset: 2, drink_until_offset: 8, priority: 50 },

  { name: 'Chablis', type: 'blanc', region: 'Bourgogne', appellation: 'Chablis', drink_from_offset: 3, drink_until_offset: 10, priority: 100 },
  { name: 'Meursault', type: 'blanc', region: 'Bourgogne', appellation: 'Meursault', drink_from_offset: 4, drink_until_offset: 12, priority: 100 },
  { name: 'Puligny-Montrachet', type: 'blanc', region: 'Bourgogne', appellation: 'Puligny-Montrachet', drink_from_offset: 5, drink_until_offset: 15, priority: 100 },
  { name: 'Gevrey-Chambertin', type: 'rouge', region: 'Bourgogne', appellation: 'Gevrey-Chambertin', drink_from_offset: 6, drink_until_offset: 18, priority: 100 },
  { name: 'Vosne-Romanée', type: 'rouge', region: 'Bourgogne', appellation: 'Vosne-Romanée', drink_from_offset: 6, drink_until_offset: 20, priority: 100 },
  { name: 'Pommard', type: 'rouge', region: 'Bourgogne', appellation: 'Pommard', drink_from_offset: 5, drink_until_offset: 15, priority: 100 },
  { name: 'Bourgogne rouge', type: 'rouge', region: 'Bourgogne', appellation: null, drink_from_offset: 4, drink_until_offset: 12, priority: 50 },
  { name: 'Bourgogne blanc', type: 'blanc', region: 'Bourgogne', appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 50 },

  { name: 'Côte-Rôtie', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Côte-Rôtie', drink_from_offset: 8, drink_until_offset: 20, priority: 100 },
  { name: 'Hermitage', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Hermitage', drink_from_offset: 8, drink_until_offset: 20, priority: 100 },
  { name: 'Cornas', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Cornas', drink_from_offset: 6, drink_until_offset: 18, priority: 100 },
  { name: 'Châteauneuf-du-Pape', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Châteauneuf-du-Pape', drink_from_offset: 5, drink_until_offset: 18, priority: 100 },
  { name: 'Gigondas', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Gigondas', drink_from_offset: 4, drink_until_offset: 12, priority: 100 },
  { name: 'Condrieu', type: 'blanc', region: 'Vallée du Rhône', appellation: 'Condrieu', drink_from_offset: 2, drink_until_offset: 8, priority: 100 },
  { name: 'Côtes du Rhône', type: 'rouge', region: 'Vallée du Rhône', appellation: 'Côtes du Rhône', drink_from_offset: 3, drink_until_offset: 8, priority: 80 },
  { name: 'Vallée du Rhône rouge', type: 'rouge', region: 'Vallée du Rhône', appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 40 },
  { name: 'Vallée du Rhône blanc', type: 'blanc', region: 'Vallée du Rhône', appellation: null, drink_from_offset: 2, drink_until_offset: 6, priority: 40 },

  { name: 'Champagne', type: 'petillant', region: 'Champagne', appellation: 'Champagne', drink_from_offset: 3, drink_until_offset: 10, priority: 100 },
  { name: 'Champagne (région)', type: 'petillant', region: 'Champagne', appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 50 },

  { name: 'Sancerre', type: 'blanc', region: 'Loire', appellation: 'Sancerre', drink_from_offset: 2, drink_until_offset: 6, priority: 100 },
  { name: 'Pouilly-Fumé', type: 'blanc', region: 'Loire', appellation: 'Pouilly-Fumé', drink_from_offset: 2, drink_until_offset: 6, priority: 100 },
  { name: 'Vouvray', type: 'blanc', region: 'Loire', appellation: 'Vouvray', drink_from_offset: 3, drink_until_offset: 15, priority: 100 },
  { name: 'Chinon', type: 'rouge', region: 'Loire', appellation: 'Chinon', drink_from_offset: 3, drink_until_offset: 10, priority: 100 },
  { name: 'Loire blanc', type: 'blanc', region: 'Loire', appellation: null, drink_from_offset: 2, drink_until_offset: 7, priority: 50 },
  { name: 'Loire rouge', type: 'rouge', region: 'Loire', appellation: null, drink_from_offset: 3, drink_until_offset: 8, priority: 50 },

  { name: 'Alsace Riesling', type: 'blanc', region: 'Alsace', appellation: 'Riesling', drink_from_offset: 4, drink_until_offset: 15, priority: 90 },
  { name: 'Alsace Gewurztraminer', type: 'blanc', region: 'Alsace', appellation: 'Gewurztraminer', drink_from_offset: 3, drink_until_offset: 12, priority: 90 },
  { name: 'Alsace blanc', type: 'blanc', region: 'Alsace', appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 50 },

  { name: 'Morgon', type: 'rouge', region: 'Beaujolais', appellation: 'Morgon', drink_from_offset: 3, drink_until_offset: 10, priority: 100 },
  { name: 'Moulin-à-Vent', type: 'rouge', region: 'Beaujolais', appellation: 'Moulin-à-Vent', drink_from_offset: 3, drink_until_offset: 10, priority: 100 },
  { name: 'Fleurie', type: 'rouge', region: 'Beaujolais', appellation: 'Fleurie', drink_from_offset: 2, drink_until_offset: 7, priority: 100 },
  { name: 'Beaujolais', type: 'rouge', region: 'Beaujolais', appellation: null, drink_from_offset: 1, drink_until_offset: 4, priority: 50 },

  { name: 'Bandol', type: 'rouge', region: 'Provence', appellation: 'Bandol', drink_from_offset: 5, drink_until_offset: 15, priority: 100 },
  { name: 'Provence rosé', type: 'rose', region: 'Provence', appellation: null, drink_from_offset: 1, drink_until_offset: 3, priority: 50 },
  { name: 'Provence rouge', type: 'rouge', region: 'Provence', appellation: null, drink_from_offset: 3, drink_until_offset: 8, priority: 50 },

  { name: 'Languedoc rouge', type: 'rouge', region: 'Languedoc', appellation: null, drink_from_offset: 2, drink_until_offset: 8, priority: 50 },
  { name: 'Languedoc blanc', type: 'blanc', region: 'Languedoc', appellation: null, drink_from_offset: 1, drink_until_offset: 5, priority: 50 },
  { name: 'Roussillon rouge', type: 'rouge', region: 'Roussillon', appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 50 },

  { name: 'Barolo', type: 'rouge', region: 'Piémont', appellation: 'Barolo', drink_from_offset: 8, drink_until_offset: 25, priority: 100 },
  { name: 'Barbaresco', type: 'rouge', region: 'Piémont', appellation: 'Barbaresco', drink_from_offset: 6, drink_until_offset: 20, priority: 100 },
  { name: 'Chianti Classico', type: 'rouge', region: 'Toscane', appellation: 'Chianti', drink_from_offset: 3, drink_until_offset: 10, priority: 90 },
  { name: 'Brunello di Montalcino', type: 'rouge', region: 'Toscane', appellation: 'Brunello', drink_from_offset: 8, drink_until_offset: 22, priority: 100 },
  { name: 'Rioja Reserva', type: 'rouge', region: 'Rioja', appellation: 'Reserva', drink_from_offset: 5, drink_until_offset: 15, priority: 90 },
  { name: 'Rioja', type: 'rouge', region: 'Rioja', appellation: null, drink_from_offset: 3, drink_until_offset: 12, priority: 50 },

  { name: 'Rouge générique', type: 'rouge', region: null, appellation: null, drink_from_offset: 3, drink_until_offset: 10, priority: 1 },
  { name: 'Blanc générique', type: 'blanc', region: null, appellation: null, drink_from_offset: 2, drink_until_offset: 6, priority: 1 },
  { name: 'Rosé générique', type: 'rose', region: null, appellation: null, drink_from_offset: 1, drink_until_offset: 3, priority: 1 },
  { name: 'Pétillant générique', type: 'petillant', region: null, appellation: null, drink_from_offset: 1, drink_until_offset: 5, priority: 1 },
];
