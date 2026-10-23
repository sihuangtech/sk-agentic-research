import { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { currentLocale } from '../i18n';

let preparation: Promise<void> | undefined;
export function prepareEditor() {
  preparation ??= (async () => {
    // Official language pack loads before Monaco registers its command labels.
    const languagePacks = {
      'zh-CN': () => import('monaco-editor/nls/lang/zh-cn.js'),
      'zh-TW': () => import('monaco-editor/nls/lang/zh-tw.js'),
      ja: () => import('monaco-editor/nls/lang/ja.js'),
      ko: () => import('monaco-editor/nls/lang/ko.js'),
      fr: () => import('monaco-editor/nls/lang/fr.js'),
      de: () => import('monaco-editor/nls/lang/de.js'),
      es: () => import('monaco-editor/nls/lang/es.js'),
      'pt-BR': () => import('monaco-editor/nls/lang/pt-br.js'),
      ru: () => import('monaco-editor/nls/lang/ru.js'),
      en: async () => {},
    };
    await languagePacks[currentLocale()]();
    const monaco = await import('monaco-editor/editor/editor.api.js');
    await Promise.all([
      import('monaco-editor/languages/definitions/python/register.js'),
      import('monaco-editor/languages/definitions/r/register.js'),
      import('monaco-editor/languages/definitions/markdown/register.js'),
      import('monaco-editor/languages/definitions/javascript/register.js'),
      import('monaco-editor/languages/definitions/shell/register.js'),
    ]);
    self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
    loader.config({ monaco });
  })();
  return preparation;
}
