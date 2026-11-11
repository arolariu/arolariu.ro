"use client";

import {Alert, AlertDescription, AlertTitle, Button, cn} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useTransition} from "react";
import {TbAlertTriangle, TbRefresh} from "react-icons/tb";
import styles from "./InvoicesLoadError.module.scss";

/**
 * Props accepted by {@link InvoicesLoadError}.
 */
type Props = Readonly<{
  /** Fetches the invoices again. Expected to settle without rejecting, like `useInvoices().refetch`. */
  onRetry: () => Promise<void>;
}>;

/**
 * Renders the recoverable error state shown when the invoices list cannot be fetched.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`), because the retry button
 * tracks the in-flight request with `useTransition`.
 *
 * While a retry is in flight the button stays focusable but unavailable (`aria-disabled`),
 * so focus is not lost and repeated activations cannot start overlapping requests.
 * The retry button sits below the message rather than beside it, so the message keeps
 * the full alert width on narrow screens.
 *
 * @param props - Component props.
 * @param props.onRetry - Callback that fetches the invoices again.
 * @returns A destructive alert with a localized explanation and a retry button.
 *
 * @example
 * ```tsx
 * const {isError, refetch} = useInvoices();
 * if (isError) return <InvoicesLoadError onRetry={refetch} />;
 * ```
 */
export default function InvoicesLoadError({onRetry}: Props): React.JSX.Element {
  const t = useTranslations();
  const [isRetrying, startRetry] = useTransition();

  const handleRetry = useCallback(() => {
    startRetry(async () => {
      await onRetry();
    });
  }, [onRetry]);

  return (
    <Alert
      variant='destructive'
      className={styles["loadError"]}>
      <TbAlertTriangle aria-hidden='true' />
      <AlertTitle>{t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.loadError.title)}</AlertTitle>
      <AlertDescription>{t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.loadError.description)}</AlertDescription>
      <div className={styles["actions"]}>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleRetry}
          disabled={isRetrying}
          focusableWhenDisabled>
          <TbRefresh
            aria-hidden='true'
            className={cn(styles["retryIcon"], isRetrying && styles["retryIconSpinning"])}
          />
          {isRetrying
            ? t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.loadError.retrying)
            : t((m) => m.pages.invoices.viewInvoices.viewInvoicesIsland.loadError.retry)}
        </Button>
      </div>
    </Alert>
  );
}
