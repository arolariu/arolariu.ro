/**
 * @fileoverview `--wrap` swizzle of Docusaurus' `DocItem/Footer`.
 *
 * @remarks
 * Renders the original footer (edit-this-page link, last-updated
 * timestamps, tags) unchanged, then appends the `DocFeedback` prompt
 * and the `BackToTop` floating button. Only mounted on doc pages,
 * which matches the intent: no feedback on the landing, no "back to
 * top" on the 404.
 */

import React from 'react';
import {useLocation} from '@docusaurus/router';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import DocFeedback from '@site/src/components/DocFeedback';
import BackToTop from '@site/src/components/BackToTop';

/** Props forwarded to the wrapped `DocItem/Footer`. */
type Props = WrapperProps<typeof FooterType>;

/**
 * Doc-item footer wrapper. Appends the feedback widget + back-to-top
 * button after the original Docusaurus footer.
 */
export default function FooterWrapper(props: Readonly<Props>): React.JSX.Element {
  const {pathname} = useLocation();
  return (
    <>
      <Footer {...props} />
      <DocFeedback pagePath={pathname} />
      <BackToTop />
    </>
  );
}
