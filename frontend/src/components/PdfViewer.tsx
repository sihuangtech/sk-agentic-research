import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfViewer({ url }: { url: string }) {
  const { t } = useTranslation();

  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    setError('');
    setPage(1);
    const loading = getDocument({
      url,
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
      wasmUrl: '/pdfjs/wasm/',
    });
    void loading.promise.then(setDocument).catch((e) => setError(String(e)));
    return () => {
      setDocument(undefined);
      void loading.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void document
      .getPage(page)
      .then((p) => {
        if (cancelled || !canvas.current) return;
        const viewport = p.getViewport({ scale: scale * devicePixelRatio });
        const target = canvas.current;
        target.width = viewport.width;
        target.height = viewport.height;
        target.style.width = `${viewport.width / devicePixelRatio}px`;
        task = p.render({ canvas: target, viewport });
        return task.promise;
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [document, page, scale]);
  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          {t('previousPage')}
        </button>
        <span>
          {page} / {document?.numPages || '…'}
        </span>
        <button
          disabled={!document || page >= document.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('nextPage')}
        </button>
        <select
          aria-label={t('pdfZoom')}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => (
            <option key={v} value={v}>
              {v * 100}%
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="pdf-canvas">
        <canvas ref={canvas} />
      </div>
    </div>
  );
}
