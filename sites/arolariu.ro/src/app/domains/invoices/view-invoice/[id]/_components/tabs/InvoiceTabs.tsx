"use client";

import {Card, CardContent, CardHeader, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbChefHat, TbInfoCircle} from "react-icons/tb";
import MetadataTab from "../../../../edit-invoice/[id]/_components/tabs/MetadataTab";
import RecipeCard from "../../../../edit-invoice/[id]/_cards/RecipeCard";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceTabs.module.scss";

/**
 * Invoice tabs component displaying possible recipes and additional metadata.
 *
 * @remarks
 * Renders two tabs:
 * - **Possible Recipes**: AI-generated recipe suggestions rendered with the
 *   shared {@link RecipeCard} component
 * - **Additional Info**: Invoice metadata key-value pairs
 *
 * @returns Invoice tabs component with recipe and metadata display
 */
export function InvoiceTabs(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const t = useTranslations();

  return (
    <Card className={styles["card"]}>
      <Tabs
        defaultValue='recipes'
        className={styles["tabs"]}>
        <CardHeader className={styles["cardHeader"]}>
          <TabsList className={styles["tabsList"]}>
            <TabsTrigger
              value='recipes'
              className={styles["tabsTrigger"]}>
              <TbChefHat className={styles["tabIcon"]} />
              {t((m) => m.pages.invoices.viewInvoice.invoiceTabs.tabs.possibleRecipes)}
            </TabsTrigger>
            <TabsTrigger
              value='info'
              className={styles["tabsTrigger"]}>
              <TbInfoCircle className={styles["tabIcon"]} />
              {t((m) => m.pages.invoices.viewInvoice.invoiceTabs.tabs.additionalInfo)}
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <TabsContent
            value='recipes'
            className={styles["tabsContent"]}>
            {invoice.possibleRecipes.length > 0 ? (
              <div className={styles["recipesGrid"]}>
                {invoice.possibleRecipes.map((recipe, recipeIndex) => (
                  <RecipeCard
                    key={`${recipe.name}-${recipe.description}-${recipe.totalMinutes}-${recipe.servings}`}
                    recipe={recipe}
                    recipeIndex={recipeIndex}
                  />
                ))}
              </div>
            ) : (
              <div className={styles["emptyState"]}>
                <TbChefHat className={styles["emptyIcon"]} />
                <p className={styles["emptyStateText"]}>{t((m) => m.pages.invoices.viewInvoice.invoiceTabs.empty.recipes)}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value='info'
            className={styles["tabsContent"]}>
            <MetadataTab metadata={invoice.additionalMetadata} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
