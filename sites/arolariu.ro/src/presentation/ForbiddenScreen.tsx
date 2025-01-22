/** @format */

import {SITE_URL} from "@/lib/utils.generic";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * This function renders a screen that tells the user that they are forbidden from accessing a certain resource.
 * @returns Render a screen that tells the user that they are forbidden from accessing a certain resource.
 */
export default function ForbiddenScreen() {
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
        <h1 className='mb-4 inline bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent sm:text-4xl'>
          {t("title")}
        </h1>
        <span className='mb-4 inline text-4xl font-black sm:text-4xl'> 😭 </span>
        <p className='my-8 leading-relaxed'>{t("description")}</p>
      </article>
      <article className='mb-12 flex justify-center'>
        <Link
          href={`${SITE_URL}/auth`}
          className='inline-flex rounded border-0 bg-indigo-600 px-6 py-2 text-lg text-white hover:bg-indigo-700 focus:outline-none'>
          {t("callToAction")}
        </Link>
      </article>
    </section>
  );
}
