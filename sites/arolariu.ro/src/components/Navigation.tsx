/** @format */

import {NavigationItem} from "@/types";
import Link from "next/link";

const NavigationItems: NavigationItem[] = [
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
