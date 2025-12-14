import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";
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
  const t = await getTranslations("Authentication.SignUp");
  const trust = await getTranslations("Authentication.Island.trust");

  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <div className='grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2'>
        <div>
          <AuthMarketingPanel
            title={t("hero.title")}
            subtitle={t("hero.subtitle")}
            illustrationSrc='/images/auth/sign-up.svg'
            illustrationAlt={t("illustrationAlt")}
            bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
            trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
          />
        </div>

        <div>
          <AuthFormShell
            kicker={t("form.kicker")}
            secondaryPrompt={t("form.secondaryPrompt")}
            secondaryAction={t("form.secondaryAction")}
            secondaryHref='/auth/sign-in/'
            footer={t("footer")}>
            <RenderSignUpPage />
          </AuthFormShell>
        </div>
      </div>
    </section>
  );
}
