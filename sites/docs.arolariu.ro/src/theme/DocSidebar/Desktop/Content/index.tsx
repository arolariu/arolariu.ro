/**
 * @fileoverview `--wrap` swizzle of Docusaurus' desktop sidebar
 * content renderer.
 *
 * @remarks
 * Mounts the `SidebarFilter` input only when the active sidebar
 * belongs to the TypeScript reference plugin (route prefix
 * `/reference/typescript/`). The TS reference has ~100 entries
 * where a quick substring filter pays off; the other sidebars are
 * short enough that an extra input would be noise.
 */

import React from 'react';
import Content from '@theme-original/DocSidebar/Desktop/Content';
import type ContentType from '@theme/DocSidebar/Desktop/Content';
import type {WrapperProps} from '@docusaurus/types';
import SidebarFilter from '@site/src/components/SidebarFilter';

/** Props forwarded to the wrapped desktop sidebar content component. */
type Props = WrapperProps<typeof ContentType>;

/**
 * Return `true` when the sidebar being rendered is the one for the
 * TypeScript reference plugin. Uses three fallbacks so the check
 * works across Docusaurus' varying sidebar shapes:
 *
 *   1. The current doc's path (most reliable at runtime).
 *   2. A top-level `link`'s href.
 *   3. The first `link` inside a top-level `category`.
 */
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

/**
 * Desktop sidebar content wrapper. Prepends `SidebarFilter` when the
 * active sidebar is the TypeScript reference tree.
 */
export default function ContentWrapper(props: Readonly<Props>): React.JSX.Element {
  const show = isTypeScriptReferenceSidebar(props);
  return (
    <>
      {show && <SidebarFilter />}
      <Content {...props} />
    </>
  );
}
