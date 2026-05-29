"use client";

import {Tooltip, TooltipContent, TooltipTrigger} from "@arolariu/components";
import type {ReactNode} from "react";
import {TbInfoCircle} from "react-icons/tb";
import styles from "./FilterCardFrame.module.scss";

type Props = {
  readonly title: ReactNode;
  readonly active: boolean;
  readonly activeValue: string | null;
  readonly inactiveLabel: string;
  readonly children: ReactNode;
  readonly dynamicHintLabel?: string;
};

/**
 * Shared visual frame for a single filter card in the invoice filter panel.
 *
 * @param props - Card title, active state, active summary, and card content.
 * @returns The rendered filter card frame.
 */
export function FilterCardFrame({
  title,
  active,
  activeValue,
  inactiveLabel,
  children,
  dynamicHintLabel,
}: Readonly<Props>): React.JSX.Element {
  return (
    <div className={`${styles["cardSection"]} ${active ? styles["cardSectionActive"] : ""}`}>
      <div className={styles["cardSectionHeader"]}>
        <span className={styles["cardSectionTitle"]}>
          {title}
          {dynamicHintLabel ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={styles["dynamicHintIcon"]}
                    aria-label={dynamicHintLabel}>
                    <TbInfoCircle aria-hidden='true' />
                  </span>
                }
              />
              <TooltipContent>{dynamicHintLabel}</TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        {activeValue !== null ? (
          <span className={styles["activeValuePill"]}>{activeValue}</span>
        ) : (
          <span className={styles["inactiveLabel"]}>{inactiveLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}
