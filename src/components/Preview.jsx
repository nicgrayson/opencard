import { useRef, useEffect, useState } from 'react';
import { generatePage } from '../engine/generate';

export default function Preview({ config }) {
  const [html, setHtml] = useState(() => {
    try {
      return generatePage(config);
    } catch {
      return '';
    }
  });
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        setHtml(generatePage(config));
      } catch {
        // Keep last valid HTML on error
      }
    }, 80);
    return () => clearTimeout(timerRef.current);
  }, [config]);

  return (
    <iframe
      srcDoc={html}
      className="w-full h-full border-0"
      title="Scorecard Preview"
      sandbox="allow-same-origin"
    />
  );
}
