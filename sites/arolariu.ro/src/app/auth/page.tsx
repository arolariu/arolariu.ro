import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import {DotBackground} from "@arolariu/components";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import RenderAuthScreen from "./island";

/**
 * Generates SEO metadata for the authentication page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from translation keys
 * under the `Authentication.__metadata__` namespace. Supports all configured locales.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility to generate
 * consistent metadata following RFC 1004 (Metadata & SEO System) standards.
 *
 * **Caching**: Metadata is generated at build time for static pages or on-demand
 * for dynamic routes. No runtime caching beyond Next.js defaults.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * and other SEO-related fields configured by the createMetadata utility.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /auth route
 * // Generates metadata like:
 * // {
 * //   title: "Sign In | arolariu.ro",
 * //   description: "Authenticate to access your account",
 * //   openGraph: { ... }
 * // }
 * ```
 *
 * @see {@link createMetadata} - Centralized metadata generation utility
 * @see RFC 1004 - Metadata & SEO System documentation
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the authentication page with automatic redirect for authenticated users.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Authentication Check**: Fetches user authentication status from the backend
 * authentication service before rendering. This prevents authenticated users from
 * seeing the login screen unnecessarily.
 *
 * **Redirect Behavior**: If the user is already authenticated (`isAuthenticated === true`),
 * performs a server-side redirect to the home page (`/`). This ensures authenticated
 * users cannot access the login page directly.
 *
 * **Client Component Delegation**: For unauthenticated users, delegates rendering to
 * the `RenderAuthScreen` client component (island.tsx), which handles interactive
 * authentication forms and user input.
 *
 * **Performance**: Server-side authentication check avoids flash of login content
 * for authenticated users. The redirect happens before any client-side JavaScript loads.
 *
 * **Error Handling**: Relies on `fetchAaaSUserFromAuthService` to handle errors.
 * If the service fails, the user sees the login screen (fail-open behavior).
 *
 * @returns Promise resolving to JSX element - either a redirect (authenticated users)
 * or the RenderAuthScreen client component (unauthenticated users).
 *
 * @example
 * ```tsx
 * // Unauthenticated user flow:
 * // 1. fetchAaaSUserFromAuthService returns { isAuthenticated: false }
 * // 2. Renders <RenderAuthScreen /> with login/signup forms
 *
 * // Authenticated user flow:
 * // 1. fetchAaaSUserFromAuthService returns { isAuthenticated: true }
 * // 2. redirect("/") - user sent to home page
 * // 3. RenderAuthScreen never renders
 * ```
 *
 * @see {@link fetchAaaSUserFromAuthService} - Server action for authentication status
 * @see {@link RenderAuthScreen} - Client component with authentication forms
 */
export default async function AuthPage(): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  if (isAuthenticated) return redirect("/");
  return (
    <main className='container mx-auto px-5 py-24'>
      <DotBackground
        glow
        className='opacity-30'
      />
      <RenderAuthScreen />
    </main>
  );
}
