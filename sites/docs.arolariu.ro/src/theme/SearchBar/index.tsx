/**
 * @fileoverview `--wrap` swizzle of Docusaurus' `SearchBar` theme
 * component.
 *
 * @remarks
 * Renders the original Docusaurus SearchBar unchanged, then overlays a
 * small `<kbd>` element showing the platform-appropriate keyboard
 * shortcut (`⌘K` on macOS/iOS, `ctrl+k` otherwise) so users discover
 * the shortcut without having to memorize Docusaurus defaults.
 */

import React, {useEffect, useState} from 'react';
import SearchBar from '@theme-original/SearchBar';
import type SearchBarType from '@theme/SearchBar';
import type {WrapperProps} from '@docusaurus/types';
import styles from './styles.module.css';

/** Props forwarded to the wrapped `SearchBar` component. */
type Props = WrapperProps<typeof SearchBarType>;

/**
 * `SearchBar` wrapper that adds a platform-aware keyboard-shortcut hint.
 */
export default function SearchBarWrapper(props: Readonly<Props>): React.JSX.Element {
  const [hint, setHint] = useState('ctrl+k');

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent ?? '');
    setHint(isMac ? '⌘K' : 'ctrl+k');
  }, []);

  return (
    <div className={styles.wrap}>
      <SearchBar {...props} />
      <kbd className={styles.hint} aria-hidden="true">{hint}</kbd>
    </div>
  );
}
