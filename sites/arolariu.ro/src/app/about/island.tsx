"use client";

import {Card, CardContent, CardFooter, CardHeader} from "@arolariu/components/card";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * This is the about page.
 * @returns The about page, CSR'ed.
 */
export default function RenderAboutScreen(): React.JSX.Element {
  const t = useTranslations("About");

  return (
    <section>
      <article className='flex flex-col flex-nowrap items-center justify-center justify-items-center text-center'>
        <h1 className='mb-4 bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent sm:text-3xl'>{t("title")}</h1>
        <p className='mb-8 w-1/2 text-base leading-relaxed text-pretty'>{t("subtitle")}</p>
      </article>

      <article className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 py-16 lg:flex-row'>
        <Card className='2xsm:max-w-11/12 2xsm:min-w-11/12 lg:max-w-1/3 lg:min-w-1/3'>
          <CardHeader>
            <Image
              alt=''
              height={100}
              width={100}
              className='mx-auto object-contain object-center'
              src='/images/about/platform-thumbnail.svg'
            />
          </CardHeader>
          <CardContent>
            <h2 className='title-font mt-6 mb-3 text-2xl font-medium'>{t("cards.platform.title")}</h2>
            <p className='pb-8 text-base leading-relaxed text-pretty'>{t("cards.platform.subtitle")}</p>
          </CardContent>
          <CardFooter className='mx-auto'>
            <Link
              href='/about/the-platform'
              className='rounded-lg bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-none dark:text-black'>
              {t("cards.platform.cta")}
            </Link>
          </CardFooter>
        </Card>
        <Card className='2xsm:max-w-11/12 2xsm:min-w-11/12 lg:max-w-1/3 lg:min-w-1/3'>
          <CardHeader>
            <Image
              alt=''
              height={100}
              width={100}
              className='mx-auto object-contain object-center'
              src='/images/about/author-thumbnail.svg'
            />
          </CardHeader>
          <CardContent>
            <h2 className='mt-6 mb-3 text-2xl font-medium'>{t("cards.author.title")}</h2>
            <p className='pb-8 text-base leading-relaxed text-pretty'>{t("cards.author.subtitle")}</p>
          </CardContent>
          <CardFooter className='mx-auto'>
            <Link
              href='/about/the-author'
              className='rounded-lg bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-none dark:text-black'>
              {t("cards.author.cta")}
            </Link>
          </CardFooter>
        </Card>
      </article>

      <article className='my-16 pb-32 text-center'>
        <h2 className='text-3xl font-bold'>{t("footer")}</h2>
      </article>
    </section>
  );
}
