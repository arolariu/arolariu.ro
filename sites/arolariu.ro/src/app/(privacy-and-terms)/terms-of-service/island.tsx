"use client";

import EnhancedLegalArticles from "../_components/EnhancedLegalArticles";

/**
 * This function will map all the sections of the terms of service page to JSX.
 * Each section will have a title and a content.
 * @returns All the sections of the terms of service page, CSR'ed.
 */
export default function RenderTermsOfServiceScreen(): React.JSX.Element {
  return <EnhancedLegalArticles pageType='termsOfService' />;
}
