/**
 * @fileoverview Invoice detail tabs component with recipes, metadata, and AI assistant.
 *
 * Displays AI-generated recipes, invoice metadata, and local AI assistant panel
 * in tabbed layout for invoice detail view.
 *
 * @module app/domains/invoices/view-invoice/[id]/_components/tabs/InvoiceTabs
 */

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

function createIngredientListItems(ingredients: ReadonlyArray<string>): Array<Readonly<{ingredient: string; key: string}>> {
  const occurrenceCounts = new Map<string, number>();

  return ingredients.map((ingredient) => {
    const occurrence = (occurrenceCounts.get(ingredient) ?? 0) + 1;
    occurrenceCounts.set(ingredient, occurrence);

    return {
      ingredient,
      key: `${ingredient}-${occurrence}`,
    };
  });
}

/**
 * Invoice detail tabs component with recipes, metadata, and AI assistant.
 *
 * @returns Tabbed interface with three views: recipes, metadata, and local AI chat.
 *
 * @remarks
 * **Tabs:**
 * 1. **Possible Recipes**: AI-generated recipe suggestions with full details
 *    - Recipe name, description, complexity badge
 *    - Time breakdown (preparation + cooking)
 *    - Ingredients list from invoice line items
 *    - Cooking instructions (if available)
 *    - External recipe link (if valid URL)
 * 2. **Additional Info**: Invoice metadata key-value pairs
 * 3. **AI Assistant**: Local-only AI chat scoped to current invoice
 *
 * **Privacy:**
 * - AI assistant scoped to single invoice (`activeInvoiceId`)
 * - All processing client-side (no server requests)
 *
 * **Accessibility:**
 * - Icon + text labels for tabs
 * - Empty states with descriptive messages
 * - Semantic HTML for recipe cards
 *
 * @example
 * ```tsx
 * // Used in invoice detail page
 * <InvoiceTabs />
 * ```
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
                  const hasInstructions = recipe.instructions.trim().length > 0;
                  const hasValidReference = Boolean(
                    recipe.referenceForMoreDetails
                    && recipe.referenceForMoreDetails !== "https://arolariu.ro"
                    && recipe.referenceForMoreDetails !== "",
                  );
                  const ingredientItems = createIngredientListItems(recipe.ingredients);

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
                          {recipe.preparationTime > 0 && recipe.cookingTime > 0 ? (
                            <div className={styles["recipeDetailMuted"]}>
                              {t("recipe.prepCook", {prep: String(recipe.preparationTime), cook: String(recipe.cookingTime)})}
                            </div>
                          ) : null}
                        </div>

                        {/* Ingredients List */}
                        {ingredientItems.length > 0 ? (
                          <div className={styles["ingredientsSection"]}>
                            <div className={styles["ingredientsHeader"]}>
                              <TbToolsKitchen2 className={styles["sectionIcon"]} />
                              <h4 className={styles["sectionTitle"]}>{t("recipe.ingredients")}</h4>
                            </div>
                            <ul className={styles["ingredientsList"]}>
                              {ingredientItems.map(({ingredient, key}) => (
                                <li
                                  key={key}
                                  className={styles["ingredientItem"]}>
                                  {ingredient}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Instructions */}
                        {hasInstructions ? (
                          <div className={styles["instructionsSection"]}>
                            <h4 className={styles["sectionTitle"]}>{t("recipe.instructions")}</h4>
                            <p className={styles["instructionsText"]}>{recipe.instructions}</p>
                          </div>
                        ) : null}

                        {/* External Link */}
                        {hasValidReference ? (
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
                        ) : null}
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
