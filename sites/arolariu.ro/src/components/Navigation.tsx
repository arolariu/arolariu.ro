/** @format */
"use client";

import {NavigationItem} from "@/types";
import Link from "next/link";
import {useCallback} from "react";

const NavigationItems: NavigationItem[] = [
  {
    label: "About",
    href: "/about",
    children: [
      {
        label: "Platform",
        href: "/about/the-platform",
      },
      {
        label: "Author",
        href: "/about/the-author",
      },
    ],
  },
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
] as const;

export const NavigationForMobile = ({className}: Readonly<{className?: string}>) => {
  const items = NavigationItems;

  const renderNavigationItem = useCallback((item: NavigationItem) => {
    const dropdownOpen = items.findIndex((i) => i.href === item.href) !== -1;
    return (
      <li key={item.href}>
        {item.children !== undefined ? (
          <details open={dropdownOpen}>
            <summary>
              <Link href={item.href}>{item.label}</Link>
            </summary>
            <ul>{item.children.map((child) => renderNavigationItem(child))}</ul>
          </details>
        ) : (
          <Link href={item.href}>{item.label}</Link>
        )}
      </li>
    );
  }, []);

  return (
    <div className='dropdown'>
      <button
        type='button'
        tabIndex={0}
        className='btn btn-circle btn-ghost h-6 max-h-6 min-h-6'>
        ≣
      </button>
      <ul className={`${className as string} dropdown-content bg-white text-xs dark:bg-black`}>
        {items.map(renderNavigationItem)}
      </ul>
    </div>
  );
};

export const NavigationForDesktop = ({className}: Readonly<{className?: string}>) => {
  const items = NavigationItems;

  const renderNavigationItem = useCallback((item: NavigationItem) => {
    const firstRow = items.findIndex((i) => i.href === item.href) !== -1;
    return (
      <li
        key={item.href}
        className='z-50'>
        {item.children !== undefined ? (
          <details>
            <summary className={firstRow ? "" : "text-black"}>
              <Link href={item.href}>{item.label}</Link>
            </summary>
            <ul>{item.children.map((child) => renderNavigationItem(child))}</ul>
          </details>
        ) : (
          <Link
            href={item.href}
            className='text-black'>
            {item.label}
          </Link>
        )}
      </li>
    );
  }, []);

  return <ul className={`${className as string} text-md gap-4`}>{items.map(renderNavigationItem)}</ul>;
};
