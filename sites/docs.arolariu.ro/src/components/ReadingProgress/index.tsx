/**
 * @fileoverview 2px reading-progress bar pinned to the top of the
 * viewport, growing as the user scrolls through a long page.
 *
 * @remarks
 * Auto-hides when the document is shorter than 1.7× the viewport
 * (short pages don't need a progress cue). The scroll listener is
 * `requestAnimationFrame`-throttled so paint cost stays near zero.
 * Mounted once inside the `Root` swizzle.
 */

import React, {useEffect, useRef, useState} from 'react';
import styles from './styles.module.css';

/**
 * Minimum ratio of `scrollHeight / viewportHeight` at which the bar
 * becomes visible. 1.7× roughly corresponds to "more than one screen
 * of content below the fold."
 */
const LENGTH_RATIO_THRESHOLD = 1.7;

/**
 * Thin copper bar at the top of the viewport whose width represents
 * how much of the current page the user has scrolled past.
 */
export default function ReadingProgress(): React.JSX.Element | null {
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
