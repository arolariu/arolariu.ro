"use client";

import {getCookie, setCookie} from "@/lib/actions/cookies";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbCookie, TbGlobe, TbInfoCircleFilled, TbLock, TbShield} from "react-icons/tb";
import RenderPrivacyPolicyScreen from "./(privacy-and-terms)/privacy-policy/island";
import RenderTermsOfServiceScreen from "./(privacy-and-terms)/terms-of-service/island";

type CookieState = {
  essential: boolean;
  analytics: boolean;
};

type Props = {locale: string};

/**
 * A shimmer for the EULA component.
 * @returns The EULA loading component.
 */
function EulaLoading(): React.JSX.Element {
  return (
    <Card className='border-2 shadow-lg'>
      <CardHeader className='space-y-4 text-center'>
        <div className='flex justify-center'>
          <div className='h-12 w-12 animate-pulse rounded-full bg-gray-200' />
        </div>
        <div className='mx-auto h-8 w-64 animate-pulse rounded-md bg-gray-200' />
        <div className='mx-auto h-4 w-48 animate-pulse rounded-md bg-gray-200' />

        <div className='mx-auto w-full max-w-xs'>
          <div className='h-10 animate-pulse rounded-md bg-gray-200' />
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        <div className='h-16 animate-pulse rounded-md bg-gray-200' />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div className='h-48 animate-pulse rounded-md bg-gray-200' />
          <div className='h-48 animate-pulse rounded-md bg-gray-200' />
        </div>

        <div className='h-1 animate-pulse rounded-md bg-gray-200' />

        <div className='space-y-4'>
          <div className='h-8 animate-pulse rounded-md bg-gray-200' />
          <div className='h-24 animate-pulse rounded-md bg-gray-200' />
          <div className='h-24 animate-pulse rounded-md bg-gray-200' />
        </div>
      </CardContent>

      <CardFooter className='flex flex-col space-y-4'>
        <div className='h-12 w-full animate-pulse rounded-md bg-gray-200' />
        <div className='mx-auto h-4 w-3/4 animate-pulse rounded-md bg-gray-200' />
      </CardFooter>
    </Card>
  );
}

/**
 * EULA component to display the End User License Agreement.
 * The component includes sections for Terms of Service, Privacy Policy, and Cookies Policy.
 * @returns The EULA component, CSR'ed.
 */
