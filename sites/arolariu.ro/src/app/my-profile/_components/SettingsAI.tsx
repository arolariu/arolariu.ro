"use client";

import {
  Badge,
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
  Slider,
  Switch,
} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef} from "react";
import {TbBrain, TbMicrophone, TbRobot, TbSettings, TbSparkles, TbTemperature} from "react-icons/tb";
import {AI_BEHAVIOR_PRESETS, AI_MODELS} from "../_utils/constants";
import type {AISettings} from "../_utils/types";
import styles from "./SettingsAI.module.scss";

type Props = Readonly<{
  settings: AISettings;
  onSettingsChange: (settings: Partial<AISettings>) => void;
}>;

export function SettingsAI({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.ai");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

  const handleModelChange = useCallback(
    (value: string) => {
      onSettingsChange({model: value as AISettings["model"]});
    },
    [onSettingsChange],
  );

  const handleBehaviorChange = useCallback(
    (value: string) => {
      onSettingsChange({behaviorPreset: value as AISettings["behaviorPreset"]});
    },
    [onSettingsChange],
  );

  const handleTemperatureChange = useCallback(
    (value: number[]) => {
      onSettingsChange({temperature: value[0]});
    },
    [onSettingsChange],
  );

  const handleMaxTokensChange = useCallback(
    (value: number[]) => {
      onSettingsChange({maxTokens: value[0]});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (key: keyof Pick<AISettings, "autoSuggestEnabled" | "contextAwareness" | "memoryEnabled" | "voiceEnabled">) => (checked: boolean) => {
      onSettingsChange({[key]: checked});
    },
    [onSettingsChange],
  );

  const selectedModel = AI_MODELS.find((m) => m.id === settings.model);

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
        {/* AI Model Selection */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbRobot className='h-4 w-4' />
                {t("model.title")}
              </CardTitle>
              <CardDescription>{t("model.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Select
                value={settings.model}
                onValueChange={handleModelChange}>
                <SelectTrigger className='cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}>
                      <div className={styles["modelItem"]}>
                        <span>{model.name}</span>
                        <Badge
                          variant={model.tier === "premium" ? "default" : "secondary"}
                          className='text-xs'>
                          {model.tier}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel ? (
                <div className={styles["infoBox"]}>
                  <p className={styles["modelName"]}>{selectedModel.name}</p>
                  <p className={styles["modelDescription"]}>{selectedModel.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Behavior Preset */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbSparkles className='h-4 w-4' />
                {t("behavior.title")}
              </CardTitle>
              <CardDescription>{t("behavior.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.behaviorPreset}
                onValueChange={handleBehaviorChange}>
                <SelectTrigger className='cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_BEHAVIOR_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={styles["behaviorHint"]}>{AI_BEHAVIOR_PRESETS.find((p) => p.id === settings.behaviorPreset)?.description}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Temperature Control */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbTemperature className='h-4 w-4' />
                {t("temperature.title")}
              </CardTitle>
              <CardDescription>{t("temperature.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["rangeLabels"]}>
                <span>{t("temperature.precise")}</span>
                <span>{settings.temperature.toFixed(1)}</span>
                <span>{t("temperature.creative")}</span>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={handleTemperatureChange}
                min={0}
                max={1}
                step={0.1}
                className='cursor-pointer'
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Max Tokens */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbSettings className='h-4 w-4' />
                {t("maxTokens.title")}
              </CardTitle>
              <CardDescription>{t("maxTokens.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["rangeLabels"]}>
                <span>512</span>
                <span>{settings.maxTokens}</span>
                <span>4096</span>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={handleMaxTokensChange}
                min={512}
                max={4096}
                step={256}
                className='cursor-pointer'
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbBrain className='h-4 w-4' />
                {t("features.title")}
              </CardTitle>
              <CardDescription>{t("features.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("features.autoSuggest")}</Label>
                  <p>{t("features.autoSuggestHint")}</p>
                </div>
                <Switch
                  checked={settings.autoSuggestEnabled}
                  onCheckedChange={handleToggle("autoSuggestEnabled")}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("features.contextAwareness")}</Label>
                  <p>{t("features.contextAwarenessHint")}</p>
                </div>
                <Switch
                  checked={settings.contextAwareness}
                  onCheckedChange={handleToggle("contextAwareness")}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("features.memory")}</Label>
                  <p>{t("features.memoryHint")}</p>
                </div>
                <Switch
                  checked={settings.memoryEnabled}
                  onCheckedChange={handleToggle("memoryEnabled")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Settings */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.3}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbMicrophone className='h-4 w-4' />
                {t("voice.title")}
              </CardTitle>
              <CardDescription>{t("voice.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("voice.enabled")}</Label>
                  <p>{t("voice.enabledHint")}</p>
                </div>
                <Switch
                  checked={settings.voiceEnabled}
                  onCheckedChange={handleToggle("voiceEnabled")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
