import { CheckCircle2, KeyRound, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, apiError } from '../api/client';

export default function ProviderSettings() {
  const [providers, setProviders] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/providers')
      .then(({ data }) => setProviders(Array.isArray(data) ? data : []))
      .catch((error) => setMessage(apiError(error)));
  }, []);

  const updateProvider = (updated) => {
    setProviders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  return (
    <section className="panel">
      <div className="mb-5">
        <h2 className="text-lg font-bold">模型供应商</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">支持 OpenAI、Anthropic Claude 和 Google Gemini。密钥只写入本地 .env，接口不会返回明文。</p>
      </div>
      {message && <p className="mb-4 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{message}</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} onSaved={updateProvider} />
        ))}
      </div>
    </section>
  );
}

function ProviderCard({ provider, onSaved }) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.base_url || '');
  const [modelId, setModelId] = useState(provider.model_id || '');
  const [apiMode, setApiMode] = useState(provider.api_mode || 'responses');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.put(`/providers/${provider.id}`, {
        base_url: baseUrl || null,
        model_id: modelId || null,
        api_mode: provider.id === 'openai' ? apiMode : null,
        api_key: apiKey || null,
      });
      onSaved(data.provider); setApiKey('');
      setMessage(data.restarted ? '已保存，调度器已重启' : '已保存并立即生效');
    } catch (error) { setMessage(apiError(error)); }
    finally { setBusy(false); }
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{provider.label}</h3>
        <span className={provider.api_key_configured ? 'text-emerald-300' : 'text-slate-600'} title={provider.api_key_configured ? '密钥已配置' : '尚未配置密钥'}>
          {provider.api_key_configured ? <CheckCircle2 size={17} /> : <KeyRound size={17} />}
        </span>
      </div>
      <label className="mb-3 block space-y-2 text-xs font-bold text-slate-400">
        <span>Base URL（留空使用官方地址）</span>
        <input type="url" className="input" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://..." />
      </label>
      <label className="mb-3 block space-y-2 text-xs font-bold text-slate-400">
        <span>模型 ID</span>
        <input className="input" value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder="请输入模型 ID" />
      </label>
      {provider.id === 'openai' && <label className="mb-3 block space-y-2 text-xs font-bold text-slate-400">
        <span>接口模式</span>
        <select className="input" value={apiMode} onChange={(event) => setApiMode(event.target.value)}>
          <option value="chat_completions">传统兼容接口（Chat Completions）</option>
          <option value="responses">Responses API</option>
        </select>
        <span className="block font-normal leading-5 text-slate-600">官方 GPT-5.6 推荐 Responses；仅支持 `/v1/chat/completions` 的中转站请选择传统兼容接口。</span>
      </label>}
      <label className="block space-y-2 text-xs font-bold text-slate-400">
        <span>API Key（留空则保留原值）</span>
        <input type="password" autoComplete="new-password" className="input" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={provider.api_key_configured ? '已配置，输入新值可替换' : '请输入 API Key'} />
      </label>
      {message && <p className="mt-3 text-xs text-cyan-200">{message}</p>}
      <button disabled={busy} onClick={save} className="action-secondary mt-4 w-full justify-center"><Save size={14} />{busy ? '保存中' : '保存供应商'}</button>
    </article>
  );
}
