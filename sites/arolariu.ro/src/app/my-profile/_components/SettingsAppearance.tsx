"use client";

import {useFontContext} from "@/contexts/FontContext";
import {setCookie} from "@/lib/actions/cookies";
import {THEME_PRESETS, type ThemePresetName} from "@/lib/theme-presets";
import {usePreferencesStore} from "@/stores/preferencesStore";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";
import {useCallback, useRef} from "react";
import {TbBrush, TbCheck, TbGlobe, TbMoon, TbPalette, TbSettings, TbSun, TbTypography} from "react-icons/tb";
import {COLOR_PALETTE} from "../_utils/constants";
import type {AppearanceSettings} from "../_utils/types";
import styles from "./SettingsAppearance.module.scss";

type Props = Readonly<{
  settings: AppearanceSettings;
  onSettingsChange: (settings: Partial<AppearanceSettings>) => void;
}>;

export function SettingsAppearance({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.appearance");
  const {theme, setTheme} = useTheme();
  const {fontType, setFont} = useFontContext();
  const {
    setPrimaryColor,
    setSecondaryColor,
    setThemePreset,
    setTheme: storeSetTheme,
    setLocale: storeSetLocale,
    setFontType: storeSetFontType,
    setCompactMode: storeSetCompactMode,
    setAnimationsEnabled: storeSetAnimationsEnabled,
  } = usePreferencesStore();
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true});

  const handleThemeChange = useCallback(
    (newTheme: "light" | "dark" | "system") => {
      setTheme(newTheme);
      storeSetTheme(newTheme);
      onSettingsChange({theme: newTheme});
    },
    [setTheme, storeSetTheme, onSettingsChange],
  );

  const handleFontChange = useCallback(
    (newFont: "normal" | "dyslexic") => {
      setFont(newFont);
      storeSetFontType(newFont);
      onSettingsChange({fontType: newFont});
    },
    [setFont, storeSetFontType, onSettingsChange],
  );

  const handleColorChange = useCallback(
    (type: "primaryColor" | "secondaryColor") => (event: React.MouseEvent<HTMLButtonElement>) => {
      const {color} = event.currentTarget.dataset;
      if (color) {
        void setCookie(`theme-${type.replace("Color", "-color")}`, color);
        document.documentElement.style.setProperty(`--color-${type.replace("Color", "")}`, color);
        onSettingsChange({[type]: color});
        setThemePreset("custom");

        if (type === "primaryColor") {
          setPrimaryColor(color);
        } else {
          setSecondaryColor(color);
        }
      }
    },
    [onSettingsChange, setPrimaryColor, setSecondaryColor, setThemePreset],
  );

  const handlePresetChange = useCallback(
    (preset: ThemePresetName | "custom") => {
      setThemePreset(preset);
    },
    [setThemePreset],
  );

  const handleThemeLightClick = useCallback(() => handleThemeChange("light"), [handleThemeChange]);
  const handleThemeDarkClick = useCallback(() => handleThemeChange("dark"), [handleThemeChange]);
  const handleThemeSystemClick = useCallback(() => handleThemeChange("system"), [handleThemeChange]);
  const handleFontNormalClick = useCallback(() => handleFontChange("normal"), [handleFontChange]);
  const handleFontDyslexicClick = useCallback(() => handleFontChange("dyslexic"), [handleFontChange]);

  const handleLocaleChange = useCallback(
    (locale: string) => {
      void setCookie("locale", locale);
      storeSetLocale(locale as "en" | "ro" | "fr");
      onSettingsChange({locale});
    },
    [storeSetLocale, onSettingsChange],
  );

  const handleToggle = useCallback(
    (key: "compactMode" | "animationsEnabled") => (checked: boolean) => {
      if (key === "compactMode") storeSetCompactMode(checked);
      else storeSetAnimationsEnabled(checked);
      onSettingsChange({[key]: checked});
    },
    [storeSetCompactMode, storeSetAnimationsEnabled, onSettingsChange],
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
        {/* Theme Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.05}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbBrush className='h-4 w-4' />
                {t("theme.title")}
              </CardTitle>
              <CardDescription>{t("theme.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["themeButtons"]}>
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size='sm'
                  className='flex-1 cursor-pointer'
                  onClick={handleThemeLightClick}>
                  <TbSun className='mr-1.5 h-4 w-4' />
                  {t("theme.light")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size='sm'
                  className='flex-1 cursor-pointer'
                  onClick={handleThemeDarkClick}>
                  <TbMoon className='mr-1.5 h-4 w-4' />
                  {t("theme.dark")}
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size='sm'
                  className='flex-1 cursor-pointer'
                  onClick={handleThemeSystemClick}>
                  <TbSettings className='mr-1.5 h-4 w-4' />
                  {t("theme.system")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Font Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbTypography className='h-4 w-4' />
                {t("font.title")}
              </CardTitle>
              <CardDescription>{t("font.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className={styles["fontButtons"]}>
                <Button
                  variant={fontType === "normal" ? "default" : "outline"}
                  size='sm'
                  className='flex-1 cursor-pointer'
                  onClick={handleFontNormalClick}>
                  {t("font.normal")}
                </Button>
                <Button
                  variant={fontType === "dyslexic" ? "default" : "outline"}
                  size='sm'
                  className='flex-1 cursor-pointer'
                  onClick={handleFontDyslexicClick}>
                  {t("font.dyslexic")}
                </Button>
              </div>
              <p className={styles["fontHint"]}>{t("font.dyslexicHint")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Presets Card */}
        <motion.div
          className={styles["fullWidthCard"]}
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.15}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbPalette className='h-4 w-4' />
                {t("presets.title")}
              </CardTitle>
              <CardDescription>{t("presets.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["presetGrid"]}>
                {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type='button'
                    className={styles["presetCard"]}
                    data-selected={themePreset === key}
                    onClick={() => handlePresetChange(key as ThemePresetName)}>
                    <div className={styles["presetPreview"]}>
                      {preset.preview.map((color) => (
                        <span
                          key={color}
                          className={styles["presetDot"]}
                          style={{backgroundColor: color}}
                        />
                      ))}
                    </div>
                    <span className={styles["presetName"]}>{preset.name}</span>
                    <span className={styles["presetDescription"]}>{preset.description}</span>
                  </button>
                ))}
                <button
                  type='button'
                  className={styles["customPresetCard"]}
                  data-selected={themePreset === "custom"}
                  onClick={() => handlePresetChange("custom")}>
                  <TbBrush className='h-5 w-5' />
                  <span className={styles["presetName"]}>{t("presets.custom")}</span>
                  <span className={styles["presetDescription"]}>{t("presets.customDescription")}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Custom Colors Card — only shown when preset is "custom" */}
        {themePreset === "custom" && (
          <motion.div
            className={styles["fullWidthCard"]}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}>
            <Card>
              <CardHeader className='pb-4'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <TbPalette className='h-4 w-4' />
                  {t("colors.title")}
                </CardTitle>
                <CardDescription>{t("colors.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className={styles["colorGrid"]}>
                  {/* Primary Color */}
                  <div className={styles["colorRow"]}>
                    <Label>{t("colors.primary")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className='h-10 w-28 cursor-pointer gap-2 px-3'>
                          <div
                            className={styles["colorSwatch"]}
                            style={{backgroundColor: settings.primaryColor}}
                          />
                          <span className={styles["colorLabel"]}>{settings.primaryColor}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-64'>
                        <div className={styles["paletteGrid"]}>
                          {COLOR_PALETTE.map((color) => (
                            <TooltipProvider key={color.value}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={settings.primaryColor === color.value ? "default" : "outline"}
                                    size='icon'
                                    className='h-10 w-10 cursor-pointer rounded-full p-0'
                                    data-color={color.value}
                                    onClick={handleColorChange("primaryColor")}>
                                    <div
                                      className={styles["colorSwatchLarge"]}
                                      style={{backgroundColor: color.value}}
                                    />
                                    {settings.primaryColor === color.value && <TbCheck className='absolute h-4 w-4 text-white' />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{color.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Secondary Color */}
                  <div className={styles["colorRow"]}>
                    <Label>{t("colors.secondary")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className='h-10 w-28 cursor-pointer gap-2 px-3'>
                          <div
                            className={styles["colorSwatch"]}
                            style={{backgroundColor: settings.secondaryColor}}
                          />
                          <span className={styles["colorLabel"]}>{settings.secondaryColor}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-64'>
                        <div className={styles["paletteGrid"]}>
                          {COLOR_PALETTE.map((color) => (
                            <TooltipProvider key={color.value}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={settings.secondaryColor === color.value ? "default" : "outline"}
                                    size='icon'
                                    className='h-10 w-10 cursor-pointer rounded-full p-0'
                                    data-color={color.value}
                                    onClick={handleColorChange("secondaryColor")}>
                                    <div
                                      className={styles["colorSwatchLarge"]}
                                      style={{backgroundColor: color.value}}
                                    />
                                    {settings.secondaryColor === color.value && <TbCheck className='absolute h-4 w-4 text-white' />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{color.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Gradient Preview */}
                <Separator />
                <div className={styles["gradientPreview"]}>
                  <Label>{t("colors.preview")}</Label>
                  <div
                    className={styles["gradientBar"]}
                    style={{
                      background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    }}
                  />
                  <p
                    className={styles["gradientText"]}
                    style={{
                      backgroundImage: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    }}>
                    {t("colors.previewText")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Language Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.2}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbGlobe className='h-4 w-4' />
                {t("locale.title")}
              </CardTitle>
              <CardDescription>{t("locale.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.locale}
                onValueChange={handleLocaleChange}>
                <SelectTrigger className='cursor-pointer'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='en'>English (EN)</SelectItem>
                  <SelectItem value='ro'>Romana (RO)</SelectItem>
                  <SelectItem value='fr'>Francais (FR)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Options Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card>
            <CardHeader className='pb-4'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbSettings className='h-4 w-4' />
                {t("advanced.title")}
              </CardTitle>
              <CardDescription>{t("advanced.description")}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("advanced.compactMode")}</Label>
                  <p>{t("advanced.compactModeHint")}</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={handleToggle("compactMode")}
                />
              </div>
              <Separator />
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("advanced.animations")}</Label>
                  <p>{t("advanced.animationsHint")}</p>
                </div>
                <Switch
                  checked={settings.animationsEnabled}
                  onCheckedChange={handleToggle("animationsEnabled")}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.section>
  );
}
