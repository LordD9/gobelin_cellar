import { all, get, getDb, run } from '../db';
import { badRequest, notFound } from '../http/errors';
import type { Location, LocationResponse, LocationTreeNode, NewLocation, LocationUpdate } from '../types';

export async function findLocation(id: number): Promise<Location | undefined> {
  return get<Location>(getDb(), 'SELECT * FROM locations WHERE id = ?', [id]);
}

export async function requireLocation(id: number): Promise<Location> {
  const location = await findLocation(id);
  if (!location) {
    throw notFound('Emplacement introuvable');
  }
  return location;
}

export async function buildLocationPath(id: number): Promise<string> {
  const names: string[] = [];
  const seen = new Set<number>();
  let currentId: number | null = id;

  while (currentId != null && !seen.has(currentId)) {
    seen.add(currentId);
    const location = await findLocation(currentId);
    if (!location) break;
    names.unshift(location.name);
    currentId = location.parent_id;
  }

  return names.join(' > ');
}

async function childrenCount(id: number): Promise<number> {
  const row = await get<{ count: number }>(
    getDb(),
    'SELECT COUNT(*) AS count FROM locations WHERE parent_id = ?',
    [id],
  );
  return row?.count ?? 0;
}

export async function toLocationResponse(location: Location): Promise<LocationResponse> {
  const [path, count] = await Promise.all([buildLocationPath(location.id), childrenCount(location.id)]);
  return { ...location, path, children_count: count };
}

export async function listLocations(): Promise<LocationResponse[]> {
  const rows = await all<Location>(getDb(), 'SELECT * FROM locations ORDER BY name ASC');
  const responses = await Promise.all(rows.map(toLocationResponse));
  return responses.sort((a, b) => a.path.localeCompare(b.path, 'fr'));
}

export async function listLocationTree(): Promise<LocationTreeNode[]> {
  const rows = await all<Location>(getDb(), 'SELECT * FROM locations ORDER BY name ASC');
  const responses = await Promise.all(rows.map(toLocationResponse));
  const byId = new Map<number, LocationTreeNode>();

  for (const location of responses) {
    byId.set(location.id, { ...location, children: [] });
  }

  const roots: LocationTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id != null && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function wouldCreateCycle(id: number, parentId: number): Promise<boolean> {
  const seen = new Set<number>();
  let currentId: number | null = parentId;

  while (currentId != null && !seen.has(currentId)) {
    if (currentId === id) return true;
    seen.add(currentId);
    const parent = await findLocation(currentId);
    currentId = parent?.parent_id ?? null;
  }

  return false;
}

export async function createLocation(input: NewLocation): Promise<LocationResponse> {
  if (input.parent_id != null) {
    await requireLocation(input.parent_id);
  }

  const result = await run(
    getDb(),
    'INSERT INTO locations (name, parent_id, description) VALUES (?, ?, ?)',
    [input.name, input.parent_id, input.description],
  );

  return toLocationResponse(await requireLocation(result.lastID));
}

export async function updateLocation(id: number, input: LocationUpdate): Promise<LocationResponse> {
  const current = await requireLocation(id);

  const next: NewLocation = {
    name: input.name ?? current.name,
    parent_id: input.parent_id === undefined ? current.parent_id : input.parent_id,
    description: input.description === undefined ? current.description : input.description,
  };

  if (next.parent_id != null) {
    if (next.parent_id === id) {
      throw badRequest("Un emplacement ne peut pas être son propre parent");
    }
    await requireLocation(next.parent_id);
    if (await wouldCreateCycle(id, next.parent_id)) {
      throw badRequest("Ce parent créerait une boucle dans la hiérarchie des emplacements");
    }
  }

  await run(
    getDb(),
    `UPDATE locations
     SET name = ?, parent_id = ?, description = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [next.name, next.parent_id, next.description, id],
  );

  return toLocationResponse(await requireLocation(id));
}

export async function deleteLocation(id: number): Promise<void> {
  await requireLocation(id);
  const count = await childrenCount(id);
  if (count > 0) {
    throw badRequest('Impossible de supprimer un emplacement qui contient des sous-emplacements');
  }

  await run(getDb(), 'DELETE FROM locations WHERE id = ?', [id]);
}
