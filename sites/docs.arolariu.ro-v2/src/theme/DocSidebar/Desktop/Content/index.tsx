import React, {type ReactNode} from 'react';
import Content from '@theme-original/DocSidebar/Desktop/Content';
import type ContentType from '@theme/DocSidebar/Desktop/Content';
import type {WrapperProps} from '@docusaurus/types';
import SidebarFilter from '@site/src/components/SidebarFilter';

type Props = WrapperProps<typeof ContentType>;

function isTypeScriptReferenceSidebar(props: Props): boolean {
  if (props.path?.startsWith('/reference/typescript')) return true;
  const first = props.sidebar?.[0];
  if (!first) return false;
  if (first.type === 'link') return (first.href ?? '').startsWith('/reference/typescript');
  if (first.type === 'category') {
    const firstChild = first.items?.[0];
    if (firstChild?.type === 'link') {
      return (firstChild.href ?? '').startsWith('/reference/typescript');
    }
  }
  return false;
}

export default function ContentWrapper(props: Props): ReactNode {
  const show = isTypeScriptReferenceSidebar(props);
  return (
    <>
      {show && <SidebarFilter />}
      <Content {...props} />
    </>
  );
}
