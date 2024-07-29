/** @format */

"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {getCookie, setCookie} from "@/lib/actions/cookies.action";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {Checkbox} from "./ui/checkbox";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "./ui/dialog";
import {Separator} from "./ui/separator";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./ui/tabs";

/**
 * The terms of service dialog component.
 */
function TermsOfServiceDialogButton() {
  const t = useTranslations("termsOfService");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='m-4 w-1/2 p-4'>{t("title")}</Button>
      </DialogTrigger>
      <DialogContent className='overflow-y-scroll 2xsm:max-h-[90vh] 2xsm:max-w-[90vw] md:max-h-[75vh] md:max-w-[75vw]'>
        <DialogHeader>
          <DialogTitle className='text-center'>{t("title")}</DialogTitle>
          <DialogDescription>
            <RenderTermsOfServiceScreen />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The privacy policy dialog component.
 */
function PrivacyPolicyDialogButton() {
  const t = useTranslations("privacyPolicy");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className='m-4 w-1/2 p-4'>{t("title")}</Button>
      </DialogTrigger>
      <DialogContent className='overflow-y-scroll 2xsm:max-h-[90vh] 2xsm:max-w-[90vw] md:max-h-[75vh] md:max-w-[75vw]'>
        <DialogHeader>
          <DialogTitle className='text-center'>{t("title")}</DialogTitle>
          <DialogDescription>
            <RenderPrivacyPolicyScreen />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The cookies banner component.
 * @returns The cookies banner component.
 */
function CookiesBanner({
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

/**
 * The EULA component.
 * @returns The EULA component.
 */
export default function EULA() {
  const t = useTranslations("EULA");
  const subtitle = t.rich("content", {
    br: (chunks) => (
      <>
        {" "}
        <br /> {chunks}{" "}
      </>
    ),
  });

  const [locale, setLocale] = useState<string>("en");
  const [eulaAccepted, setEulaAccepted] = useState<boolean | null>(null);
  const [cookiesState, setCookiesState] = useState({
    essential: true,
    analytics: true,
  });

  useEffect(() => {
    getCookie({name: "eula-accepted"})
      .then((value) => {
        setEulaAccepted(value === "true");
      })
      .catch(() => {
        setEulaAccepted(false);
      });
  }, []);

  if (eulaAccepted === null || eulaAccepted) return null;

  const handleAccept = () => {
    void setCookie({name: "eula-accepted", value: "true"});
    void setCookie({name: "accepted-cookies", value: JSON.stringify(cookiesState)});
    void setCookie({name: "locale", value: locale});
    setEulaAccepted(true);
  };

  const setLocaleHandler = (locale: string) => {
    void setCookie({name: "locale", value: locale});
    setLocale(locale);
  };

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center overflow-y-scroll py-24 text-center'>
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <h1 className='py-4 text-center text-2xl font-bold underline'>{t("title")}</h1>

        <div className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4'>
          <Button
            variant='default'
            onClick={() => setLocaleHandler("en")}
            className={locale === "en" ? "bg-blue-500 text-white" : "bg-white text-black"}>
            ENGLISH
          </Button>
          <Separator
            orientation='vertical'
            className='h-6 w-1 rounded bg-black dark:bg-white'
          />
          <Button
            variant='default'
            onClick={() => setLocaleHandler("ro")}
            className={locale === "ro" ? "bg-blue-500 text-white" : "bg-white text-black"}>
            ROMÂNĂ
          </Button>
        </div>

        <article className='mt-4 text-center'>
          {subtitle}
          <ul className='flex list-inside list-disc flex-col items-center'>
            <li>{t("termsOfService")}</li>
            <li>{t("privacyPolicy")}</li>
          </ul>
        </article>

        <div className='justify-items-centers flex flex-row items-center justify-center gap-4'>
          <TermsOfServiceDialogButton />
          <PrivacyPolicyDialogButton />
        </div>
      </section>
      <br />
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <Tabs
          defaultValue='cookies'
          className='py-4'>
          <TabsList className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4 bg-white dark:bg-black'>
            <TabsTrigger value='cookies'>
              <Button>Cookies Preference</Button>
            </TabsTrigger>
            <TabsTrigger value='settings'>
              <Button>Additional Settings</Button>
            </TabsTrigger>
          </TabsList>
          <TabsContent value='cookies'>
            <CookiesBanner
              cookiesState={cookiesState}
              setCookiesState={setCookiesState}
            />
          </TabsContent>
          <TabsContent value='settings'>
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Cupiditate perspiciatis voluptates culpa natus qui
            dicta iure beatae. Necessitatibus ipsam enim at maiores, odio minima ratione!
          </TabsContent>
        </Tabs>
      </section>

      <section>
        <div className='my-8 flex justify-center'>
          <Button
            variant='default'
            onClick={handleAccept}>
            {t("accept")}
          </Button>
        </div>
      </section>
    </main>
  );
}
