"use client";

import {selectorFromPath, useTranslations} from "next-intl-selector";

import {usePreferencesStore} from "@/stores/preferencesStore";
import type {User} from "@clerk/nextjs/server";
import {AnimatePresence, motion} from "motion/react";
import {useCallback, useMemo, useState} from "react";
import {TbBell, TbBrain, TbChartBar, TbDatabase, TbPalette, TbShield, TbUser} from "react-icons/tb";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {ProfileHeader} from "./_components/ProfileHeader";
import {ProfileSkeleton} from "./_components/ProfileSkeleton";
import {QuickStats} from "./_components/QuickStats";
import {SettingsAI} from "./_components/SettingsAI";
import {SettingsAnalytics} from "./_components/SettingsAnalytics";
import {SettingsAppearance} from "./_components/SettingsAppearance";
import {SettingsData} from "./_components/SettingsData";
import {SettingsNotifications} from "./_components/SettingsNotifications";
import {SettingsSecurity} from "./_components/SettingsSecurity";
import {getDefaultSettings, getMockStatistics} from "./_utils/helpers";
import type {SettingsSection, UserSettings} from "./_utils/types";
import styles from "./island.module.scss";

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

const PANEL_VARIANTS = {
  initial: {opacity: 0, y: 8},
  animate: {opacity: 1, y: 0},
  exit: {opacity: 0, y: -8},
};

export default function RenderMyProfileScreen({user}: Props): React.JSX.Element {
  const t = useTranslations();
  const tStats = useTranslations();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [settings, setSettings] = useState<UserSettings>(getDefaultSettings);
  const statistics = getMockStatistics();

  // Derive appearance settings from the Zustand preferences store (persisted in IndexedDB).
  // After hydration, the store is the source of truth — including cross-tab sync updates.
  const prefsStore = usePreferencesStore();
  const appearanceSettings = useMemo(
    () =>
      prefsStore.hasHydrated
        ? {
            theme: prefsStore.theme,
            primaryColor: prefsStore.primaryColor,
            secondaryColor: prefsStore.secondaryColor,
            tertiaryColor: prefsStore.tertiaryColor ?? "#1e3a8a",
            fontType: prefsStore.fontType,
            locale: prefsStore.locale,
            compactMode: prefsStore.compactMode,
            animationsEnabled: prefsStore.animationsEnabled,
          }
        : settings.appearance,
    [
      prefsStore.hasHydrated,
      prefsStore.theme,
      prefsStore.primaryColor,
      prefsStore.secondaryColor,
      prefsStore.tertiaryColor,
      prefsStore.fontType,
      prefsStore.locale,
      prefsStore.compactMode,
      prefsStore.animationsEnabled,
      settings.appearance,
    ],
  );

  const handleSectionChange = useCallback((value: SettingsSection) => {
    setActiveSection(value);
  }, []);

  /**
   * Adapter: wraps handleSectionChange to accept string and cast to SettingsSection.
   * Used by the mobile Select component which provides string values.
   */
  const handleMobileNavChange = useCallback((v: string) => handleSectionChange(v as SettingsSection), [handleSectionChange]);

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

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const section = e.currentTarget.dataset["section"] as SettingsSection | undefined;
      if (section) handleSectionChange(section);
    },
    [handleSectionChange],
  );

  if (!user) {
    return <ProfileSkeleton />;
  }

  const renderPanel = (): React.JSX.Element => {
    switch (activeSection) {
      case "profile":
        return <QuickStats statistics={statistics} />;
      case "appearance":
        return (
          <SettingsAppearance
            settings={appearanceSettings}
            onSettingsChange={handleAppearanceChange}
          />
        );
      case "ai":
        return (
          <SettingsAI
            settings={settings.ai}
            onSettingsChange={handleAIChange}
          />
        );
      case "analytics":
        return (
          <SettingsAnalytics
            settings={settings.analytics}
            onSettingsChange={handleAnalyticsChange}
          />
        );
      case "notifications":
        return (
          <SettingsNotifications
            settings={settings.notifications}
            onSettingsChange={handleNotificationsChange}
          />
        );
      case "security":
        return (
          <SettingsSecurity
            settings={settings.security}
            onSettingsChange={handleSecurityChange}
          />
        );
      case "data":
        return (
          <SettingsData
            settings={settings.data}
            onSettingsChange={handleDataChange}
          />
        );
      default: {
        const exhaustiveCheck: never = activeSection;
        return exhaustiveCheck;
      }
    }
  };

  return (
    <section className={styles["page"]}>
      {/* Flat header row — no card wrapper */}
      <ProfileHeader
        user={user}
        userIdentifier={user.id}
      />

      {/* Two-column layout: sidebar + content */}
      <div className={styles["layoutRow"]}>
        {/* Desktop Sidebar */}
        <nav
          className={styles["sidebar"]}
          aria-label={tStats((m) => m.pages.profile.island.settingsNavigationAriaLabel)}>
          {TAB_CONFIG.map(({id, icon: Icon, key}) => (
            <button
              key={id}
              type='button'
              className={activeSection === id ? styles["sidebarItemActive"] : styles["sidebarItem"]}
              data-section={id}
              onClick={handleNavClick}
              aria-current={activeSection === id ? "page" : undefined}>
              <Icon aria-hidden='true' />
              <span>{t(selectorFromPath(`pages.profile.sidebar.nav.${key}`))}</span>
            </button>
          ))}
        </nav>

        {/* Content Panel */}
        <section className={styles["content"]}>
          {/* Mobile nav — replaces fixed bottom nav */}
          <Select
            value={activeSection}
            onValueChange={handleMobileNavChange}>
            <SelectTrigger className={styles["mobileNav"]}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAB_CONFIG.map(({id, key}) => (
                <SelectItem
                  key={id}
                  value={id}>
                  {t(selectorFromPath(`pages.profile.sidebar.nav.${key}`))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AnimatePresence
            mode='wait'
            initial={false}>
            <motion.div
              key={activeSection}
              className={styles["panelEnter"]}
              variants={PANEL_VARIANTS}
              initial='initial'
              animate='animate'
              exit='exit'
              transition={{duration: 0.2}}>
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </section>
  );
}
