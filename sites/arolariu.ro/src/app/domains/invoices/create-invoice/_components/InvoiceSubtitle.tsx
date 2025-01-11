/** @format */

import {useTranslations} from "next-intl";

type Props = {images: Blob[]};

/**
 * The subtitle for the invoice upload page.
 * @returns The JSX for the invoice upload page subtitle.
 */
export default function InvoiceSubtitle({images}: Readonly<Props>) {
  const t = useTranslations("Domains.services.invoices.service.create-page");

  const imagesLength: number = images.length;
  const titleText: string = imagesLength === 0 ? t("title__before") : t("title__after");
  const subtitleText: string = imagesLength === 0 ? t("subtitle__before") : t("subtitle__after");

  return (
    <div>
      <h1 className='bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl text-transparent'>{titleText}</h1>
      <p className='mx-auto text-base leading-relaxed lg:w-2/3'>{subtitleText}</p>
    </div>
  );
}
