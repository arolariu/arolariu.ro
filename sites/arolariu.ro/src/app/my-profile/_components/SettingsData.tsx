"use client";

import {
  Button,
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
import {TbAlertTriangle, TbCloud, TbDatabase, TbDownload, TbShieldCheck, TbTrash} from "react-icons/tb";
import {DATA_RETENTION_OPTIONS, REPORT_FREQUENCIES} from "../_utils/constants";
import type {DataSettings} from "../_utils/types";

type Props = Readonly<{
  settings: DataSettings;
  onSettingsChange: (settings: Partial<DataSettings>) => void;
}>;

export function SettingsData({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.data");

  const handleRetentionChange = useCallback(
    (value: string) => {
      onSettingsChange({retention: value as DataSettings["retention"]});
    },
    [onSettingsChange],
  );

  const handleBackupFrequencyChange = useCallback(
    (value: string) => {
      onSettingsChange({backupFrequency: value as DataSettings["backupFrequency"]});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (key: keyof Pick<DataSettings, "autoBackup" | "shareAnonymousData">) => (checked: boolean) => {
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
        {/* Data Retention */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbDatabase className='h-4 w-4' />
              {t("retention.title")}
            </CardTitle>
            <CardDescription>{t("retention.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.retention}
              onValueChange={handleRetentionChange}>
              <SelectTrigger className='cursor-pointer'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_RETENTION_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-muted-foreground mt-2 text-xs'>{t("retention.hint")}</p>
          </CardContent>
        </Card>

        {/* Auto Backup */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbCloud className='h-4 w-4' />
              {t("backup.title")}
            </CardTitle>
            <CardDescription>{t("backup.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("backup.autoBackup")}</Label>
                <p className='text-muted-foreground text-xs'>{t("backup.autoBackupHint")}</p>
              </div>
              <Switch
                checked={settings.autoBackup}
                onCheckedChange={handleToggle("autoBackup")}
              />
            </div>
            <Separator />
            <div>
              <Label>{t("backup.frequency")}</Label>
              <Select
                value={settings.backupFrequency}
                onValueChange={handleBackupFrequencyChange}
                disabled={!settings.autoBackup}>
                <SelectTrigger className='mt-2 cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_FREQUENCIES.filter((f) => f.id !== "never").map((freq) => (
                    <SelectItem
                      key={freq.id}
                      value={freq.id}>
                      {freq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbShieldCheck className='h-4 w-4' />
              {t("privacy.title")}
            </CardTitle>
            <CardDescription>{t("privacy.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("privacy.shareAnonymous")}</Label>
                <p className='text-muted-foreground text-xs'>{t("privacy.shareAnonymousHint")}</p>
              </div>
              <Switch
                checked={settings.shareAnonymousData}
                onCheckedChange={handleToggle("shareAnonymousData")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbDownload className='h-4 w-4' />
              {t("export.title")}
            </CardTitle>
            <CardDescription>{t("export.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <Button
              variant='outline'
              className='w-full cursor-pointer'>
              <TbDownload className='mr-2 h-4 w-4' />
              {t("export.downloadAll")}
            </Button>
            <p className='text-muted-foreground text-center text-xs'>{t("export.hint")}</p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className='border-destructive/50 md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-destructive flex items-center gap-2 text-base'>
              <TbAlertTriangle className='h-4 w-4' />
              {t("danger.title")}
            </CardTitle>
            <CardDescription>{t("danger.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between rounded-lg border border-dashed p-4'>
              <div>
                <p className='font-medium'>{t("danger.deleteData")}</p>
                <p className='text-muted-foreground text-xs'>{t("danger.deleteDataHint")}</p>
              </div>
              <Button
                variant='destructive'
                className='cursor-pointer'>
                <TbTrash className='mr-2 h-4 w-4' />
                {t("danger.deleteButton")}
              </Button>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-dashed p-4'>
              <div>
                <p className='font-medium'>{t("danger.deleteAccount")}</p>
                <p className='text-muted-foreground text-xs'>{t("danger.deleteAccountHint")}</p>
              </div>
              <Button
                variant='outline'
                className='cursor-pointer'
                asChild>
                <a
                  href='https://accounts.arolariu.ro/user'
                  target='_blank'
                  rel='noopener noreferrer'>
                  {t("danger.manageAccount")}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
