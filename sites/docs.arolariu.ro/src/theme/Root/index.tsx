import React, {type ReactNode, useEffect} from 'react';
import Root from '@theme-original/Root';
import type RootType from '@theme/Root';
import type {WrapperProps} from '@docusaurus/types';
import ReadingProgress from '@site/src/components/ReadingProgress';

type Props = WrapperProps<typeof RootType>;

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function clickSearchTrigger(): void {
  const trigger = document.querySelector<HTMLElement>('[class*="searchBox"] button, .DocSearch-Button');
  trigger?.click();
}

export default function RootWrapper(props: Props): ReactNode {
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
