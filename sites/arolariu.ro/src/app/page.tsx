/**
 * @fileoverview Home page entry point.
 * @module app/page
 *
 * @remarks
 * Server-rendered shell that delegates interactive rendering to the home
 * client island component.
 */

import RenderHomeScreen from "./island";

/**
 * Renders the application home page.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Composition**: Delegates UI rendering to `RenderHomeScreen` for client
 * interactivity and animations.
 *
 * @param _props - Page props for the root route.
 * @returns The home page shell rendering the client island.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /
 * <Home />
 * ```
 */
export default async function Home(_props: Readonly<PageProps<"/">>): Promise<React.JSX.Element> {
  return <RenderHomeScreen />;
}
