"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbBrain, TbBuilding, TbCloud, TbFileInvoice, TbReceipt, TbScan} from "react-icons/tb";
import {formatStorageSize} from "../_utils/helpers";
import type {UserStatistics} from "../_utils/types";

type Props = Readonly<{
  statistics: UserStatistics;
}>;

export function QuickStats({statistics}: Props): React.JSX.Element {
  const t = useTranslations("MyProfile.stats");

  const storagePercentage = (statistics.storageUsed / statistics.storageLimit) * 100;

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>{t("title")}</h2>
        <p className='text-muted-foreground'>{t("description")}</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Total Invoices */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("invoices.title")}</CardTitle>
            <TbFileInvoice className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.totalInvoices}</div>
            <p className='text-muted-foreground text-xs'>{t("invoices.description")}</p>
          </CardContent>
        </Card>

        {/* Total Merchants */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("merchants.title")}</CardTitle>
            <TbBuilding className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.totalMerchants}</div>
            <p className='text-muted-foreground text-xs'>{t("merchants.description")}</p>
          </CardContent>
        </Card>

        {/* Total Scans */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("scans.title")}</CardTitle>
            <TbScan className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.totalScans}</div>
            <p className='text-muted-foreground text-xs'>{t("scans.description")}</p>
          </CardContent>
        </Card>

        {/* Total Saved */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("saved.title")}</CardTitle>
            <TbReceipt className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>${statistics.totalSaved.toFixed(2)}</div>
            <p className='text-muted-foreground text-xs'>{t("saved.description")}</p>
          </CardContent>
        </Card>

        {/* Monthly Average */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("monthly.title")}</CardTitle>
            <TbReceipt className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>${statistics.monthlyAverage.toFixed(2)}</div>
            <p className='text-muted-foreground text-xs'>{t("monthly.description")}</p>
          </CardContent>
        </Card>

        {/* AI Queries */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>{t("aiQueries.title")}</CardTitle>
            <TbBrain className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.aiQueriesUsed}</div>
            <p className='text-muted-foreground text-xs'>{t("aiQueries.description")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2 text-base'>
                <TbCloud className='h-4 w-4' />
                {t("storage.title")}
              </CardTitle>
              <CardDescription>{t("storage.description")}</CardDescription>
            </div>
            <span className='text-muted-foreground text-sm'>
              {formatStorageSize(statistics.storageUsed)} / {formatStorageSize(statistics.storageLimit)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={storagePercentage}
            className='h-2'
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            {storagePercentage.toFixed(1)}% {t("storage.used")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
