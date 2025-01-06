/** @format */

import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * The client-side authentication screen.
 * @returns The authentication screen.
 */
export default function RenderAuthScreen() {
  const t = useTranslations("Authentication.Island");

  return (
    <section className='flex gap-4 2xsm:flex-col md:flex-row'>
      <article>
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Image
            src='/images/auth/sign-in.svg'
            alt='Sign in illustration'
            width='300'
            height='500'
            className='object-fill object-center'
          />
        </div>
        <h1 className='title-font mb-3 mt-6 text-2xl font-medium'>{t("title")}</h1>
        <p className='text-base leading-relaxed'>{t("description")}</p>
        <Link
          href='/auth/sign-in/'
          className='btn btn-primary mt-6 rounded border-0 bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-none'>
          {t("callToAction")}
        </Link>
      </article>
    </section>
  );
}
