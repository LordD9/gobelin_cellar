import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { compressImage } from '../image';
import type { SearchSource, WineEnrichment, WineIdentification, WineType } from '../types';
import { WINE_TYPES } from '../types';
import { TYPE_LABELS } from '../wineStatus';

export interface ScanDraft {
  domaine?: string;
  cuvee?: string;
  type?: WineType;
  region?: string;
  appellation?: string;
  millesime?: string;
  cepages?: string;
  domaine_info?: string;
  accords?: string;
  potentiel_garde?: string;
}

interface Props {
  onApply: (draft: ScanDraft) => void;
}

type Phase = 'photo' | 'reading' | 'identified' | 'searching' | 'ready';

export function LabelScan({ onApply }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('photo');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [identification, setIdentification] = useState<WineIdentification | null>(null);
  const [enrichment, setEnrichment] = useState<WineEnrichment | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== 'reading' && phase !== 'searching') {
      startedAt.current = null;
      setElapsed(0);
      return;
    }
    startedAt.current = Date.now();
    const handle = window.setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      }
    }, 250);
    return () => window.clearInterval(handle);
  }, [phase]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setInfo(null);
    setIdentification(null);
    setEnrichment(null);
    setPhase('photo');
    try {
      setPreview(await compressImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de lire l'image");
    }
  }

  async function onReadLabel() {
    if (!preview) return;
    setError(null);
    setInfo(null);
    setPhase('reading');
    try {
      const result = await api.scanLabel(preview);
      setIdentification(result.identification);
      setPhase('identified');
      setInfo(`Lu avec ${result.model}`);
    } catch (err) {
      setPhase('photo');
      setError(err instanceof Error ? err.message : "Analyse de l'étiquette impossible");
    }
  }

  async function onEnrich() {
    if (!identification) return;
    setError(null);
    setPhase('searching');
    try {
      const result = await api.enrichScan(identification);
      setIdentification(stripEnrichment(result.enrichment));
      setEnrichment(result.enrichment);
      applyToForm(result.enrichment);
      setPhase('ready');
      setInfo(`Fiche complétée avec ${result.model} — vérifie avant d'enregistrer.`);
    } catch (err) {
      setPhase('identified');
      setError(err instanceof Error ? err.message : 'Recherche impossible');
    }
  }

  function applyToForm(data: WineIdentification | WineEnrichment) {
    const draft: ScanDraft = {};
    if (data.domaine) draft.domaine = data.domaine;
    if (data.cuvee) draft.cuvee = data.cuvee;
    if (data.type) draft.type = data.type;
    if (data.region) draft.region = data.region;
    if (data.appellation) draft.appellation = data.appellation;
    if (data.millesime != null) draft.millesime = String(data.millesime);
    if (data.cepages) draft.cepages = data.cepages;
    if ('domaine_info' in data && data.domaine_info) draft.domaine_info = data.domaine_info;
    if ('accords' in data && data.accords) draft.accords = data.accords;
    if ('potentiel_garde' in data && data.potentiel_garde) draft.potentiel_garde = data.potentiel_garde;
    onApply(draft);
  }

  function updateIdent<K extends keyof WineIdentification>(key: K, value: WineIdentification[K]) {
    setIdentification((current) => (current ? { ...current, [key]: value } : current));
  }

  function reset() {
    setPreview(null);
    setIdentification(null);
    setEnrichment(null);
    setPhase('photo');
    setError(null);
    setInfo(null);
  }

  const busy = phase === 'reading' || phase === 'searching';

  return (
    <section className="form-section glass scan-card">
      <div className="scan-head">
        <div>
          <h2>Photo de l'étiquette</h2>
          <p className="muted">Ollama lit le label, puis un second modèle complète la fiche avec le web.</p>
        </div>
        {preview && (
          <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
            Recommencer
          </button>
        )}
      </div>

      <ol className="scan-steps">
        <li className={stepClass(phase, 'photo')}>1. Photo</li>
        <li className={stepClass(phase, 'reading')}>2. Lecture</li>
        <li className={stepClass(phase, 'searching')}>3. Recherche</li>
      </ol>

      {error && <div className="banner error">{error}</div>}
      {info && !error && <p className="scan-info">{info}</p>}

      <div className="scan-layout">
        <div className="scan-preview-wrap">
          {preview ? (
            <img className="scan-preview" src={preview} alt="Étiquette à analyser" />
          ) : (
            <div className="scan-placeholder">
              Cadre l'étiquette de face, bien éclairée, sans trop de reflets.
            </div>
          )}
        </div>

        <div className="scan-actions">
          <input
            ref={cameraRef}
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <input
            ref={galleryRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
            Prendre en photo
          </button>
          <button type="button" className="btn" onClick={() => galleryRef.current?.click()} disabled={busy}>
            Choisir une image
          </button>
          <button type="button" className="btn" onClick={() => void onReadLabel()} disabled={!preview || busy}>
            {phase === 'reading' ? `Lecture de l'étiquette… ${elapsed}s` : "Lire l'étiquette"}
          </button>
        </div>
      </div>

      {busy && (
        <p className="muted" style={{ marginTop: 10 }}>
          {phase === 'reading'
            ? 'Le modèle vision tourne sur Ollama. Sur CPU ça peut prendre 30 à 120 secondes.'
            : 'Recherche web puis rédaction de la fiche…'}
        </p>
      )}

      {identification && phase !== 'reading' && (
        <div className="scan-result">
          <div className="scan-result-head">
            <h3>Identification</h3>
            <span className="chip">Confiance {Math.round(identification.confidence * 100)}%</span>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Domaine</span>
              <input
                value={identification.domaine ?? ''}
                onChange={(e) => updateIdent('domaine', e.target.value || null)}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Cuvée</span>
              <input
                value={identification.cuvee ?? ''}
                onChange={(e) => updateIdent('cuvee', e.target.value || null)}
                disabled={busy}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Type</span>
              <select
                value={identification.type ?? ''}
                onChange={(e) => updateIdent('type', (e.target.value || null) as WineType | null)}
                disabled={busy}
              >
                <option value="">Non lu</option>
                {WINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Millésime</span>
              <input
                inputMode="numeric"
                value={identification.millesime ?? ''}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  const year = Number(raw);
                  updateIdent('millesime', raw === '' || !Number.isInteger(year) ? null : year);
                }}
                disabled={busy}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Région</span>
              <input
                value={identification.region ?? ''}
                onChange={(e) => updateIdent('region', e.target.value || null)}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Appellation</span>
              <input
                value={identification.appellation ?? ''}
                onChange={(e) => updateIdent('appellation', e.target.value || null)}
                disabled={busy}
              />
            </label>
          </div>
          {identification.raw_text && (
            <details className="scan-ocr">
              <summary>Texte lu sur l'étiquette</summary>
              <pre>{identification.raw_text}</pre>
            </details>
          )}
          <div className="scan-result-actions">
            <button type="button" className="btn" onClick={() => applyToForm(identification)} disabled={busy}>
              Remplir le formulaire
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void onEnrich()} disabled={busy}>
              {phase === 'searching' ? `Recherche web… ${elapsed}s` : 'Compléter sur le web'}
            </button>
          </div>
        </div>
      )}

      {enrichment && phase === 'ready' && (
        <SourcesList
          sources={enrichment.sources}
          uncertain={enrichment.uncertain_fields}
        />
      )}
    </section>
  );
}

