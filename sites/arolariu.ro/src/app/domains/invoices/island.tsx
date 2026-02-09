"use client";

/**
 * @fileoverview Invoice domain home page with workflow guide.
 * @module app/domains/invoices/island
 *
 * @remarks
 * This component serves as the main entry point for the invoices domain.
 * It guides users through the 3-step workflow: Upload → Organize → View.
 */

import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {useRef} from "react";
import {
  TbArrowRight,
  TbBrain,
  TbChartBar,
  TbChartPie,
  TbCloud,
  TbDeviceMobile,
  TbEye,
  TbFileInvoice,
  TbLock,
  TbPhoto,
  TbReceipt,
  TbShare,
  TbSparkles,
  TbUpload,
} from "react-icons/tb";
import styles from "./island.module.scss";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Workflow step card component.
 */
function WorkflowCard({
  step,
  title,
  description,
  icon,
  href,
  buttonText,
  gradient,
  delay,
}: Readonly<{
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
  gradient: string;
  delay: number;
}>): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5, delay}}>
      <Card className='group relative h-full overflow-hidden border-2 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg dark:hover:border-indigo-700'>
        {/* Step number badge */}
        <div
          className={`${styles["stepBadge"]} bg-linear-to-br ${gradient}`}>
          {step}
        </div>

        <CardHeader className='pb-2'>
          <div className={`${styles["stepIconBox"]} bg-linear-to-br ${gradient}`}>
            {icon}
          </div>
          <CardTitle className='text-xl'>{title}</CardTitle>
          <CardDescription className='text-base'>{description}</CardDescription>
        </CardHeader>

        <CardContent className='pt-2'>
          <Button
            asChild
            className={`w-full bg-linear-to-r ${gradient} text-white transition-transform group-hover:scale-[1.02]`}>
            <Link
              href={href}
              className={styles["cardLink"]}>
              {buttonText}
              <TbArrowRight className={styles["cardArrowIcon"]} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Feature highlight component.
 */
function FeatureItem({icon, title, description}: Readonly<{icon: React.ReactNode; title: string; description: string}>): React.JSX.Element {
  return (
    <div className={styles["featureItem"]}>
      <div className={styles["featureIconBox"]}>
        {icon}
      </div>
      <div>
        <h3 className={styles["featureTitle"]}>{title}</h3>
        <p className={styles["featureDescription"]}>{description}</p>
      </div>
    </div>
  );
}

/**
 * Bento grid item configuration.
 */
const bentoItemsConfig = [
  {key: "ai", icon: TbBrain, gradient: "from-purple-600 to-indigo-600", span: "col-span-2 row-span-1"},
  {key: "analyticsCard", icon: TbChartPie, gradient: "from-emerald-500 to-teal-500", span: "col-span-1 row-span-1"},
  {key: "cloud", icon: TbCloud, gradient: "from-blue-500 to-cyan-500", span: "col-span-1 row-span-2"},
  {key: "ocr", icon: TbReceipt, gradient: "from-orange-500 to-amber-500", span: "col-span-1 row-span-1"},
  {key: "secure", icon: TbLock, gradient: "from-slate-600 to-slate-800", span: "col-span-1 row-span-1"},
  {key: "share", icon: TbShare, gradient: "from-pink-500 to-rose-500", span: "col-span-1 row-span-1"},
] as const;

type BentoKey = (typeof bentoItemsConfig)[number]["key"];

/**
 * Bento grid section showcasing capabilities.
 */
