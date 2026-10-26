"use client";

/**
 * @fileoverview Notice component for a queued analysis request.
 * @module app/domains/invoices/_components/analysis/QueuedAnalysisNotice
 *
 * @remarks
 * Renders a status notice indicating the analysis is queued, along with the
 * queue message identifier and a button to manually refresh results.
 *
 * **Rendering Context**: Client Component (`"use client"` directive) — uses a
 * callback prop and renders interactive controls.
 *
 * **Intentionally absent**: completion language, progress bars. The analysis
 * system is fire-and-poll; this component only represents the queued state.
 */

import {useTranslations} from "next-intl-selector";
import styles from "./QueuedAnalysisNotice.module.scss";

/** Props for {@link QueuedAnalysisNotice}. */
type Props = {
  /**
   * The queue message identifier returned by the analysis submission.
   * May be `null` when the identifier is not yet available.
   */
  readonly messageId: string | null;
  /** Called when the user requests an immediate result refresh. */
  readonly onRefresh: () => void;
};

/**
 * Renders a queued analysis notice with a refresh action.
 *
 * @remarks
 * - Does NOT render completion language (complete/finished/done/success).
 * - Does NOT render a progressbar role.
 * - Renders a single `button` for the refresh action.
 *
 * @param props - Component properties.
 * @returns The queued analysis notice.
 */
export default function QueuedAnalysisNotice({messageId, onRefresh}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <span
          className={styles["statusDot"]}
          aria-hidden='true'
        />
        <p className={styles["title"]}>{t((m) => m.dialogs.invoices.queuedAnalysisNotice.title)}</p>
      </div>
      <p className={styles["description"]}>{t((m) => m.dialogs.invoices.queuedAnalysisNotice.description)}</p>
      {messageId !== null && (
        <p className={styles["messageId"]}>
          <span className={styles["messageIdLabel"]}>{t((m) => m.dialogs.invoices.queuedAnalysisNotice.messageIdLabel)}</span>
          <code className={styles["messageIdValue"]}>{messageId}</code>
        </p>
      )}
      <button
        type='button'
        onClick={onRefresh}
        className={styles["refreshButton"]}
        aria-label={t((m) => m.dialogs.invoices.queuedAnalysisNotice.refreshButton)}>
        {t((m) => m.dialogs.invoices.queuedAnalysisNotice.refreshButton)}
      </button>
    </div>
  );
}
