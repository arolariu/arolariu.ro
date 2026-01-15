import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {EMPTY_GUID} from "@/lib/utils.generic";
import {createMetadata} from "@/metadata";
import RenderForbiddenScreen from "@/presentation/ForbiddenScreen";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderProfileScreen from "./island";

/**
 * Generates SEO metadata for the user profile page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from the
 * translation key `Profile.__metadata__`. Falls back to sensible defaults
 * if translation keys are not yet defined.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility following RFC 1004
 * (Metadata & SEO System) standards. Generates Open Graph tags, Twitter cards, and
 * canonical URLs optimized for profile page discovery.
 *
 * **Dynamic Route**: This is a dynamic route (`[id]`), so metadata is generated per-request
 * with the specific user context.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and other SEO-related fields for the user profile page.
 *
 * @see {@link createMetadata} - Centralized metadata generation utility
 * @see RFC 1004 - Metadata & SEO System documentation
 * @see RFC 1003 - Internationalization System documentation
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the user profile page for viewing and managing user settings.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Dynamic Route**: Uses `[id]` parameter to identify the specific user profile.
 * The user ID is extracted from the route parameters and validated against
 * the authenticated user.
 *
 * **Authentication**: Validates user authentication via `fetchBFFUserFromAuthService`.
 * Unauthenticated users are shown a `ForbiddenScreen` component instead of profile data.
 *
 * **Authorization**: Users can only view their own profile. If the route ID
 * doesn't match the authenticated user's identifier, access is denied.
 *
 * **Profile Features**:
 * - Appearance settings (theme, custom colors)
 * - Font preferences (accessibility)
 * - Language/locale settings
 * - Account information
 * - User statistics
 * - Data management (export, delete)
 * - Notification preferences
 *
 * **Client Component Delegation**: Delegates interactive profile UI to
 * `RenderProfileScreen` (island.tsx), which handles:
 * - Theme toggling
 * - Color picker interactions
 * - Font switching
 * - Form submissions
 *
 * @param props - Page props containing dynamic route parameters
 * @returns Promise resolving to server-rendered JSX element containing the
 * profile management interface, or ForbiddenScreen if user is not authorized.
 *
 * @see {@link fetchBFFUserFromAuthService} - Server action for user authentication
 * @see {@link RenderProfileScreen} - Client component with profile interface
 * @see {@link RenderForbiddenScreen} - Component shown for unauthorized users
 */
export default async function ProfilePage(props: Readonly<PageProps<"/profile/[id]">>): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const profileId = pageParams.id;

  const userInformation = await fetchBFFUserFromAuthService();
  const {userIdentifier, user} = userInformation;

  // Check if user is authenticated
  const isGuestUser = userIdentifier === EMPTY_GUID;
  if (isGuestUser || !user) {
    return <RenderForbiddenScreen />;
  }

  // Check if user is viewing their own profile
  const isOwnProfile = profileId === userIdentifier;
  if (!isOwnProfile) {
    return <RenderForbiddenScreen />;
  }

  return (
    <main className='px-5 py-24'>
      <RenderProfileScreen
        user={user}
        userIdentifier={userIdentifier}
      />
    </main>
  );
}
