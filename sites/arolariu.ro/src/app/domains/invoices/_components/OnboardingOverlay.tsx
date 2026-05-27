"use client";

/**
 * @fileoverview First-time user onboarding overlay for the invoice management system.
 * @module app/domains/invoices/_components/OnboardingOverlay
 */

import {Button, useLocalStorage} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
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
 * - "Don't show this again" checkbox for permanent dismissal
 * - AnimatePresence for step transitions (slide left/right)
 * - Stored in localStorage via `useLocalStorage`:
 *   - `"invoice-onboarding-complete"` - tracks completion
 *   - `"invoice-onboarding-dismissed"` - tracks permanent dismissal
 * - Only shows once, on the upload-scans page (not every page)
 *
 * Tutorial Steps:
 * 1. Upload Your Receipts — explanation of scan upload feature
 * 2. AI Extracts the Details — explanation of AI analysis
 * 3. Track Your Spending — explanation of statistics/analytics
 *
 * @returns The OnboardingOverlay component (only visible when not completed or dismissed)
 */
export default function OnboardingOverlay(_props: Readonly<Props>): React.JSX.Element | null {
  const t = useTranslations();
  const [onboardingComplete, setOnboardingComplete] = useLocalStorage<boolean>("invoice-onboarding-complete", false);
  const [onboardingDismissed, setOnboardingDismissed] = useLocalStorage<boolean>("invoice-onboarding-dismissed", false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps: Step[] = [
    {
      icon: <TbCamera className={styles["stepIcon"]} />,
      title: t((m) => m["IMS--Common"].onboarding.steps.upload.title),
      description: t((m) => m["IMS--Common"].onboarding.steps.upload.description),
    },
    {
      icon: <TbSparkles className={styles["stepIcon"]} />,
      title: t((m) => m["IMS--Common"].onboarding.steps.analyze.title),
      description: t((m) => m["IMS--Common"].onboarding.steps.analyze.description),
    },
    {
      icon: <TbChartBar className={styles["stepIcon"]} />,
      title: t((m) => m["IMS--Common"].onboarding.steps.track.title),
      description: t((m) => m["IMS--Common"].onboarding.steps.track.description),
    },
  ];

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      setOnboardingDismissed(true);
    }
    setOnboardingComplete(true);
  }, [dontShowAgain, setOnboardingComplete, setOnboardingDismissed]);

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

  /**
   * Factory: returns a stable click handler for the given step index.
   * Sets navigation direction based on whether moving forward or back.
   */
  const createStepClickHandler = useCallback(
    (index: number) => {
      return () => {
        setDirection(index > currentStep ? 1 : -1);
        setCurrentStep(index);
      };
    },
    [currentStep],
  );

  /** Updates the "don't show again" checkbox state. */
  const handleDontShowAgainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDontShowAgain(e.target.checked);
  }, []);

  // Don't render if onboarding is complete or permanently dismissed
  if (onboardingComplete || onboardingDismissed) {
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
            aria-label={t((m) => m["IMS--Common"].onboarding.skip)}>
            {t((m) => m["IMS--Common"].onboarding.skip)}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleClose}
            aria-label={t((m) => m["IMS--Common"].onboarding.skip)}>
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
                {t((m) => m["IMS--Common"].onboarding.stepOf, {
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
            {steps.map((step, index) => (
              <button
                type='button'
                key={step.title}
                className={`${styles["dot"]} ${index === currentStep ? styles["dotActive"] : ""}`}
                onClick={createStepClickHandler(index)}
                aria-label={`${t((m) => m["IMS--Common"].onboarding.stepOf, {
                  current: String(index + 1),
                  total: String(steps.length),
                })}`}
                aria-current={index === currentStep}
              />
            ))}
          </div>

          {/* Don't show this again checkbox */}
          <div className={styles["checkboxContainer"]}>
            <label className={styles["checkboxLabel"]}>
              <input
                type='checkbox'
                className={styles["checkbox"]}
                checked={dontShowAgain}
                onChange={handleDontShowAgainChange}
              />
              <span className={styles["checkboxText"]}>{t((m) => m["IMS--Common"].onboarding.dontShowAgain)}</span>
            </label>
          </div>

          <div className={styles["navigation"]}>
            {currentStep > 0 && (
              <Button
                variant='outline'
                onClick={handleBack}>
                <TbArrowLeft />
                {t((m) => m["IMS--Common"].onboarding.back)}
              </Button>
            )}

            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? (
                <>
                  {t((m) => m["IMS--Common"].onboarding.next)}
                  <TbArrowRight />
                </>
              ) : (
                t((m) => m["IMS--Common"].onboarding.getStarted)
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
