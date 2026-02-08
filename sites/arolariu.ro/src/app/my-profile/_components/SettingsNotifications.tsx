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
import {useTranslations} from "next-intl";
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
  const t = useTranslations("MyProfile.settings.notifications");
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
        <h2>{t("title")}</h2>
        <p>{t("description")}</p>
      </div>

      <div className={styles["grid"]}>
        {/* Email Master Toggle */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbMail className='h-4 w-4' />
                {t("email.title")}
              </CardTitle>
              <CardDescription>{t("email.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("email.enabled")}</Label>
                  <p>{t("email.enabledHint")}</p>
                </div>
                <Switch
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
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbReport className='h-4 w-4' />
                {t("reports.title")}
              </CardTitle>
              <CardDescription>{t("reports.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Select
                value={settings.reportFrequency}
                onValueChange={handleFrequencyChange}
                disabled={!settings.emailEnabled}>
                <SelectTrigger className='cursor-pointer'>
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
                  <Label>{t("reports.weeklyDigest")}</Label>
                  <p>{t("reports.weeklyDigestHint")}</p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={handleToggle("weeklyDigest")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("reports.monthlyReport")}</Label>
                  <p>{t("reports.monthlyReportHint")}</p>
                </div>
                <Switch
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
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbWallet className='h-4 w-4' />
                {t("financial.title")}
              </CardTitle>
              <CardDescription>{t("financial.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("financial.spendingAlerts")}</Label>
                  <p>{t("financial.spendingAlertsHint")}</p>
                </div>
                <Switch
                  checked={settings.spendingAlerts}
                  onCheckedChange={handleToggle("spendingAlerts")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("financial.budgetAlerts")}</Label>
                  <p>{t("financial.budgetAlertsHint")}</p>
                </div>
                <Switch
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
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbSparkles className='h-4 w-4' />
                {t("updates.title")}
              </CardTitle>
              <CardDescription>{t("updates.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("updates.newFeatures")}</Label>
                  <p>{t("updates.newFeaturesHint")}</p>
                </div>
                <Switch
                  checked={settings.newFeatures}
                  onCheckedChange={handleToggle("newFeatures")}
                  disabled={!settings.emailEnabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("updates.marketing")}</Label>
                  <p>{t("updates.marketingHint")}</p>
                </div>
                <Switch
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
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbShield className='h-4 w-4' />
                {t("security.title")}
              </CardTitle>
              <CardDescription>{t("security.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("security.securityAlerts")}</Label>
                  <p>{t("security.securityAlertsHint")}</p>
                </div>
                <Switch
                  checked={settings.securityAlerts}
                  onCheckedChange={handleToggle("securityAlerts")}
                />
              </div>
              <div className={styles["alwaysOnNote"]}>
                <p>
                  <TbBell />
                  {t("security.alwaysOnNote")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
