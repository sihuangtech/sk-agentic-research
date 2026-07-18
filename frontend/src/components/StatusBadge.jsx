const labels = {
  queued: '排队中',
  running: '运行中',
  waiting_review: '等待审核',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  accepted: '已证实',
  rejected: '未达门槛',
  inconclusive: '结论不确定',
  invalid: '实验无效',
};

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
  if (!value) return null;
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${colors[value] || 'border-white/10 bg-white/5 text-slate-300'}`}>
      {labels[value] || value}
    </span>
  );
}
