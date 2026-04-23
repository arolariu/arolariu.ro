/**
 * @fileoverview Custom 404 page for docs.arolariu.ro.
 *
 * @remarks
 * Renders in the same console aesthetic as the landing hero: a
 * wordmark with a blinking caret, two `//`-prefixed comment lines
 * (one echoing the attempted path, one introducing alternatives),
 * and a tree-drawn list of next moves. Fires a Microsoft Clarity
 * `404` custom event with the requested path so dead routes are
 * visible in analytics.
 *
 * The shortcut hint in the "open search" row is platform-aware
 * (⌘K on macOS, Ctrl+K elsewhere) so the prompt matches the
 * keyboard shortcut the SearchBar wrapper actually binds.
 */

import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './404.module.css';

declare global {
  interface Window {
    clarity?: (action: string, ...args: readonly unknown[]) => void;
  }
}

/**
 * Return `true` when the current user agent looks like macOS or iOS —
 * i.e. the platforms on which the SearchBar wrapper binds `⌘K` rather
 * than `Ctrl+K`. SSR safe (returns `false` during server render).
 */
function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent ?? '');
}

/**
 * The 404 page component. Docusaurus routes any unresolved URL here
 * automatically when `onBrokenLinks` / `onBrokenMarkdownLinks` are
 * set to `'warn'` and the Azure Static Web Apps rewrite rule falls
 * through to `index.html`.
 */
export default function NotFound(): React.JSX.Element {
  const [pathname, setPathname] = useState<string>('');
  const [shortcutHint, setShortcutHint] = useState<string>('Ctrl+K');

  useEffect(() => {
    const p = typeof window !== 'undefined' ? window.location.pathname : '';
    setPathname(p);
    setShortcutHint(isApplePlatform() ? '⌘K' : 'Ctrl+K');
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
            <code className={styles.rowPath}>press {shortcutHint}</code>
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
