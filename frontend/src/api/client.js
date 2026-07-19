import axios from 'axios';
import { invoke, isTauri } from '@tauri-apps/api/core';
import i18n from '../i18n';

let desktopConnection = null;

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.resolvedLanguage || 'en';
  return config;
});

export const initializeApi = async () => {
  if (!isTauri()) return;
  desktopConnection = await invoke('backend_connection');
  api.defaults.baseURL = `${desktopConnection.baseUrl}/api/v1`;
  api.defaults.headers.common['X-Papermill-Token'] = desktopConnection.token;
};

export const apiUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!desktopConnection) return `/api/v1${normalized}`;
  const url = new URL(`${desktopConnection.baseUrl}/api/v1${normalized}`);
  // EventSource 和普通下载链接不能附加自定义 Header，因此使用短生命周期查询令牌。
  url.searchParams.set('token', desktopConnection.token);
  return url.toString();
};

export const apiError = (error) => {
  const detail = error?.response?.data?.detail;
  const knownErrors = {
    '运行不存在': 'errors.runNotFound',
    '只有等待审核的运行可以批准': 'errors.approvalOnly',
    '已完成运行不能取消': 'errors.completedCannotCancel',
    '配置值不得包含换行符': 'errors.noNewlines',
  };
  if (typeof detail === 'string') return knownErrors[detail] ? i18n.t(knownErrors[detail]) : detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(i18n.resolvedLanguage === 'zh-CN' ? '；' : '; ');
  return error?.message || i18n.t('errors.requestFailed');
};

export const fetchOverview = async () => {
  const [system, runs, doctor] = await Promise.all([
    api.get('/system/status'),
    api.get('/runs'),
    api.get('/system/doctor'),
  ]);
  return { system: system.data, runs: runs.data, doctor: doctor.data };
};
