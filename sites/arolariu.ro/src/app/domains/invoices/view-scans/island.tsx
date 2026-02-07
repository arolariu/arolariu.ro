"use client";

/**
 * @fileoverview Client-side island for the view scans workflow.
 * @module app/domains/invoices/view-scans/island
 */

import {Button, Card, CardContent} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback} from "react";
import {TbArrowLeft, TbCheck, TbClick, TbFileInvoice, TbPhoto, TbStack2} from "react-icons/tb";
import DialogContainer from "../_contexts/DialogContainer";
import {DialogProvider, useDialogs} from "../_contexts/DialogContext";
import ScanSelectionToolbar from "./_components/ScanSelectionToolbar";
import ScansGrid from "./_components/ScansGrid";
import ScansHeader from "./_components/ScansHeader";
import {useScans} from "./_hooks/useScans";
import styles from "./island.module.scss";

/**
 * Quick tip component.
 */
function QuickTip({icon, title, description}: Readonly<{icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
  return (
    <main className={styles["quickTip"]}>
      <main className={styles["quickTipIconBox"]}>
        {icon}
      </main>
      <main>
        <p className={styles["quickTipTitle"]}>{title}</p>
        <p className={styles["quickTipDescription"]}>{description}</p>
      </main>
    </main>
  );
}

/**
 * Stats card component.
 */
function StatsCard({value, label, colorClass}: Readonly<{value: number; label: string; colorClass: string}>): React.JSX.Element {
  return (
    <main className={styles["statsCardItem"]}>
      <p className={`${styles["statsCardValue"]} ${styles[colorClass]}`}>{value}</p>
      <p className={styles["statsCardLabel"]}>{label}</p>
    </main>
  );
}

/**
 * Scan statistics component.
 */
function ScanStats(): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();
  const readyScans = scans.filter((s) => s.status === "ready").length;

  if (scans.length === 0) return null;

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className={styles["scanStatsBar"]}>
      <main className={styles["scanStatsContent"]}>
        <main className={styles["scanStatsGroup"]}>
          <StatsCard
            value={scans.length}
            label={t("stats.totalScans")}
            colorClass='statsCardValueDefault'
          />
          <StatsCard
            value={readyScans}
            label={t("stats.ready")}
            colorClass='statsCardValueGreen'
          />
          <StatsCard
            value={selectedScans.length}
            label={t("stats.selected")}
            colorClass='statsCardValuePurple'
          />
        </main>

        {selectedScans.length === 0 && scans.length > 0 && (
          <p className={styles["selectHint"]}>
            <span className={styles["hiddenMobile"]}>{t("stats.selectHint")}</span>
            <span className={styles["visibleMobile"]}>{t("stats.tapHint")}</span>
          </p>
        )}
      </main>
    </motion.div>
  );
}

/**
 * Sidebar with tips and guidance.
 */
function Sidebar(): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();

  // Don't show sidebar if no scans
  if (scans.length === 0) return null;

  return (
    <main className={styles["sidebar"]}>
      {/* How to Use */}
      <Card>
        <CardContent className='p-4'>
          <h3 className={styles["sidebarTitle"]}>{t("sidebar.howTo.title")}</h3>
          <main className={styles["howToList"]}>
            <QuickTip
              icon={<TbClick className={styles["tipIcon"]} />}
              title={t("sidebar.howTo.step1Title")}
              description={t("sidebar.howTo.step1Description")}
            />
            <QuickTip
              icon={<TbStack2 className={styles["tipIcon"]} />}
              title={t("sidebar.howTo.step2Title")}
              description={t("sidebar.howTo.step2Description")}
            />
            <QuickTip
              icon={<TbFileInvoice className={styles["tipIcon"]} />}
              title={t("sidebar.howTo.step3Title")}
              description={t("sidebar.howTo.step3Description")}
            />
          </main>
        </CardContent>
      </Card>

      {/* Selection Status */}
      {selectedScans.length > 0 && (
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}>
          <Card className='border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20'>
            <CardContent className='p-4'>
              <main className={styles["selectionContent"]}>
                <main className={styles["selectionIconCircle"]}>
                  <TbCheck className={styles["selectionIcon"]} />
                </main>
                <main>
                  <p className={styles["selectionTitle"]}>
                    {selectedScans.length}{" "}
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.plural") : t("sidebar.selectionStatus.singular")}
                  </p>
                  <p className={styles["selectionDescription"]}>
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.readyPlural") : t("sidebar.selectionStatus.readySingular")}
                  </p>
                </main>
              </main>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Upload Link */}
      <Card>
        <CardContent className='p-4'>
          <main className={styles["quickUploadContent"]}>
            <main className={styles["quickUploadIconBox"]}>
              <TbPhoto className={styles["quickUploadIcon"]} />
            </main>
            <main className={styles["quickUploadTextBlock"]}>
              <p className={styles["quickUploadTitle"]}>{t("sidebar.quickUpload.title")}</p>
              <p className={styles["quickUploadDescription"]}>{t("sidebar.quickUpload.description")}</p>
            </main>
            <Button
              asChild
              size='sm'
              variant='outline'>
              <Link href='/domains/invoices/upload-scans'>{t("sidebar.quickUpload.button")}</Link>
            </Button>
          </main>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Inner content component that uses the dialog context.
 */
function ViewScansContent(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.view-scans");
  const {scans, selectedScans} = useScans();
  const {openDialog} = useDialogs();

  const handleOpenCreateInvoice = useCallback(() => {
    openDialog("VIEW_SCANS__CREATE_INVOICE", "add", {selectedScans});
  }, [openDialog, selectedScans]);

  return (
    <section className={styles["contentSection"]}>
      {/* Breadcrumb */}
      <main className={styles["breadcrumb"]}>
        <Link
          href='/domains/invoices'
          className={styles["breadcrumbLink"]}>
          <TbArrowLeft className={styles["breadcrumbIcon"]} />
          {t("breadcrumb")}
        </Link>
      </main>

      <ScansHeader />

      {/* Stats */}
      <ScanStats />

      {/* Main Content */}
      <main className={`${styles["contentGrid"]} ${scans.length > 0 ? styles["contentGridWithSidebar"] : ""}`}>
        {/* Scans Grid - Takes 3 columns when there are scans */}
        <main className={scans.length > 0 ? styles["mainAreaWithSidebar"] : ""}>
          <ScansGrid />
        </main>

        {/* Sidebar */}
        <Sidebar />
      </main>

      <ScanSelectionToolbar onCreateInvoice={handleOpenCreateInvoice} />
      <DialogContainer />
      {/* Add padding at bottom when toolbar is visible */}
      {selectedScans.length > 0 ? <main className={styles["bottomSpacer"]} /> : null}
    </section>
  );
}

/**
 * Client-side island for the view scans workflow.
 *
 * @remarks
 * This component serves as the hydration boundary for the view scans page.
 * It manages the dialog state via DialogProvider and renders the scan viewing UI.
 */
export default function RenderViewScansScreen(): React.JSX.Element {
  return (
    <DialogProvider>
      <ViewScansContent />
    </DialogProvider>
  );
}
