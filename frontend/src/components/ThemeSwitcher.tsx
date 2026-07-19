import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getThemePreference, setThemePreference } from '../theme';

const icons = { system: Monitor, light: Sun, dark: Moon };

export default function ThemeSwitcher({ compact = false }) {
  const { t } = useTranslation();
  const [preference, setPreference] = useState(getThemePreference());
  const Icon = icons[preference] || Monitor;

  const changeTheme = (event) => {
    const next = setThemePreference(event.target.value);
    setPreference(next);
  };

  return (
    <label className={`theme-switcher ${compact ? 'theme-switcher-compact' : ''}`}>
      <Icon size={15} aria-hidden="true" />
      {!compact && <span className="sr-only">{t('app.theme')}</span>}
      <select aria-label={t('app.theme')} value={preference} onChange={changeTheme}>
        <option value="system">{t('app.themeSystem')}</option>
        <option value="light">{t('app.themeLight')}</option>
        <option value="dark">{t('app.themeDark')}</option>
      </select>
    </label>
  );
}
