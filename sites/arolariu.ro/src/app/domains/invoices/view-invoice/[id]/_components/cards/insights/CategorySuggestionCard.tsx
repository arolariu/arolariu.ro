"use client";

import {Button, Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbGift, TbHelpCircle} from "react-icons/tb";
import styles from "./CategorySuggestionCard.module.scss";

type ClassificationButtonProps = {
  classification: {readonly code: string; readonly label: string};
  isSelected: boolean;
  onSelect: (code: string) => void;
};

function ClassificationButton({classification, isSelected, onSelect}: Readonly<ClassificationButtonProps>): React.JSX.Element {
  const handleClick = useCallback(() => {
    onSelect(classification.code);
  }, [classification.code, onSelect]);

  return (
    <Button
      variant='outline'
      onClick={handleClick}
      className={`${styles["mainCategoryButton"]} ${isSelected ? styles["mainCategoryButtonSelected"] : ""}`}>
      <span className={styles["categoryLabel"]}>{classification.label}</span>
    </Button>
  );
}

export function CategorySuggestionCard(): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const t = useTranslations();

  // Gamification progress (mock)
  const categorizedCount = 8;
  const goal = 10;

  const handleSelect = useCallback((code: string) => {
    setSelected(code);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbHelpCircle className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.categorySuggestionCard.title)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Explanation */}
          <p className={styles["description"]}>{t((m) => m.cards.invoices.categorySuggestionCard.description)}</p>

          {/* Main Categories Grid */}
          <div className={styles["mainGrid"]}>
            {[
              {code: "01", label: t((m) => m.cards.invoices.categorySuggestionCard.title)},
              {code: "11", label: t((m) => m.cards.invoices.categorySuggestionCard.moreCategories)},
            ].map((classification) => (
              <ClassificationButton
                key={classification.code}
                classification={classification}
                isSelected={selected === classification.code}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Gamification */}
          <div className={styles["gamificationBox"]}>
            <div className={styles["gamificationHeader"]}>
              <TbGift className={styles["gamificationGiftIcon"]} />
              <span className={styles["gamificationLabel"]}>
                {t((m) => m.cards.invoices.categorySuggestionCard.gamification, {goal: String(goal)})}
              </span>
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
