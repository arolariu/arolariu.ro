"use client";

import {buttonVariants, cn} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import Image from "next/image";
import Link from "next/link";
import {TbFileInvoice, TbUpload} from "react-icons/tb";
import styles from "./HeroSection.module.scss";

interface Props {
  isAuthenticated: boolean;
}

/**
 * Renders the hero section for the invoices homepage.
 *
 * @param props - Component props.
 * @returns The hero section.
 */
export default function HeroSection({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  return (
    <section className={styles["heroSection"]}>
      <div className={styles["heroContainer"]}>
        <div className={styles["heroFlex"]}>
          <div className={styles["heroContent"]}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.6}}>
              <h1 className={styles["heroTitle"]}>
                {t((m) => m.pages.invoices.landing.hero.title)}{" "}
                <span className={styles["heroHighlight"]}>{t((m) => m.pages.invoices.landing.hero.titleHighlight)}</span>{" "}
                {t((m) => m.pages.invoices.landing.hero.titleSuffix)}
              </h1>
              <p className={styles["heroDescription"]}>{t((m) => m.pages.invoices.landing.hero.description)}</p>

              <div className={styles["heroButtons"]}>
                <Link
                  className={cn(buttonVariants({size: "lg"}), styles["heroPrimaryBtn"])}
                  href='/domains/invoices/upload-scans'>
                  <TbUpload className={styles["heroButtonIcon"]} />
                  {t((m) => m.pages.invoices.landing.hero.getStarted)}
                </Link>
                {isAuthenticated ? (
                  <Link
                    className={buttonVariants({variant: "outline", size: "lg"})}
                    href='/domains/invoices/view-invoices'>
                    <TbFileInvoice className={styles["heroButtonIcon"]} />
                    {t((m) => m.pages.invoices.landing.hero.viewMyInvoices)}
                  </Link>
                ) : null}
              </div>
            </motion.div>
          </div>

          <motion.div
            className={styles["heroImageWrapper"]}
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.6, delay: 0.2}}>
            <Image
              src='/images/domains/invoices/invoice-top.svg'
              alt={t((m) => m.pages.invoices.landing.hero.imageAlt)}
              width={500}
              height={500}
              className={styles["heroImage"]}
              priority
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
