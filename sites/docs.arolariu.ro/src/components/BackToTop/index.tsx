/**
 * @fileoverview Fixed "[↑ top]" button that appears after 400px of
 * vertical scroll and smooth-scrolls back to the page origin.
 *
 * @remarks
 * Mounted inside `DocItem/Footer` (via swizzle) so it's scoped to
 * doc pages, not the landing. Respects `prefers-reduced-motion` by
 * falling back to an instant scroll.
 */

import React, {useEffect, useState} from 'react';
import styles from './styles.module.css';

/** Minimum vertical scroll (in px) before the button appears. */
const THRESHOLD_PX = 400;

/**
 * Render a fixed "back to top" button once the page has been scrolled
 * past {@link THRESHOLD_PX}.
 */
export default function BackToTop(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setVisible(window.scrollY > THRESHOLD_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = (): void => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'});
  };

  if (!visible) return null;

  return (
    <button type="button" className={styles.btn} onClick={toTop} aria-label="back to top">
      [↑ top]
    </button>
  );
}
