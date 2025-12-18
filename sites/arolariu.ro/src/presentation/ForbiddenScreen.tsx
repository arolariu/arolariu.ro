"use client";

import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * @fileoverview Presentation component for the "forbidden" (HTTP 403) state.
 * @module presentation/ForbiddenScreen
 *
 * @remarks
 * This is a UI-only screen used when a user is authenticated but not authorized
 * to access a resource.
 *
 * **Internationalization**: Uses `next-intl` via `useTranslations("Forbidden.Screen")`.
 *
 * **Rendering context**: Intended for client-side rendering because it uses a React
 * hook (`useTranslations`). Ensure it is rendered under a Client Component boundary.
 */

/**
 * Renders a localized "forbidden" screen for unauthorized access attempts.
 *
 * @remarks
 * The illustration is marked as decorative (`alt=""` + `aria-hidden`) so assistive
 * technologies focus on the localized heading and descriptive text.
 *
 * @returns A full-page section explaining the access restriction.
 *
 * @example
 * ```tsx
 * import RenderForbiddenScreen from "@/presentation/ForbiddenScreen";
 *
 * export default function Page(): React.JSX.Element {
 *   return <RenderForbiddenScreen />;
 * }
 * ```
 */
export default function RenderForbiddenScreen(): React.JSX.Element {
  const t = useTranslations("Forbidden.Screen");

  return (
    <section className='container mx-auto flex flex-col items-center justify-center px-5 py-12'>
      <Image
        src='/images/auth/forbidden.svg'
        alt=''
        aria-hidden
        className='mb-4 h-full w-full rounded object-cover object-center md:w-3/6 lg:w-2/6'
        width={500}
        height={500}
      />
      <article className='w-full text-center lg:w-2/3'>
        <h1 className='mb-4 inline bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent sm:text-4xl'>
          {t("title")}
        </h1>
        <span className='mb-4 inline text-4xl font-black sm:text-4xl'>😭</span>
        <p className='my-8 leading-relaxed'>{t("description")}</p>
      </article>
      <article className='mb-12 flex justify-center'>
        <Link
          href='/auth'
          className='inline-flex rounded border-0 bg-indigo-600 px-6 py-2 text-lg text-white hover:bg-indigo-700 focus:outline-hidden'>
          {t("callToAction")}
        </Link>
      </article>
    </section>
  );
}
