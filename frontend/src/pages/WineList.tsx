import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { EmptyState } from '../components/EmptyState';
import { WineCard } from '../components/WineCard';
import { WINE_TYPES, type WineResponse, type WineType } from '../types';
import { TYPE_LABELS } from '../wineStatus';

const DRINK_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'this_year', label: 'À boire' },
  { value: 'past_peak', label: 'Dépassés' },
  { value: 'not_ready', label: 'En garde' },
] as const;

export function WineList() {
  const [params, setParams] = useSearchParams();
  const [wines, setWines] = useState<WineResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(params.get('q') ?? '');

  const type = (params.get('type') as WineType | null) ?? undefined;
  const drink = params.get('drink') ?? '';

  useEffect(() => {
    const handle = window.setTimeout(() => {
      api
        .listWines({
          q: query.trim() || undefined,
          type,
          drink: drink === 'this_year' || drink === 'past_peak' || drink === 'not_ready' ? drink : undefined,
        })
        .then(setWines)
        .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, type, drink]);

  const counts = useMemo(() => wines?.reduce((sum, wine) => sum + wine.quantity, 0) ?? 0, [wines]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bouteilles</h1>
          <p className="lede">
            {wines ? `${wines.length} référence${wines.length > 1 ? 's' : ''} · ${counts} en stock` : 'Chargement…'}
          </p>
        </div>
      </div>

      <div className="search-row">
        <input
          className="search"
          type="search"
          placeholder="Rechercher un domaine, une cuvée…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setFilter('q', event.target.value);
          }}
        />
        <div className="filter-row" role="tablist" aria-label="Type de vin">
          <button type="button" className={`pill${!type ? ' active' : ''}`} onClick={() => setFilter('type', '')}>
            Tous types
          </button>
          {WINE_TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`pill${type === item ? ' active' : ''}`}
              onClick={() => setFilter('type', item)}
            >
              {TYPE_LABELS[item]}
            </button>
          ))}
        </div>
        <div className="filter-row" role="tablist" aria-label="Apogée">
          {DRINK_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`pill${drink === item.value ? ' active' : ''}`}
              onClick={() => setFilter('drink', item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}
      {!wines && <p className="loading">Chargement de la cave…</p>}
      {wines && wines.length === 0 && (
        <EmptyState
          title="Aucun vin trouvé"
          text="Essaie un autre filtre, ou ajoute une nouvelle fiche."
          actionLabel="Ajouter un vin"
          actionTo="/vins/nouveau"
        />
      )}
      {wines && wines.length > 0 && (
        <div className="wine-list">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}
    </>
  );
}
