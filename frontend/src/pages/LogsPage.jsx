import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import PageHeader from '../components/PageHeader';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [following, setFollowing] = useState(true);
  const container = useRef(null);

  useEffect(() => {
    api.get('/logs?lines=300').then(({ data }) => setLogs((data.logs || '').split('\n').filter(Boolean))).catch(() => {});
    const stream = new EventSource('/api/v1/logs/stream');
    stream.onmessage = (event) => setLogs((current) => [...current, event.data].slice(-2000));
    return () => stream.close();
  }, []);
  useEffect(() => {
    if (following && container.current) container.current.scrollTop = container.current.scrollHeight;
  }, [logs, following]);
  const visible = useMemo(() => filter === 'all' ? logs : logs.filter((line) => line.toLowerCase().includes(filter)), [logs, filter]);

  const actions = <>
    <button className="action-secondary" onClick={() => setFollowing((value) => !value)}>{following ? <Pause size={15} /> : <Play size={15} />}{following ? '暂停跟随' : '继续跟随'}</button>
    <button className="action-danger" onClick={() => setLogs([])}><Trash2 size={15} />清空面板</button>
  </>;
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-7xl flex-col">
      <PageHeader eyebrow="Execution Evidence" title="运行日志" description="日志只清空浏览器面板，不删除磁盘上的审计记录。" actions={actions} />
      <div className="mb-3 flex gap-2">
        {['all', 'info', 'warning', 'error'].map((name) => <button key={name} onClick={() => setFilter(name)} className={`rounded-lg px-3 py-2 text-xs font-bold uppercase ${filter === name ? 'bg-cyan-300 text-slate-950' : 'bg-white/5 text-slate-400'}`}>{name}</button>)}
      </div>
      <div ref={container} className="terminal-scrollbar flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-xs leading-6">
        {visible.map((line, index) => <div key={`${index}-${line.slice(0, 16)}`} className={line.includes('ERROR') ? 'text-rose-300' : line.includes('WARNING') ? 'text-amber-300' : 'text-slate-400'}><span className="mr-4 select-none text-slate-700">{String(index + 1).padStart(4, '0')}</span>{line}</div>)}
        {!visible.length && <p className="text-slate-600">暂无日志</p>}
      </div>
    </div>
  );
}
