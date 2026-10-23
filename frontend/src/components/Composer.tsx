import { ArrowUp, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { request } from '../api';

import { useWorkbench } from '../state/WorkbenchContext';

export default function Composer() {
  const { t } = useTranslation();

  const {
    data,
    projectId,
    sessionId,
    snapshot,
    providerId,
    setProviderId,
    text,
    setText,
    mode,
    setMode,
    online,
    sending,
    project,
    running,
    act,
    send,
  } = useWorkbench();
  return (
    <>
      <form className="composer" onSubmit={(e) => void send(e)}>
        <textarea
          aria-label={t('task')}
          placeholder={project ? t('taskPlaceholder') : t('openProjectFirst')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="composer-toolbar">
          <select
            aria-label={t('modelConfig')}
            value={snapshot?.conversation.providerId || providerId}
            disabled={Boolean(sessionId)}
            onChange={(e) => setProviderId(e.target.value)}
          >
            <option value="">{t('selectModel')}</option>
            {data.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.model}
              </option>
            ))}
          </select>
          <span className="composer-space" />
          {running && (
            <>
              <select
                aria-label={t('sendMode')}
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="steer">{t('steer')}</option>
                <option value="followUp">{t('followUp')}</option>
              </select>
              <button
                type="button"
                className="icon-button"
                aria-label={t('stop')}
                onClick={() => void act(() => request(`/sessions/${sessionId}/abort`, 'POST'))}
              >
                <Square size={15} />
              </button>
            </>
          )}
          <button
            className="send-button"
            aria-label={t('send')}
            type="submit"
            disabled={!text.trim() || !projectId || !providerId || sending || !online}
          >
            <ArrowUp size={19} />
          </button>
        </div>
      </form>
      <footer className="composer-caption">
        {t('executionNotice')}
        <span>{t('sendShortcut')}</span>
      </footer>
    </>
  );
}
