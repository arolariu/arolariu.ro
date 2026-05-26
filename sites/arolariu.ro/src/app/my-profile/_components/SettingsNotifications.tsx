"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useRef} from "react";
import {TbBell, TbMail, TbReport, TbShield, TbSparkles, TbWallet} from "react-icons/tb";
import {REPORT_FREQUENCIES} from "../_utils/constants";
import type {NotificationSettings} from "../_utils/types";
import styles from "./SettingsNotifications.module.scss";

type Props = Readonly<{
  settings: NotificationSettings;
  onSettingsChange: (settings: Partial<NotificationSettings>) => void;
}>;

export function SettingsNotifications({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

  const handleFrequencyChange = useCallback(
    (value: string) => {
      onSettingsChange({reportFrequency: value as NotificationSettings["reportFrequency"]});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (
      key: keyof Pick<
        NotificationSettings,
        | "emailEnabled"
        | "weeklyDigest"
        | "monthlyReport"
        | "spendingAlerts"
        | "budgetAlerts"
        | "newFeatures"
        | "marketingEmails"
        | "securityAlerts"
      >,
    ) =>
      (checked: boolean) => {
        onSettingsChange({[key]: checked});
      },
    [onSettingsChange],
  );

  return (
    <motion.section
      ref={sectionRef}
      className={styles["section"]}
      initial={{opacity: 0}}
      animate={isInView ? {opacity: 1} : {opacity: 0}}
      transition={{duration: 0.3}}>
      <div className={styles["header"]}>
        <h2>{t((m) => m.pages.profile.settings.notifications.title)}</h2>
        <p>{t((m) => m.pages.profile.settings.notifications.description)}</p>
      </div>

      <div className={styles["grid"]}>
        {/* Email Master Toggle */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbMail className={styles["iconSm"]} />
                {t((m) => m.pages.profile.settings.notifications.email.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.pages.profile.settings.notifications.email.description)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.email.enabled)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.email.enabledHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.emailEnabled}
                  onCheckedChange={handleToggle("emailEnabled")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Report Frequency */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbReport className={styles["iconSm"]} />
                {t((m) => m.pages.profile.settings.notifications.reports.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.pages.profile.settings.notifications.reports.description)}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <Select
                value={settings.reportFrequency}
                onValueChange={handleFrequencyChange}
                disabled={!settings.emailEnabled}>
                <SelectTrigger className={styles["selectCursor"]}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_FREQUENCIES.map((freq) => (
                    <SelectItem
                      key={freq.id}
                      value={freq.id}>
                      {freq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.reports.weeklyDigest)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.reports.weeklyDigestHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.weeklyDigest}
                  onCheckedChange={handleToggle("weeklyDigest")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.reports.monthlyReport)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.reports.monthlyReportHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.monthlyReport}
                  onCheckedChange={handleToggle("monthlyReport")}
                  disabled={!settings.emailEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Alerts */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbWallet className={styles["iconSm"]} />
                {t((m) => m.pages.profile.settings.notifications.financial.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.pages.profile.settings.notifications.financial.description)}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.financial.spendingAlerts)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.financial.spendingAlertsHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.spendingAlerts}
                  onCheckedChange={handleToggle("spendingAlerts")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.financial.budgetAlerts)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.financial.budgetAlertsHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.budgetAlerts}
                  onCheckedChange={handleToggle("budgetAlerts")}
                  disabled={!settings.emailEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Updates */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbSparkles className={styles["iconSm"]} />
                {t((m) => m.pages.profile.settings.notifications.updates.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.pages.profile.settings.notifications.updates.description)}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.updates.newFeatures)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.updates.newFeaturesHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.newFeatures}
                  onCheckedChange={handleToggle("newFeatures")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.updates.marketing)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.updates.marketingHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.marketingEmails}
                  onCheckedChange={handleToggle("marketingEmails")}
                  disabled={!settings.emailEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Notifications */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbShield className={styles["iconSm"]} />
                {t((m) => m.pages.profile.settings.notifications.security.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.pages.profile.settings.notifications.security.description)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.pages.profile.settings.notifications.security.securityAlerts)}</Label>
                  <p>{t((m) => m.pages.profile.settings.notifications.security.securityAlertsHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.securityAlerts}
                  onCheckedChange={handleToggle("securityAlerts")}
                />
              </div>
              <div className={styles["alwaysOnNote"]}>
                <p>
                  <TbBell />
                  {t((m) => m.pages.profile.settings.notifications.security.alwaysOnNote)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
