"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbBrain, TbBuilding, TbCloud, TbFileInvoice, TbReceipt, TbScan} from "react-icons/tb";
import {formatStorageSize} from "../_utils/helpers";
import type {UserStatistics} from "../_utils/types";
import styles from "./QuickStats.module.scss";

type Props = Readonly<{
  statistics: UserStatistics;
}>;

const STAT_CARDS = [
  {key: "invoices", icon: TbFileInvoice, field: "totalInvoices"},
  {key: "merchants", icon: TbBuilding, field: "totalMerchants"},
  {key: "scans", icon: TbScan, field: "totalScans"},
  {key: "saved", icon: TbReceipt, field: "totalSaved", prefix: "$", decimals: 2},
  {key: "monthly", icon: TbReceipt, field: "monthlyAverage", prefix: "$", decimals: 2},
  {key: "aiQueries", icon: TbBrain, field: "aiQueriesUsed"},
] as const;

export function QuickStats({statistics}: Props): React.JSX.Element {
  const t = useTranslations("Profile.stats");

  const storagePercentage = (statistics.storageUsed / statistics.storageLimit) * 100;

  const formatValue = (card: (typeof STAT_CARDS)[number]): string => {
    const value = statistics[card.field as keyof UserStatistics] as number;
    const formatted = "decimals" in card ? value.toFixed(card.decimals) : value.toString();
    return "prefix" in card ? `${card.prefix}${formatted}` : formatted;
  };

  return (
    <section className={styles["section"]}>
      <div className={styles["header"]}>
        <h2>{t("title")}</h2>
        <p>{t("description")}</p>
      </div>

      <div className={styles["grid"]}>
        {STAT_CARDS.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.3, delay: index * 0.05}}>
            <Card className={styles["statCard"]}>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium'>{t(`${card.key}.title`)}</CardTitle>
                <card.icon className={styles["cardIcon"]} />
              </CardHeader>
              <CardContent>
                <div className={styles["statValue"]}>{formatValue(card)}</div>
                <p className={styles["statDescription"]}>{t(`${card.key}.description`)}</p>
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
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbCloud className='h-4 w-4' />
                {t("storage.title")}
              </CardTitle>
              <CardDescription>{t("storage.description")}</CardDescription>
            </div>
            <span className={styles["storageSize"]}>
              {formatStorageSize(statistics.storageUsed)} / {formatStorageSize(statistics.storageLimit)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={storagePercentage}
            className='h-2'
          />
          <p className={styles["storageHint"]}>
            {storagePercentage.toFixed(1)}% {t("storage.used")}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
