import { Languages } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../../../shared/locale';
import languages from '../../../shared/languages.json';
import { changeLanguage, currentLocale, formatError } from '../i18n';

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const [error, setError] = useState<unknown>();
  return (
    <div>
      <label className="language-switcher">
        <Languages size={15} aria-hidden="true" />
        <select
          aria-label={t('language')}
          value={currentLocale()}
          onChange={(event) => {
            setError(undefined);
            void changeLanguage(event.target.value as Locale).catch(setError);
          }}
        >
          {languages.map(({ code, name }) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {Boolean(error) && <p role="alert">{formatError(error)}</p>}
    </div>
  );
}
