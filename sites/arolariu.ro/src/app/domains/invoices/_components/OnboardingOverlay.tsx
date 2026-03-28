"use client";

/**
 * @fileoverview First-time user onboarding overlay for the invoice management system.
 * @module app/domains/invoices/_components/OnboardingOverlay
 */

import {Button, useLocalStorage} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbArrowLeft, TbArrowRight, TbCamera, TbChartBar, TbSparkles, TbX} from "react-icons/tb";
import styles from "./OnboardingOverlay.module.scss";

type Props = Record<string, never>;

type Step = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

/**
 * Onboarding overlay component with 3-step tutorial for first-time users.
 *
 * @remarks
 * Features:
 * - Full-screen overlay with glass morphism background
 * - 3-step tutorial (Upload → AI Extract → Track)
 * - Step indicator dots (filled for current)
 * - Back/Next navigation
 * - Skip button to dismiss permanently
 * - X button to close
 * - AnimatePresence for step transitions (slide left/right)
 * - Stored in localStorage via `useLocalStorage`: key `"invoice-onboarding-complete"`
 * - Only shows once, on the invoice homepage (not every page)
 *
 * Tutorial Steps:
 * 1. Upload Your Receipts — explanation of scan upload feature
 * 2. AI Extracts the Details — explanation of AI analysis
 * 3. Track Your Spending — explanation of statistics/analytics
 *
 * @returns The OnboardingOverlay component (only visible when `onboarding-complete` is false)
 */
export default function OnboardingOverlay(_props: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations("Invoices.Shared.onboarding");
  const [onboardingComplete, setOnboardingComplete] = useLocalStorage<boolean>("invoice-onboarding-complete", false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const steps: Step[] = [
    {
      icon: <TbCamera className={styles["stepIcon"]} />,
      title: t("steps.upload.title"),
      description: t("steps.upload.description"),
    },
    {
      icon: <TbSparkles className={styles["stepIcon"]} />,
      title: t("steps.analyze.title"),
      description: t("steps.analyze.description"),
    },
    {
      icon: <TbChartBar className={styles["stepIcon"]} />,
      title: t("steps.track.title"),
      description: t("steps.track.description"),
    },
  ];

  const handleClose = useCallback(() => {
    setOnboardingComplete(true);
  }, [setOnboardingComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentStep, steps.length, handleClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Don't render if onboarding is complete
  if (onboardingComplete) {
    return null;
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className={styles["overlay"]}>
      <div className={styles["card"]}>
        {/* Header with Skip and Close */}
        <div className={styles["header"]}>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClose}
            aria-label={t("skip")}>
            {t("skip")}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleClose}
            aria-label={t("skip")}>
            <TbX />
          </Button>
        </div>

        {/* Step content with AnimatePresence */}
        <div className={styles["content"]}>
          <AnimatePresence
            custom={direction}
            mode='wait'>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{
                x: {type: "spring", stiffness: 300, damping: 30},
                opacity: {duration: 0.2},
              }}
              className={styles["stepContent"]}>
              <div className={styles["iconWrapper"]}>{steps.at(currentStep)?.icon}</div>

              <p className={styles["stepIndicator"]}>
                {t("stepOf", {
                  current: String(currentStep + 1),
                  total: String(steps.length),
                })}
              </p>

              <h2 className={styles["stepTitle"]}>{steps.at(currentStep)?.title}</h2>
              <p className={styles["stepDescription"]}>{steps.at(currentStep)?.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer with dots and navigation */}
        <div className={styles["footer"]}>
          <div className={styles["dots"]}>
            {steps.map((_, index) => (
              <button
                key={index}
                className={`${styles["dot"]} ${index === currentStep ? styles["dotActive"] : ""}`}
                onClick={() => {
                  setDirection(index > currentStep ? 1 : -1);
                  setCurrentStep(index);
                }}
                aria-label={`${t("stepOf", {
                  current: String(index + 1),
                  total: String(steps.length),
                })}`}
                aria-current={index === currentStep}
              />
            ))}
          </div>

          <div className={styles["navigation"]}>
            {currentStep > 0 && (
              <Button
                variant='outline'
                onClick={handleBack}>
                <TbArrowLeft />
                {t("back")}
              </Button>
            )}

            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? (
                <>
                  {t("next")}
                  <TbArrowRight />
                </>
              ) : (
                t("getStarted")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
