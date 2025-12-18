import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderSignInPage from "./island";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.SignIn.__metadata__");
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The sign in page with enhanced modern design.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container
 * - Prominent heading with gradient text effect
 * - Better spacing and padding for mobile/desktop
 * - Backdrop blur effect for depth
 *
 * **Responsive Behavior**:
 * - Mobile: Full width with padding
 * - Tablet/Desktop: Centered with max-width constraint
 *
 * @returns The enhanced sign in page with Clerk authentication component.
 */
export default async function SignInPage(): Promise<React.JSX.Element> {
  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <RenderSignInPage />
    </section>
  );
}
