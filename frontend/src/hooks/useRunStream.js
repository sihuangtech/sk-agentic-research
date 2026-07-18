import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function useRunStream() {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/runs')
      .then(({ data }) => active && setRuns(Array.isArray(data) ? data : []))
      .catch((reason) => active && setError(reason.message));
    const stream = new EventSource('/api/v1/pipelines/stream');
    stream.onmessage = (event) => {
      try { setRuns(JSON.parse(event.data)); } catch { setError('运行状态数据解析失败'); }
    };
    stream.onerror = () => setError('实时状态连接已断开，页面仍可手动刷新');
    return () => { active = false; stream.close(); };
  }, []);

  return { runs, setRuns, error };
}
