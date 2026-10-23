import { readFile, stat } from 'node:fs/promises';
import { getDocumentProxy } from 'unpdf';
import { DomainError, message } from './errors.js';
import type { Locale } from '../shared/locale.js';
import { projectPath } from './files.js';

export async function readPdf(
  root: string,
  path: string,
  startPage = 1,
  endPage = startPage + 9,
  locale: Locale = 'zh-CN',
) {
  const full = await projectPath(root, path);
  if ((await stat(full)).size > 50_000_000) throw new DomainError('pdfTooLarge');
  const doc = await getDocumentProxy(new Uint8Array(await readFile(full)));
  try {
    if (startPage < 1 || endPage < startPage || startPage > doc.numPages)
      throw new DomainError('pdfRange');
    const last = Math.min(endPage, doc.numPages, startPage + 19);
    const pages = [];
    for (let n = startPage; n <= last; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('');
      pages.push({ page: n, text: text.slice(0, 20000) });
    }
    return {
      file: path,
      totalPages: doc.numPages,
      pages,
      note: message('pdfNote', locale),
    };
  } finally {
    await doc.loadingTask.destroy();
  }
}
