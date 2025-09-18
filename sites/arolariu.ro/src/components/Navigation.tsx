"use client";

import type {NavigationItem} from "@/types";

import {Button} from "@arolariu/components";
import Link from "next/link";
import React, {useCallback, useState} from "react";
import {TbChevronDown, TbMenu} from "react-icons/tb";

const navigationItems: ReadonlyArray<NavigationItem> = [
  {
    label: "Domains",
    href: "/domains",
    children: [
      {
        label: "Invoices",
        href: "/domains/invoices",

        children: [
          {
            label: "Create",
            href: "/domains/invoices/create-invoice",
          },
          {
            label: "View",
            href: "/domains/invoices/view-invoices",
          },
        ],
      },
    ],
  },
  {
    label: "About",
    href: "/about",
    children: [
      {
        label: "The Platform",
        href: "/about/the-platform",
      },
      {
        label: "The Author",
        href: "/about/the-author",
      },
    ],
  },
] as const;

// Desktop helper components
const DesktopNavigationChild = ({child}: Readonly<{child: NavigationItem}>): React.JSX.Element => (
  <div>
    <Link
      href={child.href}
      className='mb-2 block text-sm font-semibold text-gray-900'>
      {child.label}
    </Link>

    {Boolean(child.children) && (
      <ul className='space-y-1'>
        {child.children!.map((link) => (
          <li key={`desktop-grand-${link.label}`}>
            <Link
              href={link.href}
              className='block rounded px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-indigo-600'>
              {link.label}
              <span
                aria-hidden
                className='ml-2 text-xs'>
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
  <li className='group relative'>
    <Link
      href={item.href}
      className='px-3 py-2 text-sm font-medium hover:text-indigo-600'>
      {item.label}
    </Link>

    {Boolean(item.children) && (
      <div className='invisible absolute left-0 z-40 mt-2 rounded-xl bg-white opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100'>
        <div className='space-y-4 p-4'>
          {item.children!.map((col) => (
            <DesktopNavigationChild
              key={`col-${col.label}`}
              child={col}
            />
          ))}
        </div>
      </div>
    )}
  </li>
);

/**
 * This component renders the desktop navigation.
 * @returns The desktop navigation component.
 */
export function DesktopNavigation(): React.JSX.Element {
  return (
    <div className='mx-auto px-4 dark:text-white'>
      <ul className='flex items-center gap-6'>
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

// Mobile helper components
const MobileNavigationChild = ({col}: Readonly<{col: NavigationItem}>): React.JSX.Element => (
  <div className='mb-1 text-black'>
    <Link
      href={col.href}
      className='mb-2 block text-sm font-medium hover:underline'>
      {col.label}
    </Link>

    {Boolean(col.children) && (
      <ul className='space-y-3'>
        {col.children!.map((link) => (
          <li key={`m-grand-${link.label}`}>
            <span
              aria-hidden
              className='ml-2 inline text-xs'>
              →
            </span>
            <Link
              href={link.href}
              className='inline rounded px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-indigo-600'>
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
  <li className='py-2'>
    <div className='flex items-center justify-between py-3'>
      <Link
        href={item.href}
        className='text-base font-semibold text-gray-900 transition-colors hover:text-indigo-600'>
        {item.label}
      </Link>

      {Boolean(item.children) && (
        <Button
          onClick={onToggle}
          aria-expanded={Boolean(isOpen)}
          variant='ghost'
          className='cursor-pointer p-1 text-gray-500 hover:text-gray-700'>
          <TbChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      )}
    </div>

    {Boolean(item.children) && Boolean(isOpen) && (
      <div className='mt-3 space-y-3 rounded-md bg-gray-50 p-3 pl-4'>
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
export function MobileNavigation(): React.JSX.Element {
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
        onClick={toggleMobile}
        aria-expanded={mobileOpen}
        aria-controls='mobile-navigation'
        className='inline-flex cursor-pointer items-center justify-center rounded-md p-2 hover:bg-gray-100 sm:hidden'>
        <span className='sr-only'>Open navigation</span>
        <TbMenu className='h-6 w-6' />
      </Button>

      {Boolean(mobileOpen) && (
        <div className='fixed inset-0 z-50 flex'>
          <div
            className='fixed inset-0 bg-black/40'
            onClick={toggleMobile}
            aria-hidden
          />
          <aside
            id='mobile-navigation'
            className='relative w-80 max-w-full overflow-auto rounded-r-lg bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-semibold tracking-tight text-black'>Navigation</h3>
              <Button
                onClick={toggleMobile}
                aria-label='Close navigation'
                className='cursor-pointer p-2 text-gray-500 hover:text-gray-700'>
                ✕
              </Button>
            </div>

            <ul className='space-y-2 divide-y divide-gray-100'>
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