function BentoSection({
  translations,
}: Readonly<{
  translations: {
    title: string;
    description: string;
    mobile: string;
    items: Record<BentoKey, {title: string; description: string}>;
  };
}>): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["bentoSection"]}>
      <div className={styles["bentoContainer"]}>
        {/* Section header */}
        <motion.div
          className={styles["workflowHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.5}}>
          <h2 className={styles["sectionTitle"]}>{translations.title}</h2>
          <p className={styles["sectionDescription"]}>{translations.description}</p>
        </motion.div>

        {/* Bento grid */}
        <div className={styles["bentoGrid"]}>
          {bentoItemsConfig.map((item, index) => (
            <motion.div
              key={item.key}
              className={`${styles["bentoItem"]} bg-gradient-to-br ${item.gradient} ${item.span}`}
              initial={{opacity: 0, y: 30, scale: 0.95}}
              animate={isInView ? {opacity: 1, y: 0, scale: 1} : {}}
              transition={{delay: 0.1 + index * 0.08, duration: 0.5, ease: "easeOut"}}
              whileHover={{scale: 1.02}}>
              {/* Shimmer effect on hover */}
              <div className={styles["shimmerOverlay"]} />

              {/* Floating particles */}
              <motion.div
                className={styles["particleTopRight"]}
                animate={{y: [0, -8, 0], opacity: [0.3, 0.6, 0.3]}}
                transition={{duration: 3, repeat: Infinity, delay: index * 0.2}}
              />
              <motion.div
                className={styles["particleBottomLeft"]}
                animate={{y: [0, -6, 0], opacity: [0.2, 0.5, 0.2]}}
                transition={{duration: 2.5, repeat: Infinity, delay: index * 0.3}}
              />

              {/* Content */}
              <div className={styles["bentoContent"]}>
                <motion.div
                  whileHover={{scale: 1.1, rotate: 5}}
                  transition={{duration: 0.3}}>
                  <item.icon className={styles["bentoIcon"]} />
                </motion.div>
                <div>
                  <h3 className={styles["bentoItemTitle"]}>{translations.items[item.key].title}</h3>
                  <p className={styles["bentoItemDescription"]}>{translations.items[item.key].description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile highlight */}
        <motion.div
          className={styles["mobileNote"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.8, duration: 0.5}}>
          <TbDeviceMobile className={styles["mobileIcon"]} />
          <span className={styles["mobileText"]}>{translations.mobile}</span>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Enhanced CTA section with animations.
 */
function EnhancedCTA({
  translations,
}: Readonly<{
  translations: {
    title: string;
    description: string;
    uploadButton: string;
    learnMore: string;
    badges: {secure: string; cloud: string; ai: string};
  };
}>): React.JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-50px"});

  return (
    <section
      ref={ref}
      className={styles["ctaSection"]}>
      {/* Animated background */}
      <div className={styles["ctaBackground"]}>
        {/* Floating orbs */}
        <motion.div
          className={styles["orbTopLeft"]}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{duration: 8, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className={styles["orbBottomRight"]}
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{duration: 10, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className={styles["orbCenter"]}
          animate={{scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3]}}
          transition={{duration: 6, repeat: Infinity, ease: "easeInOut"}}
        />

        {/* Grid pattern overlay */}
        <div className={styles["ctaGridPattern"]} />
      </div>

      {/* Content */}
      <div className={styles["ctaContent"]}>
        {/* Sparkle icon */}
        <motion.div
          className={styles["ctaSparkle"]}
          initial={{opacity: 0, scale: 0}}
          animate={isInView ? {opacity: 1, scale: 1} : {}}
          transition={{duration: 0.5, type: "spring"}}>
          <motion.div
            animate={{rotate: [0, 10, -10, 0]}}
            transition={{duration: 2, repeat: Infinity, ease: "easeInOut"}}>
            <TbSparkles className={styles["sparklesIcon"]} />
          </motion.div>
        </motion.div>

        <motion.h2
          className={styles["ctaTitle"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.1, duration: 0.5}}>
          {translations.title}
        </motion.h2>

        <motion.p
          className={styles["ctaDescription"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          {translations.description}
        </motion.p>

        {/* Buttons */}
        <motion.div
          className={styles["ctaButtons"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className='group bg-white px-8 text-indigo-600 hover:bg-gray-100'>
            <Link href='/domains/invoices/upload-scans'>
              <TbUpload className={styles["ctaUploadIcon"]} />
              {translations.uploadButton}
            </Link>
          </Button>
          <Button
            asChild
            size='lg'
            variant='outline'
            className='border-white/30 bg-white/10 px-8 text-white backdrop-blur-sm hover:bg-white/20'>
            <Link href='/about/the-platform'>
              {translations.learnMore}
              <TbArrowRight className={styles["ctaArrowIcon"]} />
            </Link>
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className={styles["ctaBadges"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.5, duration: 0.5}}>
          <div className={styles["ctaBadge"]}>
            <TbLock className={styles["badgeIcon"]} />
            <span>{translations.badges.secure}</span>
          </div>
          <div className={styles["ctaBadge"]}>
            <TbCloud className={styles["badgeIcon"]} />
            <span>{translations.badges.cloud}</span>
          </div>
          <div className={styles["ctaBadge"]}>
            <TbBrain className={styles["badgeIcon"]} />
            <span>{translations.badges.ai}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The invoice domain home page with workflow guide.
 *
 * @remarks
 * Guides users through the 3-step invoice management workflow:
 * 1. Upload scans (receipts, invoices, bills)
 * 2. View and organize scans, create invoices
 * 3. View, analyze, and manage invoices
 */
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.homepage");

  // Prepare bento section translations
  const bentoTranslations = {
    title: t("bento.title"),
    description: t("bento.description"),
    mobile: t("bento.mobile"),
    items: {
      ai: {title: t("bento.ai.title"), description: t("bento.ai.description")},
      analyticsCard: {title: t("bento.analyticsCard.title"), description: t("bento.analyticsCard.description")},
      cloud: {title: t("bento.cloud.title"), description: t("bento.cloud.description")},
      ocr: {title: t("bento.ocr.title"), description: t("bento.ocr.description")},
      secure: {title: t("bento.secure.title"), description: t("bento.secure.description")},
      share: {title: t("bento.share.title"), description: t("bento.share.description")},
    },
  };

  // Prepare CTA section translations
  const ctaTranslations = {
    title: t("cta.title"),
    description: t("cta.description"),
    uploadButton: t("cta.uploadButton"),
    learnMore: t("cta.learnMore"),
    badges: {
      secure: t("cta.badges.secure"),
      cloud: t("cta.badges.cloud"),
      ai: t("cta.badges.ai"),
    },
  };

  return (
    <div className={styles["page"]}>
      {/* Hero Section */}
      <section className={styles["heroSection"]}>
        <div className={styles["heroContainer"]}>
          <div className={styles["heroFlex"]}>
            {/* Left: Content */}
            <div className={styles["heroContent"]}>
              <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6}}>
                <h1 className={styles["heroTitle"]}>
                  {t("hero.title")}{" "}
                  <span className={styles["heroHighlight"]}>
                    {t("hero.titleHighlight")}
                  </span>{" "}
                  {t("hero.titleSuffix")}
                </h1>
                <p className={styles["heroDescription"]}>{t("hero.description")}</p>

                <div className={styles["heroButtons"]}>
                  <Button
                    asChild
                    size='lg'
                    className='from-gradient-from to-gradient-to bg-linear-to-r px-8 text-white hover:opacity-90'>
                    <Link href='/domains/invoices/upload-scans'>
                      <TbUpload className={styles["heroButtonIcon"]} />
                      {t("hero.getStarted")}
                    </Link>
                  </Button>
                  {isAuthenticated ? (
                    <Button
                      asChild
                      variant='outline'
                      size='lg'>
                      <Link href='/domains/invoices/view-invoices'>
                        <TbFileInvoice className={styles["heroButtonIcon"]} />
                        {t("hero.viewMyInvoices")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </motion.div>
            </div>

            {/* Right: Image */}
            <motion.div
              className={styles["heroImageWrapper"]}
              initial={{opacity: 0, scale: 0.95}}
              animate={{opacity: 1, scale: 1}}
              transition={{duration: 0.6, delay: 0.2}}>
              <Image
                src='/images/domains/invoices/invoice-top.svg'
                alt='Invoice management illustration'
                width={500}
                height={500}
                className={styles["heroImage"]}
                priority
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className={styles["workflowSection"]}>
        <div className={styles["workflowContainer"]}>
          <motion.div
            className={styles["workflowHeader"]}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}>
            <h2 className={styles["sectionTitle"]}>{t("workflow.title")}</h2>
            <p className={styles["sectionDescription"]}>{t("workflow.description")}</p>
          </motion.div>

          <div className={styles["workflowGrid"]}>
            <WorkflowCard
              step={1}
              title={t("workflow.step1.title")}
              description={t("workflow.step1.description")}
              icon={<TbUpload className={styles["workflowIcon"]} />}
              href='/domains/invoices/upload-scans'
              buttonText={t("workflow.step1.button")}
              gradient='from-blue-500 to-cyan-500'
              delay={0.1}
            />

            <WorkflowCard
              step={2}
              title={t("workflow.step2.title")}
              description={t("workflow.step2.description")}
              icon={<TbEye className={styles["workflowIcon"]} />}
              href='/domains/invoices/view-scans'
              buttonText={t("workflow.step2.button")}
              gradient='from-purple-500 to-pink-500'
              delay={0.2}
            />

            <WorkflowCard
              step={3}
              title={t("workflow.step3.title")}
              description={t("workflow.step3.description")}
              icon={<TbFileInvoice className={styles["workflowIcon"]} />}
              href='/domains/invoices/view-invoices'
              buttonText={t("workflow.step3.button")}
              gradient='from-green-500 to-emerald-500'
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles["featuresSection"]}>
        <div className={styles["featuresContainer"]}>
          <div className={styles["featuresFlex"]}>
            {/* Left: Image */}
            <motion.div
              className={styles["featuresImageWrapper"]}
              initial={{opacity: 0, x: -20}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.6}}>
              <Image
                src='/images/domains/invoices/invoice-bottom.svg'
                alt='Invoice features illustration'
                width={500}
                height={500}
                className={styles["featuresImage"]}
              />
            </motion.div>

            {/* Right: Features */}
            <motion.div
              className={styles["featuresContent"]}
              initial={{opacity: 0, x: 20}}
              animate={{opacity: 1, x: 0}}
              transition={{duration: 0.6, delay: 0.2}}>
              <div className={styles["featuresHeader"]}>
                <h2 className={styles["sectionTitle"]}>{t("features.title")}</h2>
                <p className={styles["sectionDescription"]}>{t("features.description")}</p>
              </div>

              <div className={styles["featuresList"]}>
                <FeatureItem
                  icon={<TbPhoto className={styles["featureIcon"]} />}
                  title={t("features.ocr.title")}
                  description={t("features.ocr.description")}
                />
                <FeatureItem
                  icon={<TbChartBar className={styles["featureIcon"]} />}
                  title={t("features.analytics.title")}
                  description={t("features.analytics.description")}
                />
                <FeatureItem
                  icon={<TbFileInvoice className={styles["featureIcon"]} />}
                  title={t("features.batch.title")}
                  description={t("features.batch.description")}
                />
              </div>

              {!isAuthenticated && (
                <div className={styles["signInPrompt"]}>
                  <p className={styles["signInPromptText"]}>
                    <strong>Sign in</strong> {t("features.signInPrompt")}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <BentoSection translations={bentoTranslations} />

      {/* Enhanced CTA Section */}
      <EnhancedCTA translations={ctaTranslations} />

      {/* Footer spacing */}
      <div className={styles["footerSpacing"]} />
    </div>
  );
}
