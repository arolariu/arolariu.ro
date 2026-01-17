"use client";

import {useFontContext} from "@/contexts/FontContext";
import {useUserInformation} from "@/hooks/useUserInformation";
import {getCookie, setCookie} from "@/lib/actions/cookies";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useTheme} from "next-themes";
import Link from "next/link";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
  TbActivity,
  TbAward,
  TbBrush,
  TbCalendar,
  TbChartBar,
  TbCheck,
  TbChevronRight,
  TbClock,
  TbDatabase,
  TbDeviceAnalytics,
  TbDownload,
  TbExternalLink,
  TbFileInvoice,
  TbGlobe,
  TbKey,
  TbMail,
  TbMoon,
  TbPalette,
  TbReceipt,
  TbSettings,
  TbShield,
  TbShieldCheck,
  TbShoppingCart,
  TbSparkles,
  TbSun,
  TbTrash,
  TbTrendingUp,
  TbTypography,
  TbUpload,
  TbUser,
} from "react-icons/tb";

// Predefined color palette for the color picker
const COLOR_PALETTE = [
  {name: "Blue", value: "#3b82f6"},
  {name: "Purple", value: "#8b5cf6"},
  {name: "Pink", value: "#ec4899"},
  {name: "Red", value: "#ef4444"},
  {name: "Orange", value: "#f97316"},
  {name: "Yellow", value: "#eab308"},
  {name: "Green", value: "#22c55e"},
  {name: "Teal", value: "#14b8a6"},
  {name: "Cyan", value: "#06b6d4"},
  {name: "Indigo", value: "#6366f1"},
  {name: "Slate", value: "#64748b"},
  {name: "Rose", value: "#f43f5e"},
] as const;

// Mock achievements data (reduced for simplicity)
const ACHIEVEMENTS = [
  {id: "first_scan", name: "First Scan", description: "Uploaded your first receipt", icon: TbUpload, earned: true},
  {id: "invoice_master", name: "Invoice Master", description: "Processed 10 invoices", icon: TbFileInvoice, earned: true},
  {id: "merchant_explorer", name: "Merchant Explorer", description: "Discovered 5 merchants", icon: TbShoppingCart, earned: true},
] as const;

// Mock recent activity (reduced for simplicity)
const RECENT_ACTIVITY = [
  {id: 1, type: "scan", title: "Uploaded receipt", description: "Lidl - Groceries", time: "2 hours ago"},
  {id: 2, type: "invoice", title: "Invoice processed", description: "Amazon - Electronics", time: "5 hours ago"},
  {id: 3, type: "settings", title: "Updated theme", description: "Changed to dark mode", time: "1 day ago"},
] as const;

// Module-level constant for mount time (safe since it's computed once per module load)
const PAGE_LOAD_TIME = Date.now();

/**
 * Extracts user initials from first and last name.
 */
function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return (first + last).toUpperCase() || "U";
}

/**
 * Color picker component using Button and Popover.
 */
