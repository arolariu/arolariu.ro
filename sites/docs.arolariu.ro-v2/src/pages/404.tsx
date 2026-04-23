import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './404.module.css';

declare global {
  interface Window {
    clarity?: (action: string, ...args: readonly unknown[]) => void;
  }
}

export default function NotFound(): React.ReactNode {
  const [pathname, setPathname] = useState<string>('');

  useEffect(() => {
    const p = typeof window !== 'undefined' ? window.location.pathname : '';
    setPathname(p);
    window.clarity?.('event', '404', {path: p});
  }, []);

  return (
    <Layout title="404" description="Route not in map">
      <main className={styles.page}>
        <h1 className={styles.wordmark}>
          <span className={styles.chevron} aria-hidden="true">&gt;</span>
          <span className={styles.accent}>404</span>
          <span className={styles.slash}>:</span>
          <span className={styles.text}> route not in map</span>
          <span className={styles.caret} aria-hidden="true" />
        </h1>
        <p className={styles.tagline}>
          <span className={styles.comment}>//</span> you requested <code className={styles.path}>{pathname || '(unknown)'}</code>
        </p>
        <p className={styles.tagline}>
          <span className={styles.comment}>//</span> that path isn't published. possible next moves:
        </p>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span className={styles.tree} aria-hidden="true">├─</span>
            <Link to="/" className={styles.rowLabel}>return to landing</Link>
            <span className={styles.rowArrow} aria-hidden="true">→</span>
            <code className={styles.rowPath}>/</code>
          </li>
          <li className={styles.row}>
            <span className={styles.tree} aria-hidden="true">├─</span>
            <span className={styles.rowLabel}>open search</span>
            <span className={styles.rowArrow} aria-hidden="true">→</span>
            <code className={styles.rowPath}>press ⌘K</code>
          </li>
          <li className={styles.row}>
            <span className={styles.tree} aria-hidden="true">└─</span>
            <Link to="https://github.com/arolariu/arolariu.ro" className={styles.rowLabel}>browse the repo</Link>
            <span className={styles.rowArrow} aria-hidden="true">→</span>
            <code className={styles.rowPath}>github.com/arolariu/arolariu.ro</code>
          </li>
        </ul>
      </main>
    </Layout>
  );
}
