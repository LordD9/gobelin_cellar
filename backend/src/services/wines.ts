import { all, get, getDb, run } from '../db';
import { notFound } from '../http/errors';
import type { ApogeeSource, NewWine, Wine, WineResponse, WineUpdate } from '../types';
import { estimateApogee } from './apogee';
import { buildLocationPath, findLocation, requireLocation } from './locations';

export interface WineListFilters {
  type?: string;
  location_id?: number;
  region?: string;
  q?: string;
  drink?: 'this_year' | 'past_peak' | 'not_ready';
  year?: number;
}

export async function findWine(id: number): Promise<Wine | undefined> {
  return get<Wine>(getDb(), 'SELECT * FROM wines WHERE id = ?', [id]);
}

export async function requireWine(id: number): Promise<Wine> {
  const wine = await findWine(id);
  if (!wine) {
    throw notFound('Vin introuvable');
  }
  return wine;
}

export async function toWineResponse(wine: Wine): Promise<WineResponse> {
  const location = wine.location_id != null ? (await findLocation(wine.location_id)) ?? null : null;
  const location_path = wine.location_id != null ? await buildLocationPath(wine.location_id) : null;
  return { ...wine, location, location_path };
}

export async function listWines(filters: WineListFilters = {}): Promise<WineResponse[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.type) {
    clauses.push('type = ?');
    params.push(filters.type);
  }
  if (filters.location_id != null) {
    clauses.push('location_id = ?');
    params.push(filters.location_id);
  }
  if (filters.region) {
    clauses.push('region LIKE ?');
    params.push(`%${filters.region}%`);
  }
  if (filters.q) {
    clauses.push('(domaine LIKE ? OR cuvee LIKE ? OR appellation LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }

  const year = filters.year ?? new Date().getFullYear();
  if (filters.drink === 'this_year') {
    clauses.push('drink_from IS NOT NULL AND drink_until IS NOT NULL AND drink_from <= ? AND drink_until >= ? AND quantity > 0');
    params.push(year, year);
  } else if (filters.drink === 'past_peak') {
    clauses.push('drink_until IS NOT NULL AND drink_until < ? AND quantity > 0');
    params.push(year);
  } else if (filters.drink === 'not_ready') {
    clauses.push('drink_from IS NOT NULL AND drink_from > ? AND quantity > 0');
    params.push(year);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await all<Wine>(
    getDb(),
    `SELECT * FROM wines ${where}
     ORDER BY drink_until IS NULL, drink_until ASC, domaine ASC, millesime ASC`,
    params,
  );

  return Promise.all(rows.map(toWineResponse));
}

async function applyApogee(
  input: Partial<NewWine>,
  existing?: Wine,
): Promise<Pick<Wine, 'drink_from' | 'drink_until' | 'apogee_source' | 'potentiel_garde'>> {
  const type = input.type ?? existing?.type;
  const region = input.region !== undefined ? input.region : existing?.region ?? null;
  const appellation = input.appellation !== undefined ? input.appellation : existing?.appellation ?? null;
  const millesime = input.millesime !== undefined ? input.millesime : existing?.millesime ?? null;

  const source = resolveApogeeSource(input, existing);
  const shouldEstimate = source === 'auto' && type != null;

  if (shouldEstimate) {
    const estimate = await estimateApogee({ type, region, appellation, millesime });
    if (estimate) {
      return {
        drink_from: estimate.drink_from,
        drink_until: estimate.drink_until,
        apogee_source: 'auto',
        potentiel_garde:
          input.potentiel_garde !== undefined
            ? input.potentiel_garde
            : existing?.potentiel_garde ?? estimate.potentiel_garde,
      };
    }

    return {
      drink_from: null,
      drink_until: null,
      apogee_source: 'auto',
      potentiel_garde:
        input.potentiel_garde !== undefined ? input.potentiel_garde : existing?.potentiel_garde ?? null,
    };
  }

  return {
    drink_from: input.drink_from !== undefined ? input.drink_from : existing?.drink_from ?? null,
    drink_until: input.drink_until !== undefined ? input.drink_until : existing?.drink_until ?? null,
    apogee_source: 'manual',
    potentiel_garde:
      input.potentiel_garde !== undefined ? input.potentiel_garde : existing?.potentiel_garde ?? null,
  };
}

function resolveApogeeSource(input: Partial<NewWine>, existing?: Wine): ApogeeSource {
  if (input.apogee_source === 'auto') return 'auto';
  if (input.apogee_source === 'manual') return 'manual';
  if (input.drink_from !== undefined || input.drink_until !== undefined) return 'manual';

  if (!existing) return 'auto';

  if (existing.apogee_source === 'auto') {
    const profileChanged =
      (input.type !== undefined && input.type !== existing.type) ||
      (input.region !== undefined && input.region !== existing.region) ||
      (input.appellation !== undefined && input.appellation !== existing.appellation) ||
      (input.millesime !== undefined && input.millesime !== existing.millesime);
    if (profileChanged) return 'auto';
  }

  return existing.apogee_source;
}

export async function createWine(input: NewWine): Promise<WineResponse> {
  if (input.location_id != null) {
    await requireLocation(input.location_id);
  }

  const apogee = await applyApogee(input);

  const result = await run(
    getDb(),
    `INSERT INTO wines (
      domaine, cuvee, type, region, appellation, millesime, quantity, location_id,
      cepages, domaine_info, accords, potentiel_garde, drink_from, drink_until, apogee_source, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.domaine,
      input.cuvee,
      input.type,
      input.region,
      input.appellation,
      input.millesime,
      input.quantity,
      input.location_id,
      input.cepages,
      input.domaine_info,
      input.accords,
      apogee.potentiel_garde,
      apogee.drink_from,
      apogee.drink_until,
      apogee.apogee_source,
      input.notes,
    ],
  );

  return toWineResponse(await requireWine(result.lastID));
}

export async function updateWine(id: number, input: WineUpdate): Promise<WineResponse> {
  const current = await requireWine(id);

  if (input.location_id !== undefined && input.location_id != null) {
    await requireLocation(input.location_id);
  }

  const next: NewWine = {
    domaine: input.domaine ?? current.domaine,
    cuvee: input.cuvee !== undefined ? input.cuvee : current.cuvee,
    type: input.type ?? current.type,
    region: input.region !== undefined ? input.region : current.region,
    appellation: input.appellation !== undefined ? input.appellation : current.appellation,
    millesime: input.millesime !== undefined ? input.millesime : current.millesime,
    quantity: input.quantity ?? current.quantity,
    location_id: input.location_id !== undefined ? input.location_id : current.location_id,
    cepages: input.cepages !== undefined ? input.cepages : current.cepages,
    domaine_info: input.domaine_info !== undefined ? input.domaine_info : current.domaine_info,
    accords: input.accords !== undefined ? input.accords : current.accords,
    potentiel_garde: input.potentiel_garde !== undefined ? input.potentiel_garde : current.potentiel_garde,
    drink_from: input.drink_from !== undefined ? input.drink_from : current.drink_from,
    drink_until: input.drink_until !== undefined ? input.drink_until : current.drink_until,
    apogee_source: input.apogee_source ?? current.apogee_source,
    notes: input.notes !== undefined ? input.notes : current.notes,
  };

  const apogee = await applyApogee(input, current);

  await run(
    getDb(),
    `UPDATE wines SET
      domaine = ?, cuvee = ?, type = ?, region = ?, appellation = ?, millesime = ?,
      quantity = ?, location_id = ?, cepages = ?, domaine_info = ?, accords = ?,
      potentiel_garde = ?, drink_from = ?, drink_until = ?, apogee_source = ?, notes = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
    [
      next.domaine,
      next.cuvee,
      next.type,
      next.region,
      next.appellation,
      next.millesime,
      next.quantity,
      next.location_id,
      next.cepages,
      next.domaine_info,
      next.accords,
      apogee.potentiel_garde,
      apogee.drink_from,
      apogee.drink_until,
      apogee.apogee_source,
      next.notes,
      id,
    ],
  );

  return toWineResponse(await requireWine(id));
}

export async function deleteWine(id: number): Promise<void> {
  await requireWine(id);
  await run(getDb(), 'DELETE FROM wines WHERE id = ?', [id]);
}

export async function recomputeWineApogee(id: number): Promise<WineResponse> {
  return updateWine(id, { apogee_source: 'auto' });
}
