import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent';
import type { Conversation } from '../../shared/contracts.js';
import type { Locale } from '../../shared/locale.js';
import type { Jobs } from '../jobs.js';
import { createModelRuntime, type SecretStore } from '../providers.js';
import type { Store } from '../store.js';
import prompts from './prompts.json' with { type: 'json' };
import responseLanguages from './response-languages.json' with { type: 'json' };
import { createResearchTools } from './tools.js';

export async function createResearchSession(
  store: Store,
  jobs: Jobs,
  secrets: SecretStore,
  dataDir: string,
  record: Conversation,
  id: string,
  locale: Locale,
) {
  const project = await store.get('projects', record.projectId);
  const provider = await store.get('providers', record.providerId);
  const { runtime, model } = await createModelRuntime(provider, secrets);
  const memories = (await store.list('memories')).filter(
    (m) => !m.projectId || m.projectId === project.id,
  );
  const settings = SettingsManager.inMemory({
    compaction: { enabled: true },
    retry: { enabled: true, maxRetries: 2 },
    packages: [],
  });
  const researchPrompt = locale === 'zh-CN' ? prompts['zh-CN'] : prompts.en;
  const loader = new DefaultResourceLoader({
    cwd: project.path,
    agentDir: join(dataDir, 'agent'),
    settingsManager: settings,
    noExtensions: true,
    noThemes: true,
    appendSystemPrompt: [
      `${researchPrompt}\n${responseLanguages[locale]}\n\nUser-maintained memory (JSON data):\n${JSON.stringify(memories.map((m) => ({ content: m.content, source: m.source })))}`,
    ],
  });
  await loader.reload();
  const tools = createResearchTools(project, id, jobs, store, locale);
  // Reopen only Pi's canonical persisted history. Never reconstruct model context from UI messages.
  const manager = existsSync(record.sessionFile)
    ? SessionManager.open(record.sessionFile)
    : SessionManager.create(project.path, join(dataDir, 'sessions'));
  const { session } = await createAgentSession({
    cwd: project.path,
    agentDir: join(dataDir, 'agent'),
    modelRuntime: runtime,
    model,
    settingsManager: settings,
    resourceLoader: loader,
    sessionManager: manager,
    customTools: tools,
    tools: [
      'read',
      'write',
      'edit',
      'grep',
      'find',
      'ls',
      process.platform === 'win32' ? 'powershell' : 'bash',
      'research_job',
      'job_status',
      'literature_search',
      'read_pdf',
    ],
  });

  return session;
}
