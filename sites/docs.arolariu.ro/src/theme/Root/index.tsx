/**
 * @fileoverview `--wrap` swizzle of Docusaurus' `Root` theme component.
 *
 * @remarks
 * `Root` is the outermost React component Docusaurus mounts inside the
 * HTML shell. Wrapping it lets us attach site-wide side effects without
 * touching every page:
 *
 * - Renders a `ReadingProgress` bar (auto-hidden on short pages).
 * - Installs a keyboard listener that opens the search modal on
 *   `⌘K` / `Ctrl+K` and on `/` (but only when focus is not inside an
 *   input/textarea/contenteditable so typing is never intercepted).
 */

import React, {useEffect} from 'react';
import Root from '@theme-original/Root';
import type RootType from '@theme/Root';
import type {WrapperProps} from '@docusaurus/types';
import ReadingProgress from '@site/src/components/ReadingProgress';

/** Props forwarded to the wrapped `Root` component. */
type Props = WrapperProps<typeof RootType>;

/**
 * Return `true` when the given event target is an input, textarea, or
 * contenteditable element — the shortcuts defer to normal typing in
 * those cases.
 */
function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Click the Docusaurus search-trigger button if present. Used to open
 * the search modal in response to a global keyboard shortcut.
 */
function clickSearchTrigger(): void {
  const trigger = document.querySelector<HTMLElement>('[class*="searchBox"] button, .DocSearch-Button');
  trigger?.click();
}

/**
 * `Root` wrapper that attaches the global keyboard listener and mounts
 * the `ReadingProgress` bar.
 */
export default function RootWrapper(props: Readonly<Props>): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent ?? '');
      const primary = isMac ? e.metaKey : e.ctrlKey;
      if (primary && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clickSearchTrigger();
        return;
      }
      if (e.key === '/' && !isInteractiveTarget(e.target)) {
        e.preventDefault();
        clickSearchTrigger();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <ReadingProgress />
      <Root {...props} />
    </>
  );
}
