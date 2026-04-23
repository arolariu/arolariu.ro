import React, {useEffect, useState} from 'react';
import styles from './styles.module.css';

type StoredFeedback = 'yes' | 'no';

declare global {
  interface Window {
    clarity?: (action: string, ...args: readonly unknown[]) => void;
  }
}

function storageKey(pagePath: string): string {
  return `docfb-${pagePath}`;
}

export default function DocFeedback({pagePath}: {readonly pagePath: string}): React.ReactNode {
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
