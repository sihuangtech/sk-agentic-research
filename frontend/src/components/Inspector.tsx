import { Brain, Clock3, Folder, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../state/WorkbenchContext';
import AutomationsPanel from './AutomationsPanel';
import FilePanel from './FilePanel';
import JobsPanel from './JobsPanel';
import MemoryPanel from './MemoryPanel';

export default function Inspector() {
  const { t } = useTranslation();

  const { panel, setPanel, project, revision, setError } = useWorkbench();
  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        {(
          [
            ['files', Folder, t('files')],
            ['jobs', Terminal, t('jobs')],
            ['memory', Brain, t('memory')],
            ['automations', Clock3, t('automations')],
          ] as const
        ).map(([key, Icon, label]) => (
          <button className={panel === key ? 'active' : ''} onClick={() => setPanel(key)} key={key}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {panel === 'files' && <FilePanel project={project} revision={revision} onError={setError} />}
      {panel === 'jobs' && <JobsPanel />}
      {panel === 'memory' && <MemoryPanel />}
      {panel === 'automations' && <AutomationsPanel />}
    </aside>
  );
}
