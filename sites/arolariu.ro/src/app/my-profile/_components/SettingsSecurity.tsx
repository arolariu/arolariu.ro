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
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef} from "react";
import {TbClock, TbDevices, TbKey, TbLock, TbShieldCheck, TbTrash} from "react-icons/tb";
import type {SecuritySettings} from "../_utils/types";
import styles from "./SettingsSecurity.module.scss";

type Props = Readonly<{
  settings: SecuritySettings;
  onSettingsChange: (settings: Partial<SecuritySettings>) => void;
}>;

export function SettingsSecurity({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.security");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

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
        {/* Two-Factor Authentication */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbKey className='h-4 w-4' />
                {t("twoFactor.title")}
              </CardTitle>
              <CardDescription>{t("twoFactor.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("twoFactor.enabled")}</Label>
                  <p>{t("twoFactor.enabledHint")}</p>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={handleToggle("twoFactorEnabled")}
                />
              </div>
              {settings.twoFactorEnabled ? (
                <div className={styles["twoFactorActive"]}>
                  <p>
                    <TbShieldCheck />
                    {t("twoFactor.activeMessage")}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Session Settings */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
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
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("session.loginNotifications")}</Label>
                  <p>{t("session.loginNotificationsHint")}</p>
                </div>
                <Switch
                  checked={settings.loginNotifications}
                  onCheckedChange={handleToggle("loginNotifications")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password & Access */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
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
        </motion.div>

        {/* Trusted Devices */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbDevices className='h-4 w-4' />
                {t("devices.title")}
              </CardTitle>
              <CardDescription>{t("devices.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {settings.trustedDevices.length > 0 ? (
                <div className={styles["devicesList"]}>
                  {settings.trustedDevices.map((device) => (
                    <div
                      key={device.id}
                      className={styles["deviceItem"]}>
                      <div className={styles["deviceInfo"]}>
                        <p>{device.name}</p>
                        <p>
                          {t("devices.lastUsed")}: {new Date(device.lastUsed).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles["deviceActions"]}>
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
                <div className={styles["devicesEmpty"]}>
                  <p>{t("devices.empty")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