function ColorPicker({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (color: string) => void;
}>): React.JSX.Element {
  const handleColorSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const colorValue = event.currentTarget.dataset["color"];
      if (colorValue) {
        onChange(colorValue);
      }
    },
    [onChange],
  );

  return (
    <div className='flex items-center justify-between'>
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className='h-10 w-24 cursor-pointer gap-2 px-3'>
            <div
              className='h-5 w-5 rounded-full border'
              style={{backgroundColor: value}}
            />
            <span className='text-muted-foreground text-xs'>{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-64'>
          <div className='grid grid-cols-4 gap-2'>
            {COLOR_PALETTE.map((color) => (
              <TooltipProvider key={color.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={value === color.value ? "default" : "outline"}
                      size='icon'
                      className='h-10 w-10 cursor-pointer rounded-full p-0'
                      data-color={color.value}
                      onClick={handleColorSelect}>
                      <div
                        className='h-6 w-6 rounded-full'
                        style={{backgroundColor: color.value}}
                      />
                      {value === color.value && <TbCheck className='absolute h-4 w-4 text-white' />}
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
  );
}

/**
 * Profile loading skeleton component.
 */
function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-6xl space-y-8'>
      {/* Header skeleton */}
      <div className='flex flex-col items-center gap-6 sm:flex-row'>
        <Skeleton className='h-28 w-28 rounded-full' />
        <div className='flex-1 space-y-4 text-center sm:text-left'>
          <Skeleton className='mx-auto h-8 w-48 sm:mx-0' />
          <Skeleton className='mx-auto h-4 w-32 sm:mx-0' />
          <div className='flex justify-center gap-2 sm:justify-start'>
            <Skeleton className='h-6 w-24' />
            <Skeleton className='h-6 w-32' />
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <Skeleton className='h-64 lg:col-span-2' />
        <Skeleton className='h-64' />
      </div>
    </div>
  );
}

/**
 * Profile error component.
 */
function ProfileError(): React.JSX.Element {
  const t = useTranslations("Profile");

  const handleRetry = useCallback(() => {
    globalThis.location.reload();
  }, []);

  return (
    <div className='container mx-auto max-w-6xl'>
      <Card className='border-destructive'>
        <CardHeader>
          <CardTitle className='text-destructive'>{t("errors.loadFailed")}</CardTitle>
          <CardDescription>{t("errors.loadFailedDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant='outline'
            onClick={handleRetry}>
            {t("actions.retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Profile screen component for managing user settings and preferences.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive).
 *
 * **Data Fetching**: Uses `useUserInformation` hook to fetch user data client-side.
 * This avoids passing complex objects from Server Components.
 *
 * **Features**:
 * - Theme management (light/dark/system)
 * - Custom color selection via color picker popover
 * - Font accessibility (normal/dyslexic)
 * - Language/locale selection
 * - Account information display
 * - User statistics with visual indicators
 * - Achievement badges
 * - Recent activity timeline
 * - Data management (export/delete)
 * - Notification preferences
 *
 * @returns Client-rendered profile management interface
 */
// eslint-disable-next-line complexity -- Profile page has inherent complexity due to multiple tabs, settings, and features
export default function RenderProfileScreen(): React.JSX.Element {
  const t = useTranslations("Profile");
  const {userInformation, isLoading, isError} = useUserInformation();
  const {theme, setTheme} = useTheme();
  const {fontType, setFont} = useFontContext();

  const [locale, setLocale] = useState<string>("en");
  const [primaryColor, setPrimaryColor] = useState<string>("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [marketingEmails, setMarketingEmails] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Computed values from user info
  const {user, userIdentifier} = userInformation;

  // Calculate profile completion and account age
  const profileCompletion = user
    ? [user.firstName, user.lastName, user.primaryEmailAddress?.emailAddress, user.imageUrl].filter(Boolean).length * 25
    : 0;
  const accountAgeDays = user?.createdAt ? Math.floor((PAGE_LOAD_TIME - user.createdAt) / (1000 * 60 * 60 * 24)) : 0;

  // Mock statistics (memoized to prevent dependency changes)
  const statistics = useMemo(() => ({totalInvoices: 42, totalMerchants: 15, totalScans: 87, totalSaved: 156.5, monthlyAverage: 320}), []);

  // Load preferences from cookies
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

  // Handlers
  const handleLocaleChange = useCallback((newLocale: string) => {
    setLocale(newLocale);
    void setCookie("locale", newLocale);
  }, []);

  const handlePrimaryColorChange = useCallback((color: string) => {
    setPrimaryColor(color);
    void setCookie("theme-primary-color", color);
    document.documentElement.style.setProperty("--color-primary", color);
  }, []);

  const handleSecondaryColorChange = useCallback((color: string) => {
    setSecondaryColor(color);
    void setCookie("theme-secondary-color", color);
    document.documentElement.style.setProperty("--color-secondary", color);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSaveStatus("saving");
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  const handleExportData = useCallback(() => {
    const userData = {
      userIdentifier,
      email: user?.primaryEmailAddress?.emailAddress,
      firstName: user?.firstName,
      lastName: user?.lastName,
      createdAt: user?.createdAt,
      preferences: {theme, locale, fontType, primaryColor, secondaryColor},
      statistics,
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
  }, [userIdentifier, user, theme, locale, fontType, primaryColor, secondaryColor, statistics]);

  const handleDeleteAccount = useCallback(() => {
    console.warn("Account deletion requested for:", userIdentifier);
  }, [userIdentifier]);

  // Theme handlers
  const handleSetThemeLight = useCallback(() => setTheme("light"), [setTheme]);
  const handleSetThemeDark = useCallback(() => setTheme("dark"), [setTheme]);
  const handleSetThemeSystem = useCallback(() => setTheme("system"), [setTheme]);

  // Font handlers
  const handleSetFontNormal = useCallback(() => setFont("normal"), [setFont]);
  const handleSetFontDyslexic = useCallback(() => setFont("dyslexic"), [setFont]);

  // Loading state
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // Error state
  if (isError || !user) {
    return <ProfileError />;
  }

  return (
    <div className='container mx-auto max-w-6xl space-y-8'>
      {/* Profile Header */}
      <div className='from-primary/10 via-primary/5 relative overflow-hidden rounded-2xl bg-gradient-to-r to-transparent p-6 sm:p-8'>
        <div className='bg-primary/5 absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl' />
        <div className='relative flex flex-col items-center gap-6 sm:flex-row sm:items-start'>
          <div className='relative'>
            <Avatar className='border-background ring-primary/20 h-28 w-28 border-4 shadow-xl ring-2'>
              <AvatarImage
                src={user.imageUrl}
                alt={`${user.firstName ?? "User"}'s avatar`}
              />
              <AvatarFallback className='text-3xl'>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <div className='ring-background absolute -right-1 -bottom-1 rounded-full bg-green-500 p-1.5 ring-2'>
              <TbCheck className='h-3 w-3 text-white' />
            </div>
          </div>

          <div className='flex-1 text-center sm:text-left'>
            <div className='flex flex-col items-center gap-2 sm:flex-row sm:items-start'>
              <h1 className='text-3xl font-bold'>
                {user.firstName ?? ""} {user.lastName ?? ""}
              </h1>
              <Badge
                variant='secondary'
                className='gap-1'>
                <TbSparkles className='h-3 w-3' />
                {t("header.premiumMember")}
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1'>{t("header.subtitle")}</p>

            <div className='mt-4 flex flex-wrap justify-center gap-2 sm:justify-start'>
              <Badge variant='outline'>
                <TbUser className='mr-1 h-3 w-3' />
                {t("header.memberSince", {date: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"})}
              </Badge>
              <Badge variant='outline'>
                <TbShieldCheck className='mr-1 h-3 w-3' />
                {t("header.userId")}: {userIdentifier.slice(0, 8)}...
              </Badge>
              <Badge variant='outline'>
                <TbCalendar className='mr-1 h-3 w-3' />
                {accountAgeDays} {t("statistics.daysActive")}
              </Badge>
            </div>

            {/* Profile Completion */}
            <div className='mt-4 max-w-xs'>
              <div className='mb-1 flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>{t("header.profileCompletion")}</span>
                <span className='font-medium'>{profileCompletion}%</span>
              </div>
              <Progress
                value={profileCompletion}
                className='h-2'
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <Link href='/domains/invoices/view-invoices'>
          <Card className='group hover:border-primary cursor-pointer transition-all hover:shadow-md'>
            <CardContent className='flex items-center gap-3 p-4'>
              <div className='bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 transition-colors'>
                <TbFileInvoice className='text-primary h-5 w-5' />
              </div>
              <div>
                <p className='font-medium'>{t("quickActions.viewInvoices")}</p>
                <p className='text-muted-foreground text-xs'>
                  {statistics.totalInvoices} {t("quickActions.total")}
                </p>
              </div>
              <TbChevronRight className='text-muted-foreground ml-auto h-4 w-4 transition-transform group-hover:translate-x-1' />
            </CardContent>
          </Card>
        </Link>
        <Link href='/domains/invoices/upload-scans'>
          <Card className='group hover:border-primary cursor-pointer transition-all hover:shadow-md'>
            <CardContent className='flex items-center gap-3 p-4'>
              <div className='rounded-lg bg-green-500/10 p-2 transition-colors group-hover:bg-green-500/20'>
                <TbUpload className='h-5 w-5 text-green-500' />
              </div>
              <div>
                <p className='font-medium'>{t("quickActions.uploadScan")}</p>
                <p className='text-muted-foreground text-xs'>{t("quickActions.newReceipt")}</p>
              </div>
              <TbChevronRight className='text-muted-foreground ml-auto h-4 w-4 transition-transform group-hover:translate-x-1' />
            </CardContent>
          </Card>
        </Link>
        <Link href='/domains/invoices/view-merchants'>
          <Card className='group hover:border-primary cursor-pointer transition-all hover:shadow-md'>
            <CardContent className='flex items-center gap-3 p-4'>
              <div className='rounded-lg bg-purple-500/10 p-2 transition-colors group-hover:bg-purple-500/20'>
                <TbShoppingCart className='h-5 w-5 text-purple-500' />
              </div>
              <div>
                <p className='font-medium'>{t("quickActions.merchants")}</p>
                <p className='text-muted-foreground text-xs'>
                  {statistics.totalMerchants} {t("quickActions.discovered")}
                </p>
              </div>
              <TbChevronRight className='text-muted-foreground ml-auto h-4 w-4 transition-transform group-hover:translate-x-1' />
            </CardContent>
          </Card>
        </Link>
        <Card className='group hover:border-primary cursor-pointer transition-all hover:shadow-md'>
          <CardContent
            className='flex items-center gap-3 p-4'
            onClick={handleExportData}>
            <div className='rounded-lg bg-orange-500/10 p-2 transition-colors group-hover:bg-orange-500/20'>
              <TbDownload className='h-5 w-5 text-orange-500' />
            </div>
            <div>
              <p className='font-medium'>{t("quickActions.exportData")}</p>
              <p className='text-muted-foreground text-xs'>{t("quickActions.downloadBackup")}</p>
            </div>
            <TbChevronRight className='text-muted-foreground ml-auto h-4 w-4 transition-transform group-hover:translate-x-1' />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Left Column - Tabs */}
        <div className='lg:col-span-2'>
          <Tabs
            defaultValue='appearance'
            className='space-y-6'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger
                value='appearance'
                className='gap-2'>
                <TbPalette className='h-4 w-4' />
                <span className='hidden sm:inline'>{t("appearance.title")}</span>
              </TabsTrigger>
              <TabsTrigger
                value='account'
                className='gap-2'>
                <TbUser className='h-4 w-4' />
                <span className='hidden sm:inline'>{t("account.title")}</span>
              </TabsTrigger>
              <TabsTrigger
                value='security'
                className='gap-2'>
                <TbShield className='h-4 w-4' />
                <span className='hidden sm:inline'>{t("security.title")}</span>
              </TabsTrigger>
              <TabsTrigger
                value='data'
                className='gap-2'>
                <TbDatabase className='h-4 w-4' />
                <span className='hidden sm:inline'>{t("dataManagement.title")}</span>
              </TabsTrigger>
            </TabsList>

            {/* Appearance Tab */}
            <TabsContent
              value='appearance'
              className='space-y-6'>
              <div className='grid gap-6 sm:grid-cols-2'>
                {/* Theme Card */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <TbBrush className='h-4 w-4' />
                      {t("appearance.theme.title")}
                    </CardTitle>
                    <CardDescription>{t("appearance.theme.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex gap-2'>
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size='sm'
                        className='flex-1 cursor-pointer'
                        onClick={handleSetThemeLight}>
                        <TbSun className='mr-1.5 h-4 w-4' />
                        {t("appearance.theme.light")}
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size='sm'
                        className='flex-1 cursor-pointer'
                        onClick={handleSetThemeDark}>
                        <TbMoon className='mr-1.5 h-4 w-4' />
                        {t("appearance.theme.dark")}
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size='sm'
                        className='flex-1 cursor-pointer'
                        onClick={handleSetThemeSystem}>
                        <TbSettings className='mr-1.5 h-4 w-4' />
                        {t("appearance.theme.system")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Font Card */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <TbTypography className='h-4 w-4' />
                      {t("appearance.font.title")}
                    </CardTitle>
                    <CardDescription>{t("appearance.font.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex gap-2'>
                      <Button
                        variant={fontType === "normal" ? "default" : "outline"}
                        size='sm'
                        className='flex-1 cursor-pointer'
                        onClick={handleSetFontNormal}>
                        {t("appearance.font.normal")}
                      </Button>
                      <Button
                        variant={fontType === "dyslexic" ? "default" : "outline"}
                        size='sm'
                        className='flex-1 cursor-pointer'
                        onClick={handleSetFontDyslexic}>
                        {t("appearance.font.dyslexic")}
                      </Button>
                    </div>
                    <p className='text-muted-foreground text-xs'>{t("appearance.font.dyslexicDescription")}</p>
                  </CardContent>
                </Card>

                {/* Custom Colors Card */}
                <Card className='sm:col-span-2'>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <TbPalette className='h-4 w-4' />
                      {t("appearance.customColors.title")}
                    </CardTitle>
                    <CardDescription>{t("appearance.customColors.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <ColorPicker
                      label={t("appearance.customColors.primary")}
                      value={primaryColor}
                      onChange={handlePrimaryColorChange}
                    />
                    <ColorPicker
                      label={t("appearance.customColors.secondary")}
                      value={secondaryColor}
                      onChange={handleSecondaryColorChange}
                    />
                  </CardContent>
                </Card>

                {/* Locale Card */}
                <Card className='sm:col-span-2'>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <TbGlobe className='h-4 w-4' />
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
                        <SelectItem value='en'>English (EN)</SelectItem>
                        <SelectItem value='ro'>Romana (RO)</SelectItem>
                        <SelectItem value='fr'>Francais (FR)</SelectItem>
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
              <Card>
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
                      <p className='text-muted-foreground text-sm'>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className='space-y-2'>
                      <Label>{t("account.lastSignIn")}</Label>
                      <p className='text-muted-foreground text-sm'>
                        {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className='space-y-4'>
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
                  </div>
                  <Separator />
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
            </TabsContent>

            {/* Security Tab */}
            <TabsContent
              value='security'
              className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <TbShield className='h-5 w-5' />
                    {t("security.title")}
                  </CardTitle>
                  <CardDescription>{t("security.description")}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='flex items-center gap-3'>
                      <div className='rounded-lg bg-green-500/10 p-2'>
                        <TbKey className='h-5 w-5 text-green-500' />
                      </div>
                      <div>
                        <p className='font-medium'>{t("security.password")}</p>
                        <p className='text-muted-foreground text-sm'>{t("security.passwordDescription")}</p>
                      </div>
                    </div>
                    <Badge variant='secondary'>{t("security.secure")}</Badge>
                  </div>
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='flex items-center gap-3'>
                      <div className='rounded-lg bg-blue-500/10 p-2'>
                        <TbDeviceAnalytics className='h-5 w-5 text-blue-500' />
                      </div>
                      <div>
                        <p className='font-medium'>{t("security.sessions")}</p>
                        <p className='text-muted-foreground text-sm'>{t("security.sessionsDescription")}</p>
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='cursor-pointer'>
                      {t("security.manage")}
                    </Button>
                  </div>
                  <div className='flex items-center justify-between rounded-lg border p-4'>
                    <div className='flex items-center gap-3'>
                      <div className='rounded-lg bg-purple-500/10 p-2'>
                        <TbShieldCheck className='h-5 w-5 text-purple-500' />
                      </div>
                      <div>
                        <p className='font-medium'>{t("security.twoFactor")}</p>
                        <p className='text-muted-foreground text-sm'>{t("security.twoFactorDescription")}</p>
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='cursor-pointer'>
                      {t("security.enable")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management Tab */}
            <TabsContent
              value='data'
              className='space-y-6'>
              <div className='grid gap-6 sm:grid-cols-2'>
                <Card>
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

                <Card className='border-destructive/50'>
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
        </div>

        {/* Right Column - Stats & Activity */}
        <div className='space-y-6'>
          {/* Statistics Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbChartBar className='h-4 w-4' />
                {t("statistics.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1 text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <TbReceipt className='text-primary h-4 w-4' />
                    <span className='text-2xl font-bold'>{statistics.totalScans}</span>
                  </div>
                  <p className='text-muted-foreground text-xs'>{t("statistics.totalScans")}</p>
                </div>
                <div className='space-y-1 text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <TbFileInvoice className='h-4 w-4 text-blue-500' />
                    <span className='text-2xl font-bold'>{statistics.totalInvoices}</span>
                  </div>
                  <p className='text-muted-foreground text-xs'>{t("statistics.totalInvoices")}</p>
                </div>
                <div className='space-y-1 text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <TbShoppingCart className='h-4 w-4 text-purple-500' />
                    <span className='text-2xl font-bold'>{statistics.totalMerchants}</span>
                  </div>
                  <p className='text-muted-foreground text-xs'>{t("statistics.totalMerchants")}</p>
                </div>
                <div className='space-y-1 text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <TbTrendingUp className='h-4 w-4 text-green-500' />
                    <span className='text-2xl font-bold'>${statistics.totalSaved}</span>
                  </div>
                  <p className='text-muted-foreground text-xs'>{t("statistics.totalSaved")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbAward className='h-4 w-4' />
                {t("achievements.title")}
              </CardTitle>
              <CardDescription>
                {ACHIEVEMENTS.filter((a) => a.earned).length}/{ACHIEVEMENTS.length} {t("achievements.earned")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-3 gap-2'>
                {ACHIEVEMENTS.map((achievement) => (
                  <TooltipProvider key={achievement.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                            achievement.earned ? "bg-primary/10" : "bg-muted opacity-50"
                          }`}>
                          <achievement.icon className={`h-5 w-5 ${achievement.earned ? "text-primary" : "text-muted-foreground"}`} />
                          <span className='text-[10px] font-medium'>{achievement.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='font-medium'>{achievement.name}</p>
                        <p className='text-muted-foreground text-xs'>{achievement.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbActivity className='h-4 w-4' />
                {t("activity.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-64'>
                <div className='space-y-1 p-4 pt-0'>
                  {RECENT_ACTIVITY.map((activity) => (
                    <div
                      key={activity.id}
                      className='hover:bg-muted/50 flex items-start gap-3 rounded-lg p-2 transition-colors'>
                      <div className='bg-primary/10 mt-0.5 rounded-full p-1.5'>
                        {activity.type === "scan" && <TbUpload className='text-primary h-3 w-3' />}
                        {activity.type === "invoice" && <TbFileInvoice className='h-3 w-3 text-blue-500' />}
                        {activity.type === "settings" && <TbSettings className='h-3 w-3 text-purple-500' />}
                      </div>
                      <div className='flex-1 space-y-0.5'>
                        <p className='text-sm font-medium'>{activity.title}</p>
                        <p className='text-muted-foreground text-xs'>{activity.description}</p>
                      </div>
                      <span className='text-muted-foreground flex items-center gap-1 text-xs'>
                        <TbClock className='h-3 w-3' />
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className='flex justify-end'>
        <Button
          className='cursor-pointer'
          onClick={handleSaveSettings}
          disabled={saveStatus === "saving"}>
          {saveStatus === "saving" && (
            <>
              <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              {t("actions.saving")}
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <TbCheck className='mr-2 h-4 w-4' />
              {t("actions.saved")}
            </>
          )}
          {saveStatus === "idle" && t("actions.save")}
        </Button>
      </div>
    </div>
  );
}
