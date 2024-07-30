/** @format */
"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {useTranslations} from "next-intl";

/**
 * The cookies banner component.
 * @returns The cookies banner component.
 */
export function CookiesSettings({
  cookiesState,
  setCookiesState,
}: Readonly<{
  cookiesState: Readonly<{essential: boolean; analytics: boolean}>;
  setCookiesState: (state: {essential: boolean; analytics: boolean}) => void | Promise<void>;
}>) {
  const t = useTranslations("EULA.cookiesPolicy");
  const essentialsDescription = t.rich("cookies.essential.description", {
    br: (chunks) => (
      <>
        {" "}
        <br /> {chunks}{" "}
      </>
    ),
  });

  const analyticsDescription = t.rich("cookies.analytics.description", {
    br: (chunks) => (
      <>
        {" "}
        <br /> {chunks}{" "}
      </>
    ),
    em: (chunks) => <em>{chunks}</em>,
  });

  return (
    <Card className='m-4 flex flex-col items-center justify-center justify-items-center bg-white dark:bg-black'>
      <CardHeader className='mb-4 items-center justify-center justify-items-center pb-4'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          className='m-2'
          strokeLinejoin='round'>
          <path d='M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5' />
          <path d='M8.5 8.5v.01' />
          <path d='M16 15.5v.01' />
          <path d='M12 12v.01' />
          <path d='M11 17v.01' />
          <path d='M7 14v.01' />
        </svg>
        <CardTitle className='tracking-wide'>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col flex-wrap items-center justify-center justify-items-center gap-4'>
        <form>
          <div className='pb-4'>
            {t("cookies.essential.title")}
            <small className='mb-2 block leading-tight tracking-wider'>{essentialsDescription}</small>
            <Checkbox
              title='Essential Cookies'
              id='essential'
              className='size-6'
              checked={cookiesState.essential}
              disabled
            />
            <Label
              htmlFor='essential'
              className='ml-2 text-gray-700'>
              {t("cookies.essential.checkbox")}
            </Label>
          </div>
          <div className='pt-4'>
            {t("cookies.analytics.title")}
            <small className='mb-2 block leading-tight tracking-wider'>{analyticsDescription}</small>
            <Checkbox
              title='Analytics Cookies'
              className='size-6'
              onClick={() => setCookiesState({...cookiesState, analytics: !cookiesState.analytics})}
              checked={cookiesState.analytics}
              id='analytics'
            />
            <Label
              htmlFor='analytics'
              className='ml-2 text-gray-400'>
              {t("cookies.analytics.checkbox")}
            </Label>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdditionalSettings() {
  return (
    <div>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Possimus unde quibusdam eum modi assumenda explicabo
      aliquid culpa totam ab, illum non esse saepe consequatur, id suscipit porro fugit. Distinctio, excepturi,
      recusandae mollitia officiis maxime quibusdam est eius quaerat, ad doloremque nostrum accusamus libero accusantium
      neque aperiam nulla fuga quae magni!
    </div>
  );
}
