/**
 * @fileoverview "Was this page useful?" feedback widget rendered at
 * the bottom of every doc page (via the `DocItem/Footer` swizzle).
 *
 * @remarks
 * - Persists the user's answer in `localStorage` under
 *   `docfb-<pathname>` so each page never re-prompts.
 * - Also emits a Microsoft Clarity custom event (`doc-feedback`) with
 *   `{page, helpful}` so aggregate feedback is visible in analytics.
 * - Deliberately minimal: two bracketed buttons, no free-form text
 *   input, no backend. If a feedback backend is ever added this
 *   component is the single entry point to extend.
 */

import React, {useEffect, useState} from 'react';
import styles from './styles.module.css';

/** Binary feedback answers; wider schemas are intentionally avoided. */
type StoredFeedback = 'yes' | 'no';

declare global {
  interface Window {
    clarity?: (action: string, ...args: readonly unknown[]) => void;
  }
}

/**
 * `localStorage` key for a given page path. Scoped per-path so two
 * tabs on different pages don't collide.
 */
function storageKey(pagePath: string): string {
  return `docfb-${pagePath}`;
}

/** Props for {@link DocFeedback}. */
type DocFeedbackProps = {
  /** Absolute URL path of the doc page, used as the localStorage scope. */
  readonly pagePath: string;
};

/**
 * Render the feedback prompt (or "already marked" confirmation) for
 * the given `pagePath`.
 */
export default function DocFeedback({pagePath}: Readonly<DocFeedbackProps>): React.JSX.Element {
  const [recorded, setRecorded] = useState<StoredFeedback | null>(null);

  useEffect(() => {
    try {
      const prior = window.localStorage.getItem(storageKey(pagePath));
      if (prior === 'yes' || prior === 'no') setRecorded(prior);
    } catch {
      // storage unavailable — ignore
    }
  }, [pagePath]);

  const submit = (helpful: StoredFeedback): void => {
    try {
      window.localStorage.setItem(storageKey(pagePath), helpful);
    } catch {
      // ignore
    }
    window.clarity?.('event', 'doc-feedback', {page: pagePath, helpful});
    setRecorded(helpful);
  };

  if (recorded !== null) {
    return <div className={styles.wrap}>{`// marked (${recorded})`}</div>;
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.prompt}>// was this page useful?</span>
      <button type="button" className={styles.btn} onClick={() => submit('yes')}>[yes]</button>
      <button type="button" className={styles.btn} onClick={() => submit('no')}>[no]</button>
    </div>
  );
}
