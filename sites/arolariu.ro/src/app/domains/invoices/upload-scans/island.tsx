"use client";

/**
 * @fileoverview Client-side island for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/island
 */

import {Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {
  TbArrowLeft,
  TbArrowRight,
  TbCheck,
  TbEye,
  TbFileInvoice,
  TbFileTypePdf,
  TbInfoCircle,
  TbPhoto,
  TbShieldCheck,
} from "react-icons/tb";
import PostUploadPrompt from "./_components/PostUploadPrompt";
import UploadArea from "./_components/UploadArea";
import UploadPreview from "./_components/UploadPreview";
import {ScanUploadProvider, useScanUpload} from "./_context/ScanUploadContext";
import styles from "./island.module.scss";

/**
 * Supported file type card component.
 */
function FileTypeCard({
  icon,
  label,
  extensions,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  extensions: string;
}>): React.JSX.Element {
  return (
    <div className={styles["fileTypeCard"]}>
      <div className={styles["fileTypeIconBox"]}>{icon}</div>
      <div>
        <p className={styles["fileTypeLabel"]}>{label}</p>
        <p className={styles["fileTypeExtensions"]}>{extensions}</p>
      </div>
    </div>
  );
}

/**
 * Tip item component.
 */
function TipItem({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  return (
    <li className={styles["tipItem"]}>
      <TbCheck className={styles["tipIcon"]} />
      <span className={styles["tipText"]}>{children}</span>
    </li>
  );
}

/**
 * Upload statistics component.
 */
function UploadStats(): React.JSX.Element | null {
  const t = useTranslations("Invoices.UploadScans");
  const {pendingUploads, sessionStats} = useScanUpload();

  // Current batch stats (from pending uploads)
  const uploading = pendingUploads.filter((u) => u.status === "uploading").length;
  const pending = pendingUploads.filter((u) => u.status === "idle").length;
  const failedInQueue = pendingUploads.filter((u) => u.status === "failed").length;

  // Session stats (persisted even after uploads complete and are removed)
  const {totalAdded, totalCompleted, totalFailed} = sessionStats;

  // Don't show if no activity this session
  if (totalAdded === 0 && pendingUploads.length === 0) return null;

  // Show "View Scans" button when all uploads are done (nothing pending or uploading)
  const allDone = totalCompleted > 0 && pending === 0 && uploading === 0;

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className={styles["statsBar"]}>
      <div className={styles["statsContent"]}>
        <div className={styles["statsGroup"]}>
          {/* Session total */}
          <div className={styles["statItem"]}>
            <p className={`${styles["statValue"]} ${styles["statValueDefault"]}`}>{totalAdded}</p>
            <p className={styles["statLabel"]}>{t("stats.added")}</p>
          </div>
          {/* Pending in current batch */}
          {pending > 0 && (
            <div className={styles["statItem"]}>
              <p className={`${styles["statValue"]} ${styles["statValueAmber"]}`}>{pending}</p>
              <p className={styles["statLabel"]}>{t("stats.pending")}</p>
            </div>
          )}
          {/* Currently uploading */}
          {uploading > 0 && (
            <div className={styles["statItem"]}>
              <p className={`${styles["statValue"]} ${styles["statValueBlue"]}`}>{uploading}</p>
              <p className={styles["statLabel"]}>{t("stats.uploading")}</p>
            </div>
          )}
          {/* Session completed (persistent) */}
          {totalCompleted > 0 && (
            <div className={styles["statItem"]}>
              <p className={`${styles["statValue"]} ${styles["statValueGreen"]}`}>{totalCompleted}</p>
              <p className={styles["statLabel"]}>{t("stats.completed")}</p>
            </div>
          )}
          {/* Session failed (persistent) + current queue failures */}
          {(totalFailed > 0 || failedInQueue > 0) && (
            <div className={styles["statItem"]}>
              <p className={`${styles["statValue"]} ${styles["statValueRed"]}`}>{totalFailed + failedInQueue}</p>
              <p className={styles["statLabel"]}>{t("stats.failed")}</p>
            </div>
          )}
        </div>

        {allDone ? (
          <Button
            className={styles["viewScansButton"]}
            render={
              <Link href='/domains/invoices/view-scans'>
                {t("buttons.viewScans")}
                <TbArrowRight className={styles["arrowIcon"]} />
              </Link>
            }
          />
        ) : null}
      </div>
    </motion.div>
  );
}

/**
 * Main upload content component (uses context).
 */
function UploadContent(): React.JSX.Element {
  const t = useTranslations("Invoices.UploadScans");
  const router = useRouter();
  const {pendingUploads, sessionStats} = useScanUpload();
  const [showPrompt, setShowPrompt] = useState(false);
  const [completedScans, setCompletedScans] = useState<Array<{id: string; preview: string; name: string}>>([]);

  /**
   * Effect to detect when all uploads complete and show the prompt.
   *
   * @remarks
   * Triggers when:
   * - All pending uploads are either completed or failed
   * - At least one upload completed successfully
   * - Prompt hasn't been shown yet for this batch
   */
  useEffect(() => {
    const allDone = pendingUploads.length === 0 && sessionStats.totalCompleted > 0;
    const hasCompleted = pendingUploads.some((u) => u.status === "completed");

    if (allDone && !showPrompt) {
      // Show prompt after a short delay for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    }

    // Collect completed scans for thumbnail preview
    if (hasCompleted) {
      const completed = pendingUploads
        .filter((u) => u.status === "completed")
        .map((u) => ({
          id: u.id,
          preview: u.preview,
          name: u.name,
        }));
      setCompletedScans(completed);
    }
  }, [pendingUploads, sessionStats.totalCompleted, showPrompt]);

  /**
   * Navigate to create invoice page.
   */
  const handleCreateInvoice = (): void => {
    setShowPrompt(false);
    router.push("/domains/invoices/create-invoice");
  };

  /**
   * Navigate to view scans page.
   */
  const handleViewScans = (): void => {
    setShowPrompt(false);
    router.push("/domains/invoices/view-scans");
  };

  /**
   * Dismiss the prompt and stay on page.
   */
  const handleDismiss = (): void => {
    setShowPrompt(false);
  };

  return (
    <section className={styles["contentSection"]}>
      {/* Breadcrumb */}
      <div className={styles["breadcrumb"]}>
        <Link
          href='/domains/invoices'
          className={styles["breadcrumbLink"]}>
          <TbArrowLeft className={styles["breadcrumbIcon"]} />
          {t("breadcrumb")}
        </Link>
      </div>

      {/* Header */}
      <div className={styles["header"]}>
        <div className={styles["headerLeft"]}>
          <div>
            <h1 className={styles["headerTitle"]}>{t("header.title")}</h1>
            <p className={styles["headerDescription"]}>{t("header.description")}</p>
          </div>
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
                <p>{t("header.tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={styles["headerActions"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["outlineButton"]}
                    render={
                      <Link href='/domains/invoices/view-scans'>
                        <TbEye className={styles["actionIcon"]} />
                        <span className={styles["hiddenMobile"]}>{t("buttons.viewScans")}</span>
                        <span className={styles["visibleMobile"]}>{t("buttons.viewScans").split(" ")[0]}</span>
                      </Link>
                    }
                  />
                }
              />
              <TooltipContent>{t("buttons.viewScans")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["outlineButton"]}
                    render={
                      <Link href='/domains/invoices/view-invoices'>
                        <TbFileInvoice className={styles["actionIcon"]} />
                        <span className={styles["hiddenMobile"]}>{t("buttons.myInvoices")}</span>
                        <span className={styles["visibleMobile"]}>{t("buttons.myInvoices").split(" ")[0]}</span>
                      </Link>
                    }
                  />
                }
              />
              <TooltipContent>{t("buttons.myInvoices")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Upload Stats (when there are pending uploads) */}
      <UploadStats />

      {/* Main Content Area */}
      <div className={styles["contentGrid"]}>
        {/* Upload Area - Takes 2 columns */}
        <div className={styles["mainArea"]}>
          <UploadPreview />
          <UploadArea />
        </div>

        {/* Sidebar - Info Cards */}
        <div className={styles["sidebar"]}>
          {/* Supported Formats */}
          <Card>
            <CardContent className={styles["sidebarCardContent"]}>
              <h3 className={styles["sidebarTitle"]}>{t("sidebar.formats.title")}</h3>
              <div className={styles["formatsList"]}>
                <FileTypeCard
                  icon={<TbPhoto className={styles["fileTypeIconAccent"]} />}
                  label={t("sidebar.formats.images")}
                  extensions={t("sidebar.formats.imageExtensions")}
                />
                <FileTypeCard
                  icon={<TbFileTypePdf className={styles["fileTypeIconRed"]} />}
                  label={t("sidebar.formats.documents")}
                  extensions={t("sidebar.formats.documentExtensions")}
                />
              </div>
              <p className={styles["maxSizeNote"]}>{t("sidebar.formats.maxSize")}</p>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className={styles["sidebarCardContent"]}>
              <h3 className={styles["sidebarTitle"]}>{t("sidebar.tips.title")}</h3>
              <ul className={styles["tipsList"]}>
                <TipItem>{t("sidebar.tips.tip1")}</TipItem>
                <TipItem>{t("sidebar.tips.tip2")}</TipItem>
                <TipItem>{t("sidebar.tips.tip3")}</TipItem>
                <TipItem>{t("sidebar.tips.tip4")}</TipItem>
                <TipItem>{t("sidebar.tips.tip5")}</TipItem>
              </ul>
            </CardContent>
          </Card>

          {/* Security Note */}
          <Card className={styles["securityCard"]}>
            <CardContent className={styles["sidebarCardContent"]}>
              <div className={styles["securityContent"]}>
                <TbShieldCheck className={styles["securityIcon"]} />
                <div>
                  <h3 className={styles["securityTitle"]}>{t("sidebar.security.title")}</h3>
                  <p className={styles["securityDescription"]}>{t("sidebar.security.description")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps (when all uploads completed) */}
          {sessionStats.totalCompleted > 0 && pendingUploads.length === 0 && (
            <motion.div
              initial={{opacity: 0, scale: 0.95}}
              animate={{opacity: 1, scale: 1}}
              transition={{delay: 0.3}}>
              <Card className={styles["nextStepsCard"]}>
                <CardContent className={styles["sidebarCardContent"]}>
                  <h3 className={styles["nextStepsTitle"]}>{t("sidebar.nextSteps.title")}</h3>
                  <p className={styles["nextStepsDescription"]}>{t("sidebar.nextSteps.description")}</p>
                  <Button
                    size='sm'
                    className={styles["nextStepsButton"]}
                    render={
                      <Link href='/domains/invoices/view-scans'>
                        {t("sidebar.nextSteps.button")}
                        <TbArrowRight className={styles["arrowIcon"]} />
                      </Link>
                    }
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Post-upload prompt */}
      <PostUploadPrompt
        completedScans={completedScans}
        onCreateInvoice={handleCreateInvoice}
        onViewScans={handleViewScans}
        onDismiss={handleDismiss}
        isVisible={showPrompt}
      />
    </section>
  );
}

/**
 * Client-side island for the scan upload workflow.
 *
 * @remarks
 * This component serves as the hydration boundary for the upload page.
 * It provides the ScanUploadContext and renders the upload UI.
 */
export default function RenderUploadScansScreen(): React.JSX.Element {
  return (
    <ScanUploadProvider>
      <UploadContent />
    </ScanUploadProvider>
  );
}
