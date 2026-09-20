import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { compressImage } from '../image';
import type { ScanBatchJob, WineIdentification, WineType } from '../types';
import type { ScanDraft } from './LabelScan';

interface Props {
  onApply: (draft: ScanDraft) => void;
}

function statusLabel(status: ScanBatchJob['items'][number]['status']): string {
  if (status === 'queued') return 'en attente';
  if (status === 'running') return 'lecture…';
  if (status === 'error') return 'erreur';
  return 'lu';
}

export function BatchLabelScan({ onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<ScanBatchJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const list = await api.listScanBatches();
    setJobs(list);
  }

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, []);

  const pending = jobs.some((job) => job.done < job.total);
  useEffect(() => {
    if (!pending) return;
    const handle = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(handle);
  }, [pending]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const images: string[] = [];
      for (const file of Array.from(files).slice(0, 20)) {
        images.push(await compressImage(file));
      }
      const created = await api.startScanBatch(images);
      setNotice(`${created.total} photo(s) en file. Tu peux quitter la page, elles restent dans Ajouts.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lot impossible');
    } finally {
      setBusy(false);
    }
  }

  function applyIdent(ident: WineIdentification) {
    const draft: ScanDraft = {};
    if (ident.domaine) draft.domaine = ident.domaine;
    if (ident.cuvee) draft.cuvee = ident.cuvee;
    if (ident.type) draft.type = ident.type;
    if (ident.region) draft.region = ident.region;
    if (ident.appellation) draft.appellation = ident.appellation;
    if (ident.millesime != null) draft.millesime = String(ident.millesime);
    if (ident.cepages) draft.cepages = ident.cepages;
    onApply(draft);
  }

  async function createWine(ident: WineIdentification) {
    setError(null);
    try {
      const wine = await api.createWine({
        domaine: ident.domaine?.trim() || 'À identifier',
        cuvee: ident.cuvee,
        type: (ident.type as WineType) || 'rouge',
        region: ident.region,
        appellation: ident.appellation,
        millesime: ident.millesime,
        quantity: 1,
        cepages: ident.cepages,
        apogee_source: 'auto',
      });
      setNotice(`Fiche créée : ${wine.domaine}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  }

  return (
    <section className="form-section glass scan-card">
      <div className="scan-head">
        <div>
          <h2>File d’attente (lots)</h2>
          <p className="muted">
            Les photos restent côté serveur. Revenir ici pour voir l’avancement et créer les fiches.
          </p>
        </div>
      </div>
      {error && <div className="banner error">{error}</div>}
      {notice && !error && <p className="scan-info">{notice}</p>}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*,image/heic,image/heif,.heic,.heif"
        multiple
        onChange={(event) => {
          void onFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? 'Préparation…' : 'Ajouter des photos à la file'}
      </button>
      {jobs.length === 0 && <p className="muted" style={{ marginTop: 10 }}>Aucun lot pour l’instant.</p>}
      {jobs.map((job) => {
        const running = job.done < job.total;
        return (
          <div key={job.id} style={{ marginTop: 16 }}>
            <p className="muted">
              Lot {job.created_at.slice(0, 16).replace('T', ' ')} — {job.percent}% ({job.done}/{job.total})
              {running ? ' en cours' : ' terminé'}
            </p>
            <div
              style={{
                height: 8,
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 99,
                overflow: 'hidden',
                margin: '6px 0 10px',
              }}
            >
              <div
                style={{
                  width: `${job.percent}%`,
                  height: '100%',
                  background: running ? '#c4a574' : '#6aa84f',
                }}
              />
            </div>
            <ul className="model-installed">
              {job.items.map((item, index) => (
                <li key={item.id}>
                  <strong>Photo {index + 1}</strong>
                  <span className="muted">
                    {statusLabel(item.status)}
                    {item.status === 'error' && item.error ? ` · ${item.error}` : ''}
                    {item.status === 'done' && item.identification?.domaine ? ` · ${item.identification.domaine}` : ''}
                  </span>
                  {item.status === 'done' && item.identification && (
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn" onClick={() => applyIdent(item.identification!)}>
                        Remplir
                      </button>
                      <button type="button" className="btn" onClick={() => void createWine(item.identification!)}>
                        Créer la fiche
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
