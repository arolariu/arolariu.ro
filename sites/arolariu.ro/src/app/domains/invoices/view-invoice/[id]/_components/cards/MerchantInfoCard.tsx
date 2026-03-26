"use client";

import {formatEnum} from "@/lib/utils.generic";
import {MerchantCategory} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbGlobe, TbMapPin, TbPhone} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./MerchantInfoCard.module.scss";

export function MerchantInfoCard(): React.JSX.Element {
  const {merchant} = useInvoiceContext();
  const t = useTranslations("Invoices.ViewInvoice.merchantInfoCard");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{merchant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
        <div className={styles["infoRowStart"]}>
          <TbMapPin className={styles["iconMutedTop"]} />
          <span className={styles["infoText"]}>{merchant.address.address}</span>
        </div>
        <div className={styles["infoRow"]}>
          <TbPhone className={styles["iconMuted"]} />
          <span className={styles["infoText"]}>{merchant.address.phoneNumber}</span>
        </div>
        <div className={styles["infoRow"]}>
          <Badge variant='outline'>{formatEnum(MerchantCategory, merchant.category)}</Badge>
        </div>
        {Boolean(merchant.address.website) && (
          <div className={styles["infoRow"]}>
            <TbGlobe className={styles["iconMuted"]} />
            <a
              href={merchant.address.website}
              target='_blank'
              rel='noopener noreferrer'
              className={styles["websiteLink"]}>
              {merchant.address.website.replace(/^https?:\/\//u, "")}
            </a>
          </div>
        )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant='outline'>
          {t("viewAllReceipts")}
        </Button>
      </CardFooter>
    </Card>
  );
}
