/**
 * @fileoverview Landing page for docs.arolariu.ro.
 *
 * @remarks
 * Three tiers are rendered, top-to-bottom:
 *
 * 1. **`i want to…`** — six task-led entry points curated for
 *    returning developers who know what they want to accomplish.
 * 2. **`start here`** — four service-level roots (monorepo overview,
 *    .NET internals, TypeScript reference, Python experimental) for
 *    open-ended browsing.
 * 3. **`resources`** — three supplementary tiers (RFCs, backend
 *    guides, frontend guides).
 *
 * A keyboard cursor (↑/↓ or j/k) moves through all 13 rows; Enter
 * navigates to the highlighted entry. Escape clears the selection.
 * The cursor shortcuts deliberately do not fire when the user is
 * typing in an input/textarea/contenteditable, so the landing never
 * intercepts site-search typing.
 */

import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

/** A single row on the landing page — human label + absolute href. */
type Row = {readonly label: string; readonly href: string};

const I_WANT_TO: readonly Row[] = [
  {label: 'hit the api from code', href: '/internals/dotnet/arolariu.Backend.Core/'},
  {label: 'understand the architecture', href: '/monorepo/rfc/domain-driven-design-architecture/'},
  {label: 'use the component library', href: '/reference/typescript/components/'},
  {label: 'add a new RFC', href: '/monorepo/rfc/'},
  {label: 'configure telemetry', href: '/monorepo/backend/opentelemetry-guide/'},
  {label: 'debug the config proxy', href: '/internals/experimental/config/loader/'},
];

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

const ALL_ROWS: readonly Row[] = [...I_WANT_TO, ...START_HERE, ...RESOURCES];

/**
 * Return `'└─'` for the last row in a section, `'├─'` otherwise.
 * Used to draw the tree-style connector to the left of each row.
 */
function connector(index: number, total: number): string {
  return index === total - 1 ? '└─' : '├─';
}

/**
 * Return `true` when the given event target is an input, textarea, or
 * contenteditable element — in which case the landing's keyboard
 * shortcuts must NOT fire, or we'd hijack the user's typing.
 */
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export default function Home(): React.JSX.Element {
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      // Never hijack typing in form fields, search inputs, or editable content.
      if (isInteractiveTarget(event.target)) return;

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

        <Section title="i want to…" rows={I_WANT_TO} cursor={cursor} cursorOffset={0} />
        <Section title="start here" rows={START_HERE} cursor={cursor} cursorOffset={I_WANT_TO.length} />
        <Section title="resources" rows={RESOURCES} cursor={cursor} cursorOffset={I_WANT_TO.length + START_HERE.length} />

        <footer className={styles.footer}>
          <span className={styles.comment}>//</span> use <kbd className={styles.kbd}>↑</kbd>{' '}
          <kbd className={styles.kbd}>↓</kbd> to navigate, <kbd className={styles.kbd}>↵</kbd> to open
        </footer>
      </main>
    </Layout>
  );
}

/** Props for the internal `Section` helper. */
type SectionProps = {
  readonly title: string;
  readonly rows: readonly Row[];
  readonly cursor: number | null;
  readonly cursorOffset: number;
};

/**
 * Render one of the three landing tiers as a heading + tree-drawn list.
 *
 * @param cursorOffset - Starting global index for this section. Each
 *   row's "am I active" check adds its local index to this offset.
 */
function Section({title, rows, cursor, cursorOffset}: Readonly<SectionProps>): React.JSX.Element {
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
