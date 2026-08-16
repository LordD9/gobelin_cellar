import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { EmptyState } from '../components/EmptyState';
import { WineCard } from '../components/WineCard';
import type { DashboardStats } from '../types';
import { TYPE_LABELS } from '../wineStatus';

export function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, []);

  if (error) {
    return <div className="banner error">{error}. Vérifiez que le serveur backend tourne sur le port 3001.</div>;
  }
  if (!data) {
    return <p className="loading">Ouverture de la cave…</p>;
  }

  const empty = data.total_references === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>La cave</h1>
          <p className="lede">Vue d'ensemble {data.year} — stocks, apogées et bouteilles à sortir.</p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card glass">
          <div className="stat-label">Bouteilles</div>
          <div className="stat-value">{data.total_bottles}</div>
        </article>
        <article className="stat-card glass">
          <div className="stat-label">Références</div>
          <div className="stat-value">{data.total_references}</div>
        </article>
        <article className="stat-card glass">
          <div className="stat-label">À boire</div>
          <div className="stat-value">{data.drink_this_year.length}</div>
        </article>
        <article className="stat-card glass">
          <div className="stat-label">Dépassés</div>
          <div className="stat-value">{data.past_peak.length}</div>
        </article>
      </div>

      {data.by_type.length > 0 && (
        <div className="chips" style={{ marginBottom: 18 }}>
          {data.by_type.map((row) => (
            <span key={row.type} className="chip">
              <i className={`dot ${row.type}`} />
              {TYPE_LABELS[row.type]} · {row.bottles}
            </span>
          ))}
        </div>
      )}

      {empty ? (
        <EmptyState
          title="La cave est encore vide"
          text="Ajoute ta première bouteille : le gobelin s'occupe de l'apogée."
          actionLabel="Ajouter un vin"
          actionTo="/vins/nouveau"
        />
      ) : (
        <>
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">À boire cette année</h2>
              <Link to="/vins?drink=this_year" className="muted">
                Tout voir
              </Link>
            </div>
            {data.drink_this_year.length === 0 ? (
              <p className="muted">Aucune bouteille dans sa fenêtre d'apogée pour {data.year}.</p>
            ) : (
              <div className="wine-list">
                {data.drink_this_year.slice(0, 6).map((wine) => (
                  <WineCard key={wine.id} wine={wine} />
                ))}
              </div>
            )}
          </section>

          {data.past_peak.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">À ne plus trop attendre</h2>
              </div>
              <div className="wine-list">
                {data.past_peak.slice(0, 4).map((wine) => (
                  <WineCard key={wine.id} wine={wine} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
