/** @format */

"use client";

import RenderPrivacyPolicyScreen from "@/app/privacy-policy/island";
import RenderTermsOfServiceScreen from "@/app/terms-of-service/island";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Label} from "@/components/ui/label";
import {getCookie, setCookie} from "@/lib/actions/cookies.action";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {Checkbox} from "./ui/checkbox";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from "./ui/dialog";
import {useToast} from "./ui/use-toast";

/**
 * The terms of service dialog component.
 */
function TermsOfService() {
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
function PrivacyPolicy() {
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
  const {toast} = useToast();

  return (
    <Card className='m-4'>
      <CardHeader className='mb-4 border-b border-gray-300 pb-4'>
        <div className='items-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            className='mr-2 inline'
            strokeLinejoin='round'>
            <path d='M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5' />
            <path d='M8.5 8.5v.01' />
            <path d='M16 15.5v.01' />
            <path d='M12 12v.01' />
            <path d='M11 17v.01' />
            <path d='M7 14v.01' />
          </svg>
          <CardTitle className='inline tracking-wide'>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className='flex flex-col flex-wrap gap-4'>
          <div>
            {t("cookies.essential.title")}
            <small className='mb-2 block leading-tight tracking-wider'>
              {t.rich("cookies.essential.description", {
                br: (chunks) => (
                  <>
                    <br />
                    {chunks}
                  </>
                ),
              })}
            </small>
            <Checkbox
              id='essential'
              className='size-5'
              checked={cookiesState.essential}
              disabled
            />
            <Label
              htmlFor='essential'
              className='ml-2 text-gray-400'>
              {t("cookies.essential.checkbox")}
            </Label>
          </div>
          <div>
            {t("cookies.analytics.title")}
            <small className='mb-2 block leading-tight tracking-wider'>
              {t.rich("cookies.analytics.description", {
                br: (chunks) => (
                  <>
                    <br />
                    {chunks}
                  </>
                ),
                em: (chunks) => <em className='text-gray-400'>{chunks}</em>,
              })}
            </small>
            <Checkbox
              className='size-5'
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
      <CardFooter>
        <Button
          variant='default'
          onClick={() => {
            setCookie({name: "accepted-cookies", value: JSON.stringify(cookiesState)})
              .then(() => {
                toast({
                  title: "Cookies preferences saved!",
                  description: "Your cookies preferences have been saved.",
                  duration: 3000,
                });
              })
              .catch((error: unknown) => {
                toast({
                  title: "Error saving cookies preferences!",
                  description: `Error: ${String(error)}`,
                  duration: 3000,
                });
              });
          }}>
          {t("cookies.cta")}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * The EULA component.
 * @returns The EULA component.
 */
export default function EULA() {
  const t = useTranslations("EULA");
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

  return (
    <main className='overflow-y-scroll bg-black'>
      <section className='flex flex-col items-center justify-center justify-items-center md:h-screen md:w-screen'>
        <article className='rounded-xl bg-white shadow-inner shadow-black 2xsm:w-full lg:w-1/2 xl:w-2/3'>
          <h1 className='pt-2 text-center text-2xl font-bold underline'>{t("title")}</h1>

          <div className='flex justify-center gap-4'>
            <p
              onClick={() => {
                setLocale("en");
                void setCookie({name: "locale", value: "en"});
              }}
              className={locale === "en" ? "bg-blue-500 text-white" : "bg-white text-black"}>
              EN
            </p>
            <div className='divider divider-horizontal w-1 rounded-xl bg-black' />
            <p
              onClick={() => {
                setLocale("ro");
                void setCookie({name: "locale", value: "ro"});
              }}
              className={locale === "ro" ? "bg-blue-500 text-white" : "bg-white text-black"}>
              RO
            </p>
          </div>

          <article className='mt-4 text-center text-gray-600'>
            {t.rich("content", {
              br: (chunks) => (
                <>
                  <br />
                  {chunks}
                </>
              ),
            })}
          </article>
          <ul className='flex list-inside list-disc flex-col items-center'>
            <li>{t("termsOfService")}</li>
            <li>{t("privacyPolicy")}</li>
          </ul>
          <div className='justify-items-centers flex flex-row items-center justify-center gap-4'>
            <TermsOfService />
            <PrivacyPolicy />
          </div>
          <hr />
          <CookiesBanner
            cookiesState={cookiesState}
            setCookiesState={setCookiesState}
          />
          <div className='my-8 flex justify-center'>
            <Button
              variant='default'
              onClick={handleAccept}>
              {t("accept")}
            </Button>
          </div>
        </article>
      </section>
    </main>
  );
}
