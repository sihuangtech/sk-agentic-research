import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, normalizeLanguage } from '../i18n';

export default function LanguageSwitcher({ compact = false }) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage);

  return (
    <label className={`flex items-center gap-2 text-xs text-slate-400 ${compact ? '' : 'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2'}`}>
      <Languages size={15} aria-hidden="true" />
      {!compact && <span className="sr-only">{t('app.language')}</span>}
      <select
        className="min-w-0 flex-1 cursor-pointer bg-transparent font-semibold text-slate-300 outline-none"
        aria-label={t('app.language')}
        value={language}
        onChange={(event) => changeLanguage(event.target.value)}
      >
        <option className="bg-slate-900" value="zh-CN">{t('app.languageChinese')}</option>
        <option className="bg-slate-900" value="en">{t('app.languageEnglish')}</option>
      </select>
    </label>
  );
}
