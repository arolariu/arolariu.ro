"use client";

import {useFontContext} from "@/contexts/FontContext";
import {getCookie, setCookie} from "@/lib/actions/cookies";
import type {User} from "@clerk/nextjs/server";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {useTheme} from "next-themes";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
  TbBrush,
  TbChartBar,
  TbCheck,
  TbDatabase,
  TbDownload,
  TbExternalLink,
  TbGlobe,
  TbMail,
  TbMoon,
  TbPalette,
  TbSettings,
  TbShieldCheck,
  TbSun,
  TbTrash,
  TbTypography,
  TbUser,
} from "react-icons/tb";

type Props = Readonly<{
  user: User;
  userIdentifier: string;
}>;

/**
 * Extracts user initials from first and last name.
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Uppercase initials or "U" if both are empty
 */
function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return (first + last).toUpperCase() || "U";
}

type SaveButtonContentProps = Readonly<{
  status: "idle" | "saving" | "saved";
  t: ReturnType<typeof useTranslations<"Profile">>;
}>;

/**
 * Renders the save button content based on save status.
 */
function SaveButtonContent({status, t}: SaveButtonContentProps): React.JSX.Element {
  if (status === "saving") {
    return (
      <>
        <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
        {t("actions.saving")}
      </>
    );
  }

  if (status === "saved") {
    return (
      <>
        <TbCheck className='mr-2 h-4 w-4' />
        {t("actions.saved")}
      </>
    );
  }

  return <>{t("actions.save")}</>;
}

/**
 * Profile screen component for managing user settings and preferences.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive).
 *
 * **Features**:
 * - Theme management (light/dark/system)
 * - Custom color selection (primary/secondary)
 * - Font accessibility (normal/dyslexic)
 * - Language/locale selection
 * - Account information display
 * - User statistics (mocked)
 * - Data management (export/delete)
 * - Notification preferences
 *
 * @param props - Component props
 * @param props.user - Clerk user object with profile data
 * @param props.userIdentifier - Unique user identifier (UUID v5)
 * @returns Client-rendered profile management interface
 */
