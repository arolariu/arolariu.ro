import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * The client-side authentication screen.
 * @returns The authentication screen.
 */
export default function RenderAuthScreen(): React.JSX.Element {
  const t = useTranslations("Authentication.Island");

  return (
    <section className='2xsm:flex-col flex gap-4 md:flex-row'>
      <article>
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Image
            src='/images/auth/sign-up.svg'
            alt='Sign up illustration'
            width={300}
            height={500}
            className='object-fill object-center'
          />
        </div>
        <span className='mt-6 mb-3 text-2xl font-medium'>{t("callToAction")}</span>
        <p className='text-base leading-relaxed'>{t("description")}</p>
        <Link
          href='/auth/sign-up/'
          className='btn btn-primary mt-6 rounded border-0 bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-hidden'>
          Sign up!
        </Link>
      </article>
      <article>
        <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
          <Image
            src='/images/auth/sign-in.svg'
            alt='Sign in illustration'
            width={300}
            height={500}
            className='object-fill object-center'
          />
        </div>
        <span className='mt-6 mb-3 text-2xl font-medium'>{t("callToAction")}</span>
        <p className='text-base leading-relaxed'>{t("description")}</p>
        <Link
          href='/auth/sign-in/'
          className='btn btn-primary mt-6 rounded border-0 bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-hidden'>
          Sign in!
        </Link>
      </article>
    </section>
  );
}
