"use client";

import type {NavigationItem} from "@/types";

import {Button} from "@arolariu/components";
import {useAuth} from "@clerk/nextjs";
import {useTranslations} from "next-intl";
import Link from "next/link";
import React, {memo, useCallback, useMemo, useState} from "react";
import {TbChevronDown, TbMenu} from "react-icons/tb";
import styles from "./Navigation.module.scss";

/**
 * Hook to get translated navigation items.
 * @returns Array of navigation items with translated labels.
 */
function useNavigationItems(): ReadonlyArray<NavigationItem> {
  const {isSignedIn} = useAuth();
  const t = useTranslations("Navigation");

  return useMemo(() => {
    const items: NavigationItem[] = [
      {
        label: t("domains"),
        href: "/domains",
        children: [
          {
            label: t("invoices"),
            href: "/domains/invoices",
            children: [
              {
                label: t("uploadScans"),
                href: "/domains/invoices/upload-scans",
              },
              {
                label: t("viewScans"),
                href: "/domains/invoices/view-scans",
              },
              {
                label: t("myInvoices"),
                href: "/domains/invoices/view-invoices",
              },
            ],
          },
        ],
      },
      {
        label: t("about"),
        href: "/about",
        children: [
          {
            label: t("thePlatform"),
            href: "/about/the-platform",
          },
          {
            label: t("theAuthor"),
            href: "/about/the-author",
          },
        ],
      },
    ];

    // Add My Profile when signed in
    if (isSignedIn) {
      items.push({
        label: t("myProfile"),
        href: "/my-profile",
      });
    }

    return items;
  }, [t, isSignedIn]);
}

// Desktop helper components
const DesktopNavigationChild = ({child}: Readonly<{child: NavigationItem}>): React.JSX.Element => (
  <div>
    <Link
      href={child.href}
      className='desktop-nav__child-title'>
      {child.label}
    </Link>

    {Boolean(child.children) && (
      <ul className='desktop-nav__child-list'>
        {child.children!.map((link) => (
          <li key={`desktop-grand-${link.label}`}>
            <Link
              href={link.href}
              className='desktop-nav__child-link'>
              {link.label}
              <span
                aria-hidden
                className='desktop-nav__arrow'>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const DesktopNavigationItem = ({item}: Readonly<{item: NavigationItem}>): React.JSX.Element => (
  <li className='desktop-nav__item'>
    <Link
      href={item.href}
      className='desktop-nav__link'>
      {item.label}
    </Link>

    {Boolean(item.children) && (
      <div className='desktop-nav__dropdown'>
        {item.children!.map((col) => (
          <DesktopNavigationChild
            key={`col-${col.label}`}
            child={col}
          />
        ))}
      </div>
    )}
  </li>
);

/**
 * This component renders the desktop navigation.
 * @returns The desktop navigation component.
 */
function DesktopNavigationComponent(): React.JSX.Element {
  const navigationItems = useNavigationItems();

  return (
    <div className='desktop-nav'>
      <ul className='desktop-nav__list'>
        {navigationItems.map((item) => (
          <DesktopNavigationItem
            key={`nav-${item.label}`}
            item={item}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Memoized Desktop Navigation component to prevent unnecessary re-renders.
 */
export const DesktopNavigation = memo(DesktopNavigationComponent);
DesktopNavigation.displayName = "DesktopNavigation";

// Mobile helper components
const MobileNavigationChild = ({col}: Readonly<{col: NavigationItem}>): React.JSX.Element => (
  <div className='mobile-nav__child'>
    <Link
      href={col.href}
      className='mobile-nav__child-title'>
      {col.label}
    </Link>

    {Boolean(col.children) && (
      <ul className='mobile-nav__grandchild-list'>
        {col.children!.map((link) => (
          <li key={`m-grand-${link.label}`}>
            <span
              aria-hidden
              className='mobile-nav__grandchild-arrow'>
              →
            </span>
            <Link
              href={link.href}
              className='mobile-nav__grandchild-link'>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const MobileNavigationItem = ({
  item,
  isOpen,
  onToggle,
}: Readonly<{
  item: NavigationItem;
  isOpen?: boolean;
  onToggle?: () => void;
}>): React.JSX.Element => (
  <li className='mobile-nav__item'>
    <div className='mobile-nav__item-header'>
      <Link
        href={item.href}
        className='mobile-nav__item-link'>
        {item.label}
      </Link>

      {Boolean(item.children) && (
        <Button
          onClick={onToggle}
          aria-expanded={Boolean(isOpen)}
          variant='ghost'
          className='mobile-nav__expand-btn'>
          <TbChevronDown className={`mobile-nav__expand-icon ${isOpen ? "mobile-nav__expand-icon--open" : ""}`} />
        </Button>
      )}
    </div>

    {Boolean(item.children) && Boolean(isOpen) && (
      <div className='mobile-nav__children'>
        {item.children!.map((col) => (
          <MobileNavigationChild
            key={`m-col-${col.label}`}
            col={col}
          />
        ))}
      </div>
    )}
  </li>
);

/**
 * This component renders the mobile navigation.
 * @returns The mobile navigation component.
 */
function MobileNavigationComponent(): React.JSX.Element {
  const t = useTranslations("Navigation.mobile");
  const navigationItems = useNavigationItems();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({});

  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const toggleItem = useCallback((label: string) => {
    // eslint-disable-next-line security/detect-object-injection -- safe.
    setOpenStates((prev) => ({...prev, [label]: !prev[label]}));
  }, []);

  return (
    <>
      <Button
        variant='ghost'
        onClick={toggleMobile}
        aria-expanded={mobileOpen}
        aria-controls='mobile-navigation'
        className='mobile-nav__toggle'>
        <span className={styles["srOnly"]}>{t("openNavigation")}</span>
        <TbMenu className='mobile-nav__toggle-icon' />
      </Button>

      {Boolean(mobileOpen) && (
        <div className='mobile-nav__overlay'>
          <button
            type='button'
            className='mobile-nav__backdrop'
            aria-label={t("closeNavigation")}
            onClick={toggleMobile}
          />
          <aside
            id='mobile-navigation'
            role='dialog'
            aria-modal='true'
            aria-label={t("title")}
            className='mobile-nav__panel'>
            <div className='mobile-nav__header'>
              <h3 className='mobile-nav__title'>{t("title")}</h3>
              <Button
                variant='ghost'
                onClick={toggleMobile}
                aria-label={t("closeNavigation")}
                className='mobile-nav__close'>
                ✕
              </Button>
            </div>

            <ul className='mobile-nav__list'>
              {navigationItems.map((item) => (
                <MobileNavigationItem
                  key={`mobile-${item.label}`}
                  item={item}
                  isOpen={openStates[item.label]}
                  // eslint-disable-next-line react/jsx-no-bind -- simple page
                  onToggle={() => toggleItem(item.label)}
                />
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}

/**
 * Memoized Mobile Navigation component to prevent unnecessary re-renders.
 */
export const MobileNavigation = memo(MobileNavigationComponent);
MobileNavigation.displayName = "MobileNavigation";
