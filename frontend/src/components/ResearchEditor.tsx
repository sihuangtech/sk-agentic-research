import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { prepareEditor } from '../editor/runtime';
import { formatError } from '../i18n';
import { useTranslation } from 'react-i18next';
const languages: Record<string, string> = {
  py: 'python',
  r: 'r',
  md: 'markdown',
  js: 'javascript',
  ts: 'typescript',
  json: 'json',
  sh: 'shell',
  tex: 'plaintext',
};
export default function ResearchEditor({
  path,
  value,
  onChange,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    let active = true;
    void prepareEditor()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, []);
  if (error) return <p role="alert">{formatError(error)}</p>;
  if (!ready) return <p className="padded muted">{t('loadingEditor')}</p>;

  return (
    <Editor
      path={path}
      theme="vs-dark"
      language={languages[path.split('.').at(-1)?.toLowerCase() || ''] || 'plaintext'}
      value={value}
      onChange={(text) => onChange(text || '')}
      options={{
        ariaLabel: t('editorLabel'),
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        padding: { top: 12 },
        renderLineHighlight: 'none',
      }}
      loading={<p className="padded muted">{t('loadingEditorLong')}</p>}
    />
  );
}
