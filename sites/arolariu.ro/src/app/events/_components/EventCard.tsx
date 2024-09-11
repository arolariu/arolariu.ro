/** @format */

import {Button} from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import {SiDatefns, SiMapbox} from "react-icons/si";

type Props = {
  title: string;
  description: string;
  date: string;
  location: string;
  imagePath: string | undefined;
  buttons:
    | {
        internal?: {
          label: string;
          disabled?: boolean;
          href: string;
        };
        external?: {
          label: string;
          disabled?: boolean;
          href: string;
        };
      }
    | undefined;
};

/**
 * The event card component
 * @returns The event card component
 */
export const EventCard = ({title, description, date, location, imagePath, buttons}: Readonly<Props>) => {
  return (
    <article className='flex max-w-[32rem] flex-col flex-nowrap rounded-xl bg-white shadow-lg dark:bg-gray-800'>
      <Image
        className='w-full rounded-t-xl object-fill'
        src={imagePath ?? "https://dummyimage.com/720x400&text=TBA"}
        width={720}
        height={400}
        alt={`${title} event image`}
      />
      <section className='p-4 2xsm:text-center md:text-left'>
        <p className='mb-2 text-xl font-semibold text-gray-800 dark:text-white'>{title}</p>
        <p className='text-gray-600 dark:text-gray-400'>{description}</p>
      </section>
      <section className='flex flex-col gap-2 p-4 2xsm:text-center md:text-left'>
        {/* The Date component. */}
        <div className='flex flex-row gap-2'>
          <SiDatefns className='h-6 w-6 fill-current text-gray-500' />
          <p className='text-gray-600 dark:text-gray-400'>Date: {date}</p>
        </div>

        {/* The Location component. */}
        <div className='flex flex-row gap-2'>
          <SiMapbox className='h-6 w-6 fill-current text-gray-500' />
          <p className='text-gray-600 dark:text-gray-400'>Location: {location}</p>
        </div>
      </section>
      <section className='flex flex-row items-stretch justify-between justify-items-center gap-2 p-4'>
        {buttons?.internal && (
          <Button
            variant='link'
            disabled={buttons.internal.disabled}
            className='w-full'>
            <Link
              href={buttons.internal.href}
              className='w-1/2'
              target='_blank'>
              {buttons.internal.label}
            </Link>
          </Button>
        )}
        {buttons?.external && (
          <Button
            variant='default'
            disabled={buttons.external.disabled}
            className='w-full'>
            <Link
              href={buttons.external.href}
              className='w-1/2'
              target='_blank'>
              {buttons.external.label}
            </Link>
          </Button>
        )}
      </section>
    </article>
  );
};
