"use client";

import type {InvoiceCategory} from "@/types/invoices";
import {Button, Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbGift, TbHelpCircle} from "react-icons/tb";
import {extendedCategories, mainCategories} from "../../../_utils/categories";
import styles from "./CategorySuggestionCard.module.scss";

type CategoryButtonProps = {
  category: (typeof mainCategories)[number] | (typeof extendedCategories)[number];
  isSelected: boolean;
  onSelect: (id: InvoiceCategory | string) => void;
  variant: "main" | "extended";
};

function CategoryButton({category, isSelected, onSelect, variant}: Readonly<CategoryButtonProps>): React.JSX.Element {
  const handleClick = useCallback(() => {
    onSelect(category.id);
  }, [category.id, onSelect]);

  if (variant === "main") {
    return (
      <Button
        variant='outline'
        onClick={handleClick}
        className={`${styles["mainCategoryButton"]} ${category.color} ${isSelected ? styles["mainCategoryButtonSelected"] : ""}`}>
        {category.icon}
        <span className={styles["categoryLabel"]}>{category.name}</span>
      </Button>
    );
  }

  return (
    <Button
      variant='outline'
      onClick={handleClick}
      className={`${styles["extendedCategoryButton"]} ${isSelected ? styles["extendedCategoryButtonSelected"] : ""}`}>
      {category.icon}
      <span>{category.name}</span>
    </Button>
  );
}

export function CategorySuggestionCard(): React.JSX.Element {
  const [selected, setSelected] = useState<InvoiceCategory | string | null>(null);
  const t = useTranslations("Invoices.ViewInvoice.categorySuggestionCard");

  // Gamification progress (mock)
  const categorizedCount = 8;
  const goal = 10;

  const handleSelect = useCallback((id: InvoiceCategory | string) => {
    setSelected(id);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbHelpCircle className={styles["titleIcon"]} />
            {t("title")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
        {/* Explanation */}
        <p className={styles["description"]}>{t("description")}</p>

        {/* Main Categories Grid */}
        <div className={styles["mainGrid"]}>
          {mainCategories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              isSelected={selected === category.id}
              onSelect={handleSelect}
              variant='main'
            />
          ))}
        </div>

        {/* More Categories Grid */}
        <div className={styles["moreSection"]}>
          <p className={styles["moreLabel"]}>{t("moreCategories")}</p>
          <div className={styles["moreGrid"]}>
            {extendedCategories.map((category) => (
              <CategoryButton
                key={category.id}
                category={category}
                isSelected={selected === category.id}
                onSelect={handleSelect}
                variant='extended'
              />
            ))}
          </div>
        </div>

        {/* Gamification */}
        <div className={styles["gamificationBox"]}>
          <div className={styles["gamificationHeader"]}>
            <TbGift className={styles["gamificationGiftIcon"]} />
            <span className={styles["gamificationLabel"]}>{t("gamification", {goal: String(goal)})}</span>
          </div>
          <div className={styles["gamificationProgress"]}>
            <Progress value={(categorizedCount / goal) * 100} />
            <span className={styles["gamificationCount"]}>
              {categorizedCount}/{goal}
            </span>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
