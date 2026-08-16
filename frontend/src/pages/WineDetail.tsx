import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { ApogeeBar } from '../components/ApogeeBar';
import type { WineResponse } from '../types';
import { bottlesLabel, drinkStatus, STATUS_LABELS, TYPE_LABELS, wineTitle } from '../wineStatus';

export function WineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wine, setWine] = useState<WineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getWine(Number(id))
      .then(setWine)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, [id]);

  async function onDelete() {
    if (!wine) return;
    if (!window.confirm(`Supprimer « ${wineTitle(wine)} » de la cave ?`)) return;
    setBusy(true);
    try {
      await api.deleteWine(wine.id);
      navigate('/vins');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onRecompute() {
    if (!wine) return;
    setBusy(true);
    try {
      setWine(await api.recomputeApogee(wine.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calcul impossible');
    } finally {
      setBusy(false);
    }
  }

  if (error && !wine) return <div className="banner error">{error}</div>;
  if (!wine) return <p className="loading">Préparation de la fiche…</p>;

  const status = drinkStatus(wine);

  return (
    <>
      <Link to="/vins" className="back">
        ← Bouteilles
      </Link>

      {error && <div className="banner error">{error}</div>}

      <article className="detail-hero glass">
        <div className="detail-kicker">
          <span className={`badge ${wine.type}`}>{TYPE_LABELS[wine.type]}</span>
          <span className={`badge ${status}`}>{STATUS_LABELS[status]}</span>
          {wine.millesime && <span className="chip">{wine.millesime}</span>}
        </div>
        <h1>{wineTitle(wine)}</h1>
        <p className="meta">
          {[wine.appellation, wine.region].filter(Boolean).join(' · ') || 'Région non renseignée'}
        </p>
        <p className="qty" style={{ marginTop: 12 }}>
          {bottlesLabel(wine.quantity)}
        </p>
      </article>

      <section className="apogee glass">
        <h2 className="section-title">Apogée</h2>
        <p className="meta" style={{ marginBottom: 8 }}>
          {wine.apogee_source === 'auto' ? 'Estimation automatique' : 'Saisie manuelle'}
          {wine.potentiel_garde ? ` · ${wine.potentiel_garde}` : ''}
        </p>
        <ApogeeBar drinkFrom={wine.drink_from} drinkUntil={wine.drink_until} />
      </section>

      <div className="info-grid">
        {wine.location_path && (
          <section className="info-card glass">
            <h2>Emplacement</h2>
            <p>{wine.location_path}</p>
          </section>
        )}
        {wine.cepages && (
          <section className="info-card glass">
            <h2>Cépages</h2>
            <p>{wine.cepages}</p>
          </section>
        )}
        {wine.accords && (
          <section className="info-card glass">
            <h2>Accords mets & vins</h2>
            <p>{wine.accords}</p>
          </section>
        )}
        {wine.domaine_info && (
          <section className="info-card glass">
            <h2>Le domaine</h2>
            <p>{wine.domaine_info}</p>
          </section>
        )}
        {wine.notes && (
          <section className="info-card glass">
            <h2>Notes</h2>
            <p>{wine.notes}</p>
          </section>
        )}
      </div>

      <div className="actions-row">
        <Link to={`/vins/${wine.id}/modifier`} className="btn btn-primary">
          Modifier
        </Link>
        <button type="button" className="btn" disabled={busy} onClick={() => void onRecompute()}>
          Recalculer l'apogée
        </button>
        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void onDelete()}>
          Supprimer
        </button>
      </div>
    </>
  );
}
