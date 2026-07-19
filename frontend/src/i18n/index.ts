import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

const LANGUAGE_STORAGE_KEY = 'agentic-research.uiLanguage';
const supportedLanguages = ['zh-CN', 'en'];
let initialization;

export function normalizeLanguage(language) {
  return String(language || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function syncDocument(language) {
  const normalized = normalizeLanguage(language);
  document.documentElement.lang = normalized;
  document.title = i18n.t('app.documentTitle');
}

export function initializeI18n() {
  if (!initialization) {
    initialization = i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          'zh-CN': { translation: zhCN },
          en: { translation: en },
        },
        fallbackLng: 'en',
        supportedLngs: supportedLanguages,
        load: 'currentOnly',
        detection: {
          // A fresh install follows the operating-system/browser language.
          // A choice made in the switcher is remembered for later launches.
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
          caches: ['localStorage'],
          convertDetectedLanguage: normalizeLanguage,
        },
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
  await i18n.changeLanguage(normalized);
}

export default i18n;
