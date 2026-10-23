import { useTranslation } from 'react-i18next';
import { formatError } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
export default function BootError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <main className="boot-error">
      <LanguageSwitcher />
      <h1>{t('bootError')}</h1>
      <p>{formatError(error)}</p>
      <button onClick={() => location.reload()}>{t('retryConnection')}</button>
    </main>
  );
}
