import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";
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
  const t = await getTranslations("Authentication.SignIn");
  const trust = await getTranslations("Authentication.Island.trust");

  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14'>
      <div className='grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2'>
        <div className='order-2 lg:order-1'>
          <AuthMarketingPanel
            title={t("hero.title")}
            subtitle={t("hero.subtitle")}
            illustrationSrc='/images/auth/sign-in.svg'
            illustrationAlt={t("illustrationAlt")}
            bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
            trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
          />
        </div>

        <div className='order-1 lg:order-2'>
          <AuthFormShell
            kicker={t("form.kicker")}
            secondaryPrompt={t("form.secondaryPrompt")}
            secondaryAction={t("form.secondaryAction")}
            secondaryHref='/auth/sign-up/'
            footer={t("footer")}>
            <RenderSignInPage />
          </AuthFormShell>
        </div>
      </div>
    </section>
  );
}
