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
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-all ${category.color} ${
          isSelected ? "border-primary bg-primary/10 ring-primary/20 ring-2" : ""
        }`}>
        {category.icon}
        <span className={styles["categoryLabel"]}>{category.name}</span>
      </Button>
    );
  }

  return (
    <Button
      variant='outline'
      onClick={handleClick}
      className={`hover:bg-muted flex items-center gap-2 rounded-lg border p-2 text-sm transition-all ${
        isSelected ? "border-primary bg-primary/10" : ""
      }`}>
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
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbHelpCircle className='h-5 w-5 text-amber-500' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
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
            <TbGift className='h-4 w-4 text-amber-600' />
            <span className={styles["gamificationLabel"]}>{t("gamification", {goal: String(goal)})}</span>
          </div>
          <div className={styles["gamificationProgress"]}>
            <Progress
              value={(categorizedCount / goal) * 100}
              className='h-2 flex-1'
            />
            <span className={styles["gamificationCount"]}>
              {categorizedCount}/{goal}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
