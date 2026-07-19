import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const LANGUAGE_STORAGE_KEY = 'papermill.uiLanguage';
const supportedLanguages = ['zh-CN', 'en'];
let initialization;

export function normalizeLanguage(language) {
  return String(language || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function readSavedLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return supportedLanguages.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function detectLanguage() {
  const saved = readSavedLanguage();
  if (saved) return saved;
  return normalizeLanguage(navigator.languages?.[0] || navigator.language);
}

function syncDocument(language) {
  const normalized = normalizeLanguage(language);
  document.documentElement.lang = normalized;
  document.title = i18n.t('app.documentTitle');
}

export function initializeI18n() {
  if (!initialization) {
    initialization = i18n
      .use(initReactI18next)
      .init({
        resources: {
          'zh-CN': { translation: zhCN },
          en: { translation: en },
        },
        lng: detectLanguage(),
        fallbackLng: 'en',
        supportedLngs: supportedLanguages,
        load: 'currentOnly',
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
      })
      .then(() => {
        syncDocument(i18n.resolvedLanguage);
        i18n.on('languageChanged', syncDocument);
        return i18n;
      });
  }
  return initialization;
}

export async function changeLanguage(language) {
  const normalized = normalizeLanguage(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // The selected language still applies for this session when storage is unavailable.
  }
  await i18n.changeLanguage(normalized);
}

export default i18n;
