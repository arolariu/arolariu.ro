"use client";

import {formatEnum} from "@/lib/utils.generic";
import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {TbChefHat, TbClock, TbExternalLink, TbInfoCircle} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

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
              <div className='grid gap-4 sm:grid-cols-2'>
                {invoice.possibleRecipes.map((recipe) => (
                  <Card
                    key={recipe.name}
                    className='transition-shadow duration-300 hover:shadow-md'>
                    <CardHeader className='pb-2'>
                      <div className='flex items-start justify-between gap-2'>
                        <CardTitle className='text-base'>{recipe.name}</CardTitle>
                        <Badge variant={getComplexityVariant(recipe.complexity)}>{formatEnum(RecipeComplexity, recipe.complexity)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <p className='text-muted-foreground line-clamp-2 text-sm'>{recipe.description}</p>
                      <div className='flex items-center gap-4 text-sm'>
                        <div className='text-muted-foreground flex items-center gap-1'>
                          <TbClock className='h-4 w-4' />
                          <span>{recipe.duration} min</span>
                        </div>
                        <div className='text-muted-foreground'>
                          Prep: {recipe.preparationTime}m • Cook: {recipe.cookingTime}m
                        </div>
                      </div>
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
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center py-8 text-center'>
                <TbChefHat className='text-muted-foreground/50 h-12 w-12' />
                <p className='text-muted-foreground mt-2'>No recipe suggestions available</p>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value='info'
            className='mt-0'>
            {Object.keys(invoice.additionalMetadata).length > 0 ? (
              <dl className='space-y-3'>
                {Object.entries(invoice.additionalMetadata).map(([key, value]) => (
                  <div
                    key={key}
                    className='border-border flex justify-between gap-4 border-b pb-2 last:border-0'>
                    <dt className='text-muted-foreground text-sm font-medium'>{key}</dt>
                    <dd className='text-right text-sm'>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className='flex flex-col items-center justify-center py-8 text-center'>
                <TbInfoCircle className='text-muted-foreground/50 h-12 w-12' />
                <p className='text-muted-foreground mt-2'>No additional information available</p>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
