"use client";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import type {User} from "@clerk/nextjs/server";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbBell, TbBrain, TbChartBar, TbDatabase, TbPalette, TbShield, TbUser} from "react-icons/tb";
import {
  ProfileHeader,
  ProfileSkeleton,
  QuickStats,
  SettingsAI,
  SettingsAnalytics,
  SettingsAppearance,
  SettingsData,
  SettingsNotifications,
  SettingsSecurity,
} from "./_components";
import {getDefaultSettings, getMockStatistics} from "./_utils/helpers";
import type {SettingsSection, UserSettings} from "./_utils/types";

type Props = Readonly<{
  user: User | null;
}>;

/** Tab configuration with icon and translation key */
const TAB_CONFIG = [
  {id: "profile", icon: TbUser, key: "profile"},
  {id: "appearance", icon: TbPalette, key: "appearance"},
  {id: "ai", icon: TbBrain, key: "ai"},
  {id: "analytics", icon: TbChartBar, key: "analytics"},
  {id: "notifications", icon: TbBell, key: "notifications"},
  {id: "security", icon: TbShield, key: "security"},
  {id: "data", icon: TbDatabase, key: "data"},
] as const;

export default function ProfileIsland({user}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.sidebar.nav");
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [settings, setSettings] = useState<UserSettings>(getDefaultSettings);
  const statistics = getMockStatistics();

  const handleTabChange = useCallback((value: string) => {
    setActiveSection(value as SettingsSection);
  }, []);

  const handleAppearanceChange = useCallback((newSettings: Partial<UserSettings["appearance"]>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: {...prev.appearance, ...newSettings},
    }));
  }, []);

  const handleAIChange = useCallback((newSettings: Partial<UserSettings["ai"]>) => {
    setSettings((prev) => ({
      ...prev,
      ai: {...prev.ai, ...newSettings},
    }));
  }, []);

  const handleAnalyticsChange = useCallback((newSettings: Partial<UserSettings["analytics"]>) => {
    setSettings((prev) => ({
      ...prev,
      analytics: {...prev.analytics, ...newSettings},
    }));
  }, []);

  const handleNotificationsChange = useCallback((newSettings: Partial<UserSettings["notifications"]>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {...prev.notifications, ...newSettings},
    }));
  }, []);

  const handleSecurityChange = useCallback((newSettings: Partial<UserSettings["security"]>) => {
    setSettings((prev) => ({
      ...prev,
      security: {...prev.security, ...newSettings},
    }));
  }, []);

  const handleDataChange = useCallback((newSettings: Partial<UserSettings["data"]>) => {
    setSettings((prev) => ({
      ...prev,
      data: {...prev.data, ...newSettings},
    }));
  }, []);

  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className='container mx-auto max-w-7xl px-4 py-8'>
      {/* Bento Grid Header Section */}
      <div className='mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Profile Card - spans 2 columns on large screens */}
        <div className='rounded-xl border bg-gradient-to-br from-background to-muted/50 p-6 shadow-sm md:col-span-2 lg:col-span-2'>
          <ProfileHeader
            user={user}
            userIdentifier={user.id}
          />
        </div>

        {/* Quick Stats Summary Card */}
        <div className='rounded-xl border bg-gradient-to-br from-background to-muted/50 p-6 shadow-sm'>
          <div className='flex flex-col items-center justify-center space-y-2 text-center'>
            <div className='text-4xl font-bold text-primary'>{statistics.totalInvoices}</div>
            <p className='text-muted-foreground text-sm'>Total Invoices</p>
            <div className='mt-2 flex gap-4 text-xs text-muted-foreground'>
              <span>{statistics.totalMerchants} merchants</span>
              <span>{statistics.totalScans} scans</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeSection}
        onValueChange={handleTabChange}
        className='w-full'>
        {/* Tab List - Responsive with horizontal scroll on mobile */}
        <TabsList className='mb-6 flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto bg-transparent p-0 md:gap-2'>
          {TAB_CONFIG.map(({id, icon: Icon, key}) => (
            <TabsTrigger
              key={id}
              value={id}
              className='inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground md:px-4'>
              <Icon
                className='h-4 w-4'
                aria-hidden='true'
              />
              <span className='hidden sm:inline'>{t(key)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content - All content panels */}
        <div className='rounded-xl border bg-background p-4 shadow-sm md:p-6'>
          <TabsContent
            value='profile'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <QuickStats statistics={statistics} />
          </TabsContent>

          <TabsContent
            value='appearance'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsAppearance
              settings={settings.appearance}
              onSettingsChange={handleAppearanceChange}
            />
          </TabsContent>

          <TabsContent
            value='ai'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsAI
              settings={settings.ai}
              onSettingsChange={handleAIChange}
            />
          </TabsContent>

          <TabsContent
            value='analytics'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsAnalytics
              settings={settings.analytics}
              onSettingsChange={handleAnalyticsChange}
            />
          </TabsContent>

          <TabsContent
            value='notifications'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsNotifications
              settings={settings.notifications}
              onSettingsChange={handleNotificationsChange}
            />
          </TabsContent>

          <TabsContent
            value='security'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsSecurity
              settings={settings.security}
              onSettingsChange={handleSecurityChange}
            />
          </TabsContent>

          <TabsContent
            value='data'
            className='mt-0 focus-visible:outline-none focus-visible:ring-0'>
            <SettingsData
              settings={settings.data}
              onSettingsChange={handleDataChange}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
