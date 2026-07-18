import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { api, apiError } from '../api/client';
import PageHeader from '../components/PageHeader';
import ProviderSettings from '../components/ProviderSettings';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [newDirection, setNewDirection] = useState('');

  useEffect(() => { api.get('/config').then(({ data }) => setConfig(data)).catch((error) => setMessage(apiError(error))); }, []);
  const update = (section, key, value) => setConfig((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  const save = async () => {
    setBusy(true); setMessage('');
    try { const { data } = await api.put('/config', config); setConfig(data.config); setMessage(data.restarted ? '配置已保存，持续调度已自动重启' : '配置已保存并生效'); }
    catch (error) { setMessage(apiError(error)); }
    finally { setBusy(false); }
  };
  const addDirection = () => {
    const value = newDirection.trim();
    if (!value || config.research_directions.includes(value)) return;
    setConfig({ ...config, research_directions: [...config.research_directions, value] });
    setNewDirection('');
  };

  if (!config) return <div className="p-20 text-center text-slate-500">正在加载配置……</div>;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Validated Configuration" title="系统设置" description="保存时后端会验证种子隔离、阈值范围和资源上限；持续调度正在运行时会自动重启使新配置生效。" actions={<button disabled={busy} onClick={save} className="action-primary"><Save size={16} />{busy ? '保存中' : '保存配置'}</button>} />
      {message && <p className="mb-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{message}</p>}
      <div className="space-y-5">
        <ProviderSettings />
        <Section title="模型与审核">
          <Field label="生成模型供应商"><ProviderSelect value={config.llm.provider} onChange={(value) => update('llm', 'provider', value)} /></Field>
          <Field label="审核模型供应商（留空则相同）"><ProviderSelect allowEmpty value={config.llm.reviewer_provider || ''} onChange={(value) => update('llm', 'reviewer_provider', value || null)} /></Field>
          <Field label="独立审核模型（可留空）"><input className="input" value={config.llm.reviewer_model || ''} onChange={(event) => update('llm', 'reviewer_model', event.target.value || null)} /></Field>
          <NumberField label="假设审核门槛" value={config.workflow.hypothesis_review_threshold} onChange={(value) => update('workflow', 'hypothesis_review_threshold', value)} step="0.1" />
        </Section>
        <Section title="实验纪律">
          <NumberField label="实验超时（分钟）" value={config.experiment.timeout_minutes} onChange={(value) => update('experiment', 'timeout_minutes', value)} />
          <NumberField label="候选最大迭代数" value={config.experiment.max_iterations} onChange={(value) => update('experiment', 'max_iterations', value)} />
          <NumberField label="最低成功率" value={config.experiment.minimum_success_rate} onChange={(value) => update('experiment', 'minimum_success_rate', value)} step="0.05" />
          <NumberField label="最大变异系数" value={config.experiment.maximum_coefficient_of_variation} onChange={(value) => update('experiment', 'maximum_coefficient_of_variation', value)} step="0.01" />
          <Field label="开发种子（逗号分隔）"><SeedInput value={config.experiment.train_seeds} onChange={(value) => update('experiment', 'train_seeds', value)} /></Field>
          <Field label="留出种子（不得重叠）"><SeedInput value={config.experiment.validation_seeds} onChange={(value) => update('experiment', 'validation_seeds', value)} /></Field>
        </Section>
        <Section title="安全与审批">
          <Toggle label="执行前人工审核" value={config.workflow.human_review_before_execution} onChange={(value) => update('workflow', 'human_review_before_execution', value)} />
          <Toggle label="允许实验代码联网" value={config.security.allow_network} onChange={(value) => update('security', 'allow_network', value)} />
          <NumberField label="内存上限（MB）" value={config.security.max_memory_mb} onChange={(value) => update('security', 'max_memory_mb', value)} />
          <NumberField label="日志上限（KB）" value={config.security.max_output_kb} onChange={(value) => update('security', 'max_output_kb', value)} />
        </Section>
        <section className="panel">
          <h2 className="mb-4 text-lg font-bold">研究方向</h2>
          <div className="mb-4 flex flex-wrap gap-2">{config.research_directions.map((item) => <span key={item} className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs">{item}<button onClick={() => setConfig({ ...config, research_directions: config.research_directions.filter((value) => value !== item) })}><X size={13} /></button></span>)}</div>
          <div className="flex gap-2"><input className="input flex-1" value={newDirection} onChange={(event) => setNewDirection(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addDirection())} placeholder="添加研究方向" /><button onClick={addDirection} className="action-secondary"><Plus size={15} />添加</button></div>
        </section>
      </div>
    </div>
  );
}

function Section({ title, children }) { return <section className="panel"><h2 className="mb-5 text-lg font-bold">{title}</h2><div className="grid gap-5 md:grid-cols-2">{children}</div></section>; }
function Field({ label, children }) { return <label className="space-y-2 text-xs font-bold text-slate-400"><span>{label}</span>{children}</label>; }
function NumberField({ label, value, onChange, step = '1' }) { return <Field label={label}><input type="number" step={step} className="input" value={value} onChange={(event) => onChange(Number(event.target.value))} /></Field>; }
function ProviderSelect({ value, onChange, allowEmpty = false }) { return <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>{allowEmpty && <option value="">与生成模型相同</option>}<option value="openai">OpenAI / 兼容</option><option value="anthropic">Anthropic Claude</option><option value="google">Google Gemini</option></select>; }
function SeedInput({ value, onChange }) { const [text, setText] = useState(value.join(', ')); return <input className="input" value={text} onChange={(event) => setText(event.target.value)} onBlur={() => { const seeds = text.split(',').map(Number).filter(Number.isInteger); onChange(seeds); setText(seeds.join(', ')); }} />; }
function Toggle({ label, value, onChange }) { return <label className="flex items-center justify-between rounded-xl bg-black/20 p-4 text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-cyan-300" /></label>; }
