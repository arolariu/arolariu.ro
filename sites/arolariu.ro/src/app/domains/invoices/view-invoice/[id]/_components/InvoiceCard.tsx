/** @format */

"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {Currency} from "@/types/DDD";
import {InvoiceCategory, Merchant, RecipeComplexity, type Invoice, type Product, type Recipe} from "@/types/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {AnimatePresence, motion} from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Clock,
  CreditCard,
  Edit,
  Edit2,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Trash,
  User,
  Utensils,
} from "lucide-react";
import {useState} from "react";
import {CurrencySelector} from "./CurrencySelector";
import {InvoiceAnalysisDialog} from "./dialogs/Analysis";
import {EditItemsDialog} from "./dialogs/EditItems";
import {ExportDialog} from "./dialogs/Export";
import {FeedbackDialog} from "./dialogs/Feedback";
import {MerchantDetailsDialog} from "./dialogs/MerchantDetails";
import {MerchantReceiptsDialog} from "./dialogs/MerchantReceipts";
import {MetadataDialog, VALID_METADATA_KEYS} from "./dialogs/Metadata";
import {RecipeDialog} from "./dialogs/Recipe";
import {ShareAnalyticsDialog} from "./dialogs/ShareAnalytics";
import {ExpandedStatisticsCard} from "./StatisticsCard";
import {TriviaTipsCard} from "./TriviaTips";

// Animation variants for Framer Motion
const containerVariants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Animation variants for Framer Motion
const itemVariants = {
  hidden: {y: 20, opacity: 0},
  visible: {
    y: 0,
    opacity: 1,
    transition: {type: "spring", stiffness: 300, damping: 24},
  },
};

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

