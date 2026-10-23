import { type ToolDefinition } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import type { Project } from '../../shared/contracts.js';
import { DomainError, message } from '../errors.js';
import type { Locale } from '../../shared/locale.js';
import type { Jobs } from '../jobs.js';
import { readPdf } from '../pdf.js';
import type { Store } from '../store.js';
export function createResearchTools(
  project: Project,
  id: string,
  jobs: Jobs,
  store: Store,
  locale: Locale,
): ToolDefinition[] {
  const reply = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    details: {},
  });
  const tools: ToolDefinition[] = [
    {
      name: 'read_pdf',
      label: message('pdfLabel', locale),
      description: message('pdfDescription', locale),
      parameters: Type.Object({
        path: Type.String(),
        startPage: Type.Optional(Type.Integer({ minimum: 1 })),
        endPage: Type.Optional(Type.Integer({ minimum: 1 })),
      }),
      execute: async (_id, args) => {
        const input = args as { path: string; startPage?: number; endPage?: number };
        return reply(
          await readPdf(project.path, input.path, input.startPage, input.endPage, locale),
        );
      },
    },
    {
      name: 'research_job',
      label: message('jobLabel', locale),
      description: message('jobDescription', locale),
      parameters: Type.Object({ command: Type.String({ maxLength: 16000 }) }),
      execute: async (_id, args) =>
        reply(await jobs.start(project, (args as { command: string }).command, id)),
    },
    {
      name: 'job_status',
      label: message('jobStatusLabel', locale),
      description: message('jobStatusDescription', locale),
      parameters: Type.Object({ id: Type.String() }),
      execute: async (_id, args) => {
        const job = await store.get('jobs', (args as { id: string }).id);
        if (job.projectId !== project.id) throw new DomainError('jobProjectMismatch');
        return reply(job);
      },
    },
    {
      name: 'literature_search',
      label: message('searchLabel', locale),
      description: message('searchDescription', locale),
      parameters: Type.Object({ query: Type.String({ maxLength: 1000 }) }),
      execute: async (_id, args, signal) => {
        const url = new URL('https://api.crossref.org/works');
        url.searchParams.set('query', (args as { query: string }).query);
        url.searchParams.set('rows', '8');
        const result = await fetch(url, {
          signal: AbortSignal.any([
            signal || new AbortController().signal,
            AbortSignal.timeout(20000),
          ]),
          headers: { 'User-Agent': 'SecondMoon/0.4' },
        });
        if (!result.ok) throw new Error(`Crossref HTTP ${result.status}`);
        const data = (await result.json()) as {
          message: { items: Array<Record<string, unknown>> };
        };
        return reply(
          data.message.items.map((p) => ({
            title: p.title,
            doi: p.DOI,
            url: p.URL,
            published: p.published,
            author: p.author,
            abstract: p.abstract,
          })),
        );
      },
    },
  ];

  return tools.map((tool) => ({
    ...tool,
    execute: async (...args) => {
      try {
        return await tool.execute(...args);
      } catch (error) {
        if (error instanceof DomainError) throw new Error(message(error.code, locale));
        throw error;
      }
    },
  }));
}
