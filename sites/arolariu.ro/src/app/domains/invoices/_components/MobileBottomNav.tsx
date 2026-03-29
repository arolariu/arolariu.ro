/**
 * @fileoverview Mobile bottom navigation bar for the invoices domain.
 * @module app/domains/invoices/_components/MobileBottomNav
 *
 * @remarks
 * Provides a fixed bottom navigation bar visible only on mobile devices (hidden on desktop).
 * Features glass morphism styling, active tab highlighting based on pathname, and safe area
 * padding for notched devices.
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/use-pathname}
 */

"use client";

import {useTranslations} from "next-intl";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {TbCamera, TbFileInvoice, TbHome, TbUser} from "react-icons/tb";
import styles from "./MobileBottomNav.module.scss";

/**
 * Navigation item configuration.
 */
interface NavItem {
  /** Translation key for the label */
  labelKey: "home" | "scan" | "invoices" | "profile";
  /** Navigation href */
  href: string;
  /** Icon component from react-icons */
  icon: React.ComponentType<{className?: string}>;
  /** Whether to use exact path matching (default: false) */
  exact?: boolean;
}

/**
 * Mobile bottom navigation bar with fixed positioning.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `usePathname` hook).
 *
 * **Features**:
 * - Fixed at bottom of viewport
 * - Hidden on desktop (md breakpoint and above)
 * - Glass morphism background with backdrop blur
 * - Active tab highlighting based on current pathname
 * - Safe area insets for notched devices
 * - Four navigation tabs: Home, Scan, Invoices, Profile
 *
 * **Accessibility**:
 * - Semantic navigation element
 * - Descriptive labels for screen readers
 * - Clear active state indication
 *
 * @returns The mobile bottom navigation bar.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <MobileBottomNav />
 * ```
 */
export default function MobileBottomNav(): React.JSX.Element {
  const pathname = usePathname();
  const t = useTranslations("Invoices.Shared.mobileNav");

  /**
   * Navigation items configuration.
   */
  const navItems: NavItem[] = [
    {
      labelKey: "home",
      href: "/domains/invoices",
      icon: TbHome,
      exact: true,
    },
    {
      labelKey: "scan",
      href: "/domains/invoices/upload-scans",
      icon: TbCamera,
    },
    {
      labelKey: "invoices",
      href: "/domains/invoices/view-invoices",
      icon: TbFileInvoice,
    },
    {
      labelKey: "profile",
      href: "/auth/profile",
      icon: TbUser,
    },
  ];

  /**
   * Check if a navigation item is active based on the current pathname.
   *
   * @param item - The navigation item to check.
   * @returns True if the item is active, false otherwise.
   */
  const isActive = (item: NavItem): boolean => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      className={styles["nav"]}
      aria-label={t("ariaLabel")}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles["navItem"]} ${active ? styles["navItemActive"] : ""}`}
            aria-current={active ? "page" : undefined}>
            <Icon
              className={styles["navIcon"]}
              aria-hidden='true'
            />
            <span className={styles["navLabel"]}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
