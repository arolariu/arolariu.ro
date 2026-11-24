"use client";

import {invoiceCategoryLabel} from "@/app/domains/invoices/_utils/labelUtilities";
import {InvoiceCategory} from "@/types/invoices";
import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {TbHelpCircle} from "react-icons/tb";
import styles from "./CategorySuggestionCard.module.scss";

const examples = [InvoiceCategory.Groceries, InvoiceCategory.RestaurantDining, InvoiceCategory.MixedPurchases] as const;

/** Shows real category examples and offers the existing editor to the owner. */
export function CategorySuggestionCard({editHref}: Readonly<{editHref?: string}>): React.JSX.Element {
  const t = useTranslations();
  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles["titleRow"]}>
          <TbHelpCircle className={styles["titleIcon"]} />
          {t((m) => m.cards.invoices.categorySuggestionCard.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["contentSpaced"]}>
        <p className={styles["description"]}>{t((m) => m.cards.invoices.categorySuggestionCard.description)}</p>
        <div className={styles["mainGrid"]}>
          {examples.map((category) => (
            <Badge
              key={category}
              variant='outline'>
              {invoiceCategoryLabel(t, category)}
            </Badge>
          ))}
        </div>
        {editHref === undefined ? null : <Link href={editHref}>{t((m) => m.categories.ui.choose)}</Link>}
      </CardContent>
    </Card>
  );
}
