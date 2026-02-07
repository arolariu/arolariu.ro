"use client";

import {formatEnum} from "@/lib/utils.generic";
import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
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

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <Tabs
        defaultValue='recipes'
        className='w-full'>
        <CardHeader className='pb-0'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger
              value='recipes'
              className='gap-2'>
              <TbChefHat className='h-4 w-4' />
              Possible Recipes
            </TabsTrigger>
            <TabsTrigger
              value='info'
              className='gap-2'>
              <TbInfoCircle className='h-4 w-4' />
              Additional Info
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className='pt-6'>
          <TabsContent
            value='recipes'
            className='mt-0'>
            {invoice.possibleRecipes.length > 0 ? (
              <main className={styles["recipesGrid"]}>
                {invoice.possibleRecipes.map((recipe) => (
                  <Card
                    key={recipe.name}
                    className='transition-shadow duration-300 hover:shadow-md'>
                    <CardHeader className='pb-2'>
                      <main className={styles["recipeHeader"]}>
                        <CardTitle className='text-base'>{recipe.name}</CardTitle>
                        <Badge variant={getComplexityVariant(recipe.complexity)}>{formatEnum(RecipeComplexity, recipe.complexity)}</Badge>
                      </main>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <p className={styles["recipeDescription"]}>{recipe.description}</p>
                      <main className={styles["recipeDetails"]}>
                        <main className={styles["recipeDetailItem"]}>
                          <TbClock className='h-4 w-4' />
                          <span>{recipe.duration} min</span>
                        </main>
                        <main className={styles["recipeDetailMuted"]}>
                          Prep: {recipe.preparationTime}m • Cook: {recipe.cookingTime}m
                        </main>
                      </main>
                      {Boolean(recipe.referenceForMoreDetails) && (
                        <Button
                          variant='link'
                          className='h-auto p-0 text-sm'
                          asChild>
                          <a
                            href={recipe.referenceForMoreDetails}
                            target='_blank'
                            rel='noopener noreferrer'>
                            View Recipe
                            <TbExternalLink className='ml-1 h-3 w-3' />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </main>
            ) : (
              <main className={styles["emptyState"]}>
                <TbChefHat className='text-muted-foreground/50 h-12 w-12' />
                <p className={styles["emptyStateText"]}>No recipe suggestions available</p>
              </main>
            )}
          </TabsContent>
          <TabsContent
            value='info'
            className='mt-0'>
            {Object.keys(invoice.additionalMetadata).length > 0 ? (
              <dl className={styles["metadataList"]}>
                {Object.entries(invoice.additionalMetadata).map(([key, value]) => (
                  <main
                    key={key}
                    className={styles["metadataItem"]}>
                    <dt className={styles["metadataKey"]}>{key}</dt>
                    <dd className={styles["metadataValue"]}>{value}</dd>
                  </main>
                ))}
              </dl>
            ) : (
              <main className={styles["emptyState"]}>
                <TbInfoCircle className='text-muted-foreground/50 h-12 w-12' />
                <p className={styles["emptyStateText"]}>No additional information available</p>
              </main>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
