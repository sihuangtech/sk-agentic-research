import { useEffect, useState } from 'react';
import { Download, FileCode2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError, apiUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function PapersPage() {
  const { t } = useTranslation();
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/papers').then(({ data }) => setPapers(Array.isArray(data) ? data : [])).catch((reason) => setError(apiError(reason)));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={t('papers.eyebrow')} title={t('papers.title')} description={t('papers.description')} />
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
              <a className="action-secondary" href={apiUrl(`/papers/${paper.id}/md`)}><FileText size={15} />Markdown</a>
              <a className="action-secondary" href={apiUrl(`/papers/${paper.id}/tex`)}><FileCode2 size={15} />LaTeX</a>
              {paper.has_pdf && <a className="action-primary" href={apiUrl(`/papers/${paper.id}/pdf`)}><Download size={15} />PDF</a>}
            </div>
          </article>
        ))}
        {!papers.length && <div className="panel py-16 text-center text-sm text-slate-500 md:col-span-2">{t('papers.empty')}</div>}
      </div>
    </div>
  );
}
