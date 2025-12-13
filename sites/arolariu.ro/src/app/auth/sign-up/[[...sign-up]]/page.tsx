import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
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

  return (
    <section className='relative mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8'>
      <div className='grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2'>
        <div className='relative space-y-6'>
          <div className='space-y-3'>
            <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>{t("hero.title")}</h1>
            <p className='text-muted-foreground text-base leading-relaxed sm:text-lg'>{t("hero.subtitle")}</p>
          </div>

          <div className='bg-card/40 relative mx-auto max-w-md overflow-hidden rounded-2xl border p-6 backdrop-blur-sm'>
            <div className='bg-primary/10 pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl' />
            <div className='bg-primary/10 pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full blur-3xl' />

            <Image
              src='/images/auth/sign-up.svg'
              alt={t("illustrationAlt")}
              width={320}
              height={320}
              className='mx-auto h-48 w-48 object-contain sm:h-56 sm:w-56'
              priority
            />

            <ul className='text-muted-foreground mt-6 space-y-2 text-sm'>
              <li className='flex items-start gap-2'>
                <span
                  aria-hidden='true'
                  className='bg-primary/70 mt-2 inline-block h-1.5 w-1.5 rounded-full'
                />
                <span>{t("bullets.first")}</span>
              </li>
              <li className='flex items-start gap-2'>
                <span
                  aria-hidden='true'
                  className='bg-primary/70 mt-2 inline-block h-1.5 w-1.5 rounded-full'
                />
                <span>{t("bullets.second")}</span>
              </li>
              <li className='flex items-start gap-2'>
                <span
                  aria-hidden='true'
                  className='bg-primary/70 mt-2 inline-block h-1.5 w-1.5 rounded-full'
                />
                <span>{t("bullets.third")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div>
          <div className='mx-auto w-full max-w-md space-y-6'>
            <div className='text-center'>
              <p className='text-muted-foreground text-sm'>{t("form.kicker")}</p>
              <p className='text-muted-foreground mt-2 text-sm'>
                {t("form.secondaryPrompt")}{" "}
                <Link
                  href='/auth/sign-in/'
                  className='text-primary font-medium underline-offset-4 hover:underline'>
                  {t("form.secondaryAction")}
                </Link>
              </p>
            </div>

            <RenderSignUpPage />

            <p className='text-muted-foreground text-center text-xs'>{t("footer")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
