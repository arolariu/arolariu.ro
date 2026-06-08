"use client";

/**
 * @fileoverview Client-side island for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/island
 */

import {Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useCallback} from "react";
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
import {FadeIn} from "../_components/FadeIn";
import OnboardingOverlay from "../_components/OnboardingOverlay";
import WorkflowProgress from "../_components/WorkflowProgress";
import PostUploadPrompt from "./_components/PostUploadPrompt";
import UploadArea from "./_components/UploadArea";
import UploadPreview from "./_components/UploadPreview";
import {ScanUploadProvider, useScanUpload} from "./_context/ScanUploadContext";
import {usePostUploadPrompt} from "./_hooks/usePostUploadPrompt";
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
 * Main upload content component (uses context).
 */
function UploadContent(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {pendingUploads, sessionStats, completedBatch, clearCompletedBatch} = useScanUpload();
  const {isVisible: showPrompt, completedScans, dismissPrompt} = usePostUploadPrompt({
    pendingUploadCount: pendingUploads.length,
    totalCompleted: sessionStats.totalCompleted,
    completedBatch,
    clearCompletedBatch,
  });

  /** Navigates to the create invoice page after dismissing the prompt. */
  const handleCreateInvoice = useCallback((): void => {
    dismissPrompt();
    router.push("/domains/invoices/create-invoice");
  }, [dismissPrompt, router]);

  /** Navigates to the view scans page after dismissing the prompt. */
  const handleViewScans = useCallback((): void => {
    dismissPrompt();
    router.push("/domains/invoices/view-scans");
  }, [dismissPrompt, router]);

  return (
    <section className={styles["contentSection"]}>
      {/* Breadcrumb */}
      <div className={styles["breadcrumb"]}>
        <Link
          href='/domains/invoices'
          className={styles["breadcrumbLink"]}>
          <TbArrowLeft className={styles["breadcrumbIcon"]} />
          {t((m) => m.pages.invoices.uploadScans.breadcrumb)}
        </Link>
      </div>

      {/* Workflow Progress */}
      <WorkflowProgress currentStep='upload' />

      {/* Header */}
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
                          <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.uploadScans.buttons.viewScans)}</span>
                          <span className={styles["visibleMobile"]}>
                            {t((m) => m.pages.invoices.uploadScans.buttons.viewScans).split(" ")[0]}
                          </span>
                        </Link>
                      }
                    />
                  }
                />
                <TooltipContent>{t((m) => m.pages.invoices.uploadScans.buttons.viewScans)}</TooltipContent>
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
                          <span className={styles["hiddenMobile"]}>{t((m) => m.pages.invoices.uploadScans.buttons.myInvoices)}</span>
                          <span className={styles["visibleMobile"]}>
                            {t((m) => m.pages.invoices.uploadScans.buttons.myInvoices).split(" ")[0]}
                          </span>
                        </Link>
                      }
                    />
                  }
                />
                <TooltipContent>{t((m) => m.pages.invoices.uploadScans.buttons.myInvoices)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </FadeIn>

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
              <h3 className={styles["sidebarTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.formats.title)}</h3>
              <div className={styles["formatsList"]}>
                <FileTypeCard
                  icon={<TbPhoto className={styles["fileTypeIconAccent"]} />}
                  label={t((m) => m.pages.invoices.uploadScans.sidebar.formats.images)}
                  extensions={t((m) => m.pages.invoices.uploadScans.sidebar.formats.imageExtensions)}
                />
                <FileTypeCard
                  icon={<TbFileTypePdf className={styles["fileTypeIconRed"]} />}
                  label={t((m) => m.pages.invoices.uploadScans.sidebar.formats.documents)}
                  extensions={t((m) => m.pages.invoices.uploadScans.sidebar.formats.documentExtensions)}
                />
              </div>
              <p className={styles["maxSizeNote"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.formats.maxSize)}</p>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className={styles["sidebarCardContent"]}>
              <h3 className={styles["sidebarTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.title)}</h3>
              <ul className={styles["tipsList"]}>
                <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip1)}</TipItem>
                <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip2)}</TipItem>
                <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip3)}</TipItem>
                <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip4)}</TipItem>
                <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip5)}</TipItem>
              </ul>
            </CardContent>
          </Card>

          {/* Security Note */}
          <Card className={styles["securityCard"]}>
            <CardContent className={styles["sidebarCardContent"]}>
              <div className={styles["securityContent"]}>
                <TbShieldCheck className={styles["securityIcon"]} />
                <div>
                  <h3 className={styles["securityTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.security.title)}</h3>
                  <p className={styles["securityDescription"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.security.description)}</p>
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
                  <h3 className={styles["nextStepsTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.title)}</h3>
                  <p className={styles["nextStepsDescription"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.description)}</p>
                  <Button
                    size='sm'
                    className={styles["nextStepsButton"]}
                    render={
                      <Link href='/domains/invoices/view-scans'>
                        {t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.button)}
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
        onDismiss={dismissPrompt}
        isVisible={showPrompt}
      />

      {/* Onboarding overlay */}
      <OnboardingOverlay />
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
