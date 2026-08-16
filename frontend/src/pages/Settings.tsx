import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import type { SettingsResponse, SuggestedModel } from '../types';

function formatSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} Mo`;
  return `${(bytes / 1024 ** 3).toFixed(1)} Go`;
}

export function Settings() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [vlmModel, setVlmModel] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [searxngUrl, setSearxngUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullStatus, setPullStatus] = useState<string | null>(null);

  async function refresh() {
    const next = await api.getSettings();
    setData(next);
    setOllamaUrl(next.ollama_url);
    setVlmModel(next.vlm_model);
    setLlmModel(next.llm_model);
    setSearxngUrl(next.searxng_url ?? '');
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Erreur'));
  }, []);

  const installed = data?.ollama.models ?? [];
  const installedNames = new Set(installed.map((model) => model.name));

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api.saveSettings({
        ollama_url: ollamaUrl.trim(),
        vlm_model: vlmModel.trim(),
        llm_model: llmModel.trim(),
        searxng_url: searxngUrl.trim() || null,
      });
      setData(next);
      setNotice(next.ollama.online ? `Ollama joignable${next.ollama.version ? ` · ${next.ollama.version}` : ''}.` : 'Réglages enregistrés. Ollama ne répond pas encore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.saveSettings({ ollama_url: ollamaUrl.trim() });
      const next = await api.getSettings();
      setData(next);
      if (next.ollama.online) {
        setNotice(`Connecté à Ollama ${next.ollama.version ?? ''} · ${next.ollama.models.length} modèle${next.ollama.models.length > 1 ? 's' : ''}.`);
      } else {
        setError(next.ollama.error || 'Ollama injoignable');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onPull(model: string) {
    setPulling(model);
    setPullStatus('Connexion à Ollama…');
    setError(null);
    try {
      await api.pullOllamaModel(model, (event) => {
        const status = typeof event.status === 'string' ? event.status : 'téléchargement';
        const total = typeof event.total === 'number' ? event.total : 0;
        const completed = typeof event.completed === 'number' ? event.completed : 0;
        if (total > 0) {
          setPullStatus(`${status} · ${Math.min(100, Math.round((completed / total) * 100))}%`);
        } else {
          setPullStatus(status);
        }
      });
      setPullStatus(null);
      setNotice(`Modèle ${model} prêt.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Téléchargement impossible');
      setPullStatus(null);
    } finally {
      setPulling(null);
    }
  }

  if (!data && !error) return <p className="loading">Chargement des réglages…</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Réglages</h1>
          <p className="lede">
            Branche Ollama, choisis un petit VLM pour l'étiquette et un petit LLM pour compléter la fiche.
          </p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}
      {notice && <div className="banner ok">{notice}</div>}

      <form className="form" onSubmit={(event) => void onSave(event)}>
        <section className="form-section glass">
          <h2>Serveur Ollama</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Depuis un conteneur Docker, <code>http://host.docker.internal:11434</code> pointe vers Ollama
            installé sur la machine hôte. Privilégie des modèles 2–3B si tu utilises une configuration matérielle modeste.
          </p>
          <label className="field">
            <span>URL</span>
            <input
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://127.0.0.1:11434"
              autoComplete="off"
            />
          </label>
          <div className="ollama-status">
            <span className={`status-dot ${data?.ollama.online ? 'on' : 'off'}`} />
            {data?.ollama.online
              ? `En ligne${data.ollama.version ? ` · ${data.ollama.version}` : ''}`
              : data?.ollama.error || 'Hors ligne'}
          </div>
          <div className="actions-row">
            <button type="button" className="btn" disabled={busy} onClick={() => void onTest()}>
              Tester la connexion
            </button>
          </div>
        </section>

        <ModelPicker
          title="Modèle vision (étiquette)"
          hint="Lit la photo. qwen3-vl:2b est un excellent compromis pour une configuration standard."
          value={vlmModel}
          onChange={setVlmModel}
          suggested={data?.suggested_vlm ?? []}
          installed={installed}
          installedNames={installedNames}
          pulling={pulling}
          onPull={(name) => void onPull(name)}
        />

        <ModelPicker
          title="Modèle texte (fiche + web)"
          hint="Complète cépages, accords, domaine à partir des extraits web."
          value={llmModel}
          onChange={setLlmModel}
          suggested={data?.suggested_llm ?? []}
          installed={installed}
          installedNames={installedNames}
          pulling={pulling}
          onPull={(name) => void onPull(name)}
        />

        {pullStatus && <p className="muted">{pulling} · {pullStatus}</p>}

        <section className="form-section glass">
          <h2>Recherche web (optionnel)</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Par défaut : Wikipédia + DuckDuckGo. Si tu as un SearXNG, colle son URL pour des résultats plus propres.
          </p>
          <label className="field">
            <span>URL SearXNG</span>
            <input
              value={searxngUrl}
              onChange={(e) => setSearxngUrl(e.target.value)}
              placeholder="http://searxng:8080"
              autoComplete="off"
            />
          </label>
        </section>

        {installed.length > 0 && (
          <section className="form-section glass">
            <h2>Modèles installés</h2>
            <ul className="model-installed">
              {installed.map((model) => (
                <li key={model.name}>
                  <strong>{model.name}</strong>
                  <span className="muted">
                    {model.vision ? 'vision · ' : ''}
                    {formatSize(model.size)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="form-bar">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </>
  );
}

function ModelPicker({
  title,
  hint,
  value,
  onChange,
  suggested,
  installed,
  installedNames,
  pulling,
  onPull,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  suggested: SuggestedModel[];
  installed: SettingsResponse['ollama']['models'];
  installedNames: Set<string>;
  pulling: string | null;
  onPull: (name: string) => void;
}) {
  const extras = installed.filter((model) => !suggested.some((item) => item.name === model.name));

  return (
    <section className="form-section glass">
      <h2>{title}</h2>
      <p className="muted" style={{ marginBottom: 12 }}>{hint}</p>
      <label className="field">
        <span>Modèle Ollama</span>
        <input
          list={title.startsWith('Modèle vision') ? 'vlm-models' : 'llm-models'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="qwen3-vl:2b"
          autoComplete="off"
        />
        <datalist id={title.startsWith('Modèle vision') ? 'vlm-models' : 'llm-models'}>
          {suggested.map((item) => (
            <option key={item.name} value={item.name} />
          ))}
          {extras.map((item) => (
            <option key={item.name} value={item.name} />
          ))}
        </datalist>
      </label>
      <div className="model-suggestions">
        {suggested.map((item) => {
          const present = installedNames.has(item.name) || [...installedNames].some((name) => name.startsWith(`${item.name}`));
          return (
            <div key={item.name} className={`model-chip${value === item.name ? ' selected' : ''}`}>
              <button type="button" className="model-chip-main" onClick={() => onChange(item.name)}>
                <strong>{item.name}</strong>
                <span>
                  {item.size} · {item.note}
                </span>
              </button>
              {present ? (
                <span className="model-flag">Installé</span>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={pulling != null}
                  onClick={() => onPull(item.name)}
                >
                  {pulling === item.name ? '…' : 'Pull'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
