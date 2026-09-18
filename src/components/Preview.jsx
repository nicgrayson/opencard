import { useRef, useEffect, useState } from 'react';
import { generatePage } from '../engine/generate';

const BASE_WIDTH = 360;

export default function Preview({ config }) {
  const [html, setHtml] = useState(() => {
    try {
      return generatePage(config);
    } catch {
      return '';
    }
  });
  const [page, setPage] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const timerRef = useRef(null);
  const naturalWRef = useRef(0);
  const wrapRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        naturalWRef.current = 0;
        setPage({ w: 0, h: 0 });
        setHtml(generatePage(config));
      } catch {
        // Keep last valid HTML on error
      }
    }, 80);
    return () => clearTimeout(timerRef.current);
  }, [config]);

  useEffect(() => {
    const frame = frameRef.current;
    const wrap = wrapRef.current;
    if (!frame || !wrap) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      let doc;
      try {
        doc = frame.contentDocument;
      } catch {
        return;
      }
      if (!doc || !doc.body) return;
      const de = doc.documentElement;
      const w = Math.max(de.scrollWidth, doc.body.scrollWidth);
      const h = Math.max(de.scrollHeight, doc.body.scrollHeight);
      if (!w || !h) return;
      if (w !== naturalWRef.current) {
        naturalWRef.current = w;
        setPage({ w, h: 0 });
        setTimeout(measure, 60);
      } else {
        setPage({ w, h });
      }
    };

    frame.addEventListener('load', measure);
    window.addEventListener('resize', measure);
    measure();
    return () => {
      cancelled = true;
      frame.removeEventListener('load', measure);
      window.removeEventListener('resize', measure);
    };
  }, [html]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !page.w) return;
    const update = () => setScale(Math.min(1, (wrap.clientWidth - 2) / page.w));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [page.w]);

  const width = page.w || BASE_WIDTH;
  const height = page.h || '100%';

  return (
    <div ref={wrapRef} className="w-full h-full overflow-auto bg-gray-100">
      <div style={{ width: page.w ? page.w * scale : '100%', height: page.h ? page.h * scale : '100%' }}>
        <div style={{ width, height, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: 'top left' }}>
          <iframe
            ref={frameRef}
            srcDoc={html}
            className="border-0 block"
            style={{ width, height }}
            title="Scorecard Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
