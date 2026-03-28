"use client";

/**
 * @fileoverview Post-upload prompt component that appears after successful scan uploads.
 * @module app/domains/invoices/upload-scans/_components/PostUploadPrompt
 *
 * @remarks
 * This component displays an animated overlay prompt asking users if their uploaded
 * scans represent a single purchase. It provides navigation options to either create
 * an invoice immediately or view scans for later processing.
 */

import {Button, Card, CardContent} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbArrowRight, TbCheck, TbEye, TbX} from "react-icons/tb";
import styles from "./PostUploadPrompt.module.scss";

/**
 * Represents a completed scan with preview information.
 */
interface CompletedScan {
  /** Unique identifier of the scan */
  id: string;
  /** Preview URL for the scan thumbnail */
  preview: string;
  /** Original filename of the scan */
  name: string;
}

/**
 * Props for the PostUploadPrompt component.
 */
interface Props {
  /** Array of completed scans to display thumbnails */
  completedScans: CompletedScan[];
  /** Callback when user wants to create an invoice from scans */
  onCreateInvoice: () => void;
  /** Callback when user wants to view all scans */
  onViewScans: () => void;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
  /** Whether the prompt is visible */
  isVisible: boolean;
}

/**
 * Post-upload prompt component.
 *
 * @remarks
 * Displays after all uploads complete successfully, offering users immediate actions:
 * - Create an invoice from the uploaded scans
 * - View scans in the scan library
 * - Dismiss the prompt and continue uploading
 *
 * The component features:
 * - Animated entrance/exit with backdrop blur
 * - Success checkmark animation
 * - Thumbnail preview of uploaded scans
 * - Accessible dismiss button with aria-label
 * - Keyboard navigation support
 *
 * @example
 * ```tsx
 * <PostUploadPrompt
 *   completedScans={[
 *     { id: '1', preview: 'blob:...', name: 'receipt.jpg' }
 *   ]}
 *   onCreateInvoice={() => router.push('/domains/invoices/create-invoice')}
 *   onViewScans={() => router.push('/domains/invoices/view-scans')}
 *   onDismiss={() => setShowPrompt(false)}
 *   isVisible={showPrompt}
 * />
 * ```
 */
export default function PostUploadPrompt({
  completedScans,
  onCreateInvoice,
  onViewScans,
  onDismiss,
  isVisible,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.UploadScans.postUpload");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles["overlay"]}
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.2}}
          onClick={onDismiss}>
          <motion.div
            className={styles["cardWrapper"]}
            initial={{opacity: 0, scale: 0.9, y: 20}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.9, y: 20}}
            transition={{duration: 0.3, ease: "easeOut"}}
            onClick={(e) => e.stopPropagation()}>
            <Card className={styles["card"]}>
              <CardContent className={styles["content"]}>
                {/* Dismiss button */}
                <button
                  type='button'
                  onClick={onDismiss}
                  className={styles["dismissButton"]}
                  aria-label={t("dismiss")}>
                  <TbX className={styles["dismissIcon"]} />
                </button>

                {/* Success header with animated checkmark */}
                <div className={styles["header"]}>
                  <motion.div
                    className={styles["checkmarkCircle"]}
                    initial={{scale: 0}}
                    animate={{scale: 1}}
                    transition={{delay: 0.1, type: "spring", stiffness: 200, damping: 15}}>
                    <TbCheck className={styles["checkmarkIcon"]} />
                  </motion.div>
                  <h2 className={styles["title"]}>{t("title")}</h2>
                </div>

                {/* Thumbnail preview row */}
                {completedScans.length > 0 && (
                  <motion.div
                    className={styles["thumbnailRow"]}
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.2}}>
                    {completedScans.slice(0, 5).map((scan, index) => (
                      <motion.img
                        key={scan.id}
                        src={scan.preview}
                        alt={scan.name}
                        className={styles["thumbnail"]}
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: 0.3 + index * 0.05}}
                      />
                    ))}
                    {completedScans.length > 5 && (
                      <motion.div
                        className={styles["thumbnailMore"]}
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        transition={{delay: 0.55}}>
                        +{completedScans.length - 5}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Subtitle/Question */}
                <motion.p
                  className={styles["subtitle"]}
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  transition={{delay: 0.4}}>
                  {t("subtitle")}
                </motion.p>

                {/* Action buttons */}
                <motion.div
                  className={styles["actions"]}
                  initial={{opacity: 0, y: 10}}
                  animate={{opacity: 1, y: 0}}
                  transition={{delay: 0.5}}>
                  <Button
                    onClick={onCreateInvoice}
                    className={styles["primaryButton"]}
                    size='lg'>
                    {t("createInvoice")}
                    <TbArrowRight className={styles["buttonIcon"]} />
                  </Button>
                  <Button
                    onClick={onViewScans}
                    variant='outline'
                    className={styles["secondaryButton"]}
                    size='lg'>
                    <TbEye className={styles["buttonIcon"]} />
                    {t("viewScans")}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
