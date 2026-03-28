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
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef} from "react";
import {TbAlertTriangle, TbCloud, TbDatabase, TbDownload, TbShieldCheck, TbTrash} from "react-icons/tb";
import {DATA_RETENTION_OPTIONS, REPORT_FREQUENCIES} from "../_utils/constants";
import type {DataSettings} from "../_utils/types";
import styles from "./SettingsData.module.scss";

type Props = Readonly<{
  settings: DataSettings;
  onSettingsChange: (settings: Partial<DataSettings>) => void;
}>;

export function SettingsData({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("Profile.settings.data");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

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
        {/* Data Retention */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbDatabase className={styles["iconSm"]} />
                {t("retention.title")}
              </CardTitle>
              <CardDescription>{t("retention.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.retention}
                onValueChange={handleRetentionChange}>
                <SelectTrigger className={styles["selectCursor"]}>
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
              <p className={styles["retentionHint"]}>{t("retention.hint")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Auto Backup */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbCloud className={styles["iconSm"]} />
                {t("backup.title")}
              </CardTitle>
              <CardDescription>{t("backup.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("backup.autoBackup")}</Label>
                  <p>{t("backup.autoBackupHint")}</p>
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
                  <SelectTrigger className={styles["selectCursorMt"]}>
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
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbShieldCheck className={styles["iconSm"]} />
                {t("privacy.title")}
              </CardTitle>
              <CardDescription>{t("privacy.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("privacy.shareAnonymous")}</Label>
                  <p>{t("privacy.shareAnonymousHint")}</p>
                </div>
                <Switch
                  checked={settings.shareAnonymousData}
                  onCheckedChange={handleToggle("shareAnonymousData")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Export Data */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbDownload className={styles["iconSm"]} />
                {t("export.title")}
              </CardTitle>
              <CardDescription>{t("export.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced3"]}>
              <Button
                variant='outline'
                className={styles["buttonFullCursor"]}>
                <TbDownload className={styles["buttonIcon"]} />
                {t("export.downloadAll")}
              </Button>
              <p className={styles["exportHint"]}>{t("export.hint")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          className={styles["dangerCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card className={styles["dangerCardBorder"]}>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["dangerTitle"]}>
                <TbAlertTriangle className={styles["iconSm"]} />
                {t("danger.title")}
              </CardTitle>
              <CardDescription>{t("danger.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div className={styles["dangerRow"]}>
                <div className={styles["dangerRowText"]}>
                  <p>{t("danger.deleteData")}</p>
                  <p>{t("danger.deleteDataHint")}</p>
                </div>
                <Button
                  variant='destructive'
                  className={styles["selectCursor"]}>
                  <TbTrash className={styles["buttonIcon"]} />
                  {t("danger.deleteButton")}
                </Button>
              </div>
              <div className={styles["dangerRow"]}>
                <div className={styles["dangerRowText"]}>
                  <p>{t("danger.deleteAccount")}</p>
                  <p>{t("danger.deleteAccountHint")}</p>
                </div>
                <Button
                  variant='outline'
                  className={styles["selectCursor"]}
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
        </motion.div>
      </div>
    </motion.section>
  );
}
