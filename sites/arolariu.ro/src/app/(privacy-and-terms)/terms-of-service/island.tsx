/**
 * @fileoverview Client island for the Terms of Service page.
 * @module app/(privacy-and-terms)/terms-of-service/island
 *
 * @remarks
 * Renders the interactive legal article list on the client to support
 * browser-only behaviors such as in-page navigation and dynamic expansion.
 */

"use client";

import EnhancedLegalArticles from "../_components/EnhancedLegalArticles";

/**
 * Renders the Terms of Service content sections.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Composition**: Delegates section rendering to `EnhancedLegalArticles` and
 * configures the page type as `termsOfService`.
 *
 * **Why Client Component?**
 * - Supports interactive behaviors within the legal articles.
 *
 * @returns The Terms of Service article list rendered on the client.
 *
 * @example
 * ```tsx
 * <RenderTermsOfServiceScreen />
 * ```
 */
export default function RenderTermsOfServiceScreen(): React.JSX.Element {
  return <EnhancedLegalArticles pageType='Legal.TermsOfService' />;
}