function SourcesList({ sources, uncertain }: { sources: SearchSource[]; uncertain: string[] }) {
  return (
    <div className="scan-sources">
      {uncertain.length > 0 && (
        <p className="muted">Champs incertains : {uncertain.join(', ')}</p>
      )}
      {sources.length === 0 ? (
        <p className="muted">Aucune source web trouvée — la fiche s'appuie sur le modèle. Vérifie bien.</p>
      ) : (
        <ul>
          {sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              {source.snippet && <p className="muted">{source.snippet}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stripEnrichment(enrichment: WineEnrichment): WineIdentification {
  return {
    domaine: enrichment.domaine,
    cuvee: enrichment.cuvee,
    type: enrichment.type,
    region: enrichment.region,
    appellation: enrichment.appellation,
    millesime: enrichment.millesime,
    cepages: enrichment.cepages,
    raw_text: enrichment.raw_text,
    confidence: enrichment.confidence,
  };
}

function stepClass(phase: Phase, step: 'photo' | 'reading' | 'searching'): string {
  const order: Phase[] = ['photo', 'reading', 'identified', 'searching', 'ready'];
  const current = order.indexOf(phase);
  const target = step === 'photo' ? 0 : step === 'reading' ? 1 : 3;
  if (phase === step || (step === 'reading' && phase === 'identified') || (step === 'searching' && phase === 'ready')) {
    return 'active';
  }
  return current > target ? 'done' : '';
}
