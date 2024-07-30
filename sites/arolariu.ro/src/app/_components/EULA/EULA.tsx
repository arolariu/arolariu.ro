/** @format */
"use client";

import {Button} from "@/components/ui/button";
import {Separator} from "@/components/ui/separator";
import {Skeleton} from "@/components/ui/skeleton";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {getCookie, setCookie} from "@/lib/actions/cookies.action";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {PrivacyPolicyDialogButton, TermsOfServiceDialogButton} from "./EulaDialogs";
import {CookiesSettings} from "./EulaSettings";

const LanguagePicker = ({
  locale,
  setLocale,
}: Readonly<{
  locale: string;
  setLocale: (locale: string) => void | Promise<void>;
}>) => {
  const setLocaleHandler = (locale: string) => {
    void setCookie({name: "locale", value: locale});
    setLocale(locale);
  };

  return (
    <div className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4'>
      <Button
        title='English Language'
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
        title='Romanian Language'
        variant='default'
        onClick={() => setLocaleHandler("ro")}
        className={locale === "ro" ? "bg-blue-500 text-white" : "bg-white text-black"}>
        ROMÂNĂ
      </Button>
    </div>
  );
};

const DialogMenu = () => {
  return (
    <div className='justify-items-centers flex flex-row items-center justify-center gap-4'>
      <TermsOfServiceDialogButton />
      <PrivacyPolicyDialogButton />
    </div>
  );
};

const LoadingScreen = () => {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center overflow-y-scroll py-24 text-center'>
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <h1 className='py-4 text-center text-2xl font-bold underline'>Loading...</h1>
        <Skeleton className='mx-auto my-2 h-44 w-5/6 animate-pulse' />
      </section>
      <br />
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <Skeleton className='mx-auto my-2 h-80 w-5/6 animate-pulse' />
      </section>
    </main>
  );
};

/**
 * The EULA component.
 *
 * @format
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

  if (eulaAccepted === null) return <LoadingScreen />;
  if (eulaAccepted) return null;

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center overflow-y-scroll py-24 text-center'>
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <h1 className='py-4 text-center text-2xl font-bold underline'>{t("title")}</h1>
        <LanguagePicker
          locale={locale}
          setLocale={setLocale}
        />

        <article className='mt-4 text-center'>
          {t.rich("content", {
            br: (chunks) => (
              <>
                <br /> {chunks}
              </>
            ),
          })}
          <ul className='flex list-inside list-disc flex-col items-center'>
            <li>{t("termsOfService")}</li>
            <li>{t("privacyPolicy")}</li>
          </ul>
        </article>

        <DialogMenu />
      </section>

      <br />

      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <Tabs
          defaultValue='cookies'
          className='py-4'>
          <TabsList className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4 bg-white dark:bg-black'>
            <TabsTrigger value='cookies'>
              <Button title='Cookies Preference'>Cookies Preference</Button>
            </TabsTrigger>
            <TabsTrigger value='settings'>
              <Button title='Additional Settings'>Additional Settings</Button>
            </TabsTrigger>
          </TabsList>
          <TabsContent value='cookies'>
            <CookiesSettings
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
            title={t("accept")}
            onClick={() => {
              void setCookie({name: "eula-accepted", value: "true"});
              void setCookie({name: "accepted-cookies", value: JSON.stringify(cookiesState)});
              void setCookie({name: "locale", value: locale});
              setEulaAccepted(true);
            }}>
            {t("accept")}
          </Button>
        </div>
      </section>
    </main>
  );
}
