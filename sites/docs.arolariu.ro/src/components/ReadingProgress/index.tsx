import React, {useEffect, useRef, useState} from 'react';
import styles from './styles.module.css';

const LENGTH_RATIO_THRESHOLD = 1.7;

export default function ReadingProgress(): React.ReactNode {
  const [widthPct, setWidthPct] = useState(0);
  const [active, setActive] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const measure = (): void => {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const viewport = window.innerHeight;
      const total = doc.scrollHeight;
      if (total <= viewport * LENGTH_RATIO_THRESHOLD) {
        setActive(false);
        return;
      }
      setActive(true);
      const max = total - viewport;
      const pct = Math.max(0, Math.min(100, (scrolled / max) * 100));
      setWidthPct(pct);
    };
    const onScroll = (): void => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };
    measure();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!active) return null;
  return <div aria-hidden="true" className={styles.bar} style={{width: `${widthPct}%`}} />;
}
