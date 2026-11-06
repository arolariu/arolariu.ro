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
 * A keyboard cursor (↑/↓ or j/k) moves through 13 full-site rows or
 * seven authored-prose rows in site-only mode; Enter
 * navigates to the highlighted entry. Escape clears the selection.
 * The cursor shortcuts deliberately do not fire when the user is
 * typing in an input/textarea/contenteditable, so the landing never
 * intercepts site-search typing.
 */

import React, {useEffect, useRef, useState} from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import {useHistory} from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {getDocumentationNavigation, type DocumentationRow} from "../lib/navigation";
import styles from "./index.module.css";

/**
 * Return `'└─'` for the last row in a section, `'├─'` otherwise.
 * Used to draw the tree-style connector to the left of each row.
 */
function connector(index: number, total: number): string {
  return index === total - 1 ? "└─" : "├─";
}

/**
 * Return `true` when the given event target is an input, textarea, or
 * contenteditable element — in which case the landing's keyboard
 * shortcuts must NOT fire, or we'd hijack the user's typing.
 */
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const siteOnly = siteConfig.customFields?.["docsSiteOnly"] === true;
  const navigation = getDocumentationNavigation(siteOnly ? "site-only" : "full");
  const [cursor, setCursor] = useState<number | null>(null);
  const history = useHistory();
  // Mirror `cursor` into a ref so the global keydown listener can read
  // the latest value without being re-attached each render — installing
  // once keeps this hot on pages with heavy redraws.
  const cursorRef = useRef<number | null>(null);
  cursorRef.current = cursor;

  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      // Never hijack typing in form fields, search inputs, or editable content.
      if (isInteractiveTarget(event.target)) return;

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        setCursor((value) => (value === null ? 0 : Math.min(value + 1, navigation.allRows.length - 1)));
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        setCursor((value) => (value === null || value <= 0 ? 0 : value - 1));
      } else if (event.key === "Enter" && cursorRef.current !== null) {
        event.preventDefault();
        // Route via Docusaurus' SPA history so the navigation stays
        // client-side — no full reload, preserves plugin state.
        const selected = navigation.allRows[cursorRef.current];
        if (selected !== undefined) history.push(selected.href);
      } else if (event.key === "Escape") {
        setCursor(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [history, navigation]);

  return (
    <Layout
      title='docs'
      description='Unified reference for arolariu.ro'>
      <main className={styles["page"]}>
        <section className={styles["hero"]}>
          <h1 className={styles["wordmark"]}>
            <span className={styles["prefix"]}>arolariu.ro</span>
            <span className={styles["slash"]}>/</span>
            <span className={styles["accent"]}>docs</span>
          </h1>
          <p className={styles["tagline"]}>
            <span className={styles["comment"]}>//</span>{" "}
            {siteOnly ? "site-only preview: authored documentation" : "unified reference for three services"}
            <span
              className={styles["caret"]}
              aria-hidden='true'
            />
          </p>
        </section>

        <Section
          title='i want to…'
          rows={navigation.iWantTo}
          cursor={cursor}
          cursorOffset={0}
        />
        <Section
          title='start here'
          rows={navigation.startHere}
          cursor={cursor}
          cursorOffset={navigation.iWantTo.length}
        />
        <Section
          title='resources'
          rows={navigation.resources}
          cursor={cursor}
          cursorOffset={navigation.iWantTo.length + navigation.startHere.length}
        />

        <footer className={styles["footer"]}>
          <span className={styles["comment"]}>//</span> use <kbd className={styles["kbd"]}>↑</kbd> <kbd className={styles["kbd"]}>↓</kbd> to
          navigate, <kbd className={styles["kbd"]}>↵</kbd> to open
        </footer>
      </main>
    </Layout>
  );
}

/** Props for the internal `Section` helper. */
type SectionProps = {
  readonly title: string;
  readonly rows: readonly DocumentationRow[];
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
    <section className={styles["section"]}>
      <h2 className={styles["sectionTitle"]}>
        <span
          className={styles["chevron"]}
          aria-hidden='true'>
          &gt;
        </span>{" "}
        {title}
      </h2>
      <ul className={styles["rows"]}>
        {rows.map((row, i) => {
          const globalIndex = cursorOffset + i;
          const isActive = cursor === globalIndex;
          return (
            <li
              key={row.href}
              className={styles["row"]}
              style={{animationDelay: `${60 + globalIndex * 35}ms`}}>
              <span
                className={styles["tree"]}
                aria-hidden='true'>
                {connector(i, rows.length)}
              </span>
              <span
                className={styles["pointer"]}
                aria-hidden='true'
                data-active={isActive}>
                {isActive ? "▸" : "·"}
              </span>
              <Link
                to={row.href}
                className={styles["rowLabel"] ?? ""}
                data-active={isActive}>
                {row.label}
              </Link>
              <span
                className={styles["rowArrow"]}
                aria-hidden='true'>
                →
              </span>
              <code className={styles["rowPath"]}>{row.href}</code>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
