import React, {useCallback, useEffect, useRef, useState} from 'react';
import styles from './styles.module.css';

const DEBOUNCE_MS = 80;

function applyFilter(query: string): void {
  const needle = query.trim().toLowerCase();
  const menu = document.querySelector('.theme-doc-sidebar-menu');
  if (!menu) return;
  const items = menu.querySelectorAll<HTMLElement>('.menu__list-item');
  for (const li of items) {
    const link = li.querySelector<HTMLAnchorElement>('.menu__link');
    const label = link?.textContent?.toLowerCase() ?? '';
    const direct = needle === '' || label.includes(needle);
    const descendant = direct ? false : hasMatchingDescendant(li, needle);
    li.style.display = direct || descendant ? '' : 'none';
    if ((direct || descendant) && needle !== '') expandAncestors(li);
  }
}

function hasMatchingDescendant(li: HTMLElement, needle: string): boolean {
  if (needle === '') return false;
  const links = li.querySelectorAll<HTMLAnchorElement>('.menu__link');
  for (const a of links) {
    if ((a.textContent?.toLowerCase() ?? '').includes(needle)) return true;
  }
  return false;
}

function expandAncestors(li: HTMLElement): void {
  let node: HTMLElement | null = li.parentElement;
  while (node) {
    if (node.classList.contains('menu__list-item--collapsed')) {
      node.classList.remove('menu__list-item--collapsed');
    }
    node = node.parentElement;
  }
}

export default function SidebarFilter(): React.ReactNode {
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
