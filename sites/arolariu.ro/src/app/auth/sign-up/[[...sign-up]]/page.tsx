import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderSignUpPage from "./island";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.SignUp.__metadata__");
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The sign up page with enhanced modern design.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Design Improvements**:
 * - Centered layout with maximum width container
 * - Eye-catching gradient heading
 * - Clean, modern spacing
 * - Responsive design for all screen sizes
 *
 * **Value Proposition**:
 * - Clear call to action
 * - Emphasis on quick registration
 * - Professional appearance
 *
 * @returns The enhanced sign up page with Clerk authentication component.
 */
export default async function SignUpPage(): Promise<React.JSX.Element> {
  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <RenderSignUpPage />
    </section>
  );
}
