import { invoke, isTauri } from '@tauri-apps/api/core';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { type Locale, isLocale, resolveLocale, supportedLocales } from '../../../shared/locale';
import serviceZh from '../../../shared/locales/zh-CN.json';
import { resources } from './resources';

export const languageStorageKey = 'agentic-research.language';
function initialLanguage(): Locale {
  try {
    const stored = localStorage.getItem(languageStorageKey);
    if (isLocale(stored)) return stored;
  } catch {
    /* Private browser contexts may disallow persistence. */
  }
  return resolveLocale(navigator.languages.join(','));
}
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  lng: initialLanguage(),
  supportedLngs: supportedLocales,
  fallbackLng: false,
  initAsync: false,
  keySeparator: false,
  resources,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
export function currentLocale(): Locale {
  return resolveLocale(i18n.language);
}
function updateDocument() {
  document.documentElement.lang = currentLocale();
  document.title = i18n.t('brand');
}
i18n.on('languageChanged', updateDocument);
updateDocument();
export async function changeLanguage(locale: Locale) {
  if (isTauri()) await invoke('set_locale', { locale });
  await i18n.changeLanguage(locale);
  try {
    localStorage.setItem(languageStorageKey, locale);
  } catch {
    /* Session-only selection. */
  }
}
export async function syncDesktopLanguage() {
  if (isTauri()) await invoke('set_locale', { locale: currentLocale() });
}
export function formatDate(value: number) {
  return new Intl.DateTimeFormat(currentLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}
export function serviceMessage(code?: string, fallback = '') {
  return code && Object.hasOwn(serviceZh, code)
    ? String(i18n.t(code as keyof typeof serviceZh, { ns: 'service' }))
    : fallback;
}
export function formatError(error: unknown) {
  if (typeof error === 'string') return serviceMessage(error, error);
  return error instanceof Error ? error.toString() : String(error);
}
export class UiMessage extends Error {
  constructor(key: 'savedConfig' | 'testing' | 'networkError');
  constructor(key: 'connectionSuccess', values: { latency: number });
  constructor(
    readonly key: 'savedConfig' | 'testing' | 'networkError' | 'connectionSuccess',
    readonly values?: { latency: number },
  ) {
    super(key);
  }
  toString() {
    if (this.key === 'connectionSuccess')
      return i18n.t(this.key, { latency: this.values!.latency });
    return i18n.t(this.key);
  }
}
