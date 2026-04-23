import React, {type ReactNode, useEffect, useState} from 'react';
import SearchBar from '@theme-original/SearchBar';
import type SearchBarType from '@theme/SearchBar';
import type {WrapperProps} from '@docusaurus/types';
import styles from './styles.module.css';

type Props = WrapperProps<typeof SearchBarType>;

export default function SearchBarWrapper(props: Props): ReactNode {
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
