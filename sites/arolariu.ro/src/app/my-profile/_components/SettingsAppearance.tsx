"use client";

import {useFontContext} from "@/contexts/FontContext";
import {setCookie} from "@/lib/actions/cookies";
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
import {useTheme} from "next-themes";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbBrush, TbCheck, TbGlobe, TbMoon, TbPalette, TbSettings, TbSun, TbTypography} from "react-icons/tb";
import {COLOR_PALETTE} from "../_utils/constants";
import type {AppearanceSettings} from "../_utils/types";

type Props = Readonly<{
  settings: AppearanceSettings;
  onSettingsChange: (settings: Partial<AppearanceSettings>) => void;
}>;

export function SettingsAppearance({settings, onSettingsChange}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.settings.appearance");
  const {theme, setTheme} = useTheme();
  const {fontType, setFont} = useFontContext();

  const handleThemeChange = useCallback(
    (newTheme: "light" | "dark" | "system") => {
      setTheme(newTheme);
      onSettingsChange({theme: newTheme});
    },
    [setTheme, onSettingsChange],
  );

  const handleFontChange = useCallback(
    (newFont: "normal" | "dyslexic") => {
      setFont(newFont);
      onSettingsChange({fontType: newFont});
    },
    [setFont, onSettingsChange],
  );

  const handleColorChange = useCallback(
    (type: "primaryColor" | "secondaryColor") => (event: React.MouseEvent<HTMLButtonElement>) => {
      const {color} = event.currentTarget.dataset;
      if (color) {
        void setCookie(`theme-${type.replace("Color", "-color")}`, color);
        document.documentElement.style.setProperty(`--color-${type.replace("Color", "")}`, color);
        onSettingsChange({[type]: color});
      }
    },
    [onSettingsChange],
  );

  const handleThemeLightClick = useCallback(() => handleThemeChange("light"), [handleThemeChange]);
  const handleThemeDarkClick = useCallback(() => handleThemeChange("dark"), [handleThemeChange]);
  const handleThemeSystemClick = useCallback(() => handleThemeChange("system"), [handleThemeChange]);
  const handleFontNormalClick = useCallback(() => handleFontChange("normal"), [handleFontChange]);
  const handleFontDyslexicClick = useCallback(() => handleFontChange("dyslexic"), [handleFontChange]);

  const handleLocaleChange = useCallback(
    (locale: string) => {
      void setCookie("locale", locale);
      onSettingsChange({locale});
    },
    [onSettingsChange],
  );

  const handleToggle = useCallback(
    (key: "compactMode" | "animationsEnabled") => (checked: boolean) => {
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
        {/* Theme Card */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbBrush className='h-4 w-4' />
              {t("theme.title")}
            </CardTitle>
            <CardDescription>{t("theme.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-2'>
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

        {/* Font Card */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbTypography className='h-4 w-4' />
              {t("font.title")}
            </CardTitle>
            <CardDescription>{t("font.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='flex gap-2'>
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
            <p className='text-muted-foreground text-xs'>{t("font.dyslexicHint")}</p>
          </CardContent>
        </Card>

        {/* Custom Colors Card */}
        <Card className='md:col-span-2'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbPalette className='h-4 w-4' />
              {t("colors.title")}
            </CardTitle>
            <CardDescription>{t("colors.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              {/* Primary Color */}
              <div className='flex items-center justify-between'>
                <Label>{t("colors.primary")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-10 w-28 cursor-pointer gap-2 px-3'>
                      <div
                        className='h-5 w-5 rounded-full border'
                        style={{backgroundColor: settings.primaryColor}}
                      />
                      <span className='text-muted-foreground text-xs'>{settings.primaryColor}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-64'>
                    <div className='grid grid-cols-4 gap-2'>
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
                                  className='h-6 w-6 rounded-full'
                                  style={{backgroundColor: color.value}}
                                />
                                {settings.primaryColor === color.value && (
                                  <TbCheck className='absolute h-4 w-4 text-white' />
                                )}
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
              <div className='flex items-center justify-between'>
                <Label>{t("colors.secondary")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className='h-10 w-28 cursor-pointer gap-2 px-3'>
                      <div
                        className='h-5 w-5 rounded-full border'
                        style={{backgroundColor: settings.secondaryColor}}
                      />
                      <span className='text-muted-foreground text-xs'>{settings.secondaryColor}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-64'>
                    <div className='grid grid-cols-4 gap-2'>
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
                                  className='h-6 w-6 rounded-full'
                                  style={{backgroundColor: color.value}}
                                />
                                {settings.secondaryColor === color.value && (
                                  <TbCheck className='absolute h-4 w-4 text-white' />
                                )}
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
          </CardContent>
        </Card>

        {/* Language Card */}
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

        {/* Advanced Options Card */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <TbSettings className='h-4 w-4' />
              {t("advanced.title")}
            </CardTitle>
            <CardDescription>{t("advanced.description")}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("advanced.compactMode")}</Label>
                <p className='text-muted-foreground text-xs'>{t("advanced.compactModeHint")}</p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={handleToggle("compactMode")}
              />
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <div>
                <Label>{t("advanced.animations")}</Label>
                <p className='text-muted-foreground text-xs'>{t("advanced.animationsHint")}</p>
              </div>
              <Switch
                checked={settings.animationsEnabled}
                onCheckedChange={handleToggle("animationsEnabled")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
