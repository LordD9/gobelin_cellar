import { all, get, getDb } from '../db';
import { listWines } from './wines';
import type { WineResponse, WineType } from '../types';

export interface TypeCount {
  type: WineType;
  bottles: number;
  references: number;
}

export interface DashboardStats {
  year: number;
  total_bottles: number;
  total_references: number;
  by_type: TypeCount[];
  drink_this_year: WineResponse[];
  past_peak: WineResponse[];
  not_ready: WineResponse[];
}

export async function getDashboard(year = new Date().getFullYear()): Promise<DashboardStats> {
  const totals = await get<{ bottles: number; reference_count: number }>(
    getDb(),
    `SELECT COALESCE(SUM(quantity), 0) AS bottles, COUNT(*) AS reference_count
     FROM wines WHERE quantity > 0`,
  );

  const byTypeRows = await all<{ type: WineType; bottles: number; reference_count: number }>(
    getDb(),
    `SELECT type, COALESCE(SUM(quantity), 0) AS bottles, COUNT(*) AS reference_count
     FROM wines
     WHERE quantity > 0
     GROUP BY type
     ORDER BY bottles DESC`,
  );
  const byType: TypeCount[] = byTypeRows.map((row) => ({
    type: row.type,
    bottles: row.bottles,
    references: row.reference_count,
  }));

  const [drink_this_year, past_peak, not_ready] = await Promise.all([
    listWines({ drink: 'this_year', year }),
    listWines({ drink: 'past_peak', year }),
    listWines({ drink: 'not_ready', year }),
  ]);

  return {
    year,
    total_bottles: totals?.bottles ?? 0,
    total_references: totals?.reference_count ?? 0,
    by_type: byType,
    drink_this_year,
    past_peak,
    not_ready,
  };
}
