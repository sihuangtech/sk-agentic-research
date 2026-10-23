import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkbench } from '../state/WorkbenchContext';

export default function ProjectDialog() {
  const { t } = useTranslation();

  const { setAddingProject, act, addProject } = useWorkbench();
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('openProject')}
        className="modal compact"
      >
        <button
          className="modal-close"
          aria-label={t('close')}
          onClick={() => setAddingProject(false)}
        >
          <X />
        </button>
        <h2>{t('openLocalProject')}</h2>
        <p className="muted">{t('projectPathHelp')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(() => addProject(String(new FormData(e.currentTarget).get('path'))));
          }}
        >
          <input
            name="path"
            aria-label={t('projectPath')}
            placeholder="/Users/you/Research/my-project"
            required
            autoFocus
          />
          <button className="primary">{t('openProject')}</button>
        </form>
      </section>
    </div>
  );
}
