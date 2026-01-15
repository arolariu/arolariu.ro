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
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbBrain, TbMicrophone, TbRobot, TbSettings, TbSparkles, TbTemperature} from "react-icons/tb";
import {AI_BEHAVIOR_PRESETS, AI_MODELS} from "../_utils/constants";
import type {AISettings} from "../_utils/types";

type Props = Readonly<{
  settings: AISettings;
  onSettingsChange: (settings: Partial<AISettings>) => void;
}>;

export function SettingsAI({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.ai");

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
    (key: keyof Pick<AISettings, "autoSuggestEnabled" | "contextAwareness" | "memoryEnabled" | "voiceEnabled">) =>
      (checked: boolean) => {
        onSettingsChange({[key]: checked});
      },
    [onSettingsChange],
  );

  const selectedModel = AI_MODELS.find((m) => m.id === settings.model);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>{t("title")}</h2>
        <p className='text-muted-foreground'>{t("description")}</p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* AI Model Selection */}
        <Card className='md:col-span-2'>
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
                    <div className='flex items-center gap-2'>
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
              <div className='bg-muted/50 rounded-lg p-3'>
                <p className='text-sm font-medium'>{selectedModel.name}</p>
                <p className='text-muted-foreground text-xs'>{selectedModel.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Behavior Preset */}
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
            <p className='text-muted-foreground mt-2 text-xs'>
              {AI_BEHAVIOR_PRESETS.find((p) => p.id === settings.behaviorPreset)?.description}
            </p>
          </CardContent>
        </Card>

        {/* Temperature Control */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbTemperature className='h-4 w-4' />
              {t("temperature.title")}
            </CardTitle>
            <CardDescription>{t("temperature.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>{t("temperature.precise")}</span>
              <span className='font-medium'>{settings.temperature.toFixed(1)}</span>
              <span className='text-muted-foreground text-sm'>{t("temperature.creative")}</span>
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

        {/* Max Tokens */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbSettings className='h-4 w-4' />
              {t("maxTokens.title")}
            </CardTitle>
            <CardDescription>{t("maxTokens.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>512</span>
              <span className='font-medium'>{settings.maxTokens}</span>
              <span className='text-muted-foreground text-sm'>4096</span>
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

        {/* Features Card */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbBrain className='h-4 w-4' />
              {t("features.title")}
            </CardTitle>
            <CardDescription>{t("features.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("features.autoSuggest")}</Label>
                <p className='text-muted-foreground text-xs'>{t("features.autoSuggestHint")}</p>
              </div>
              <Switch
                checked={settings.autoSuggestEnabled}
                onCheckedChange={handleToggle("autoSuggestEnabled")}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("features.contextAwareness")}</Label>
                <p className='text-muted-foreground text-xs'>{t("features.contextAwarenessHint")}</p>
              </div>
              <Switch
                checked={settings.contextAwareness}
                onCheckedChange={handleToggle("contextAwareness")}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("features.memory")}</Label>
                <p className='text-muted-foreground text-xs'>{t("features.memoryHint")}</p>
              </div>
              <Switch
                checked={settings.memoryEnabled}
                onCheckedChange={handleToggle("memoryEnabled")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbMicrophone className='h-4 w-4' />
              {t("voice.title")}
            </CardTitle>
            <CardDescription>{t("voice.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("voice.enabled")}</Label>
                <p className='text-muted-foreground text-xs'>{t("voice.enabledHint")}</p>
              </div>
              <Switch
                checked={settings.voiceEnabled}
                onCheckedChange={handleToggle("voiceEnabled")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
