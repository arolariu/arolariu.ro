"use client";

/**
 * @fileoverview Header action links (view scans, my invoices).
 * @module app/domains/invoices/upload-scans/_components/_header/UploadHeaderActions
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import type {ComponentProps, ReactNode} from "react";
import {TbEye, TbFileInvoice} from "react-icons/tb";
import styles from "./UploadHeaderActions.module.scss";

type LinkHref = ComponentProps<typeof Link>["href"];

/** One tooltip-wrapped header link button (full label on desktop, first word on mobile). */
function HeaderActionLink({href, icon, label}: Readonly<{href: LinkHref; icon: ReactNode; label: string}>): React.JSX.Element {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='outline'
              className={styles["outlineButton"]}
              render={
                <Link href={href}>
                  {icon}
                  <span className={styles["hiddenMobile"]}>{label}</span>
                  <span className={styles["visibleMobile"]}>{label.split(" ")[0]}</span>
                </Link>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Renders the header's navigation actions. */
export default function UploadHeaderActions(): React.JSX.Element {
  const t = useTranslations();
  return (
    <div className={styles["headerActions"]}>
      <HeaderActionLink
        href='/domains/invoices/view-scans'
        icon={<TbEye className={styles["actionIcon"]} />}
        label={t((m) => m.pages.invoices.uploadScans.buttons.viewScans)}
      />
      <HeaderActionLink
        href='/domains/invoices/view-invoices'
        icon={<TbFileInvoice className={styles["actionIcon"]} />}
        label={t((m) => m.pages.invoices.uploadScans.buttons.myInvoices)}
      />
    </div>
  );
}
