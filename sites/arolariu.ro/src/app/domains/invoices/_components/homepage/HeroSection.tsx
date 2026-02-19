import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
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
  const t = useTranslations("Domains.services.invoices.service.homepage");

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
                {t("hero.title")} <span className={styles["heroHighlight"]}>{t("hero.titleHighlight")}</span> {t("hero.titleSuffix")}
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
  );
}
