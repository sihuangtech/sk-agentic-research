import type { AgentMessage } from '@earendil-works/pi-agent-core';
import type { ChatMessage } from '../../shared/contracts.js';
import type { Locale } from '../../shared/locale.js';
import { message as translate } from '../errors.js';

export function presentMessages(messages: AgentMessage[], locale: Locale = 'zh-CN'): ChatMessage[] {
  return messages
    .map((message) => {
      const m = message as unknown as {
        role: string;
        content?:
          | string
          | Array<{ type: string; text?: string; name?: string; arguments?: unknown }>;
        toolName?: string;
        isError?: boolean;
        errorMessage?: string;
      };
      const text =
        typeof m.content === 'string'
          ? m.content
          : (m.content || [])
              .map((c) =>
                c.type === 'text'
                  ? c.text || ''
                  : c.type === 'toolCall'
                    ? `${translate('toolCall', locale)}: ${c.name}\n${JSON.stringify(c.arguments, null, 2)}`
                    : '',
              )
              .filter(Boolean)
              .join('\n');
      return {
        role: m.role,
        text: text || m.errorMessage || '',
        toolName: m.toolName,
        isError: m.isError || Boolean(m.errorMessage),
      };
    })
    .filter((m) => m.text);
}
