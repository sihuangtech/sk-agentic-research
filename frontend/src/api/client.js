import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20000,
});

export const apiError = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join('；');
  return error?.message || '请求失败';
};

export const fetchOverview = async () => {
  const [system, runs, doctor] = await Promise.all([
    api.get('/system/status'),
    api.get('/runs'),
    api.get('/system/doctor'),
  ]);
  return { system: system.data, runs: runs.data, doctor: doctor.data };
};
