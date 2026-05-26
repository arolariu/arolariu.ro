import {selectorFromPath} from "next-intl-selector";
"use client";

import {useInvoicesStore} from "@/stores/invoicesStore";
import {useMerchantsStore} from "@/stores/merchantsStore";
import {useScansStore} from "@/stores/scansStore";
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {TbBuilding, TbCloud, TbFileInvoice, TbScan} from "react-icons/tb";
import {formatStorageSize} from "../_utils/helpers";
import type {UserStatistics} from "../_utils/types";
import styles from "./QuickStats.module.scss";

type Props = Readonly<{
  statistics: UserStatistics;
}>;

const STAT_CARDS = [
  {key: "invoices", icon: TbFileInvoice},
  {key: "merchants", icon: TbBuilding},
  {key: "scans", icon: TbScan},
] as const;

export function QuickStats({statistics}: Props): React.JSX.Element {
  const t = useTranslations();

  const invoicesCount = useInvoicesStore((state) => state.entities.length);
  const merchantsCount = useMerchantsStore((state) => state.entities.length);
  const scansCount = useScansStore((state) => state.scans.length);

  const storagePercentage = (statistics.storageUsed / statistics.storageLimit) * 100;

  const getStatValue = (key: string): number => {
    switch (key) {
      case "invoices":
        return invoicesCount;
      case "merchants":
        return merchantsCount;
      case "scans":
        return scansCount;
      default:
        return 0;
    }
  };

  return (
    <section className={styles["section"]}>
      <div className={styles["header"]}>
        <h2>{t((m) => m.Profile.stats.title)}</h2>
        <p>{t((m) => m.Profile.stats.description)}</p>
      </div>

      <div className={styles["grid"]}>
        {STAT_CARDS.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.3, delay: index * 0.05}}>
            <Card className={styles["statCard"]}>
              <CardHeader className={styles["cardHeaderFlex"]}>
                <CardTitle className={styles["cardTitleSmall"]}>{t(selectorFromPath(`Profile.stats.${card.key}.title`))}</CardTitle>
                <card.icon className={styles["cardIcon"]} />
              </CardHeader>
              <CardContent>
                <div className={styles["statValue"]}>{getStatValue(card.key)}</div>
                <p className={styles["statDescription"]}>{t(selectorFromPath(`Profile.stats.${card.key}.description`))}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <div className={styles["storageHeader"]}>
            <div className={styles["storageInfo"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                <TbCloud className={styles["iconSm"]} />
                {t((m) => m.Profile.stats.storage.title)}
              </CardTitle>
              <CardDescription>{t((m) => m.Profile.stats.storage.description)}</CardDescription>
            </div>
            <span className={styles["storageSize"]}>
              {formatStorageSize(statistics.storageUsed)} / {formatStorageSize(statistics.storageLimit)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={storagePercentage}
            className={styles["progressHeight"]}
          />
          <p className={styles["storageHint"]}>
            {storagePercentage.toFixed(1)}% {t((m) => m.Profile.stats.storage.used)}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
