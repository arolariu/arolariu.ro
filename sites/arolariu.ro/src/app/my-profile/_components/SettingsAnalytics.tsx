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
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbChartBar, TbChartPie, TbClock, TbDatabase, TbDownload, TbTrendingUp} from "react-icons/tb";
import {ANALYTICS_GRANULARITY} from "../_utils/constants";
import type {AnalyticsSettings} from "../_utils/types";

type Props = Readonly<{
  settings: AnalyticsSettings;
  onSettingsChange: (settings: Partial<AnalyticsSettings>) => void;
}>;

export function SettingsAnalytics({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.analytics");

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
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>{t("title")}</h2>
        <p className='text-muted-foreground'>{t("description")}</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Master Toggle */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbChartBar className='h-4 w-4' />
              {t("enabled.title")}
            </CardTitle>
            <CardDescription>{t("enabled.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("enabled.label")}</Label>
                <p className='text-muted-foreground text-xs'>{t("enabled.hint")}</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggle("enabled")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Granularity */}
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

        {/* Export Format */}
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

        {/* Tracking Options */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbChartPie className='h-4 w-4' />
              {t("tracking.title")}
            </CardTitle>
            <CardDescription>{t("tracking.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("tracking.spending")}</Label>
                <p className='text-muted-foreground text-xs'>{t("tracking.spendingHint")}</p>
              </div>
              <Switch
                checked={settings.trackSpending}
                onCheckedChange={handleToggle("trackSpending")}
                disabled={!settings.enabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("tracking.categories")}</Label>
                <p className='text-muted-foreground text-xs'>{t("tracking.categoriesHint")}</p>
              </div>
              <Switch
                checked={settings.trackCategories}
                onCheckedChange={handleToggle("trackCategories")}
                disabled={!settings.enabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("tracking.merchants")}</Label>
                <p className='text-muted-foreground text-xs'>{t("tracking.merchantsHint")}</p>
              </div>
              <Switch
                checked={settings.trackMerchants}
                onCheckedChange={handleToggle("trackMerchants")}
                disabled={!settings.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Analytics */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbTrendingUp className='h-4 w-4' />
              {t("advanced.title")}
            </CardTitle>
            <CardDescription>{t("advanced.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("advanced.benchmarking")}</Label>
                <p className='text-muted-foreground text-xs'>{t("advanced.benchmarkingHint")}</p>
              </div>
              <Switch
                checked={settings.benchmarking}
                onCheckedChange={handleToggle("benchmarking")}
                disabled={!settings.enabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("advanced.predictive")}</Label>
                <p className='text-muted-foreground text-xs'>{t("advanced.predictiveHint")}</p>
              </div>
              <Switch
                checked={settings.predictiveAnalysis}
                onCheckedChange={handleToggle("predictiveAnalysis")}
                disabled={!settings.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Usage Info */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbDatabase className='h-4 w-4' />
              {t("dataUsage.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='bg-muted/50 rounded-lg p-4'>
              <p className='text-muted-foreground text-sm'>{t("dataUsage.info")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
