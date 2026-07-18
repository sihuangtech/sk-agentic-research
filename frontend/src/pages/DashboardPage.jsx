import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, Square, Wrench } from 'lucide-react';
import { api, apiError } from '../api/client';
import PageHeader from '../components/PageHeader';
import RunCard from '../components/RunCard';
import StatusBadge from '../components/StatusBadge';
import useRunStream from '../hooks/useRunStream';

export default function DashboardPage() {
  const { runs, error: streamError } = useRunStream();
  const [system, setSystem] = useState({ status: 'stopped' });
  const [doctor, setDoctor] = useState({});
  const [direction, setDirection] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSystem = () => Promise.all([api.get('/system/status'), api.get('/system/doctor')])
    .then(([status, checks]) => { setSystem(status.data); setDoctor(checks.data); });

  useEffect(() => { loadSystem().catch((error) => setMessage(apiError(error))); }, []);
  const counts = useMemo(() => ({
    active: runs.filter((run) => ['queued', 'running', 'waiting_review'].includes(run.status)).length,
    accepted: runs.filter((run) => run.decision === 'accepted').length,
    failed: runs.filter((run) => ['failed', 'invalid'].includes(run.status) || run.decision === 'invalid').length,
  }), [runs]);

  const act = async (request, success) => {
    setBusy(true); setMessage('');
    try { await request(); setMessage(success); await loadSystem(); }
    catch (error) { setMessage(apiError(error)); }
    finally { setBusy(false); }
  };

  const createResearch = (event) => {
    event.preventDefault();
    if (!direction.trim()) return;
    act(() => api.post('/research', { direction: direction.trim() }), '研究任务已提交');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Local Research Control Plane"
        title="科研工作流总览"
        description="这里展示真实运行状态、留出验证指标和结论门禁，不再根据文件是否存在猜测进度。"
        actions={<><StatusBadge value={system.status === 'running' ? 'running' : 'cancelled'} />
          <button disabled={busy} onClick={() => act(() => api.post('/system/start'), '持续调度已启动')} className="action-primary"><Play size={16} />启动</button>
          <button disabled={busy} onClick={() => act(() => api.post('/system/stop'), '持续调度已停止')} className="action-secondary"><Square size={16} />停止</button></>}
      />
      {(message || streamError) && <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">{message || streamError}</div>}
      <section className="mb-7 grid gap-4 md:grid-cols-3">
        <Stat label="进行中/待审核" value={counts.active} tone="cyan" />
        <Stat label="通过留出验证" value={counts.accepted} tone="green" />
        <Stat label="失败或无效" value={counts.failed} tone="rose" />
      </section>
      <section className="mb-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <form onSubmit={createResearch} className="panel">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold"><FlaskConical size={18} className="text-cyan-300" />创建研究方向</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={direction} onChange={(event) => setDirection(event.target.value)} placeholder="例如：小样本医学影像分割的可靠性" className="input flex-1" />
            <button disabled={busy || !direction.trim()} className="action-primary justify-center">提交研究</button>
          </div>
          <p className="mt-3 text-xs text-slate-500">默认会在实验执行前暂停，等待你审核计划和生成代码。</p>
        </form>
        <div className="panel">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold"><Wrench size={18} className="text-amber-300" />环境检查</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(doctor).map(([key, value]) => <div key={key} className="rounded-lg bg-black/20 p-2"><span className="text-slate-500">{key}</span><p className={value?.ok ? 'text-emerald-300' : value?.optional ? 'text-amber-300' : 'text-rose-300'}>{value?.ok ? '正常' : value?.optional ? '可选缺失' : '需要处理'}</p></div>)}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        {runs.map((run) => <RunCard key={run.id} run={run} busy={busy}
          onApprove={(id) => act(() => api.post(`/runs/${id}/approve`, { reviewer: 'web-user' }), '已批准，后台开始执行')}
          onResume={(id) => act(() => api.post(`/runs/${id}/resume`), '恢复指令已提交')}
          onCancel={(id) => act(() => api.post(`/runs/${id}/cancel`), '运行已取消')} />)}
        {!runs.length && <div className="panel py-16 text-center text-sm text-slate-500">还没有科研运行。可以先执行 <code>python -m backend.cli demo</code> 验证本地环境。</div>}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = { cyan: 'text-cyan-300', green: 'text-emerald-300', rose: 'text-rose-300' }[tone];
  return <div className="panel"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>;
}
