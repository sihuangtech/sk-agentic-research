import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiUrl } from '../api/client';

export default function useRunStream() {
  const { t } = useTranslation();
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/runs')
      .then(({ data }) => active && setRuns(Array.isArray(data) ? data : []))
      .catch((reason) => active && setError(reason.message));
    const stream = new EventSource(apiUrl('/pipelines/stream'));
    stream.onmessage = (event) => {
      try { setRuns(JSON.parse(event.data)); } catch { setError(t('stream.parseFailed')); }
    };
    stream.onerror = () => setError(t('stream.disconnected'));
    return () => { active = false; stream.close(); };
  }, [t]);

  return { runs, setRuns, error };
}