export default function Eula({locale}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("EULA");
  const [eulaCookie, setEulaCookie] = useState<boolean | null>(null);
  const [cookieState, setCookieState] = useState<CookieState>({
    essential: true,
    analytics: true,
  });

  const handleLocale = useCallback((locale: string) => {
    void setCookie("locale", locale);
  }, []);

  const handleAccept = useCallback(() => {
    void setCookie("eula-accepted", "true");
    void setCookie("accepted-cookies", JSON.stringify(cookieState));
    void setCookie("locale", locale);
    setEulaCookie(true);
  }, [cookieState, locale]);

  const handleLocaleEnClick = useCallback(() => {
    handleLocale("en");
  }, [handleLocale]);

  const handleLocaleRoClick = useCallback(() => {
    handleLocale("ro");
  }, [handleLocale]);

  const handleAnalyticsCheckedChange = useCallback((checked: boolean) => {
    setCookieState((prev) => ({...prev, analytics: checked}));
  }, []);

  useEffect(() => {
    const fetchCookie = async () => {
      const cookie = await getCookie("eula-accepted");
      if (cookie) {
        setEulaCookie(cookie === "true");
      } else {
        setEulaCookie(false);
      }
    };

    fetchCookie();
  }, []);

  if (eulaCookie === null) {
    return (
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5}}
        className='mx-auto w-full max-w-4xl px-4 py-20'>
        <EulaLoading />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5}}
      className='mx-auto w-full max-w-4xl px-4 py-20'>
      <Card className='border-2 shadow-lg'>
        <CardHeader className='space-y-2 text-center'>
          <motion.div
            initial={{scale: 0.9}}
            animate={{scale: 1}}
            transition={{duration: 0.5}}
            className='flex justify-center'>
            <TbShield className='text-primary h-12 w-12' />
          </motion.div>
          <CardTitle className='text-2xl font-bold md:text-3xl'>{t("title")}</CardTitle>
          <CardDescription className='text-base'>{t("subtitle")}</CardDescription>

          <Tabs
            defaultValue={locale}
            className='mx-auto flex w-full max-w-xs flex-row items-center justify-center justify-items-center'>
            <TabsList className='flex flex-row items-center justify-center justify-items-center gap-2'>
              <TabsTrigger
                value='en'
                onClick={handleLocaleEnClick}
                className='flex cursor-pointer items-center gap-2'>
                <TbGlobe className='h-4 w-4' />
                English (EN)
              </TabsTrigger>
              <Separator
                orientation='vertical'
                className='border-muted-foreground/50 h-6 rounded-xl border-2'
              />
              <TabsTrigger
                value='ro'
                onClick={handleLocaleRoClick}
                className='flex cursor-pointer items-center gap-2'>
                <TbGlobe className='h-4 w-4' />
                Română (RO)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className='space-y-6'>
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.2}}
            className='px-4 text-center'>
            <span className='text-muted-foreground'>{t("content")}</span>
          </motion.div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <Card className='hover:border-primary h-full transition-colors'>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center gap-2'>
                    <TbLock className='text-primary h-5 w-5' />
                    {t("termsOfService.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className='text-muted-foreground text-sm'>{t("termsOfService.subtitle")}</CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant='outline'
                        title={t("termsOfService.cta")}
                        className='w-full cursor-pointer'>
                        {t("termsOfService.cta")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className='2xsm:max-h-[90vh] 2xsm:max-w-[90vw] overflow-y-scroll md:max-h-[75vh] md:max-w-[75vw]'>
                      <DialogHeader>
                        <DialogTitle className='text-center'>{t("termsOfService.cta")}</DialogTitle>
                        <RenderTermsOfServiceScreen />
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <Card className='hover:border-primary h-full transition-colors'>
                <CardHeader className='pb-2'>
                  <CardTitle className='flex items-center gap-2'>
                    <TbShield className='text-primary h-5 w-5' />
                    {t("privacyPolicy.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className='text-muted-foreground text-sm'>{t("privacyPolicy.subtitle")}</CardContent>
                <CardFooter>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant='outline'
                        title={t("privacyPolicy.cta")}
                        className='w-full cursor-pointer'>
                        {t("privacyPolicy.cta")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className='2xsm:max-h-[90vh] 2xsm:max-w-[90vw] overflow-y-scroll md:max-h-[75vh] md:max-w-[75vw]'>
                      <DialogHeader>
                        <DialogTitle className='text-center'>{t("privacyPolicy.cta")}</DialogTitle>
                        <RenderPrivacyPolicyScreen />
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            </motion.div>
          </div>

          <Separator className='my-6' />

          <motion.div
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.4}}>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='flex items-center gap-2 text-lg font-medium'>
                  <TbCookie className='text-primary h-5 w-5' />
                  {t("cookiesPolicy.title")}
                </h3>
              </div>

              <span className='text-muted-foreground text-sm'>{t("cookiesPolicy.subtitle")}</span>

              <Accordion
                type='single'
                collapsible
                className='w-full'>
                <AccordionItem value='essential'>
                  <AccordionTrigger className='hover:no-underline'>
                    <div className='flex items-center gap-2'>
                      <TbLock className='text-primary h-4 w-4' />
                      <span>{t("cookiesPolicy.cookies.essential.title")}</span>
                      <Badge className='bg-primary ml-2'>Required</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='space-y-4 p-2'>
                      <p className='text-muted-foreground text-sm'>{t("cookiesPolicy.cookies.essential.description")}</p>
                      <div className='flex items-center space-x-2'>
                        <Switch
                          id='essential'
                          checked
                          disabled
                        />
                        <Label
                          htmlFor='essential'
                          className='text-sm font-medium'>
                          {t("cookiesPolicy.cookies.essential.checkbox")}
                        </Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value='analytics'>
                  <AccordionTrigger className='hover:no-underline'>
                    <div className='flex items-center gap-2'>
                      <TbInfoCircleFilled className='text-primary h-4 w-4' />
                      <span>{t("cookiesPolicy.cookies.analytics.title")}</span>
                      <Badge
                        className='ml-2'
                        variant='outline'>
                        Optional
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className='space-y-4 p-2'>
                      <p className='text-muted-foreground text-sm'>{t("cookiesPolicy.cookies.analytics.description")}</p>
                      <div className='flex items-center space-x-2'>
                        <Switch
                          id='analytics'
                          checked={cookieState.analytics}
                          onCheckedChange={handleAnalyticsCheckedChange}
                        />
                        <Label
                          htmlFor='analytics'
                          className='text-sm font-medium'>
                          {t("cookiesPolicy.cookies.analytics.checkbox")}
                        </Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </motion.div>
        </CardContent>

        <CardFooter className='flex flex-col space-y-4'>
          <motion.div
            whileHover={{scale: 1.03}}
            whileTap={{scale: 0.97}}
            className='w-full'>
            <Button
              onClick={handleAccept}
              className='bg-primary hover:bg-primary/90 w-full cursor-pointer'
              size='lg'>
              <TbCheck className='mr-2 h-4 w-4' /> {t("accept")}
            </Button>
          </motion.div>
          <p className='text-muted-foreground text-center text-xs'>{t("content").split(".")[0]}.</p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
