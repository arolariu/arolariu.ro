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
import {TbBell, TbMail, TbReport, TbShield, TbSparkles, TbWallet} from "react-icons/tb";
import {REPORT_FREQUENCIES} from "../_utils/constants";
import type {NotificationSettings} from "../_utils/types";

type Props = Readonly<{
  settings: NotificationSettings;
  onSettingsChange: (settings: Partial<NotificationSettings>) => void;
}>;

export function SettingsNotifications({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.notifications");

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
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>{t("title")}</h2>
        <p className='text-muted-foreground'>{t("description")}</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Email Master Toggle */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbMail className='h-4 w-4' />
              {t("email.title")}
            </CardTitle>
            <CardDescription>{t("email.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("email.enabled")}</Label>
                <p className='text-muted-foreground text-xs'>{t("email.enabledHint")}</p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={handleToggle("emailEnabled")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Report Frequency */}
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
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("reports.weeklyDigest")}</Label>
                <p className='text-muted-foreground text-xs'>{t("reports.weeklyDigestHint")}</p>
              </div>
              <Switch
                checked={settings.weeklyDigest}
                onCheckedChange={handleToggle("weeklyDigest")}
                disabled={!settings.emailEnabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("reports.monthlyReport")}</Label>
                <p className='text-muted-foreground text-xs'>{t("reports.monthlyReportHint")}</p>
              </div>
              <Switch
                checked={settings.monthlyReport}
                onCheckedChange={handleToggle("monthlyReport")}
                disabled={!settings.emailEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Alerts */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbWallet className='h-4 w-4' />
              {t("financial.title")}
            </CardTitle>
            <CardDescription>{t("financial.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("financial.spendingAlerts")}</Label>
                <p className='text-muted-foreground text-xs'>{t("financial.spendingAlertsHint")}</p>
              </div>
              <Switch
                checked={settings.spendingAlerts}
                onCheckedChange={handleToggle("spendingAlerts")}
                disabled={!settings.emailEnabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("financial.budgetAlerts")}</Label>
                <p className='text-muted-foreground text-xs'>{t("financial.budgetAlertsHint")}</p>
              </div>
              <Switch
                checked={settings.budgetAlerts}
                onCheckedChange={handleToggle("budgetAlerts")}
                disabled={!settings.emailEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Updates */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbSparkles className='h-4 w-4' />
              {t("updates.title")}
            </CardTitle>
            <CardDescription>{t("updates.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("updates.newFeatures")}</Label>
                <p className='text-muted-foreground text-xs'>{t("updates.newFeaturesHint")}</p>
              </div>
              <Switch
                checked={settings.newFeatures}
                onCheckedChange={handleToggle("newFeatures")}
                disabled={!settings.emailEnabled}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("updates.marketing")}</Label>
                <p className='text-muted-foreground text-xs'>{t("updates.marketingHint")}</p>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={handleToggle("marketingEmails")}
                disabled={!settings.emailEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Notifications */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbShield className='h-4 w-4' />
              {t("security.title")}
            </CardTitle>
            <CardDescription>{t("security.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("security.securityAlerts")}</Label>
                <p className='text-muted-foreground text-xs'>{t("security.securityAlertsHint")}</p>
              </div>
              <Switch
                checked={settings.securityAlerts}
                onCheckedChange={handleToggle("securityAlerts")}
              />
            </div>
            <div className='bg-muted/50 mt-4 rounded-lg p-3'>
              <p className='text-muted-foreground flex items-center gap-2 text-xs'>
                <TbBell className='h-4 w-4' />
                {t("security.alwaysOnNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
