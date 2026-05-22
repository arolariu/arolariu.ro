"use client";

import {useFontContext} from "@/contexts/FontContext";
import {setCookie} from "@/lib/actions/cookies";
import {THEME_PRESETS, type CustomThemeColors, type ThemePresetName} from "@/lib/theme-presets";
import {usePreferencesStore} from "@/stores/preferencesStore";
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Separator, Switch} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";
import {useCallback, useRef} from "react";
import {TbBrush, TbCheck, TbGlobe, TbMoon, TbPalette, TbSettings, TbSun, TbTypography} from "react-icons/tb";
import type {AppearanceSettings} from "../_utils/types";
import styles from "./SettingsAppearance.module.scss";

/**
 * Default intermediary color (Tailwind blue-900) used as the middle stop
 * of the custom gradient when the user has not picked their own.
 */
const DEFAULT_INTERMEDIARY_COLOR = "#1e3a8a";

/**
 * Converts a `#rrggbb` hex color to a space-separated HSL string
 * (e.g., `"187 94% 43%"`) suitable for Tailwind/CSS variable consumption.
 */
function hexToHslString(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = Number.parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleaned.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Builds the `CustomThemeColors` payload from user-chosen primary,
 * intermediary (via), and secondary hex colors.
 */
function buildCustomThemeColors(primaryHex: string, viaHex: string, secondaryHex: string): CustomThemeColors {
  const primaryHsl = hexToHslString(primaryHex);
  const secondaryHsl = hexToHslString(secondaryHex);
  const viaHsl = hexToHslString(viaHex);
  return {
    gradientFrom: primaryHsl,
    gradientVia: viaHsl,
    gradientTo: secondaryHsl,
    primary: primaryHsl,
    primaryForeground: "0 0% 100%",
    footerBg: primaryHsl,
  };
}

type Props = Readonly<{
  settings: AppearanceSettings;
  onSettingsChange: (settings: Partial<AppearanceSettings>) => void;
}>;

export function SettingsAppearance({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("Profile.settings.appearance");
  const {theme, setTheme} = useTheme();
  const {fontType, setFont} = useFontContext();
  const {
    setPrimaryColor,
    setSecondaryColor,
    setTertiaryColor,
    setThemePreset,
    setCustomThemeColors,
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
    (type: "primaryColor" | "secondaryColor" | "tertiaryColor", color: string) => {
      const cookieKeyMap = {primaryColor: "primary", secondaryColor: "secondary", tertiaryColor: "tertiary"} as const;
      void setCookie(`theme-${cookieKeyMap[type]}-color`, color);
      const currentVia = settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR;
      const newPrimary = type === "primaryColor" ? color : settings.primaryColor;
      const newSecondary = type === "secondaryColor" ? color : settings.secondaryColor;
      const newVia = type === "tertiaryColor" ? color : currentVia;
      if (type === "primaryColor") {
        setPrimaryColor(color);
      } else if (type === "secondaryColor") {
        setSecondaryColor(color);
      } else {
        setTertiaryColor(color);
      }
      setCustomThemeColors(buildCustomThemeColors(newPrimary, newVia, newSecondary));
      setThemePreset("custom");
      onSettingsChange({[type]: color});
    },
    [
      onSettingsChange,
      setPrimaryColor,
      setSecondaryColor,
      setTertiaryColor,
      setThemePreset,
      setCustomThemeColors,
      settings.primaryColor,
      settings.secondaryColor,
      settings.tertiaryColor,
    ],
  );

  const handlePrimaryColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleColorChange("primaryColor", e.target.value),
    [handleColorChange],
  );

  const handleSecondaryColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleColorChange("secondaryColor", e.target.value),
    [handleColorChange],
  );

  const handleTertiaryColorInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleColorChange("tertiaryColor", e.target.value),
    [handleColorChange],
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
      storeSetLocale(locale as "en" | "ro" | "fr");
      onSettingsChange({locale});
    },
    [storeSetLocale, onSettingsChange],
  );

  const handleLocaleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const {locale} = e.currentTarget.dataset;
      if (locale) handleLocaleChange(locale);
    },
    [handleLocaleChange],
  );

  const localeOptions = [
    {value: "en", label: "English", code: "EN"},
    {value: "ro", label: "Română", code: "RO"},
    {value: "fr", label: "Français", code: "FR"},
  ] as const;

  const handlePresetClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const preset = e.currentTarget.dataset["preset"] as ThemePresetName | "custom";
      if (preset) handlePresetChange(preset);
    },
    [handlePresetChange],
  );

  const handleCustomPresetClick = useCallback(() => handlePresetChange("custom"), [handlePresetChange]);

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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbBrush className={styles["iconSm"]} />
                {t("theme.title")}
              </CardTitle>
              <CardDescription>{t("theme.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced3"]}>
              <div className={styles["themeButtons"]}>
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size='sm'
                  className={styles["flex1Cursor"]}
                  onClick={handleThemeLightClick}>
                  <TbSun className={styles["buttonIconSm"]} />
                  {t("theme.light")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size='sm'
                  className={styles["flex1Cursor"]}
                  onClick={handleThemeDarkClick}>
                  <TbMoon className={styles["buttonIconSm"]} />
                  {t("theme.dark")}
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size='sm'
                  className={styles["flex1Cursor"]}
                  onClick={handleThemeSystemClick}>
                  <TbSettings className={styles["buttonIconSm"]} />
                  {t("theme.system")}
                </Button>
              </div>
              <p className={styles["cardHint"]}>{t("theme.hint")}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Font Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.1}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbTypography className={styles["iconSm"]} />
                {t("font.title")}
              </CardTitle>
              <CardDescription>{t("font.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced3"]}>
              <div className={styles["fontButtons"]}>
                <Button
                  variant={fontType === "normal" ? "default" : "outline"}
                  size='sm'
                  className={styles["flex1Cursor"]}
                  onClick={handleFontNormalClick}>
                  {t("font.normal")}
                </Button>
                <Button
                  variant={fontType === "dyslexic" ? "default" : "outline"}
                  size='sm'
                  className={styles["flex1Cursor"]}
                  onClick={handleFontDyslexicClick}>
                  {t("font.dyslexic")}
                </Button>
              </div>
              <p className={styles["cardHint"]}>{t("font.dyslexicHint")}</p>
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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbPalette className={styles["iconSm"]} />
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
                    data-preset={key}
                    onClick={handlePresetClick}>
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
                  onClick={handleCustomPresetClick}>
                  <TbBrush className={styles["iconMd"]} />
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
              <CardHeader className={styles["cardHeaderPb"]}>
                <CardTitle className={styles["cardTitleBase"]}>
                  <TbPalette className={styles["iconSm"]} />
                  {t("colors.title")}
                </CardTitle>
                <CardDescription>{t("colors.description")}</CardDescription>
              </CardHeader>
              <CardContent className={styles["cardContentSpaced"]}>
                <div className={styles["colorGrid"]}>
                  {/* Primary Color — full color picker */}
                  <div className={styles["customColorField"]}>
                    <Label htmlFor='custom-primary-color'>{t("colors.primary")}</Label>
                    <label
                      className={styles["customColorSwatch"]}
                      style={{backgroundColor: settings.primaryColor}}
                      htmlFor='custom-primary-color'>
                      <input
                        id='custom-primary-color'
                        type='color'
                        className={styles["customColorInput"]}
                        value={settings.primaryColor}
                        onChange={handlePrimaryColorInput}
                      />
                      <span className={styles["customColorHex"]}>{settings.primaryColor}</span>
                    </label>
                  </div>

                  {/* Intermediary Color — full color picker */}
                  <div className={styles["customColorField"]}>
                    <Label htmlFor='custom-tertiary-color'>{t("colors.intermediary")}</Label>
                    <label
                      className={styles["customColorSwatch"]}
                      style={{backgroundColor: settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR}}
                      htmlFor='custom-tertiary-color'>
                      <input
                        id='custom-tertiary-color'
                        type='color'
                        className={styles["customColorInput"]}
                        value={settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR}
                        onChange={handleTertiaryColorInput}
                      />
                      <span className={styles["customColorHex"]}>{settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR}</span>
                    </label>
                  </div>

                  {/* Secondary Color — full color picker */}
                  <div className={styles["customColorField"]}>
                    <Label htmlFor='custom-secondary-color'>{t("colors.secondary")}</Label>
                    <label
                      className={styles["customColorSwatch"]}
                      style={{backgroundColor: settings.secondaryColor}}
                      htmlFor='custom-secondary-color'>
                      <input
                        id='custom-secondary-color'
                        type='color'
                        className={styles["customColorInput"]}
                        value={settings.secondaryColor}
                        onChange={handleSecondaryColorInput}
                      />
                      <span className={styles["customColorHex"]}>{settings.secondaryColor}</span>
                    </label>
                  </div>
                </div>

                {/* Gradient Preview — primary → intermediary → secondary */}
                <Separator />
                <div className={styles["gradientPreview"]}>
                  <Label>{t("colors.preview")}</Label>
                  <div
                    className={styles["gradientBar"]}
                    style={{
                      background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR}, ${settings.secondaryColor})`,
                    }}
                  />
                  <p
                    className={styles["gradientText"]}
                    style={{
                      backgroundImage: `linear-gradient(to right, ${settings.primaryColor}, ${settings.tertiaryColor || DEFAULT_INTERMEDIARY_COLOR}, ${settings.secondaryColor})`,
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
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbGlobe className={styles["iconSm"]} />
                {t("locale.title")}
              </CardTitle>
              <CardDescription>{t("locale.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles["localeList"]}>
                {localeOptions.map((option) => {
                  const isSelected = settings.locale === option.value;
                  return (
                    <button
                      key={option.value}
                      type='button'
                      data-selected={isSelected}
                      data-locale={option.value}
                      className={styles["localeRow"]}
                      onClick={handleLocaleClick}>
                      <span className={styles["localeCode"]}>{option.code}</span>
                      <span className={styles["localeLabel"]}>{option.label}</span>
                      {isSelected && <TbCheck className={styles["localeCheck"]} />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Options Card */}
        <motion.div
          initial={{opacity: 0, y: 10}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 10}}
          transition={{duration: 0.3, delay: 0.25}}>
          <Card>
            <CardHeader className={styles["cardHeaderPb"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbSettings className={styles["iconSm"]} />
                {t("advanced.title")}
              </CardTitle>
              <CardDescription>{t("advanced.description")}</CardDescription>
            </CardHeader>
            <CardContent className={styles["cardContentSpaced"]}>
              <div className={styles["toggleRow"]}>
                <div className={styles["toggleLabel"]}>
                  <Label>{t("advanced.compactMode")}</Label>
                  <p>{t("advanced.compactModeHint")}</p>
                </div>
                <Switch
                  nativeButton
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
                  nativeButton
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
