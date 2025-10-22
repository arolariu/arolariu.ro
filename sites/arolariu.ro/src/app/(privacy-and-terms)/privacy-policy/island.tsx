"use client";

import EnhancedLegalArticles from "../_components/EnhancedLegalArticles";

/**
 * This function renders the privacy policy screen.
 * The privacy policy screen is a static page that informs users about the privacy practices of the website.
 * @returns The privacy policy screen component, client-side rendered.
 */
export default function RenderPrivacyPolicyScreen(): React.JSX.Element {
  return <EnhancedLegalArticles pageType='privacyPolicy' />;
}
