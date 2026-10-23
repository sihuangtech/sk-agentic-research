import { Plus, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiMode, Provider } from '../../../shared/contracts';
import { request } from '../api';
import { formatError, UiMessage } from '../i18n';

function usePresets() {
  const { t } = useTranslation();
  return [
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', api: 'openai-responses' as ApiMode },
    {
      name: 'Anthropic',
      baseUrl: 'https://api.anthropic.com',
      api: 'anthropic-messages' as ApiMode,
    },
    {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      api: 'openai-completions' as ApiMode,
    },
    { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', api: 'openai-completions' as ApiMode },
    { name: t('custom'), baseUrl: '', api: 'openai-completions' as ApiMode },
  ];
}
export default function ProviderDialog({
  providers,
  onClose,
  onSaved,
}: {
  providers: Provider[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();

  const presets = usePresets();
  const defaults = { ...presets[0], model: '', contextWindow: 128000, maxTokens: 8192 };
  const [draft, setDraft] = useState(defaults);
  const [id, setId] = useState('');
  const [key, setKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [message, setMessage] = useState<unknown>('');
  const [busy, setBusy] = useState(false);
  const select = (p?: Provider) => {
    setId(p?.id || '');
    setDraft(p || defaults);
    setKey('');
    setClearKey(false);
    setMessage('');
  };
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const p = await request<Provider>(
        id ? `/providers/${id}` : '/providers',
        id ? 'PUT' : 'POST',
        { ...draft, apiKey: key || undefined, clearKey },
      );
      setId(p.id);
      setKey('');
      setClearKey(false);
      await onSaved();
      setMessage(new UiMessage('savedConfig'));
    } catch (e) {
      setMessage(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('settings')}
        className="modal provider-modal"
      >
        <button className="modal-close" aria-label={t('closeSettings')} onClick={onClose}>
          <X />
        </button>
        <div className="eyebrow">{t('modelConnections')}</div>
        <h2>{t('connectModel')}</h2>
        <p className="muted">{t('providerDescription')}</p>
        <div className="provider-layout">
          <nav>
            {providers.map((p) => (
              <button key={p.id} className={id === p.id ? 'active' : ''} onClick={() => select(p)}>
                {p.name}
                <small>{p.model}</small>
              </button>
            ))}
            <button onClick={() => select()}>
              <Plus size={14} /> {t('addProvider')}
            </button>
          </nav>
          <form onSubmit={(e) => void save(e)}>
            <div className="presets">
              {presets.map((p) => (
                <button type="button" key={p.name} onClick={() => setDraft({ ...draft, ...p })}>
                  {p.name}
                </button>
              ))}
            </div>
            <label>
              {t('configName')}
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </label>
            <label>
              Base URL
              <input
                type="url"
                value={draft.baseUrl}
                onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                required
              />
            </label>
            <label>
              {t('protocol')}
              <select
                value={draft.api}
                onChange={(e) => setDraft({ ...draft, api: e.target.value as ApiMode })}
              >
                <option value="openai-responses">OpenAI Responses</option>
                <option value="openai-completions">{t('compatible')}</option>
                <option value="anthropic-messages">Anthropic Messages</option>
              </select>
            </label>
            <label>
              API Key
              <input
                type="password"
                autoComplete="new-password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={
                  providers.find((p) => p.id === id)?.hasKey ? t('keySaved') : t('keyOptional')
                }
              />
            </label>
            {providers.find((p) => p.id === id)?.hasKey && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={clearKey}
                  onChange={(e) => setClearKey(e.target.checked)}
                />
                {t('clearKey')}
              </label>
            )}
            <label>
              {t('modelId')}
              <input
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder={t('modelIdHelp')}
                required
              />
            </label>
            <div className="two-columns">
              <label>
                {t('contextWindow')}
                <input
                  type="number"
                  min={2048}
                  value={draft.contextWindow}
                  onChange={(e) => setDraft({ ...draft, contextWindow: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                {t('maxOutput')}
                <input
                  type="number"
                  min={128}
                  value={draft.maxTokens}
                  onChange={(e) => setDraft({ ...draft, maxTokens: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="record-actions">
              <button className="primary" disabled={busy}>
                {busy ? t('saving') : t('saveConfig')}
              </button>
              {id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setMessage(new UiMessage('testing'));
                    void request<{ latencyMs: number }>(`/providers/${id}/test`, 'POST')
                      .then((r) =>
                        setMessage(new UiMessage('connectionSuccess', { latency: r.latencyMs })),
                      )
                      .catch(setMessage)
                      .finally(() => setBusy(false));
                  }}
                >
                  {t('testConfig')}
                </button>
              )}
            </div>
            {Boolean(message) && (
              <p role="status" className="form-message">
                {formatError(message)}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
