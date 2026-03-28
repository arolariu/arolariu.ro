"use client";

import {getCookie, setCookie} from "@/lib/actions/cookies";
import {usePreferencesStore} from "@/stores/preferencesStore";
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
} from "@arolariu/components";
import {motion} from "motion/react";
import {type Locale, useTranslations} from "next-intl";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbCookie, TbGlobe, TbInfoCircleFilled, TbLock, TbShield} from "react-icons/tb";
import RenderPrivacyPolicyScreen from "./(privacy-and-terms)/privacy-policy/island";
import RenderTermsOfServiceScreen from "./(privacy-and-terms)/terms-of-service/island";
import styles from "./EULA.module.scss";
import EulaShimmer from "./EULA.shimmers";

type CookieState = {
  essential: boolean;
  analytics: boolean;
};

type Props = {locale: Locale};

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

  const handleLocale = useCallback((locale: Locale) => {
    usePreferencesStore.getState().setLocale(locale as "en" | "ro" | "fr");
  }, []);

  const handleAccept = useCallback(() => {
    void setCookie("eula-accepted", "true");
    void setCookie("accepted-cookies", JSON.stringify(cookieState));
    // Locale cookie is handled by the store's locale → cookie subscription
    usePreferencesStore.getState().setLocale(locale as "en" | "ro" | "fr");
    setEulaCookie(true);
  }, [cookieState, locale]);

  const handleLocaleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const extractedLocale = (event.target.value as Locale) || "en";
      handleLocale(extractedLocale);
    },
    [handleLocale],
  );

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
      <div className={styles["main"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}>
          <EulaShimmer />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles["main"]}>
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5}}>
        <Card className={styles["card"]}>
          <CardHeader className={styles["headerCenter"]}>
            <motion.div
              initial={{scale: 0.9}}
              animate={{scale: 1}}
              transition={{duration: 0.5}}
              className={styles["shieldIcon"]}>
              <TbShield className={styles["shieldIconSvg"]} />
            </motion.div>
            <CardTitle>
              <h1 className={styles["title"]}>{t("title")}</h1>
            </CardTitle>
            <CardDescription className={styles["subtitle"]}>{t("subtitle")}</CardDescription>

            <div className={styles["localePicker"]}>
              <Label
                htmlFor='locale-select'
                className={styles["localeLabel"]}>
                <TbGlobe className={styles["globeIcon"]} />
                {t("language")}
              </Label>
              <select
                title={t("language")}
                id='locale-select'
                defaultValue={locale}
                onChange={handleLocaleChange}
                className={styles["localeSelect"]}>
                <option value='en'>English (EN)</option>
                <option value='ro'>Română (RO)</option>
                <option value='fr'>Français (FR)</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className={styles["contentArea"]}>
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={{delay: 0.2}}
              className={styles["contentText"]}>
              <span>{t("content")}</span>
            </motion.div>

            <div className={styles["policyGrid"]}>
              <motion.div
                whileHover={{scale: 1.02}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <Card className={styles["policyCard"]}>
                  <CardHeader className={styles["policyCardHeader"]}>
                    <CardTitle className={styles["policyCardTitle"]}>
                      <TbLock className={styles["policyIcon"]} />
                      {t("termsOfService.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={styles["policyCardContent"]}>{t("termsOfService.subtitle")}</CardContent>
                  <CardFooter>
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button
                            variant='outline'
                            title={t("termsOfService.cta")}
                            className={styles["policyButton"]}>
                            {t("termsOfService.cta")}
                          </Button>
                        }
                      />
                      <DialogContent className={styles["dialogContent"]}>
                        <DialogHeader>
                          <DialogTitle className={styles["dialogTitle"]}>{t("termsOfService.cta")}</DialogTitle>
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
                <Card className={styles["policyCard"]}>
                  <CardHeader className={styles["policyCardHeader"]}>
                    <CardTitle className={styles["policyCardTitle"]}>
                      <TbShield className={styles["policyIcon"]} />
                      {t("privacyPolicy.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className={styles["policyCardContent"]}>{t("privacyPolicy.subtitle")}</CardContent>
                  <CardFooter>
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button
                            variant='outline'
                            title={t("privacyPolicy.cta")}
                            className={styles["policyButton"]}>
                            {t("privacyPolicy.cta")}
                          </Button>
                        }
                      />
                      <DialogContent className={styles["dialogContent"]}>
                        <DialogHeader>
                          <DialogTitle className={styles["dialogTitle"]}>{t("privacyPolicy.cta")}</DialogTitle>
                          <RenderPrivacyPolicyScreen />
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>

            <Separator className={styles["separator"]} />

            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: 0.4}}>
              <div className={styles["cookiesSection"]}>
                <div className={styles["cookiesHeader"]}>
                  <h3 className={styles["cookiesTitle"]}>
                    <TbCookie className={styles["cookieIcon"]} />
                    {t("cookiesPolicy.title")}
                  </h3>
                </div>

                <span className={styles["cookiesSubtitle"]}>{t("cookiesPolicy.subtitle")}</span>

                <Accordion
                  type='single'
                  collapsible
                  defaultValue='essential'
                  className={styles["accordion"]}>
                  <AccordionItem value='essential'>
                    <AccordionTrigger className={styles["accordionTrigger"]}>
                      <div className={styles["accordionTriggerContent"]}>
                        <TbLock className={styles["accordionIcon"]} />
                        <span>{t("cookiesPolicy.cookies.essential.title")}</span>
                        <Badge className={styles["badgeRequired"]}>Required</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className={styles["accordionBody"]}>
                        <p className={styles["accordionDescription"]}>{t("cookiesPolicy.cookies.essential.description")}</p>
                        <div className={styles["switchRow"]}>
                          <Switch
                            nativeButton
                            id='essential'
                            checked
                            disabled
                          />
                          <Label
                            htmlFor='essential'
                            className={styles["switchLabel"]}>
                            {t("cookiesPolicy.cookies.essential.checkbox")}
                          </Label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='analytics'>
                    <AccordionTrigger className={styles["accordionTrigger"]}>
                      <div className={styles["accordionTriggerContent"]}>
                        <TbInfoCircleFilled className={styles["accordionIcon"]} />
                        <span>{t("cookiesPolicy.cookies.analytics.title")}</span>
                        <Badge
                          className={styles["badgeOptional"]}
                          variant='outline'>
                          Optional
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className={styles["accordionBody"]}>
                        <p className={styles["accordionDescription"]}>{t("cookiesPolicy.cookies.analytics.description")}</p>
                        <div className={styles["switchRow"]}>
                          <Switch
                            nativeButton
                            id='analytics'
                            checked={cookieState.analytics}
                            onCheckedChange={handleAnalyticsCheckedChange}
                          />
                          <Label
                            htmlFor='analytics'
                            className={styles["switchLabel"]}>
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

          <CardFooter className={styles["footer"]}>
            <motion.div
              whileHover={{scale: 1.03}}
              whileTap={{scale: 0.97}}
              className={styles["acceptButtonWrapper"]}>
              <Button
                onClick={handleAccept}
                className={styles["acceptButton"]}
                size='lg'>
                <TbCheck className={styles["acceptIcon"]} /> {t("accept")}
              </Button>
            </motion.div>
            <p className={styles["footerNote"]}>{t("content").split(".")[0]}.</p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