export default function InvoiceCard({invoice, merchant}: Readonly<Props>) {
  // Dialog handlers:
  const [metadataDialogOpen, setMetadataDialogOpen] = useState<boolean>(false);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [merchantDialogOpen, setMerchantDialogOpen] = useState<boolean>(false);
  const [merchantReceiptsDialogOpen, setMerchantReceiptsDialogOpen] = useState<boolean>(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState<boolean>(false);
  const [editItemsDialogOpen, setEditItemsDialogOpen] = useState<boolean>(false);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState<boolean>(false);
  const [shareAnalyticsDialogOpen, setShareAnalyticsDialogOpen] = useState<boolean>(false);
  const [recipeDialogMode, setRecipeDialogMode] = useState<"view" | "edit" | "add">("view");
  const [metadataDialogMode, setMetadataDialogMode] = useState<"add" | "edit">("add");

  // Recipe state and dialogs
  const [recipes, setRecipes] = useState<Recipe[]>(invoice.possibleRecipes);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | undefined>(undefined);

  // Items state
  const [items, setItems] = useState<Product[]>(invoice.items);
  const [totalAmount, setTotalAmount] = useState<number>(invoice.paymentInformation?.totalCostAmount ?? -1);

  // Metadata state and dialogs
  const [metadata, setMetadata] = useState<Record<string, string>>(invoice.additionalMetadata);
  const [currentMetadataKey, setCurrentMetadataKey] = useState<string | undefined>(undefined);

  // Delete confirmation dialog
  const [itemToDelete, setItemToDelete] = useState<{type: "recipe" | "metadata"; id: string}>({
    type: "recipe",
    id: "",
  });

  // Add these new state variables after the existing state declarations
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(invoice.paymentInformation?.currency!);

  // Recipe handlers
  const handleViewRecipe = (recipe: Recipe) => {};

  const handleAddRecipe = () => {};

  const handleEditRecipe = (recipe: Recipe) => {};

  const handleSaveRecipe = (recipe: Recipe) => {};

  const handleDeleteRecipe = (recipeId: string) => {};

  const confirmDelete = () => {};

  // Items handlers
  const handleSaveItems = (updatedItems: typeof items) => {};

  // Metadata handlers
  const handleAddMetadata = () => {};

  const handleEditMetadata = (key: string) => {};

  const handleSaveMetadata = (key: string, value: string) => {};

  const handleDeleteMetadata = (key: string) => {};

  // Check if a metadata field is readonly
  const isMetadataReadonly = (key: string) => {
    return VALID_METADATA_KEYS.find((item) => item.key === key)?.readonly || false;
  };

  // Get the display label for a metadata key
  const getMetadataLabel = (key: string) => {
    return VALID_METADATA_KEYS.find((item) => item.key === key)?.label || key.replace(/([A-Z])/g, " $1").trim();
  };

  // Add this function after the other handler functions
  const handleCurrencyChange = (newCurrency: string) => {};

  // Update the button handlers in the header section
  return (
    <div className='container mx-auto max-w-5xl px-4 py-6'>
      <motion.div
        initial={{opacity: 0, y: -20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5}}
        className='mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>{invoice.name}</h1>
          <p className='text-muted-foreground'>{invoice.id}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <CurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>
      </motion.div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {/* Left column - Invoice details */}
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='space-y-6 md:col-span-2'>
          <motion.div variants={itemVariants}>
            <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle>Invoice Details</CardTitle>
                  <Badge
                    variant='default'
                    className='transition-transform group-hover:scale-105'>
                    {invoice.isImportant ? "Important" : "Normal"}
                  </Badge>
                </div>
                <CardDescription>From {merchant.name}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <motion.div
                    whileHover={{scale: 1.02}}
                    transition={{type: "spring", stiffness: 400, damping: 10}}>
                    <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Date</h3>
                    <p>{formatDate(invoice.paymentInformation?.transactionDate!)}</p>
                  </motion.div>
                  <motion.div
                    whileHover={{scale: 1.02}}
                    transition={{type: "spring", stiffness: 400, damping: 10}}>
                    <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Category</h3>
                    <Badge variant='outline'>{invoice.category}</Badge>
                  </motion.div>
                  <motion.div
                    whileHover={{scale: 1.02}}
                    transition={{type: "spring", stiffness: 400, damping: 10}}>
                    <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Payment Method</h3>
                    <div className='flex items-center'>
                      <CreditCard className='text-muted-foreground mr-2 h-4 w-4' />
                      <span>{invoice.paymentInformation?.paymentType}</span>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{scale: 1.02}}
                    transition={{type: "spring", stiffness: 400, damping: 10}}>
                    <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Total Amount</h3>
                    <p className='text-lg font-semibold'>
                      {formatCurrency(totalAmount, invoice.paymentInformation?.currency || "USD")}
                    </p>
                  </motion.div>
                </div>

                <Separator />

                <div>
                  <div className='mb-2 flex items-center justify-between'>
                    <h3 className='text-sm font-medium'>Items</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setEditItemsDialogOpen(true)}
                            className='h-8'>
                            <Edit2 className='mr-1 h-3.5 w-3.5' />
                            Edit Items
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit invoice items and quantities</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className='overflow-hidden rounded-md border'>
                    <table className='divide-border min-w-full divide-y'>
                      <thead>
                        <tr className='bg-muted/50'>
                          <th className='text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase tracking-wider'>
                            Item
                          </th>
                          <th className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                            Qty
                          </th>
                          <th className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                            Price
                          </th>
                          <th className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-popover divide-border divide-y'>
                        {items.map((item, index) => (
                          <motion.tr
                            key={item.genericName}
                            initial={{opacity: 0, x: -20}}
                            animate={{opacity: 1, x: 0}}
                            transition={{delay: index * 0.05}}
                            className='hover:bg-muted/50'>
                            <td className='whitespace-nowrap px-4 py-3 text-sm'>{item.genericName}</td>
                            <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                              {item.quantity} {item.quantityUnit}
                            </td>
                            <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                              {formatCurrency(item.price, invoice.paymentInformation?.currency || "USD")}
                            </td>
                            <td className='whitespace-nowrap px-4 py-3 text-right text-sm font-medium'>
                              {formatCurrency(
                                item.price * item.quantity,
                                invoice.paymentInformation?.currency || "USD",
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className='bg-muted/50'>
                          <th
                            colSpan={3}
                            className='px-4 py-3 text-right text-sm font-medium'>
                            Total
                          </th>
                          <th className='px-4 py-3 text-right text-sm font-medium'>
                            {formatCurrency(totalAmount, invoice.paymentInformation?.currency || "USD")}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Tabs defaultValue='recipes'>
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='recipes'>
                  <Utensils className='mr-2 h-4 w-4' />
                  Possible Recipes
                </TabsTrigger>
                <TabsTrigger value='metadata'>
                  <ShoppingCart className='mr-2 h-4 w-4' />
                  Additional Info
                </TabsTrigger>
              </TabsList>

              {/* Recipes Tab Content - Updated with interactive features */}
              <AnimatePresence mode='wait'>
                <TabsContent
                  value='recipes'
                  className='mt-4'>
                  <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    transition={{duration: 0.2}}>
                    <Card className='group transition-shadow duration-300 hover:shadow-md'>
                      <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <div>
                          <CardTitle>Recipes You Can Make</CardTitle>
                          <CardDescription>Based on items in this invoice</CardDescription>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={handleAddRecipe}
                                size='sm'>
                                <Plus className='mr-2 h-4 w-4' />
                                Add Recipe
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Create a new recipe with these ingredients</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardHeader>
                      <CardContent>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                          {recipes.map((recipe, index) => (
                            <motion.div
                              key={recipe.name}
                              initial={{opacity: 0, scale: 0.9}}
                              animate={{opacity: 1, scale: 1}}
                              transition={{delay: index * 0.1}}
                              whileHover={{y: -5}}>
                              <Card className='overflow-hidden transition-shadow duration-300 hover:shadow-md'>
                                <div className='p-4'>
                                  <div className='mb-2 flex items-start justify-between'>
                                    <div>
                                      <h3 className='text-lg font-semibold'>{recipe.name}</h3>
                                      <Badge
                                        variant={
                                          recipe.complexity === RecipeComplexity.Easy
                                            ? "default"
                                            : recipe.complexity === RecipeComplexity.Normal
                                              ? "secondary"
                                              : "destructive"
                                        }
                                        className='mt-1'>
                                        {RecipeComplexity[recipe.complexity]}
                                      </Badge>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant='ghost'
                                          size='icon'>
                                          <MoreHorizontal className='h-4 w-4' />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align='end'>
                                        <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                                          <Edit className='mr-2 h-4 w-4' />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteRecipe(recipe.name)}
                                          className='text-destructive focus:text-destructive'>
                                          <Trash className='mr-2 h-4 w-4' />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className='space-y-1'>
                                    <h4 className='text-muted-foreground text-sm'>Ingredients:</h4>
                                    <ul className='list-disc pl-5 text-sm'>
                                      {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                                        <li key={idx}>{ingredient.genericName}</li>
                                      ))}
                                      {recipe.ingredients.length > 3 && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <li className='text-muted-foreground cursor-help'>
                                                +{recipe.ingredients.length - 3} more
                                              </li>
                                            </TooltipTrigger>
                                            <TooltipContent className='max-w-xs'>
                                              <p className='mb-1 font-medium'>Additional ingredients:</p>
                                              <ul className='list-disc pl-5'>
                                                {recipe.ingredients.slice(3).map((ingredient, idx) => (
                                                  <li key={idx}>{ingredient.genericName}</li>
                                                ))}
                                              </ul>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </ul>
                                  </div>

                                  {recipe.preparationTime && recipe.cookingTime && (
                                    <div className='text-muted-foreground mt-2 flex gap-4 text-xs'>
                                      <div className='flex items-center'>
                                        <Clock className='mr-1 h-3 w-3' />
                                        Prep: {recipe.preparationTime}
                                      </div>
                                      <div className='flex items-center'>
                                        <Utensils className='mr-1 h-3 w-3' />
                                        Cook: {recipe.cookingTime}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <CardFooter className='bg-muted/50 px-4 py-2'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    className='group ml-auto'
                                    onClick={() => handleViewRecipe(recipe)}>
                                    View Recipe
                                    <ExternalLink className='ml-2 h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
                                  </Button>
                                </CardFooter>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Metadata Tab Content - Updated with interactive features */}
                <TabsContent
                  value='metadata'
                  className='mt-4'>
                  <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -10}}
                    transition={{duration: 0.2}}>
                    <Card className='group transition-shadow duration-300 hover:shadow-md'>
                      <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <div>
                          <CardTitle>Additional Information</CardTitle>
                          <CardDescription>Metadata associated with this invoice</CardDescription>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={handleAddMetadata}
                                size='sm'>
                                <Plus className='mr-2 h-4 w-4' />
                                Add Field
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add custom metadata to this invoice</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardHeader>
                      <CardContent>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                          {Object.entries(metadata).map(([key, value], index) => (
                            <motion.div
                              key={key}
                              initial={{opacity: 0, scale: 0.9}}
                              animate={{opacity: 1, scale: 1}}
                              transition={{delay: index * 0.05}}
                              whileHover={{scale: 1.02}}
                              className='hover:bg-muted/50 group relative flex flex-col space-y-1 rounded-md border p-3 transition-colors hover:border-primary/50'>
                              <span className='text-muted-foreground text-sm font-medium'>
                                {getMetadataLabel(key)}
                                {isMetadataReadonly(key) && (
                                  <Badge
                                    variant='outline'
                                    className='ml-2 text-xs'>
                                    Readonly
                                  </Badge>
                                )}
                              </span>
                              <span>{value}</span>

                              <div className='absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100'>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant='ghost'
                                      size='icon'
                                      className='h-8 w-8'>
                                      <MoreHorizontal className='h-4 w-4' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align='end'>
                                    <DropdownMenuItem
                                      onClick={() => handleEditMetadata(key)}
                                      disabled={isMetadataReadonly(key)}>
                                      <Edit className='mr-2 h-4 w-4' />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteMetadata(key)}
                                      className='text-destructive focus:text-destructive'
                                      disabled={isMetadataReadonly(key)}>
                                      <Trash className='mr-2 h-4 w-4' />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </motion.div>

          {/* Add the expanded statistics card below the tabs */}
          <motion.div variants={itemVariants}>
            <ExpandedStatisticsCard
              merchantName={merchant.name}
              category={InvoiceCategory[invoice.category]}
              currency={invoice.paymentInformation?.currency.code!}
              totalSpent={totalAmount}
              onShareClick={() => setShareAnalyticsDialogOpen(true)}
              onFeedbackClick={() => setFeedbackDialogOpen(true)}
            />
          </motion.div>
        </motion.div>

        {/* Right column - Sidebar */}
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='space-y-6'>
          <motion.div variants={itemVariants}>
            <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
              <CardHeader>
                <CardTitle>Receipt Image</CardTitle>
              </CardHeader>
              <CardContent className='flex justify-center'>
                <motion.img
                  whileHover={{scale: 1.05}}
                  transition={{type: "spring", stiffness: 300, damping: 10}}
                  src={invoice.photoLocation || "/placeholder.svg"}
                  alt='Invoice receipt'
                  className='w-full rounded-md border object-cover'
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className='group transition-shadow duration-300 hover:shadow-md'>
              <CardHeader>
                <CardTitle>Merchant</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center'>
                  <div className='mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
                    <ShoppingCart className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <p className='font-medium'>{merchant.name}</p>
                    <p className='text-muted-foreground text-sm'>ID: {invoice.merchantReference.substring(0, 8)}...</p>
                  </div>
                </div>
                <div className='space-y-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          className='group w-full'
                          onClick={() => setMerchantDialogOpen(true)}>
                          <span>View Merchant Details</span>
                          <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>See detailed information about this merchant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          className='group w-full'
                          onClick={() => setMerchantReceiptsDialogOpen(true)}>
                          <ShoppingBag className='mr-2 h-4 w-4' />
                          <span>View All Receipts</span>
                          <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View all receipts from this merchant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className='group transition-shadow duration-300 hover:shadow-md'>
              <CardHeader>
                <CardTitle>Sharing</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center'>
                  <div className='mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
                    <User className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <p className='font-medium'>Owner</p>
                    <p className='text-muted-foreground text-sm'>ID: {invoice.userIdentifier.substring(0, 8)}...</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className='mb-2 text-sm font-medium'>Shared With</h3>
                  {invoice.sharedWith.length > 0 ? (
                    <div className='space-y-2'>
                      {invoice.sharedWith.map((userId, index) => (
                        <motion.div
                          key={index}
                          className='flex items-center'
                          initial={{opacity: 0, x: -20}}
                          animate={{opacity: 1, x: 0}}
                          transition={{delay: index * 0.1}}
                          whileHover={{x: 5}}>
                          <div className='bg-muted mr-2 flex h-8 w-8 items-center justify-center rounded-full'>
                            <User className='h-4 w-4' />
                          </div>
                          <span className='text-sm'>User {userId.substring(0, 8)}...</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-muted-foreground text-sm'>Not shared with anyone</p>
                  )}
                </div>

                {/* Update the Share Invoice button in the sharing card */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='outline'
                        className='group w-full'
                        onClick={() => setShareDialogOpen(true)}>
                        <Share2 className='mr-2 h-4 w-4' />
                        <span>Share Invoice</span>
                        <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share this invoice with other users</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <TriviaTipsCard
              merchant={merchant}
              invoice={invoice}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Add Analyze Invoice button at the bottom */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.5, duration: 0.5}}
        className='mt-8 flex justify-center'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='lg'
                onClick={() => setAnalysisDialogOpen(true)}
                className='group relative gap-2 overflow-hidden'>
                <motion.span
                  className='absolute inset-0 bg-primary/20'
                  initial={{x: "-100%"}}
                  whileHover={{x: "100%"}}
                  transition={{duration: 0.8}}
                />
                <BarChart3 className='h-5 w-5' />
                Analyze Invoice
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get detailed insights and analysis of this invoice</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* All dialogs */}
      <ExportDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        invoiceId={invoice.id}
        invoiceName={invoice.name}
      />

      <MerchantDetailsDialog
        open={merchantDialogOpen}
        onOpenChange={setMerchantDialogOpen}
        merchant={merchant}
      />

      <MerchantReceiptsDialog
        open={merchantReceiptsDialogOpen}
        onOpenChange={setMerchantReceiptsDialogOpen}
        merchantName={merchant.name}
        currency={selectedCurrency.code}
      />

      <RecipeDialog
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
        recipe={currentRecipe}
        mode={recipeDialogMode}
        onSave={handleSaveRecipe}
        onDelete={handleDeleteRecipe}
      />

      <MetadataDialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        mode={metadataDialogMode}
        currentKey={currentMetadataKey}
        currentValue={currentMetadataKey ? metadata[currentMetadataKey] : ""}
        existingKeys={Object.keys(metadata)}
        onSave={handleSaveMetadata}
      />

      <InvoiceAnalysisDialog
        open={analysisDialogOpen}
        onOpenChange={setAnalysisDialogOpen}
        invoice={invoice}
      />

      <EditItemsDialog
        open={editItemsDialogOpen}
        onOpenChange={setEditItemsDialogOpen}
        items={invoice.items}
        currency={invoice.paymentInformation.currency.code}
        onSave={handleSaveItems}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {itemToDelete.type === "recipe" ? " recipe" : " metadata field"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CurrencySelector
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
      />

      <ShareAnalyticsDialog
        open={shareAnalyticsDialogOpen}
        onOpenChange={setShareAnalyticsDialogOpen}
        merchantName={merchant.name}
        currency={selectedCurrency.code}
      />

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
      />
    </div>
  );
}
