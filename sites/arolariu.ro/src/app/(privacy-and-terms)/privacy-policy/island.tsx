/**
 * @fileoverview Client island for the Privacy Policy page.
 * @module app/(privacy-and-terms)/privacy-policy/island
 *
 * @remarks
 * Renders the privacy policy content on the client to support interactive
 * legal article behaviors such as in-page navigation and dynamic expansion.
 */

"use client";

import EnhancedLegalArticles from "../_components/EnhancedLegalArticles";

/**
 * Renders the Privacy Policy content sections.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Composition**: Delegates section rendering to `EnhancedLegalArticles` and
 * configures the page type as `privacyPolicy`.
 *
 * **Why Client Component?**
 * - Supports interactive behaviors within the legal articles.
 *
 * @returns The Privacy Policy article list rendered on the client.
 *
 * @example
 * ```tsx
 * <RenderPrivacyPolicyScreen />
 * ```
 */
export default function RenderPrivacyPolicyScreen(): React.JSX.Element {
  return <EnhancedLegalArticles pageType='privacyPolicy' />;
}
