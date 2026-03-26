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
    <div className={styles["quickTip"]}>
      <div className={styles["quickTipIconBox"]}>{icon}</div>
      <div>
        <p className={styles["quickTipTitle"]}>{title}</p>
        <p className={styles["quickTipDescription"]}>{description}</p>
      </div>
    </div>
  );
}

/**
 * Stats card component.
 */
function StatsCard({value, label, colorClass}: Readonly<{value: number; label: string; colorClass: string}>): React.JSX.Element {
  return (
    <div className={styles["statsCardItem"]}>
      <p className={`${styles["statsCardValue"]} ${styles[colorClass]}`}>{value}</p>
      <p className={styles["statsCardLabel"]}>{label}</p>
    </div>
  );
}

/**
 * Scan statistics component.
 */
function ScanStats(): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewScans");
  const {scans, selectedScans} = useScans();
  const readyScans = scans.filter((s) => s.status === "ready").length;

  if (scans.length === 0) return null;

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      className={styles["scanStatsBar"]}>
      <div className={styles["scanStatsContent"]}>
        <div className={styles["scanStatsGroup"]}>
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
        </div>

        {selectedScans.length === 0 && scans.length > 0 && (
          <p className={styles["selectHint"]}>
            <span className={styles["hiddenMobile"]}>{t("stats.selectHint")}</span>
            <span className={styles["visibleMobile"]}>{t("stats.tapHint")}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Sidebar with tips and guidance.
 */
function Sidebar(): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewScans");
  const {scans, selectedScans} = useScans();

  // Don't show sidebar if no scans
  if (scans.length === 0) return null;

  return (
    <div className={styles["sidebar"]}>
      {/* How to Use */}
      <Card>
        <CardContent className={styles["sidebarCardContent"]}>
          <h3 className={styles["sidebarTitle"]}>{t("sidebar.howTo.title")}</h3>
          <div className={styles["howToList"]}>
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
          </div>
        </CardContent>
      </Card>

      {/* Selection Status */}
      {selectedScans.length > 0 && (
        <motion.div
          initial={{opacity: 0, scale: 0.95}}
          animate={{opacity: 1, scale: 1}}>
          <Card className={styles["selectionCard"]}>
            <CardContent className={styles["sidebarCardContent"]}>
              <div className={styles["selectionContent"]}>
                <div className={styles["selectionIconCircle"]}>
                  <TbCheck className={styles["selectionIcon"]} />
                </div>
                <div>
                  <p className={styles["selectionTitle"]}>
                    {selectedScans.length}{" "}
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.plural") : t("sidebar.selectionStatus.singular")}
                  </p>
                  <p className={styles["selectionDescription"]}>
                    {selectedScans.length > 1 ? t("sidebar.selectionStatus.readyPlural") : t("sidebar.selectionStatus.readySingular")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Upload Link */}
      <Card>
        <CardContent className={styles["sidebarCardContent"]}>
          <div className={styles["quickUploadContent"]}>
            <div className={styles["quickUploadIconBox"]}>
              <TbPhoto className={styles["quickUploadIcon"]} />
            </div>
            <div className={styles["quickUploadTextBlock"]}>
              <p className={styles["quickUploadTitle"]}>{t("sidebar.quickUpload.title")}</p>
              <p className={styles["quickUploadDescription"]}>{t("sidebar.quickUpload.description")}</p>
            </div>
            <Button
              asChild
              size='sm'
              variant='outline'>
              <Link href='/domains/invoices/upload-scans'>{t("sidebar.quickUpload.button")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inner content component that uses the dialog context.
 */
function ViewScansContent(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewScans");
  const {scans, selectedScans} = useScans();
  const {openDialog} = useDialogs();

  const handleOpenCreateInvoice = useCallback(() => {
    openDialog("VIEW_SCANS__CREATE_INVOICE", "add", {selectedScans});
  }, [openDialog, selectedScans]);

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

      <ScansHeader />

      {/* Stats */}
      <ScanStats />

      {/* Main Content */}
      <div className={`${styles["contentGrid"]} ${scans.length > 0 ? styles["contentGridWithSidebar"] : ""}`}>
        {/* Scans Grid - Takes 3 columns when there are scans */}
        <div className={scans.length > 0 ? styles["mainAreaWithSidebar"] : ""}>
          <ScansGrid />
        </div>

        {/* Sidebar */}
        <Sidebar />
      </div>

      <ScanSelectionToolbar onCreateInvoice={handleOpenCreateInvoice} />
      <DialogContainer />
      {/* Add padding at bottom when toolbar is visible */}
      {selectedScans.length > 0 ? <div className={styles["bottomSpacer"]} /> : null}
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
