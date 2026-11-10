"use client";

import {Button, buttonVariants, cn} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {TbAlertTriangle, TbHome, TbRefresh} from "react-icons/tb";
import styles from "./RouteErrorContent.module.scss";

/**
 * Props accepted by {@link RouteErrorContent}.
 */
export interface RouteErrorContentProps {
  /** The thrown error, optionally carrying a Next.js digest identifier. */
  readonly error: Error & {readonly digest?: string};
  /** Callback that attempts to re-render the segment that errored. */
  readonly reset: () => void;
  /** Route segment identifier exposed as `data-scope`; omitted for the root boundary. */
  readonly scope?: string;
}

/**
 * Renders the responsive recovery UI shared by the route segment `error.tsx` boundaries.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`), because the recovery
 * actions invoke the boundary's `reset` callback.
 *
 * Unlike `global-error.tsx`, segment boundaries render inside the root layout, so this
 * content only fills the `<main>` area between the fixed header and the footer. Each
 * boundary keeps its own logging so the log prefix identifies the failing segment.
 *
 * @param props - Component props.
 * @param props.error - The thrown error, optionally carrying a Next.js `digest` identifier.
 * @param props.reset - Callback that attempts to re-render the segment that errored.
 * @param props.scope - Route segment identifier exposed as `data-scope`.
 * @returns The localized error hero, optional digest, and recovery actions.
 *
 * @example
 * ```tsx
 * <RouteErrorContent
 *   error={error}
 *   reset={reset}
 *   scope='domains'
 * />
 * ```
 */
export function RouteErrorContent({error, reset, scope = undefined}: RouteErrorContentProps): React.JSX.Element {
  const t = useTranslations();

  return (
    <section
      role='alert'
      aria-live='assertive'
      data-scope={scope}
      className={styles["container"]}>
      <div className={styles["content"]}>
        <div className={styles["iconCircle"]}>
          <TbAlertTriangle
            aria-hidden='true'
            className={styles["icon"]}
          />
        </div>
        <h1 className={styles["title"]}>{t((m) => m.app.errors.globalError.hero.title)}</h1>
        <p className={styles["subtitle"]}>{t((m) => m.app.errors.globalError.hero.subtitle)}</p>
        {error.digest ? (
          <p className={styles["digest"]}>
            <span>{t((m) => m.app.errors.globalError.details.errorIdLabel)}</span>{" "}
            <code className={styles["digestCode"]}>{error.digest}</code>
          </p>
        ) : null}
        <div className={styles["actions"]}>
          <Button
            type='button'
            onClick={reset}
            className={styles["actionButton"]}>
            <TbRefresh aria-hidden='true' />
            {t((m) => m.app.errors.globalError.buttons.tryAgain)}
          </Button>
          {/* Resetting as well lets the root boundary recover when it already renders `/`. */}
          <Link
            href='/'
            onClick={reset}
            className={cn(buttonVariants({variant: "outline"}), styles["actionButton"])}>
            <TbHome aria-hidden='true' />
            {t((m) => m.app.errors.globalError.buttons.returnHome)}
          </Link>
        </div>
      </div>
    </section>
  );
}
