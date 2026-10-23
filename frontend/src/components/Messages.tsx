import { Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

import { serviceMessage } from '../i18n';
import { useWorkbench } from '../state/WorkbenchContext';

export default function Messages() {
  const { t } = useTranslation();

  const { sessionId, snapshot, chatEnd, running } = useWorkbench();
  return (
    <>
      {sessionId && !snapshot && <p className="muted padded">{t('restoring')}</p>}
      {snapshot?.messages.map((message, index) => (
        <article
          key={index}
          className={`message ${message.role === 'user' ? 'user' : message.role === 'toolResult' ? 'tool' : 'assistant'}`}
        >
          {message.role === 'toolResult' ? (
            <details>
              <summary>
                <Terminal size={14} />
                {message.toolName || t('toolResult')}
                <span className={message.isError ? 'bad' : 'muted'}>
                  {message.isError ? t('failed') : t('completed')}
                </span>
              </summary>
              <pre>{message.text}</pre>
            </details>
          ) : (
            <>
              <div className="message-author">
                {message.role === 'user' ? t('you') : t('brand')}
                <span>{message.role === 'user' ? t('researcher') : t('agent')}</span>
              </div>
              <div className="markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            </>
          )}
        </article>
      ))}
      {snapshot?.activeTools.map((tool) => (
        <div key={tool} className="activity">
          <i className="pulse" />
          {t('executingTool', { tool })}
        </div>
      ))}
      {running && !snapshot?.activeTools.length && (
        <div className="activity">
          <i className="pulse" />
          {t('working')}
        </div>
      )}
      {snapshot?.queued.map((q, i) => (
        <div className="queued" key={i}>
          {t('queuedGuidance', { text: q })}
        </div>
      ))}
      {(snapshot?.conversation.error || snapshot?.conversation.errorCode) && (
        <div className="session-error">
          {serviceMessage(snapshot.conversation.errorCode, snapshot.conversation.error)}
        </div>
      )}
      <div ref={chatEnd} />
    </>
  );
}
