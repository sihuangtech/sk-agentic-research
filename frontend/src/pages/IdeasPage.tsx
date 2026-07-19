import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../api/client';
import PageHeader from '../components/PageHeader';

export default function IdeasPage() {
  const { t } = useTranslation();
  const [ideas, setIdeas] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/ideas').then(({ data }) => setIdeas(Array.isArray(data) ? data : [])).catch((reason) => setError(apiError(reason)));
  }, []);
  const visible = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    return keyword ? ideas.filter((idea) => `${idea.title} ${idea.content}`.toLowerCase().includes(keyword)) : ideas;
  }, [ideas, filter]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={t('ideas.eyebrow')} title={t('ideas.title')} description={t('ideas.description')} />
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input value={filter} onChange={(event) => setFilter(event.target.value)} className="input w-full pl-11" placeholder={t('ideas.search')} />
      </div>
      {error && <p className="mb-5 rounded-xl bg-rose-300/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="space-y-4">
        {visible.map((idea) => (
          <article key={idea.id} className="panel">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div><h2 className="text-lg font-bold">{idea.title}</h2><p className="mt-1 text-xs text-slate-500">{idea.id}</p></div>
              {typeof idea.score === 'number' && <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">{t('ideas.score', { score: idea.score.toFixed(2) })}</span>}
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">{idea.content}</p>
          </article>
        ))}
        {!visible.length && <div className="panel py-16 text-center text-sm text-slate-500">{t('ideas.empty')}</div>}
      </div>
    </div>
  );
}
