/** @format */

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
      },
    ],
  },
];

export const NavigationForMobile = ({className}: Readonly<{className?: string}>) => {
  const items = NavigationItems;

  const renderNavigationItem = useCallback((item: NavigationItem) => {
    return (
      <li key={item.href}>
        {item.children !== undefined ? (
          <details open>
            <summary>
              <Link href={item.href}>{item.label}</Link>
            </summary>
            <ul>
              {item.children.map((child) => (
                <li key={child.href}>
                  <Link href={child.href}>{child.label}</Link>
                </li>
              ))}
            </ul>
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

  return (
    <ul className={`${className as string} flex items-center justify-center justify-items-center gap-4`}>
      {items.map((item) => (
        <li key={item.href}>
          {item.children ? (
            <details>
              <summary>
                <Link href={item.href}>{item.label}</Link>
              </summary>
              <ul className='mx-2 rounded-xl bg-white dark:bg-black 2xsm:border-0 md:border'>
                {item.children.map((child) => (
                  <li
                    key={child.href}
                    className='hover:text-yellow-300'>
                    <Link href={child.href}>&gt; {child.label}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <Link
              href={item.href}
              className='hover:text-yellow-300'>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
};
