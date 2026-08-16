import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { EmptyState } from '../components/EmptyState';
import type { LocationResponse } from '../types';

export function Locations() {
  const [locations, setLocations] = useState<LocationResponse[] | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLocations(await api.listLocations());
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Le nom de l\'emplacement est obligatoire.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createLocation({
        name: name.trim(),
        parent_id: parentId ? Number(parentId) : null,
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(location: LocationResponse) {
    if (!window.confirm(`Supprimer « ${location.name} » ?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteLocation(location.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lieux</h1>
          <p className="lede">Cave, armoire, ligne : organise l'emplacement physique de chaque bouteille.</p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <form className="form-section glass" onSubmit={(event) => void onCreate(event)} style={{ marginBottom: 16 }}>
        <h2>Nouvel emplacement</h2>
        <label className="field">
          <span>Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Armoire gauche" />
        </label>
        <label className="field">
          <span>Parent</span>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Aucun (racine)</option>
            {(locations ?? []).map((location) => (
              <option key={location.id} value={location.id}>
                {location.path}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          Ajouter le lieu
        </button>
      </form>

      {!locations && <p className="loading">Chargement…</p>}
      {locations && locations.length === 0 && (
        <EmptyState title="Aucun lieu" text="Crée d'abord une cave principale." />
      )}
      {locations && locations.length > 0 && (
        <div className="location-tree">
          {locations.map((location) => (
            <article key={location.id} className="location-item glass">
              <div>
                <strong>{location.name}</strong>
                <p className="meta">{location.path}</p>
                {location.description && <p className="meta">{location.description}</p>}
              </div>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onDelete(location)}>
                Supprimer
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
