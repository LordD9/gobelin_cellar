/**
 * Emplacement hiérarchique de stockage.
 *
 * Exemple : Cave Principale > Armoire Gauche > Ligne 3
 * se représente par trois lignes liées via `parent_id`.
 */
export interface Location {
  id: number;
  name: string;
  parent_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type NewLocation = Omit<Location, 'id' | 'created_at' | 'updated_at'>;
export type LocationUpdate = Partial<NewLocation>;

export interface LocationResponse extends Location {
  path: string;
  children_count: number;
}

export interface LocationTreeNode extends LocationResponse {
  children: LocationTreeNode[];
}
