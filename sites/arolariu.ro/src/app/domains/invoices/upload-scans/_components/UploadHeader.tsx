"use client";

/**
 * @fileoverview Upload-scans page header (title, info tooltip, actions).
 * @module app/domains/invoices/upload-scans/_components/UploadHeader
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbInfoCircle} from "react-icons/tb";
import {FadeIn} from "../../_components/FadeIn";
import UploadHeaderActions from "./_header/UploadHeaderActions";
import styles from "../island.module.scss";

/** Renders the page title, info tooltip, and header actions. */
export default function UploadHeader(): React.JSX.Element {
  const t = useTranslations();
  return (
    <FadeIn>
      <div className={styles["header"]}>
        <div className={styles["headerLeft"]}>
          <div>
            <div className={styles["titleRow"]}>
              <h1 className={styles["headerTitle"]}>{t((m) => m.pages.invoices.uploadScans.header.title)}</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant='ghost'
                        size='icon'
                        className={styles["infoButton"]}>
                        <TbInfoCircle className={styles["infoIcon"]} />
                      </Button>
                    }
                  />
                  <TooltipContent
                    side='right'
                    className={styles["tooltipContent"]}>
                    <p>{t((m) => m.pages.invoices.uploadScans.header.tooltip)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className={styles["headerDescription"]}>{t((m) => m.pages.invoices.uploadScans.header.description)}</p>
          </div>
        </div>
        <UploadHeaderActions />
      </div>
    </FadeIn>
  );
}
