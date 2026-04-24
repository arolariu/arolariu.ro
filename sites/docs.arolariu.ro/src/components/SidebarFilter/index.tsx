/**
 * @fileoverview Live-filter input for a Docusaurus sidebar.
 *
 * @remarks
 * Mounted only on the `/reference/typescript/*` routes (see the
 * `DocSidebar/Desktop/Content` swizzle) where the sidebar has
 * 100+ items and manual scanning is slow.
 *
 * The filter walks the current sidebar's DOM and toggles
 * `style.display` on each `.menu__list-item` based on whether the
 * item's label (or any of its descendants' labels) contains the
 * query string. Matching items have their collapsed ancestors
 * expanded so the match is visible in the tree.
 *
 * Collapsed categories that the filter auto-expands are tracked and
 * re-collapsed when the filter is cleared (via Escape or an empty
 * query), so the sidebar returns to the user's prior layout instead
 * of permanently forcing categories open.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import styles from './styles.module.css';

const DEBOUNCE_MS = 80;
const COLLAPSED_CLASS = 'menu__list-item--collapsed';

/**
 * Holds the categories we auto-expanded so they can be restored when
 * the filter is cleared. A module-level set is safe because only one
 * filter is mounted at a time (single sidebar instance on the page).
 */
const expandedByFilter = new Set<HTMLElement>();

/**
 * Apply `query` to the sidebar: hide non-matching items, expand the
 * ancestors of anything that matches, and — when `query` is empty —
 * restore every category the filter previously auto-expanded.
 */
function applyFilter(query: string): void {
  const needle = query.trim().toLowerCase();
  const menu = document.querySelector('.theme-doc-sidebar-menu');
  if (!menu) return;

  if (needle === '') {
    restoreExpandedCategories();
    menu.querySelectorAll<HTMLElement>('.menu__list-item').forEach((li) => {
      li.style.display = '';
    });
    return;
  }

  const items = menu.querySelectorAll<HTMLElement>('.menu__list-item');
  for (const li of items) {
    const link = li.querySelector<HTMLAnchorElement>('.menu__link');
    const label = link?.textContent?.toLowerCase() ?? '';
    const direct = label.includes(needle);
    const descendant = direct ? false : hasMatchingDescendant(li, needle);
    li.style.display = direct || descendant ? '' : 'none';
    if (direct || descendant) expandAncestors(li);
  }
}

/**
 * Return `true` when `li` contains a descendant `.menu__link` whose
 * text includes `needle`. Used so category headers stay visible when
 * any leaf inside them matches.
 */
function hasMatchingDescendant(li: HTMLElement, needle: string): boolean {
  const links = li.querySelectorAll<HTMLAnchorElement>('.menu__link');
  for (const a of links) {
    if ((a.textContent?.toLowerCase() ?? '').includes(needle)) return true;
  }
  return false;
}

/**
 * Walk up from `li` and expand every collapsed category on the path to
 * the root, recording each one we touch so it can be re-collapsed when
 * the filter is cleared.
 */
function expandAncestors(li: HTMLElement): void {
  let node: HTMLElement | null = li.parentElement;
  while (node) {
    if (node.classList.contains(COLLAPSED_CLASS)) {
      node.classList.remove(COLLAPSED_CLASS);
      expandedByFilter.add(node);
    }
    node = node.parentElement;
  }
}

/**
 * Re-collapse every category that the filter previously auto-expanded.
 * Categories the user manually expanded are untouched.
 */
function restoreExpandedCategories(): void {
  for (const node of expandedByFilter) {
    if (node.isConnected) node.classList.add(COLLAPSED_CLASS);
  }
  expandedByFilter.clear();
}

/**
 * Live-filter input rendered above the TypeScript reference sidebar.
 * Debounced 80ms so each keystroke doesn't walk the full DOM.
 */
export default function SidebarFilter(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => applyFilter(value), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    schedule(query);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, schedule]);

  // When the filter component unmounts (user navigates away), restore
  // everything so the next sidebar render starts clean.
  useEffect(() => () => restoreExpandedCategories(), []);

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>[filter:</span>
      <input
        className={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
        placeholder=""
        aria-label="filter sidebar"
        type="search"
      />
      <span className={styles.label}>]</span>
    </div>
  );
}
