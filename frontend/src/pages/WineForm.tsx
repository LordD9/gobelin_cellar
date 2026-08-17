import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { LabelScan, type ScanDraft } from '../components/LabelScan';
import type { ApogeeEstimate, ApogeeSource, LocationResponse, WinePayload, WineType } from '../types';
import { WINE_TYPES } from '../types';
import { TYPE_LABELS, formatWindow } from '../wineStatus';

interface FormState {
  domaine: string;
  cuvee: string;
  type: WineType;
  region: string;
  appellation: string;
  millesime: string;
  quantity: string;
  location_id: string;
  cepages: string;
  domaine_info: string;
  accords: string;
  potentiel_garde: string;
  notes: string;
  apogee_source: ApogeeSource;
  drink_from: string;
  drink_until: string;
}

const EMPTY: FormState = {
  domaine: '',
  cuvee: '',
  type: 'rouge',
  region: '',
  appellation: '',
  millesime: '',
  quantity: '1',
  location_id: '',
  cepages: '',
  domaine_info: '',
  accords: '',
  potentiel_garde: '',
  notes: '',
  apogee_source: 'auto',
  drink_from: '',
  drink_until: '',
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toInt(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function WineForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<FormState>(() => {
    if (!editing) {
      try {
        const stored = localStorage.getItem('gobelin_draft_form');
        if (stored) return JSON.parse(stored) as FormState;
      } catch {
        // ignore
      }
    }
    return EMPTY;
  });
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [estimate, setEstimate] = useState<ApogeeEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!editing);

  useEffect(() => {
    if (!editing) {
      localStorage.setItem('gobelin_draft_form', JSON.stringify(form));
    }
  }, [form, editing]);

  useEffect(() => {
    api.listLocations().then(setLocations).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .getWine(Number(id))
      .then((wine) => {
        setForm({
          domaine: wine.domaine,
          cuvee: wine.cuvee ?? '',
          type: wine.type,
          region: wine.region ?? '',
          appellation: wine.appellation ?? '',
          millesime: wine.millesime != null ? String(wine.millesime) : '',
          quantity: String(wine.quantity),
          location_id: wine.location_id != null ? String(wine.location_id) : '',
          cepages: wine.cepages ?? '',
          domaine_info: wine.domaine_info ?? '',
          accords: wine.accords ?? '',
          potentiel_garde: wine.potentiel_garde ?? '',
          notes: wine.notes ?? '',
          apogee_source: wine.apogee_source,
          drink_from: wine.drink_from != null ? String(wine.drink_from) : '',
          drink_until: wine.drink_until != null ? String(wine.drink_until) : '',
        });
        setReady(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, [id]);

  useEffect(() => {
    if (form.apogee_source !== 'auto') {
      setEstimate(null);
      return;
    }
    const millesime = toInt(form.millesime);
    if (millesime == null) {
      setEstimate(null);
      return;
    }
    const handle = window.setTimeout(() => {
      api
        .estimateApogee({
          type: form.type,
          region: emptyToNull(form.region),
          appellation: emptyToNull(form.appellation),
          millesime,
        })
        .then((result) => setEstimate(result.estimate))
        .catch(() => setEstimate(null));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [form.apogee_source, form.type, form.region, form.appellation, form.millesime]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyScan(draft: ScanDraft) {
    setForm((current) => ({
      ...current,
      domaine: draft.domaine ?? current.domaine,
      cuvee: draft.cuvee ?? current.cuvee,
      type: draft.type ?? current.type,
      region: draft.region ?? current.region,
      appellation: draft.appellation ?? current.appellation,
      millesime: draft.millesime ?? current.millesime,
      cepages: draft.cepages ?? current.cepages,
      domaine_info: draft.domaine_info ?? current.domaine_info,
      accords: draft.accords ?? current.accords,
      potentiel_garde: draft.potentiel_garde ?? current.potentiel_garde,
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.domaine.trim()) {
      setError('Le domaine est obligatoire.');
      return;
    }
    const quantity = toInt(form.quantity);
    if (quantity == null || quantity < 0) {
      setError('La quantité doit être un entier positif.');
      return;
    }

    const payload: WinePayload = {
      domaine: form.domaine.trim(),
      cuvee: emptyToNull(form.cuvee),
      type: form.type,
      region: emptyToNull(form.region),
      appellation: emptyToNull(form.appellation),
      millesime: toInt(form.millesime),
      quantity,
      location_id: toInt(form.location_id),
      cepages: emptyToNull(form.cepages),
      domaine_info: emptyToNull(form.domaine_info),
      accords: emptyToNull(form.accords),
      potentiel_garde: emptyToNull(form.potentiel_garde),
      notes: emptyToNull(form.notes),
      apogee_source: form.apogee_source,
    };
    if (form.apogee_source === 'manual') {
      payload.drink_from = toInt(form.drink_from);
      payload.drink_until = toInt(form.drink_until);
    }

    setBusy(true);
    try {
      const saved = editing ? await api.updateWine(Number(id), payload) : await api.createWine(payload);
      if (!editing) {
        localStorage.removeItem('gobelin_draft_form');
        localStorage.removeItem('gobelin_draft_preview');
        localStorage.removeItem('gobelin_draft_phase');
        localStorage.removeItem('gobelin_draft_info');
        localStorage.removeItem('gobelin_draft_ident');
        localStorage.removeItem('gobelin_draft_enrich');
      }
      navigate(`/vins/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  if (!ready && !error) return <p className="loading">Chargement du formulaire…</p>;

  return (
    <>
      <Link to={editing ? `/vins/${id}` : '/vins'} className="back">
        ← Retour
      </Link>
      <div className="page-head">
        <div>
          <h1>{editing ? 'Modifier la fiche' : 'Nouvelle bouteille'}</h1>
          <p className="lede">Photo de l'étiquette ou saisie manuelle. L'apogée se calcule toute seule en mode auto.</p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <LabelScan onApply={applyScan} />
        <section className="form-section glass">
          <h2>L'essentiel</h2>
          <label className="field">
            <span>Domaine *</span>
            <input value={form.domaine} onChange={(e) => update('domaine', e.target.value)} required autoComplete="off" />
          </label>
          <label className="field">
            <span>Cuvée</span>
            <input value={form.cuvee} onChange={(e) => update('cuvee', e.target.value)} autoComplete="off" />
          </label>
          <div className="field">
            <span>Type</span>
            <div className="segmented">
              {WINE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={form.type === type ? 'active' : ''}
                  onClick={() => update('type', type)}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Millésime</span>
              <input
                inputMode="numeric"
                value={form.millesime}
                onChange={(e) => update('millesime', e.target.value)}
                placeholder="2018"
              />
            </label>
            <label className="field">
              <span>Quantité</span>
              <input
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>Emplacement</span>
            <select value={form.location_id} onChange={(e) => update('location_id', e.target.value)}>
              <option value="">Non précisé</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.path}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="form-section glass">
          <h2>Origine</h2>
          <div className="field-row">
            <label className="field">
              <span>Région</span>
              <input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="Bordeaux" />
            </label>
            <label className="field">
              <span>Appellation</span>
              <input value={form.appellation} onChange={(e) => update('appellation', e.target.value)} placeholder="Pauillac" />
            </label>
          </div>
          <label className="field">
            <span>Cépages</span>
            <input value={form.cepages} onChange={(e) => update('cepages', e.target.value)} />
          </label>
        </section>

        <section className="form-section glass">
          <h2>Apogée</h2>
          <div className="segmented">
            <button type="button" className={form.apogee_source === 'auto' ? 'active' : ''} onClick={() => update('apogee_source', 'auto')}>
              Automatique
            </button>
            <button type="button" className={form.apogee_source === 'manual' ? 'active' : ''} onClick={() => update('apogee_source', 'manual')}>
              Manuelle
            </button>
          </div>
          {form.apogee_source === 'auto' && estimate && (
            <p className="estimate" style={{ marginTop: 12 }}>
              {estimate.rule_name} · {formatWindow(estimate.drink_from, estimate.drink_until)}
              <br />
              {estimate.potentiel_garde}
            </p>
          )}
          {form.apogee_source === 'auto' && !estimate && form.millesime && (
            <p className="muted" style={{ marginTop: 12 }}>Estimation en cours…</p>
          )}
          {form.apogee_source === 'manual' && (
            <div className="field-row" style={{ marginTop: 12 }}>
              <label className="field">
                <span>À boire à partir de</span>
                <input inputMode="numeric" value={form.drink_from} onChange={(e) => update('drink_from', e.target.value)} />
              </label>
              <label className="field">
                <span>À boire avant</span>
                <input inputMode="numeric" value={form.drink_until} onChange={(e) => update('drink_until', e.target.value)} />
              </label>
            </div>
          )}
        </section>

        <section className="form-section glass">
          <h2>Fiche détaillée</h2>
          <label className="field">
            <span>Accords mets & vins</span>
            <textarea value={form.accords} onChange={(e) => update('accords', e.target.value)} />
          </label>
          <label className="field">
            <span>Potentiel de garde</span>
            <textarea value={form.potentiel_garde} onChange={(e) => update('potentiel_garde', e.target.value)} />
          </label>
          <label className="field">
            <span>Le domaine</span>
            <textarea value={form.domaine_info} onChange={(e) => update('domaine_info', e.target.value)} />
          </label>
          <label className="field">
            <span>Notes personnelles</span>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
          </label>
        </section>

        <div className="form-bar">
          <Link to={editing ? `/vins/${id}` : '/vins'} className="btn btn-ghost">
            Annuler
          </Link>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter à la cave'}
          </button>
        </div>
      </form>
    </>
  );
}
