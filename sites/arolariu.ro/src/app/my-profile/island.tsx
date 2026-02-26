"use client";

import {usePreferencesStore} from "@/stores/preferencesStore";
import type {User} from "@clerk/nextjs/server";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useMemo, useState} from "react";
import {TbBell, TbBrain, TbChartBar, TbDatabase, TbPalette, TbShield, TbUser} from "react-icons/tb";

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
  const t = useTranslations("MyProfile.sidebar.nav");
  const tStats = useTranslations("I18nConsolidation.MyProfileIsland");
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
      {/* Bento Grid Header Section */}
      <section className={styles["bentoGrid"]}>
        <div className={styles["bentoProfileCard"]}>
          <ProfileHeader
            user={user}
            userIdentifier={user.id}
          />
        </div>

        <div className={styles["bentoStatsCard"]}>
          <div className={styles["statsCardInner"]}>
            <div className={styles["statsNumber"]}>{statistics.totalInvoices}</div>
            <p className={styles["statsLabel"]}>{tStats("totalInvoices")}</p>
            <div className={styles["statsMeta"]}>
              <span>{tStats("merchants", {count: String(statistics.totalMerchants)})}</span>
              <span>{tStats("scans", {count: String(statistics.totalScans)})}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout: sidebar + content */}
      <div className={styles["layoutRow"]}>
        {/* Desktop Sidebar */}
        <nav
          className={styles["sidebar"]}
          aria-label={tStats("settingsNavigationAriaLabel")}>
          {TAB_CONFIG.map(({id, icon: Icon, key}) => (
            <button
              key={id}
              type='button'
              className={activeSection === id ? styles["sidebarItemActive"] : styles["sidebarItem"]}
              onClick={() => handleSectionChange(id as SettingsSection)}
              aria-current={activeSection === id ? "page" : undefined}>
              <Icon aria-hidden='true' />
              <span>{t(key)}</span>
            </button>
          ))}
        </nav>

        {/* Content Panel */}
        <section className={styles["content"]}>
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

      {/* Bottom Nav (mobile/tablet) */}
      <nav
        className={styles["bottomNav"]}
        aria-label={tStats("settingsNavigationAriaLabel")}>
        {TAB_CONFIG.map(({id, icon: Icon, key}) => (
          <button
            key={id}
            type='button'
            className={activeSection === id ? styles["bottomNavItemActive"] : styles["bottomNavItem"]}
            onClick={() => handleSectionChange(id as SettingsSection)}
            aria-current={activeSection === id ? "page" : undefined}>
            <Icon aria-hidden='true' />
            <span>{t(key)}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
