/** @format */
"use client";

import {getCookie, setCookie} from "@/lib/actions/cookies.action";
import {ShimmerWrapper} from "@/presentation/ShimmerWrapper";
import {useTranslations} from "next-intl";
import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {Button, Separator, Tab, TabList, TabPanel, Tabs} from "react-aria-components";
import {PrivacyPolicyDialogButton, TermsOfServiceDialogButton} from "./EulaDialogs";
import {CookiesSettings} from "./EulaSettings";

const LanguagePicker = ({
  locale,
  setLocale,
}: Readonly<{
  locale: string;
  setLocale: Dispatch<SetStateAction<string>>;
}>) => {
  const setLocaleHandler = (locale: string) => {
    void setCookie({name: "locale", value: locale});
    setLocale(locale);
  };

  return (
    <div className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4'>
      <Button
        onPress={() => setLocaleHandler("en")}
        className={locale === "en" ? "bg-blue-700" : ""}>
        ENGLISH
      </Button>
      <Separator
        orientation='vertical'
        className='h-6 w-1 rounded bg-black dark:bg-white'
      />
      <Button
        onPress={() => setLocaleHandler("ro")}
        className={locale === "ro" ? "bg-blue-700" : ""}>
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
        <ShimmerWrapper className='mx-auto my-2 h-44 w-5/6 animate-pulse' />
      </section>
      <br />
      <section className='rounded-xl border-2 2xsm:w-full lg:w-2/3'>
        <ShimmerWrapper className='mx-auto my-2 h-20 w-5/6 animate-pulse' />
        <Separator orientation='horizontal' />
        <ShimmerWrapper className='mx-auto my-2 h-96 w-5/6 animate-pulse' />
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
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center py-24 text-center'>
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
        <h2 className='pt-4 text-center text-xl font-bold'>Additional Information</h2>
        <Tabs className='py-4'>
          <TabList className='flex flex-row flex-nowrap items-center justify-center justify-items-center gap-4 bg-white dark:bg-black'>
            <Tab id='cookies'>Cookies Preference</Tab>
            <Tab id='settings'>Additional Settings</Tab>
          </TabList>
          <TabPanel id='cookies'>
            <CookiesSettings
              cookiesState={cookiesState}
              setCookiesState={setCookiesState}
            />
          </TabPanel>
          <TabPanel id='settings'>
            Lorem ipsum, dolor sit amet consectetur adipisicing elit. Cupiditate perspiciatis voluptates culpa natus qui
            dicta iure beatae. Necessitatibus ipsam enim at maiores, odio minima ratione!
          </TabPanel>
        </Tabs>
      </section>

      <section>
        <div className='my-8 flex justify-center'>
          <Button
            onPress={() => {
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
