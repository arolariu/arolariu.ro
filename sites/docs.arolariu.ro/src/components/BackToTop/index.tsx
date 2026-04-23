import React, {useEffect, useState} from 'react';
import styles from './styles.module.css';

const THRESHOLD_PX = 400;

export default function BackToTop(): React.ReactNode {
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
