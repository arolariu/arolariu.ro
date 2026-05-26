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
import {useTranslations} from "next-intl-selector";
import {useCallback, useRef} from "react";
import {TbClock, TbDevices, TbKey, TbLock, TbShieldCheck, TbTrash} from "react-icons/tb";
import type {SecuritySettings} from "../_utils/types";
import styles from "./SettingsSecurity.module.scss";

type Props = Readonly<{
  settings: SecuritySettings;
  onSettingsChange: (settings: Partial<SecuritySettings>) => void;
}>;

export function SettingsSecurity({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations();
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
        <h2>{t((m) => m.Profile.settings.security.title)}</h2>
        <p>{t((m) => m.Profile.settings.security.description)}</p>
      </div>

      <div className={styles["grid"]}>
        {/* Two-Factor Authentication */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbKey className={styles["iconSm"]} />
                {t((m) => m.Profile.settings.security.twoFactor.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.Profile.settings.security.twoFactor.description)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.Profile.settings.security.twoFactor.enabled)}</Label>
                  <p>{t((m) => m.Profile.settings.security.twoFactor.enabledHint)}</p>
                </div>
                <Switch
                  nativeButton
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={handleToggle("twoFactorEnabled")}
                />
              </div>
              {settings.twoFactorEnabled ? (
                <div className={styles["twoFactorActive"]}>
                  <p>
                    <TbShieldCheck />
                    {t((m) => m.Profile.settings.security.twoFactor.activeMessage)}
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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbClock className={styles["iconSm"]} />
                {t((m) => m.Profile.settings.security.session.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.Profile.settings.security.session.description)}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div>
                <Label>{t((m) => m.Profile.settings.security.session.timeout)}</Label>
                <Select
                  value={settings.sessionTimeout.toString()}
                  onValueChange={handleSessionTimeoutChange}>
                  <SelectTrigger className={styles["selectCursorMt"]}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='15'>15 {t((m) => m.Profile.settings.security.session.minutes)}</SelectItem>
                    <SelectItem value='30'>30 {t((m) => m.Profile.settings.security.session.minutes)}</SelectItem>
                    <SelectItem value='60'>1 {t((m) => m.Profile.settings.security.session.hour)}</SelectItem>
                    <SelectItem value='120'>2 {t((m) => m.Profile.settings.security.session.hours)}</SelectItem>
                    <SelectItem value='480'>8 {t((m) => m.Profile.settings.security.session.hours)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t((m) => m.Profile.settings.security.session.loginNotifications)}</Label>
                  <p>{t((m) => m.Profile.settings.security.session.loginNotificationsHint)}</p>
                </div>
                <Switch
                  nativeButton
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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbLock className={styles["iconSm"]} />
                {t((m) => m.Profile.settings.security.password.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.Profile.settings.security.password.description)}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <Button
                variant='outline'
                className={styles["buttonFullCursor"]}
                asChild>
                <a
                  href='https://accounts.arolariu.ro/user/security'
                  target='_blank'
                  rel='noopener noreferrer'>
                  {t((m) => m.Profile.settings.security.password.changePassword)}
                </a>
              </Button>
              <p className={styles["clerkNote"]}>{t((m) => m.Profile.settings.security.password.clerkNote)}</p>
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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbDevices className={styles["iconSm"]} />
                {t((m) => m.Profile.settings.security.devices.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.Profile.settings.security.devices.description)}</CardDescription>
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
                          {t((m) => m.Profile.settings.security.devices.lastUsed)}: {new Date(device.lastUsed).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles["deviceActions"]}>
                        {device.isCurrent ? (
                          <Badge variant='secondary'>{t((m) => m.Profile.settings.security.devices.current)}</Badge>
                        ) : (
                          <Button
                            variant='ghost'
                            size='icon'
                            className={styles["selectCursor"]}
                            onClick={handleRemoveDevice(device.id)}
                            aria-label={`Remove device ${device.name}`}>
                            <TbTrash
                              className={styles["iconSm"]}
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
                  <p>{t((m) => m.Profile.settings.security.devices.empty)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
