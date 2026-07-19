import { useTranslation } from 'react-i18next';

const colors = {
  running: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  completed: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  accepted: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  waiting_review: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  failed: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
  invalid: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
  rejected: 'border-orange-300/30 bg-orange-300/10 text-orange-200',
  inconclusive: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
};

export default function StatusBadge({ value }) {
  const { t } = useTranslation();
  if (!value) return null;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${colors[value] || 'border-white/10 bg-white/5 text-slate-300'}`}>
      {t(`status.${value}`, { defaultValue: value })}
    </span>
  );
}
