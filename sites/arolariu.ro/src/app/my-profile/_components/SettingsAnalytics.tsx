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
import {TbChartBar, TbChartPie, TbClock, TbDatabase, TbDownload, TbTrendingUp} from "react-icons/tb";
import {ANALYTICS_GRANULARITY} from "../_utils/constants";
import type {AnalyticsSettings} from "../_utils/types";
import styles from "./SettingsAnalytics.module.scss";

type Props = Readonly<{
  settings: AnalyticsSettings;
  onSettingsChange: (settings: Partial<AnalyticsSettings>) => void;
}>;

export function SettingsAnalytics({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.analytics");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

  const handleGranularityChange = useCallback(
    (value: string) => {
      onSettingsChange({granularity: value as AnalyticsSettings["granularity"]});
    },
    [onSettingsChange],
  );

  const handleExportFormatChange = useCallback(
    (value: string) => {
      onSettingsChange({exportFormat: value as AnalyticsSettings["exportFormat"]});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (
      key: keyof Pick<
        AnalyticsSettings,
        "enabled" | "trackSpending" | "trackCategories" | "trackMerchants" | "benchmarking" | "predictiveAnalysis"
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
        {/* Master Toggle */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbChartBar className='h-4 w-4' />
                {t("enabled.title")}
              </CardTitle>
              <CardDescription>{t("enabled.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("enabled.label")}</Label>
                  <p>{t("enabled.hint")}</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={handleToggle("enabled")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Granularity */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbClock className='h-4 w-4' />
                {t("granularity.title")}
              </CardTitle>
              <CardDescription>{t("granularity.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.granularity}
                onValueChange={handleGranularityChange}
                disabled={!settings.enabled}>
                <SelectTrigger className='cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTICS_GRANULARITY.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Export Format */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbDownload className='h-4 w-4' />
                {t("export.title")}
              </CardTitle>
              <CardDescription>{t("export.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.exportFormat}
                onValueChange={handleExportFormatChange}>
                <SelectTrigger className='cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='json'>JSON</SelectItem>
                  <SelectItem value='csv'>CSV</SelectItem>
                  <SelectItem value='pdf'>PDF</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tracking Options */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbChartPie className='h-4 w-4' />
                {t("tracking.title")}
              </CardTitle>
              <CardDescription>{t("tracking.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("tracking.spending")}</Label>
                  <p>{t("tracking.spendingHint")}</p>
                </div>
                <Switch
                  checked={settings.trackSpending}
                  onCheckedChange={handleToggle("trackSpending")}
                  disabled={!settings.enabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("tracking.categories")}</Label>
                  <p>{t("tracking.categoriesHint")}</p>
                </div>
                <Switch
                  checked={settings.trackCategories}
                  onCheckedChange={handleToggle("trackCategories")}
                  disabled={!settings.enabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("tracking.merchants")}</Label>
                  <p>{t("tracking.merchantsHint")}</p>
                </div>
                <Switch
                  checked={settings.trackMerchants}
                  onCheckedChange={handleToggle("trackMerchants")}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Analytics */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbTrendingUp className='h-4 w-4' />
                {t("advanced.title")}
              </CardTitle>
              <CardDescription>{t("advanced.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("advanced.benchmarking")}</Label>
                  <p>{t("advanced.benchmarkingHint")}</p>
                </div>
                <Switch
                  checked={settings.benchmarking}
                  onCheckedChange={handleToggle("benchmarking")}
                  disabled={!settings.enabled}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("advanced.predictive")}</Label>
                  <p>{t("advanced.predictiveHint")}</p>
                </div>
                <Switch
                  checked={settings.predictiveAnalysis}
                  onCheckedChange={handleToggle("predictiveAnalysis")}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Usage Info */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.3}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbDatabase className='h-4 w-4' />
                {t("dataUsage.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles["infoBox"]}>
                <p className={styles["dataUsageInfo"]}>{t("dataUsage.info")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
