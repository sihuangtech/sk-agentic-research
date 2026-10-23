import { BookOpen, ChevronRight, FlaskConical, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkbench } from '../state/WorkbenchContext';

export default function Welcome() {
  const { t } = useTranslation();

  const { setText, project } = useWorkbench();
  return (
    <section className="welcome">
      <span className="eyebrow">{t('eyebrow')}</span>
      <h1>{t('welcomeTitle')}</h1>
      <p>
        {t('welcomeIntro')}
        <br />
        {t('welcomeBody')}
      </p>
      <div className="suggestions">
        {[
          [t('understand'), t('understandPrompt'), FolderOpen],
          [t('analyze'), t('analyzePrompt'), FlaskConical],
          [t('literature'), t('literaturePrompt'), BookOpen],
        ].map(([label, prompt, Icon]) => {
          const Glyph = Icon as typeof BookOpen;
          return (
            <button key={String(label)} onClick={() => setText(String(prompt))}>
              <Glyph size={18} />
              <strong>{String(label)}</strong>
              <ChevronRight size={14} />
            </button>
          );
        })}
      </div>
      <div className="welcome-note">
        {project ? t('currentProjectPath', { path: project.path }) : t('getStarted')}
      </div>
    </section>
  );
}
