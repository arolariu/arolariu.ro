"use client";

import {formatEnum} from "@/lib/utils.generic";
import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbChefHat, TbClock, TbExternalLink, TbInfoCircle} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceTabs.module.scss";

// Get complexity badge variant
function getComplexityVariant(complexity: RecipeComplexity): "default" | "secondary" | "destructive" | "outline" {
  switch (complexity) {
    case RecipeComplexity.Easy:
      return "secondary";
    case RecipeComplexity.Normal:
      return "default";
    case RecipeComplexity.Hard:
      return "destructive";
    default:
      return "outline";
  }
}

export function InvoiceTabs(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const t = useTranslations("Invoices.ViewInvoice.invoiceTabs");

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
              {t("tabs.possibleRecipes")}
            </TabsTrigger>
            <TabsTrigger
              value='info'
              className={styles["tabsTrigger"]}>
              <TbInfoCircle className={styles["tabIcon"]} />
              {t("tabs.additionalInfo")}
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <TabsContent
            value='recipes'
            className={styles["tabsContent"]}>
            {invoice.possibleRecipes.length > 0 ? (
              <div className={styles["recipesGrid"]}>
                {invoice.possibleRecipes.map((recipe) => (
                  <Card
                    key={recipe.name}
                    className={styles["recipeCard"]}>
                    <CardHeader className={styles["recipeCardHeader"]}>
                      <div className={styles["recipeHeader"]}>
                        <CardTitle className={styles["recipeTitle"]}>{recipe.name}</CardTitle>
                        <Badge variant={getComplexityVariant(recipe.complexity)}>{formatEnum(RecipeComplexity, recipe.complexity)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className={styles["recipeBody"]}>
                      <p className={styles["recipeDescription"]}>{recipe.description}</p>
                      <div className={styles["recipeDetails"]}>
                        <div className={styles["recipeDetailItem"]}>
                          <TbClock className={styles["tabIcon"]} />
                          <span>{t("recipe.duration", {minutes: String(recipe.duration)})}</span>
                        </div>
                        <div className={styles["recipeDetailMuted"]}>
                          {t("recipe.prepCook", {prep: String(recipe.preparationTime), cook: String(recipe.cookingTime)})}
                        </div>
                      </div>
                      {Boolean(recipe.referenceForMoreDetails) && (
                        <Button
                          variant='link'
                          className={styles["recipeLink"]}
                          asChild>
                          <a
                            href={recipe.referenceForMoreDetails}
                            target='_blank'
                            rel='noopener noreferrer'>
                            {t("recipe.viewRecipe")}
                            <TbExternalLink className={styles["externalLinkIcon"]} />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={styles["emptyState"]}>
                <TbChefHat className={styles["emptyIcon"]} />
                <p className={styles["emptyStateText"]}>{t("empty.recipes")}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value='info'
            className={styles["tabsContent"]}>
            {Object.keys(invoice.additionalMetadata).length > 0 ? (
              <dl className={styles["metadataList"]}>
                {Object.entries(invoice.additionalMetadata).map(([key, value]) => (
                  <div
                    key={key}
                    className={styles["metadataItem"]}>
                    <dt className={styles["metadataKey"]}>{key}</dt>
                    <dd className={styles["metadataValue"]}>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className={styles["emptyState"]}>
                <TbInfoCircle className={styles["emptyIcon"]} />
                <p className={styles["emptyStateText"]}>{t("empty.additionalInfo")}</p>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
