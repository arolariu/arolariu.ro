import React, {type ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import Footer from '@theme-original/DocItem/Footer';
import type FooterType from '@theme/DocItem/Footer';
import type {WrapperProps} from '@docusaurus/types';
import DocFeedback from '@site/src/components/DocFeedback';
import BackToTop from '@site/src/components/BackToTop';

type Props = WrapperProps<typeof FooterType>;

export default function FooterWrapper(props: Props): ReactNode {
  const {pathname} = useLocation();
  return (
    <>
      <Footer {...props} />
      <DocFeedback pagePath={pathname} />
      <BackToTop />
    </>
  );
}
