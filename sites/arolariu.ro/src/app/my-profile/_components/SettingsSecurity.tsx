"use client";

import {
  Badge,
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
import {TbClock, TbDevices, TbKey, TbLock, TbShieldCheck, TbTrash} from "react-icons/tb";
import type {SecuritySettings} from "../_utils/types";

type Props = Readonly<{
  settings: SecuritySettings;
  onSettingsChange: (settings: Partial<SecuritySettings>) => void;
}>;

export function SettingsSecurity({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.security");

  const handleSessionTimeoutChange = useCallback(
    (value: string) => {
      onSettingsChange({sessionTimeout: Number.parseInt(value, 10)});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (key: keyof Pick<SecuritySettings, "twoFactorEnabled" | "loginNotifications">) => (checked: boolean) => {
      onSettingsChange({[key]: checked});
    },
    [onSettingsChange],
  );

  const handleRemoveDevice = useCallback(
    (deviceId: string) => () => {
      onSettingsChange({
        trustedDevices: settings.trustedDevices.filter((d) => d.id !== deviceId),
      });
    },
    [onSettingsChange, settings.trustedDevices],
  );

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>{t("title")}</h2>
        <p className='text-muted-foreground'>{t("description")}</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Two-Factor Authentication */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbKey className='h-4 w-4' />
              {t("twoFactor.title")}
            </CardTitle>
            <CardDescription>{t("twoFactor.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("twoFactor.enabled")}</Label>
                <p className='text-muted-foreground text-xs'>{t("twoFactor.enabledHint")}</p>
              </div>
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={handleToggle("twoFactorEnabled")}
              />
            </div>
            {settings.twoFactorEnabled ? (
              <div className='bg-muted/50 mt-4 rounded-lg p-3'>
                <p className='flex items-center gap-2 text-sm font-medium text-green-600'>
                  <TbShieldCheck className='h-4 w-4' />
                  {t("twoFactor.activeMessage")}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Session Settings */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbClock className='h-4 w-4' />
              {t("session.title")}
            </CardTitle>
            <CardDescription>{t("session.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label>{t("session.timeout")}</Label>
              <Select
                value={settings.sessionTimeout.toString()}
                onValueChange={handleSessionTimeoutChange}>
                <SelectTrigger className='mt-2 cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='15'>15 {t("session.minutes")}</SelectItem>
                  <SelectItem value='30'>30 {t("session.minutes")}</SelectItem>
                  <SelectItem value='60'>1 {t("session.hour")}</SelectItem>
                  <SelectItem value='120'>2 {t("session.hours")}</SelectItem>
                  <SelectItem value='480'>8 {t("session.hours")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("session.loginNotifications")}</Label>
                <p className='text-muted-foreground text-xs'>{t("session.loginNotificationsHint")}</p>
              </div>
              <Switch
                checked={settings.loginNotifications}
                onCheckedChange={handleToggle("loginNotifications")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Password & Access */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbLock className='h-4 w-4' />
              {t("password.title")}
            </CardTitle>
            <CardDescription>{t("password.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button
              variant='outline'
              className='w-full cursor-pointer'
              asChild>
              <a
                href='https://accounts.arolariu.ro/user/security'
                target='_blank'
                rel='noopener noreferrer'>
                {t("password.changePassword")}
              </a>
            </Button>
            <p className='text-muted-foreground text-center text-xs'>{t("password.clerkNote")}</p>
          </CardContent>
        </Card>

        {/* Trusted Devices */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbDevices className='h-4 w-4' />
              {t("devices.title")}
            </CardTitle>
            <CardDescription>{t("devices.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {settings.trustedDevices.length > 0 ? (
              <div className='space-y-3'>
                {settings.trustedDevices.map((device) => (
                  <div
                    key={device.id}
                    className='flex items-center justify-between rounded-lg border p-3'>
                    <div>
                      <p className='font-medium'>{device.name}</p>
                      <p className='text-muted-foreground text-xs'>
                        {t("devices.lastUsed")}: {new Date(device.lastUsed).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {device.isCurrent ? (
                        <Badge variant='secondary'>{t("devices.current")}</Badge>
                      ) : (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='cursor-pointer'
                          onClick={handleRemoveDevice(device.id)}
                          aria-label={`Remove device ${device.name}`}>
                          <TbTrash
                            className='h-4 w-4'
                            aria-hidden='true'
                          />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='bg-muted/50 rounded-lg p-4 text-center'>
                <p className='text-muted-foreground text-sm'>{t("devices.empty")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
