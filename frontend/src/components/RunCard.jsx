import { Check, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';

const metric = (value) => (typeof value === 'number' ? value.toFixed(5) : '—');

export default function RunCard({ run, busy, onApprove, onResume, onCancel }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={run.status} />
            <StatusBadge value={run.decision} />
            <span className="text-xs text-slate-500">{t(`stage.${run.stage}`, { defaultValue: run.stage })}</span>
          </div>
          <h3 className="text-lg font-bold">{run.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{run.id}</p>
        </div>
        <div className="flex gap-2">
          {run.status === 'waiting_review' && (
            <button disabled={busy} onClick={() => onApprove(run.id)} className="action-primary"><Check size={15} /> {t('run.approve')}</button>
          )}
          {run.status === 'failed' && (
            <button disabled={busy} onClick={() => onResume(run.id)} className="action-secondary"><RotateCcw size={15} /> {t('run.resume')}</button>
          )}
          {['queued', 'running', 'waiting_review', 'failed'].includes(run.status) && (
            <button disabled={busy} onClick={() => onCancel(run.id)} className="action-danger" aria-label={t('run.cancel')} title={t('run.cancel')}><X size={15} /></button>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label={t('run.baselineMean')} value={metric(run.metrics?.baseline_mean)} />
        <Metric label={t('run.candidateMean')} value={metric(run.metrics?.candidate_mean)} />
        <Metric label={t('run.improvement')} value={metric(run.metrics?.improvement)} />
        <Metric label={t('run.successRate')} value={typeof run.metrics?.success_rate === 'number' ? `${(run.metrics.success_rate * 100).toFixed(0)}%` : '—'} />
      </div>
      {run.error && <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">{run.error}</p>}
    </article>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-mono text-sm font-bold text-slate-200">{value}</p></div>;
}
