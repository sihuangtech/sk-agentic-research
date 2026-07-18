import { Check, Play, RotateCcw, X } from 'lucide-react';
import StatusBadge from './StatusBadge';

const stages = {
  created: '已创建', literature: '检索证据', ideation: '构建假设', planning: '设计实验',
  baseline: '运行基线', experiment: '候选迭代', validation: '留出验证', writing: '撰写报告', completed: '完成',
};

const metric = (value) => (typeof value === 'number' ? value.toFixed(5) : '—');

export default function RunCard({ run, busy, onApprove, onResume, onCancel }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={run.status} />
            <StatusBadge value={run.decision} />
            <span className="text-xs text-slate-500">{stages[run.stage] || run.stage}</span>
          </div>
          <h3 className="text-lg font-bold">{run.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{run.id}</p>
        </div>
        <div className="flex gap-2">
          {run.status === 'waiting_review' && (
            <button disabled={busy} onClick={() => onApprove(run.id)} className="action-primary"><Check size={15} /> 批准实验</button>
          )}
          {run.status === 'failed' && (
            <button disabled={busy} onClick={() => onResume(run.id)} className="action-secondary"><RotateCcw size={15} /> 恢复</button>
          )}
          {['queued', 'running', 'waiting_review', 'failed'].includes(run.status) && (
            <button disabled={busy} onClick={() => onCancel(run.id)} className="action-danger"><X size={15} /></button>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="基线均值" value={metric(run.metrics?.baseline_mean)} />
        <Metric label="候选均值" value={metric(run.metrics?.candidate_mean)} />
        <Metric label="改进量" value={metric(run.metrics?.improvement)} />
        <Metric label="成功率" value={typeof run.metrics?.success_rate === 'number' ? `${(run.metrics.success_rate * 100).toFixed(0)}%` : '—'} />
      </div>
      {run.error && <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{run.error}</p>}
    </article>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-mono text-sm font-bold text-slate-200">{value}</p></div>;
}
