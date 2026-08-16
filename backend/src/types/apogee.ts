import type { WineType } from './wine';

export interface ApogeeRule {
  id: number;
  name: string;
  type: WineType | null;
  region: string | null;
  appellation: string | null;
  drink_from_offset: number;
  drink_until_offset: number;
  priority: number;
}

export interface ApogeeEstimate {
  drink_from: number;
  drink_until: number;
  rule_name: string;
  potentiel_garde: string;
}

export interface ApogeeProfile {
  type: WineType;
  region: string | null;
  appellation: string | null;
  millesime: number | null;
}
