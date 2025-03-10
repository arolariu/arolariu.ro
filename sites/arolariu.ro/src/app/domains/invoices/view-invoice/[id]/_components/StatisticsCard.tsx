/** @format */

"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {motion} from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  HelpCircle,
  LineChart,
  PieChart,
  Share,
  ShoppingBag,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";

type Props = {
  merchantName: string;
  totalSpent: number;
  currency: string;
  category: string;
  onShareClick?: () => void;
  onFeedbackClick?: () => void;
};

export function StatisticsCard({merchantName, totalSpent, currency, category}: Readonly<Props>) {
  // Mock data for statistics
  const averageTransaction = 112.5;
  const percentChange = 8.5;
  const isIncrease = totalSpent > averageTransaction;
  const visitFrequency = "2.5 times per month";
  const lastVisit = "5 days ago";

  // Mock spending by category data
  const spendingByCategory = [
    {category: "Produce", percentage: 35},
    {category: "Dairy", percentage: 25},
    {category: "Meat", percentage: 20},
    {category: "Bakery", percentage: 10},
    {category: "Other", percentage: 10},
  ];

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center justify-between text-lg'>
          <span>Spending Statistics</span>
          <Badge
            variant='outline'
            className='ml-2'>
            {category}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>Total Spent</p>
            <div className='flex items-center'>
              <DollarSign className='text-muted-foreground mr-1 h-4 w-4' />
              <p className='text-xl font-bold'>{formatCurrency(totalSpent)}</p>
            </div>
          </div>

          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>Compared to Average</p>
            <div className='flex items-center'>
              {isIncrease ? (
                <motion.div
                  initial={{scale: 0.8}}
                  animate={{scale: 1}}
                  className='text-destructive flex items-center'>
                  <ArrowUpRight className='mr-1 h-4 w-4' />
                  <p className='text-xl font-bold'>+{percentChange}%</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{scale: 0.8}}
                  animate={{scale: 1}}
                  className='flex items-center text-success'>
                  <ArrowDownRight className='mr-1 h-4 w-4' />
                  <p className='text-xl font-bold'>-{percentChange}%</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <ShoppingBag className='text-muted-foreground mr-2 h-4 w-4' />
              <span className='text-sm'>Visit Frequency</span>
            </div>
            <span className='font-medium'>{visitFrequency}</span>
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <CreditCard className='text-muted-foreground mr-2 h-4 w-4' />
              <span className='text-sm'>Average Transaction</span>
            </div>
            <span className='font-medium'>{formatCurrency(averageTransaction)}</span>
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <TrendingUp className='text-muted-foreground mr-2 h-4 w-4' />
              <span className='text-sm'>Last Visit</span>
            </div>
            <span className='font-medium'>{lastVisit}</span>
          </div>
        </div>

        <Separator />

        <div className='space-y-2'>
          <p className='text-sm font-medium'>Spending by Category</p>
          <div className='space-y-2'>
            {spendingByCategory.map((item, index) => (
              <div
                key={index}
                className='space-y-1'>
                <div className='flex justify-between text-sm'>
                  <span>{item.category}</span>
                  <span>{item.percentage}%</span>
                </div>
                <motion.div
                  initial={{width: 0}}
                  animate={{width: `${item.percentage}%`}}
                  transition={{duration: 0.5, delay: index * 0.1}}
                  className='h-2 rounded-full bg-primary'
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpandedStatisticsCard({merchantName, totalSpent, currency, category, onShareClick, onFeedbackClick}: Readonly<Props>) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Mock data for statistics
  const averageTransaction = 112.5;
  const percentChange = 8.5;
  const isIncrease = totalSpent > averageTransaction;
  const visitFrequency = "2.5 times per month";
  const lastVisit = "5 days ago";

  // Mock spending by category data
  const spendingByCategory = [
    {category: "Produce", percentage: 35, color: "bg-green-500"},
    {category: "Dairy", percentage: 25, color: "bg-blue-400"},
    {category: "Meat", percentage: 20, color: "bg-red-400"},
    {category: "Bakery", percentage: 10, color: "bg-yellow-400"},
    {category: "Other", percentage: 10, color: "bg-gray-400"},
  ];

  // Mock monthly spending data
  const monthlySpending = [
    {month: "Jan", amount: 95.2},
    {month: "Feb", amount: 110.45},
    {month: "Mar", amount: 127.85},
    {month: "Apr", amount: 105.3},
    {month: "May", amount: 142.75},
    {month: "Jun", amount: 118.9},
  ];

  // Mock similar merchants data
  const similarMerchants = [
    {name: "Trader Joe's", avgSpend: 98.5},
    {name: "Safeway", avgSpend: 115.25},
    {name: "Kroger", avgSpend: 105.75},
    {name: "Albertsons", avgSpend: 95.3},
  ];

  // Find the highest monthly spending for chart scaling
  const maxMonthlySpend = Math.max(...monthlySpending.map((m) => m.amount));

  return (
    <Card className='w-full'>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center text-lg'>
            <span>Spending Analytics</span>
            <Badge
              variant='outline'
              className='ml-2'>
              {category}
            </Badge>
          </CardTitle>
          <div className='flex gap-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={onFeedbackClick}>
                    <ThumbsUp className='mr-1 h-4 w-4' />
                    Feedback
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Provide feedback on these analytics</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={onShareClick}>
                    <Share className='mr-1 h-4 w-4' />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share these analytics</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Tabs defaultValue='overview'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='overview'>
              <PieChart className='mr-2 h-4 w-4' />
              Overview
            </TabsTrigger>
            <TabsTrigger value='trends'>
              <LineChart className='mr-2 h-4 w-4' />
              Trends
            </TabsTrigger>
            <TabsTrigger value='comparison'>
              <BarChart3 className='mr-2 h-4 w-4' />
              Comparison
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent
            value='overview'
            className='space-y-4 pt-4'>
            <div className='grid grid-cols-2 gap-4'>
              <motion.div
                className='space-y-1'
                whileHover={{scale: 1.02}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className='text-muted-foreground flex items-center text-sm'>
                        Total Spent
                        <HelpCircle className='text-muted-foreground ml-1 h-3 w-3' />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total amount spent at this merchant</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className='flex items-center'>
                  <DollarSign className='mr-1 h-4 w-4 text-primary' />
                  <p className='text-xl font-bold'>{formatCurrency(totalSpent)}</p>
                </div>
              </motion.div>

              <motion.div
                className='space-y-1'
                whileHover={{scale: 1.02}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className='text-muted-foreground flex items-center text-sm'>
                        Compared to Average
                        <HelpCircle className='text-muted-foreground ml-1 h-3 w-3' />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How this purchase compares to your average spending at {merchantName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className='flex items-center'>
                  {isIncrease ? (
                    <motion.div
                      initial={{scale: 0.8}}
                      animate={{scale: 1}}
                      className='text-destructive flex items-center'>
                      <ArrowUpRight className='mr-1 h-4 w-4' />
                      <p className='text-xl font-bold'>+{percentChange}%</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{scale: 0.8}}
                      animate={{scale: 1}}
                      className='flex items-center text-success'>
                      <ArrowDownRight className='mr-1 h-4 w-4' />
                      <p className='text-xl font-bold'>-{percentChange}%</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            <Separator />

            <div className='space-y-3'>
              <motion.div
                className='flex items-center justify-between'
                whileHover={{x: 5}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <div className='flex items-center'>
                  <ShoppingBag className='mr-2 h-4 w-4 text-primary' />
                  <span className='text-sm'>Visit Frequency</span>
                </div>
                <span className='font-medium'>{visitFrequency}</span>
              </motion.div>

              <motion.div
                className='flex items-center justify-between'
                whileHover={{x: 5}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <div className='flex items-center'>
                  <CreditCard className='mr-2 h-4 w-4 text-primary' />
                  <span className='text-sm'>Average Transaction</span>
                </div>
                <span className='font-medium'>{formatCurrency(averageTransaction)}</span>
              </motion.div>

              <motion.div
                className='flex items-center justify-between'
                whileHover={{x: 5}}
                transition={{type: "spring", stiffness: 400, damping: 10}}>
                <div className='flex items-center'>
                  <TrendingUp className='mr-2 h-4 w-4 text-primary' />
                  <span className='text-sm'>Last Visit</span>
                </div>
                <span className='font-medium'>{lastVisit}</span>
              </motion.div>
            </div>

            <Separator />

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Spending by Category</p>
              <div className='space-y-3'>
                {spendingByCategory.map((item, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          className='cursor-help space-y-1'
                          whileHover={{scale: 1.01}}
                          transition={{type: "spring", stiffness: 400, damping: 10}}>
                          <div className='flex justify-between text-sm'>
                            <span>{item.category}</span>
                            <span>{item.percentage}%</span>
                          </div>
                          <div className='bg-muted h-2 overflow-hidden rounded-full'>
                            <motion.div
                              initial={{width: 0}}
                              animate={{width: `${item.percentage}%`}}
                              transition={{duration: 0.5, delay: index * 0.1}}
                              className={`h-full ${item.color} rounded-full`}
                            />
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          You spent {formatCurrency(totalSpent * (item.percentage / 100))} on {item.category.toLowerCase()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent
            value='trends'
            className='space-y-4 pt-4'>
            <p className='text-sm font-medium'>Monthly Spending at {merchantName}</p>

            <div className='flex h-40 items-end justify-between gap-2'>
              {monthlySpending.map((month, index) => {
                const heightPercentage = (month.amount / maxMonthlySpend) * 100;
                const isCurrentMonth = index === monthlySpending.length - 1;

                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className='flex flex-1 flex-col items-center gap-1'>
                          <motion.div
                            initial={{height: 0}}
                            animate={{height: `${heightPercentage}%`}}
                            transition={{duration: 0.5, delay: index * 0.1}}
                            className={`w-full rounded-t-md ${isCurrentMonth ? "bg-primary" : "bg-primary/60"}`}
                            whileHover={{
                              scale: 1.05,
                              backgroundColor: isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.8)",
                            }}
                          />
                          <span className='text-xs'>{month.month}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {month.month}: {formatCurrency(month.amount)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            <Separator />

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Spending Insights</p>
              <motion.div
                className='bg-muted/50 rounded-md p-3'
                whileHover={{scale: 1.01, backgroundColor: "hsl(var(--muted))"}}>
                <p className='text-sm'>
                  Your spending at {merchantName} has {isIncrease ? "increased" : "decreased"} by {percentChange}% compared to your average.
                  {isIncrease
                    ? " This might be due to seasonal items or special promotions."
                    : " This could be a result of buying fewer items or taking advantage of discounts."}
                </p>
              </motion.div>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent
            value='comparison'
            className='space-y-4 pt-4'>
            <p className='text-sm font-medium'>How {merchantName} Compares to Similar Merchants</p>

            <div className='space-y-3'>
              {[merchantName, ...similarMerchants.map((m) => m.name)].map((name, index) => {
                const amount = name === merchantName ? totalSpent : similarMerchants.find((m) => m.name === name)?.avgSpend || 0;

                const maxAmount = Math.max(totalSpent, ...similarMerchants.map((m) => m.avgSpend));
                const widthPercentage = (amount / maxAmount) * 100;
                const isCurrent = name === merchantName;

                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          className='cursor-help space-y-1'
                          whileHover={{scale: 1.01}}>
                          <div className='flex justify-between text-sm'>
                            <span className={isCurrent ? "font-medium" : ""}>{name}</span>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                          <div className='bg-muted h-2 overflow-hidden rounded-full'>
                            <motion.div
                              initial={{width: 0}}
                              animate={{width: `${widthPercentage}%`}}
                              transition={{duration: 0.5, delay: index * 0.1}}
                              className={`h-full ${isCurrent ? "bg-primary" : "bg-primary/60"} rounded-full`}
                            />
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Average transaction at {name}: {formatCurrency(amount)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            <Separator />

            <div className='space-y-2'>
              <p className='text-sm font-medium'>Value Analysis</p>
              <motion.div
                className='bg-muted/50 rounded-md p-3'
                whileHover={{scale: 1.01, backgroundColor: "hsl(var(--muted))"}}>
                <p className='text-sm'>
                  {totalSpent > similarMerchants.reduce((sum, m) => sum + m.avgSpend, 0) / similarMerchants.length
                    ? `You tend to spend more at ${merchantName} compared to similar stores. This could be due to premium products or larger purchases.`
                    : `You spend less at ${merchantName} compared to similar stores. This suggests you might be getting better value or purchasing fewer items.`}
                </p>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