export default function RenderProfileScreen({user, userIdentifier}: Props): React.JSX.Element {
  const t = useTranslations("Profile");
  const {theme, setTheme} = useTheme();
  const {fontType, setFont} = useFontContext();

  const [locale, setLocale] = useState<string>("en");
  const [primaryColor, setPrimaryColor] = useState<string>("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [marketingEmails, setMarketingEmails] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Memoize date-dependent values to avoid calling Date.now() during render
  const memberSinceDate = useMemo(() => {
    const timestamp = user.createdAt ?? 0;
    return new Date(timestamp).toLocaleDateString();
  }, [user.createdAt]);

  const accountCreatedDate = useMemo(() => {
    const timestamp = user.createdAt ?? 0;
    return new Date(timestamp).toLocaleDateString();
  }, [user.createdAt]);

  const lastSignInDate = useMemo(() => {
    if (!user.lastSignInAt) return "N/A";
    return new Date(user.lastSignInAt).toLocaleDateString();
  }, [user.lastSignInAt]);

  // Mock statistics data - computed once using lazy initialization
  // eslint-disable-next-line react-hooks/purity, react/hook-use-state -- Date.now() is safe here for mock statistics initialization
  const [statistics] = useState(() => {
    const now = Date.now();
    const createdAt = user.createdAt ?? now;
    const accountAgeDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    return {
      totalInvoices: 42,
      totalMerchants: 15,
      totalScans: 87,
      accountAge: accountAgeDays,
      storageUsed: "12.5",
      lastActive: new Date(now).toLocaleDateString(),
    };
  });

  // Load user preferences from cookies
  useEffect(() => {
    const loadPreferences = async () => {
      const savedLocale = await getCookie("locale");
      if (savedLocale) setLocale(savedLocale);

      const savedPrimary = await getCookie("theme-primary-color");
      if (savedPrimary) setPrimaryColor(savedPrimary);

      const savedSecondary = await getCookie("theme-secondary-color");
      if (savedSecondary) setSecondaryColor(savedSecondary);
    };
    loadPreferences();
  }, []);

  const handleLocaleChange = useCallback((newLocale: string) => {
    setLocale(newLocale);
    void setCookie("locale", newLocale);
  }, []);

  const handlePrimaryColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setPrimaryColor(color);
    void setCookie("theme-primary-color", color);
    document.documentElement.style.setProperty("--color-primary", color);
  }, []);

  const handleSecondaryColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setSecondaryColor(color);
    void setCookie("theme-secondary-color", color);
    document.documentElement.style.setProperty("--color-secondary", color);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSaveStatus("saving");
    // Simulate save delay
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  const handleExportData = useCallback(() => {
    // Mock export - in real implementation, this would call an API
    const userData = {
      userIdentifier,
      email: user.primaryEmailAddress?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      preferences: {
        theme,
        locale,
        fontType,
        primaryColor,
        secondaryColor,
      },
    };

    const blob = new Blob([JSON.stringify(userData, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profile-export-${userIdentifier}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [userIdentifier, user, theme, locale, fontType, primaryColor, secondaryColor]);

  const handleDeleteAccount = useCallback(() => {
    // This would open a confirmation dialog and call an API
    // For now, just log the action
    console.warn("Account deletion requested for:", userIdentifier);
  }, [userIdentifier]);

  // Theme handlers
  const handleSetThemeLight = useCallback(() => setTheme("light"), [setTheme]);
  const handleSetThemeDark = useCallback(() => setTheme("dark"), [setTheme]);
  const handleSetThemeSystem = useCallback(() => setTheme("system"), [setTheme]);

  // Font handlers
  const handleSetFontNormal = useCallback(() => setFont("normal"), [setFont]);
  const handleSetFontDyslexic = useCallback(() => setFont("dyslexic"), [setFont]);

  return (
    <div className='animate-in fade-in container mx-auto px-4 py-8 duration-500 sm:py-12'>
      {/* Header Section */}
      <div className='animate-in slide-in-from-bottom-4 mb-8 duration-500'>
        <div className='flex flex-col items-center gap-6 sm:flex-row sm:items-start'>
          <Avatar className='h-24 w-24 border-4 border-primary'>
            <AvatarImage
              src={user.imageUrl}
              alt={`${user.firstName ?? "User"}'s avatar`}
            />
            <AvatarFallback className='text-2xl'>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-center sm:text-left'>
            <h1 className='text-3xl font-bold'>
              {user.firstName ?? ""} {user.lastName ?? ""}
            </h1>
            <p className='text-muted-foreground mt-1'>{t("header.subtitle")}</p>
            <div className='mt-2 flex flex-wrap justify-center gap-2 sm:justify-start'>
              <Badge variant='secondary'>
                <TbUser className='mr-1 h-3 w-3' />
                {t("header.memberSince", {date: memberSinceDate})}
              </Badge>
              <Badge variant='outline'>
                <TbShieldCheck className='mr-1 h-3 w-3' />
                {t("header.userId")}: {userIdentifier.slice(0, 8)}...
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Separator className='my-8' />

      {/* Main Content with Tabs */}
      <Tabs
        defaultValue='appearance'
        className='space-y-6'>
        <TabsList className='grid w-full grid-cols-2 gap-2 md:grid-cols-4'>
          <TabsTrigger
            value='appearance'
            className='flex items-center gap-2'>
            <TbPalette className='h-4 w-4' />
            <span className='hidden sm:inline'>{t("appearance.title")}</span>
          </TabsTrigger>
          <TabsTrigger
            value='account'
            className='flex items-center gap-2'>
            <TbUser className='h-4 w-4' />
            <span className='hidden sm:inline'>{t("account.title")}</span>
          </TabsTrigger>
          <TabsTrigger
            value='statistics'
            className='flex items-center gap-2'>
            <TbChartBar className='h-4 w-4' />
            <span className='hidden sm:inline'>{t("statistics.title")}</span>
          </TabsTrigger>
          <TabsTrigger
            value='data'
            className='flex items-center gap-2'>
            <TbDatabase className='h-4 w-4' />
            <span className='hidden sm:inline'>{t("dataManagement.title")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent
          value='appearance'
          className='space-y-6'>
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Theme Card */}
            <Card className='animate-in slide-in-from-left-4 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbBrush className='h-5 w-5' />
                  {t("appearance.theme.title")}
                </CardTitle>
                <CardDescription>{t("appearance.theme.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex gap-2'>
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className='flex-1 cursor-pointer'
                    onClick={handleSetThemeLight}>
                    <TbSun className='mr-2 h-4 w-4' />
                    {t("appearance.theme.light")}
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className='flex-1 cursor-pointer'
                    onClick={handleSetThemeDark}>
                    <TbMoon className='mr-2 h-4 w-4' />
                    {t("appearance.theme.dark")}
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className='flex-1 cursor-pointer'
                    onClick={handleSetThemeSystem}>
                    <TbSettings className='mr-2 h-4 w-4' />
                    {t("appearance.theme.system")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Colors Card */}
            <Card className='animate-in slide-in-from-right-4 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbPalette className='h-5 w-5' />
                  {t("appearance.customColors.title")}
                </CardTitle>
                <CardDescription>{t("appearance.customColors.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='primary-color'>{t("appearance.customColors.primary")}</Label>
                  <div className='flex items-center gap-2'>
                    <input
                      type='color'
                      id='primary-color'
                      value={primaryColor}
                      onChange={handlePrimaryColorChange}
                      className='h-10 w-16 cursor-pointer rounded border-0'
                    />
                    <span className='text-muted-foreground text-sm'>{primaryColor}</span>
                  </div>
                </div>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='secondary-color'>{t("appearance.customColors.secondary")}</Label>
                  <div className='flex items-center gap-2'>
                    <input
                      type='color'
                      id='secondary-color'
                      value={secondaryColor}
                      onChange={handleSecondaryColorChange}
                      className='h-10 w-16 cursor-pointer rounded border-0'
                    />
                    <span className='text-muted-foreground text-sm'>{secondaryColor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Font Card */}
            <Card className='animate-in slide-in-from-left-4 delay-100 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbTypography className='h-5 w-5' />
                  {t("appearance.font.title")}
                </CardTitle>
                <CardDescription>{t("appearance.font.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex gap-2'>
                  <Button
                    variant={fontType === "normal" ? "default" : "outline"}
                    className='flex-1 cursor-pointer'
                    onClick={handleSetFontNormal}>
                    {t("appearance.font.normal")}
                  </Button>
                  <Button
                    variant={fontType === "dyslexic" ? "default" : "outline"}
                    className='flex-1 cursor-pointer'
                    onClick={handleSetFontDyslexic}>
                    {t("appearance.font.dyslexic")}
                  </Button>
                </div>
                <p className='text-muted-foreground text-xs'>{t("appearance.font.dyslexicDescription")}</p>
              </CardContent>
            </Card>

            {/* Locale Card */}
            <Card className='animate-in slide-in-from-right-4 delay-100 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbGlobe className='h-5 w-5' />
                  {t("locale.title")}
                </CardTitle>
                <CardDescription>{t("locale.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={locale}
                  onValueChange={handleLocaleChange}>
                  <SelectTrigger className='w-full cursor-pointer'>
                    <SelectValue placeholder={t("locale.language.title")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='en'>
                      <span className='flex items-center gap-2'>English (EN)</span>
                    </SelectItem>
                    <SelectItem value='ro'>
                      <span className='flex items-center gap-2'>Romana (RO)</span>
                    </SelectItem>
                    <SelectItem value='fr'>
                      <span className='flex items-center gap-2'>Francais (FR)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent
          value='account'
          className='space-y-6'>
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Account Info Card */}
            <Card className='animate-in slide-in-from-left-4 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbUser className='h-5 w-5' />
                  {t("account.title")}
                </CardTitle>
                <CardDescription>{t("account.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label>{t("account.email")}</Label>
                  <div className='bg-muted flex items-center gap-2 rounded-md p-3'>
                    <TbMail className='text-muted-foreground h-4 w-4' />
                    <span>{user.primaryEmailAddress?.emailAddress ?? "N/A"}</span>
                    {user.primaryEmailAddress?.verification?.status === "verified" && (
                      <Badge
                        variant='secondary'
                        className='ml-auto'>
                        <TbCheck className='mr-1 h-3 w-3' />
                        {t("account.emailVerified")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>{t("account.createdAt")}</Label>
                    <p className='text-muted-foreground text-sm'>{accountCreatedDate}</p>
                  </div>
                  <div className='space-y-2'>
                    <Label>{t("account.lastSignIn")}</Label>
                    <p className='text-muted-foreground text-sm'>{lastSignInDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Card */}
            <Card className='animate-in slide-in-from-right-4 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbMail className='h-5 w-5' />
                  {t("notifications.title")}
                </CardTitle>
                <CardDescription>{t("notifications.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>{t("notifications.email.title")}</Label>
                    <p className='text-muted-foreground text-xs'>{t("notifications.email.description")}</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <Separator />
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>{t("notifications.marketing.title")}</Label>
                    <p className='text-muted-foreground text-xs'>{t("notifications.marketing.description")}</p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Manage Account Card */}
            <Card className='animate-in slide-in-from-bottom-4 delay-100 duration-500 md:col-span-2'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbSettings className='h-5 w-5' />
                  {t("account.manageAccount")}
                </CardTitle>
                <CardDescription>{t("account.manageAccountDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant='outline'
                  className='cursor-pointer'
                  asChild>
                  <a
                    href='https://accounts.arolariu.ro/user'
                    target='_blank'
                    rel='noopener noreferrer'>
                    <TbExternalLink className='mr-2 h-4 w-4' />
                    {t("account.manageAccount")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent
          value='statistics'
          className='space-y-6'>
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            <Card className='animate-in slide-in-from-bottom-4 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>{statistics.totalInvoices}</CardTitle>
                <CardDescription>{t("statistics.totalInvoices")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className='animate-in slide-in-from-bottom-4 delay-75 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>{statistics.totalMerchants}</CardTitle>
                <CardDescription>{t("statistics.totalMerchants")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className='animate-in slide-in-from-bottom-4 delay-100 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>{statistics.totalScans}</CardTitle>
                <CardDescription>{t("statistics.totalScans")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className='animate-in slide-in-from-bottom-4 delay-150 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>
                  {t("statistics.accountAgeDays", {days: String(statistics.accountAge)})}
                </CardTitle>
                <CardDescription>{t("statistics.accountAge")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className='animate-in slide-in-from-bottom-4 delay-200 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>{statistics.storageUsed} MB</CardTitle>
                <CardDescription>{t("statistics.storageUsed")}</CardDescription>
              </CardHeader>
            </Card>
            <Card className='animate-in slide-in-from-bottom-4 delay-250 duration-500'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-2xl font-bold'>{statistics.lastActive}</CardTitle>
                <CardDescription>{t("statistics.lastActivity")}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent
          value='data'
          className='space-y-6'>
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Export Data Card */}
            <Card className='animate-in slide-in-from-left-4 duration-500'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <TbDownload className='h-5 w-5' />
                  {t("dataManagement.export.title")}
                </CardTitle>
                <CardDescription>{t("dataManagement.export.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant='outline'
                  className='w-full cursor-pointer'
                  onClick={handleExportData}>
                  <TbDownload className='mr-2 h-4 w-4' />
                  {t("dataManagement.export.button")}
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account Card */}
            <Card className='animate-in slide-in-from-right-4 border-destructive/50 duration-500'>
              <CardHeader>
                <CardTitle className='text-destructive flex items-center gap-2'>
                  <TbTrash className='h-5 w-5' />
                  {t("dataManagement.delete.title")}
                </CardTitle>
                <CardDescription>{t("dataManagement.delete.description")}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-muted-foreground text-sm'>{t("dataManagement.delete.warning")}</p>
                <Button
                  variant='destructive'
                  className='w-full cursor-pointer'
                  onClick={handleDeleteAccount}>
                  <TbTrash className='mr-2 h-4 w-4' />
                  {t("dataManagement.delete.button")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className='mt-8 flex justify-end'>
        <Button
          className='cursor-pointer'
          onClick={handleSaveSettings}
          disabled={saveStatus === "saving"}>
          <SaveButtonContent
            status={saveStatus}
            t={t}
          />
        </Button>
      </div>
    </div>
  );
}
