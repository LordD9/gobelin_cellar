import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { compressImage } from '../image';
import type { ScanBatchJob, WineIdentification, WineType } from '../types';
import type { ScanDraft } from './LabelScan';

interface Props {
  onApply: (draft: ScanDraft) => void;
}

export function BatchLabelScan({ onApply }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<ScanBatchJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!job || job.done >= job.total) return;
    const handle = window.setInterval(() => {
      api.getScanBatch(job.id).then(setJob).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(handle);
  }, [job]);

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
      setJob(created);
      setNotice(`${created.total} photo(s) en file. Tu peux laisser tourner.`);
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

  const running = job != null && job.done < job.total;

  return (
    <section className="form-section glass scan-card">
      <div className="scan-head">
        <div>
          <h2>Lot de photos</h2>
          <p className="muted">
            Plusieurs étiquettes d’un coup. Analyse en arrière-plan, sans rester bloqué sur chaque image.
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
        {busy ? 'Préparation…' : 'Choisir plusieurs photos'}
      </button>
      {job && (
        <p className="muted" style={{ marginTop: 10 }}>
          {job.done}/{job.total} {running ? 'en cours…' : 'terminé'}
        </p>
      )}
      {job && (
        <ul className="model-installed" style={{ marginTop: 12 }}>
          {job.items.map((item, index) => (
            <li key={item.id}>
              <strong>Photo {index + 1}</strong>
              <span className="muted">
                {item.status === 'queued' && 'en attente'}
                {item.status === 'running' && 'lecture…'}
                {item.status === 'error' && (item.error || 'erreur')}
                {item.status === 'done' && (item.identification?.domaine || 'lu')}
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
      )}
    </section>
  );
}
