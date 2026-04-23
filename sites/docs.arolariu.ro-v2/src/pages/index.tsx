import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

type Row = {readonly label: string; readonly href: string};

const START_HERE: readonly Row[] = [
  {label: 'monorepo overview', href: '/monorepo/'},
  {label: '.net internals', href: '/internals/dotnet/'},
  {label: 'typescript reference', href: '/reference/typescript/'},
  {label: 'experimental (python)', href: '/internals/experimental/'},
];

const RESOURCES: readonly Row[] = [
  {label: 'rfcs', href: '/monorepo/rfc/'},
  {label: 'backend guides', href: '/monorepo/backend/'},
  {label: 'frontend guides', href: '/monorepo/frontend/'},
];

const ALL_ROWS: readonly Row[] = [...START_HERE, ...RESOURCES];

function connector(index: number, total: number): string {
  return index === total - 1 ? '└─' : '├─';
}

export default function Home(): React.ReactNode {
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'ArrowDown' || event.key === 'j') {
        event.preventDefault();
        setCursor((value) => (value === null ? 0 : Math.min(value + 1, ALL_ROWS.length - 1)));
      } else if (event.key === 'ArrowUp' || event.key === 'k') {
        event.preventDefault();
        setCursor((value) => (value === null || value <= 0 ? 0 : value - 1));
      } else if (event.key === 'Enter' && cursor !== null) {
        event.preventDefault();
        window.location.href = ALL_ROWS[cursor]!.href;
      } else if (event.key === 'Escape') {
        setCursor(null);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cursor]);

  return (
    <Layout title="docs" description="Unified reference for arolariu.ro">
      <main className={styles.page}>
        <section className={styles.hero}>
          <h1 className={styles.wordmark}>
            <span className={styles.prefix}>arolariu.ro</span>
            <span className={styles.slash}>/</span>
            <span className={styles.accent}>docs</span>
          </h1>
          <p className={styles.tagline}>
            <span className={styles.comment}>//</span> unified reference for three services
            <span className={styles.caret} aria-hidden="true" />
          </p>
        </section>

        <Section title="start here" rows={START_HERE} cursor={cursor} cursorOffset={0} />
        <Section title="resources" rows={RESOURCES} cursor={cursor} cursorOffset={START_HERE.length} />

        <footer className={styles.footer}>
          <span className={styles.comment}>//</span> use <kbd className={styles.kbd}>↑</kbd>{' '}
          <kbd className={styles.kbd}>↓</kbd> to navigate, <kbd className={styles.kbd}>↵</kbd> to open
        </footer>
      </main>
    </Layout>
  );
}

function Section({
  title,
  rows,
  cursor,
  cursorOffset,
}: {
  readonly title: string;
  readonly rows: readonly Row[];
  readonly cursor: number | null;
  readonly cursorOffset: number;
}): React.ReactNode {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.chevron} aria-hidden="true">&gt;</span> {title}
      </h2>
      <ul className={styles.rows}>
        {rows.map((row, i) => {
          const globalIndex = cursorOffset + i;
          const isActive = cursor === globalIndex;
          return (
            <li key={row.href} className={styles.row} style={{animationDelay: `${60 + globalIndex * 35}ms`}}>
              <span className={styles.tree} aria-hidden="true">
                {connector(i, rows.length)}
              </span>
              <span className={styles.pointer} aria-hidden="true" data-active={isActive}>
                {isActive ? '▸' : '·'}
              </span>
              <Link to={row.href} className={styles.rowLabel} data-active={isActive}>
                {row.label}
              </Link>
              <span className={styles.rowArrow} aria-hidden="true">
                →
              </span>
              <code className={styles.rowPath}>{row.href}</code>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
