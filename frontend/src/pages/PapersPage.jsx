import { useEffect, useState } from 'react';
import { Download, FileCode2, FileText } from 'lucide-react';
import { api, apiError } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function PapersPage() {
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/papers').then(({ data }) => setPapers(Array.isArray(data) ? data : [])).catch((reason) => setError(apiError(reason)));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Auditable Outputs" title="研究报告" description="报告与真实验证记录绑定。未通过门禁的结果会被明确标为未证实、无效或结论不确定。" />
      {error && <p className="mb-5 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {papers.map((paper) => (
          <article key={paper.id} className="panel flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="rounded-xl bg-violet-300/10 p-3 text-violet-200"><FileText size={22} /></div>
              <StatusBadge value={paper.decision} />
            </div>
            <h2 className="text-lg font-bold leading-7">{paper.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{paper.abstract}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a className="action-secondary" href={`/api/v1/papers/${paper.id}/md`}><FileText size={15} />Markdown</a>
              <a className="action-secondary" href={`/api/v1/papers/${paper.id}/tex`}><FileCode2 size={15} />LaTeX</a>
              {paper.has_pdf && <a className="action-primary" href={`/api/v1/papers/${paper.id}/pdf`}><Download size={15} />PDF</a>}
            </div>
          </article>
        ))}
        {!papers.length && <div className="panel py-16 text-center text-sm text-slate-500 md:col-span-2">尚未产生研究报告。</div>}
      </div>
    </div>
  );
}
