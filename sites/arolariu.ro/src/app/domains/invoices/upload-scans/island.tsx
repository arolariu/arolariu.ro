"use client";

/**
 * @fileoverview Client-side island for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/island
 */

import {Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
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
            asChild
            className='bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'>
            <Link href='/domains/invoices/view-scans'>
              {t("buttons.viewScans")}
              <TbArrowRight className={styles["arrowIcon"]} />
            </Link>
          </Button>
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
  const {pendingUploads, sessionStats} = useScanUpload();

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
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='mt-1 h-auto w-auto p-0 text-gray-400 hover:bg-transparent hover:text-gray-600 dark:text-gray-500 dark:hover:bg-transparent dark:hover:text-gray-300'>
                  <TbInfoCircle className={styles["infoIcon"]} />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='right'
                className='max-w-xs'>
                <p>{t("header.tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={styles["headerActions"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant='outline'
                  className='flex items-center gap-2'>
                  <Link href='/domains/invoices/view-scans'>
                    <TbEye className={styles["actionIcon"]} />
                    <span className={styles["hiddenMobile"]}>{t("buttons.viewScans")}</span>
                    <span className={styles["visibleMobile"]}>{t("buttons.viewScans").split(" ")[0]}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("buttons.viewScans")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant='outline'
                  className='flex items-center gap-2'>
                  <Link href='/domains/invoices/view-invoices'>
                    <TbFileInvoice className={styles["actionIcon"]} />
                    <span className={styles["hiddenMobile"]}>{t("buttons.myInvoices")}</span>
                    <span className={styles["visibleMobile"]}>{t("buttons.myInvoices").split(" ")[0]}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
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
            <CardContent className='p-4'>
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
            <CardContent className='p-4'>
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
          <Card className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'>
            <CardContent className='p-4'>
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
              <Card className='border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'>
                <CardContent className='p-4'>
                  <h3 className={styles["nextStepsTitle"]}>{t("sidebar.nextSteps.title")}</h3>
                  <p className={styles["nextStepsDescription"]}>{t("sidebar.nextSteps.description")}</p>
                  <Button
                    asChild
                    size='sm'
                    className='w-full bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'>
                    <Link href='/domains/invoices/view-scans'>
                      {t("sidebar.nextSteps.button")}
                      <TbArrowRight className={styles["arrowIcon"]} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
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
