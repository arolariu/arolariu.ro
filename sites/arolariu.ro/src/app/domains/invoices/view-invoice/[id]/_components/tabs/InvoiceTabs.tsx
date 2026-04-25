"use client";

import {formatEnum} from "@/lib/utils.generic";
import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbChefHat, TbClock, TbExternalLink, TbInfoCircle, TbMessage, TbToolsKitchen2} from "react-icons/tb";
import {LocalInvoiceAssistantPanel} from "../../../../_components/ai/LocalInvoiceAssistantPanel";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceTabs.module.scss";

/**
 * Returns the badge variant for a recipe complexity level.
 *
 * @param complexity - The recipe complexity enum value
 * @returns Badge variant matching the complexity level
 */
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

/**
 * Returns the emoji icon for a recipe complexity level.
 *
 * @param complexity - The recipe complexity enum value
 * @returns Emoji representing the complexity
 */
function getComplexityEmoji(complexity: RecipeComplexity): string {
  switch (complexity) {
    case RecipeComplexity.Easy:
      return "🟢";
    case RecipeComplexity.Normal:
      return "🟡";
    case RecipeComplexity.Hard:
      return "🔴";
    default:
      return "⚪";
  }
}

/**
 * Invoice tabs component displaying possible recipes and additional metadata.
 *
 * @remarks
 * Renders two tabs:
 * - **Possible Recipes**: AI-generated recipe suggestions with full details
 * - **Additional Info**: Invoice metadata key-value pairs
 *
 * **Recipe Features**:
 * - Full recipe cards with name, description, complexity badge
 * - Time breakdown (preparation + cooking)
 * - Ingredients list from invoice products
 * - Instructions display
 * - External recipe link (if available)
 *
 * @returns Invoice tabs component with recipe and metadata display
 */
export function InvoiceTabs(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const t = useTranslations("IMS--View.invoiceTabs");

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
            <TabsTrigger
              value='assistant'
              className={styles["tabsTrigger"]}>
              <TbMessage className={styles["tabIcon"]} />
              {t("tabs.aiAssistant")}
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <TabsContent
            value='recipes'
            className={styles["tabsContent"]}>
            {invoice.possibleRecipes.length > 0 ? (
              <div className={styles["recipesGrid"]}>
                {invoice.possibleRecipes.map((recipe) => {
                  const hasValidReference =
                    recipe.referenceForMoreDetails
                    && recipe.referenceForMoreDetails !== "https://arolariu.ro"
                    && recipe.referenceForMoreDetails !== "";

                  return (
                    <Card
                      key={recipe.name}
                      className={styles["recipeCard"]}>
                      <CardHeader className={styles["recipeCardHeader"]}>
                        <div className={styles["recipeHeader"]}>
                          <CardTitle className={styles["recipeTitle"]}>{recipe.name}</CardTitle>
                          <Badge variant={getComplexityVariant(recipe.complexity)}>
                            {getComplexityEmoji(recipe.complexity)} {formatEnum(RecipeComplexity, recipe.complexity)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className={styles["recipeBody"]}>
                        <p className={styles["recipeDescription"]}>{recipe.description}</p>

                        {/* Time Information */}
                        <div className={styles["recipeDetails"]}>
                          <div className={styles["recipeDetailItem"]}>
                            <TbClock className={styles["tabIcon"]} />
                            <span>{t("recipe.duration", {minutes: String(recipe.approximateTotalDuration)})}</span>
                          </div>
                          {recipe.preparationTime > 0 && recipe.cookingTime > 0 && (
                            <div className={styles["recipeDetailMuted"]}>
                              {t("recipe.prepCook", {prep: String(recipe.preparationTime), cook: String(recipe.cookingTime)})}
                            </div>
                          )}
                        </div>

                        {/* Ingredients List */}
                        {recipe.ingredients.length > 0 && (
                          <div className={styles["ingredientsSection"]}>
                            <div className={styles["ingredientsHeader"]}>
                              <TbToolsKitchen2 className={styles["sectionIcon"]} />
                              <h4 className={styles["sectionTitle"]}>{t("recipe.ingredients")}</h4>
                            </div>
                            <ul className={styles["ingredientsList"]}>
                              {recipe.ingredients.map((ingredient, index) => (
                                <li
                                  key={`${ingredient}-${index}`}
                                  className={styles["ingredientItem"]}>
                                  {ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Instructions */}
                        {recipe.instructions && (
                          <div className={styles["instructionsSection"]}>
                            <h4 className={styles["sectionTitle"]}>{t("recipe.instructions")}</h4>
                            <p className={styles["instructionsText"]}>{recipe.instructions}</p>
                          </div>
                        )}

                        {/* External Link */}
                        {hasValidReference && (
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
                  );
                })}
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
          <TabsContent
            value='assistant'
            className={styles["tabsContent"]}>
            <LocalInvoiceAssistantPanel
              activeInvoiceId={invoice.id}
              invoices={[invoice]}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
