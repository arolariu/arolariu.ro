/** @format */

"use client";
import {formatCurrency} from "@/lib/utils.generic";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {ArrowDownIcon, ArrowUpIcon, BarChart3, DollarSign, LineChart, PieChart, ShoppingCart, TrendingDown, TrendingUp} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
};

export function InvoiceAnalysisDialog({open, onOpenChange, invoice}: Readonly<Props>) {
  // Shorthands:
  const {totalCostAmount, currency} = invoice.paymentInformation!;

  // Calculate some metrics for the analysis
  const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  const averageItemPrice = invoice.items.reduce((sum, item) => sum + item.price, 0) / invoice.items.length;
  const mostExpensiveItem = invoice.items.reduce((prev, current) => (prev.price > current.price ? prev : current));
  const leastExpensiveItem = invoice.items.reduce((prev, current) => (prev.price < current.price ? prev : current));

  // Mock data for spending trends
  const spendingTrends = [
    {month: "Jan", amount: 95.2},
    {month: "Feb", amount: 110.5},
    {month: "Mar", amount: 88.75},
    {month: "Apr", amount: 105.3},
    {month: "May", amount: 120.15},
    {month: "Jun", amount: totalCostAmount},
  ];

  // Mock data for category comparison
  const categoryComparison = {
    average: 115.25,
    difference: totalCostAmount - 115.25,
    percentDifference: ((totalCostAmount - 115.25) / 115.25) * 100,
  };

  // Mock data for price insights
  const priceInsights = [
    {item: "Organic Bananas", status: "higher", percent: 12},
    {item: "Free Range Eggs", status: "lower", percent: 8},
    {item: "Whole Grain Bread", status: "average", percent: 0},
    {item: "Grass-fed Ground Beef", status: "higher", percent: 15},
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[800px]'>
        <DialogHeader>
          <DialogTitle>Invoice Analysis</DialogTitle>
          <DialogDescription>Detailed analysis and insights for {invoice.name}.</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='summary'
          className='mt-4'>
          <TabsList className='grid grid-cols-3'>
            <TabsTrigger value='summary'>
              <PieChart className='mr-2 h-4 w-4' />
              Summary
            </TabsTrigger>
            <TabsTrigger value='trends'>
              <LineChart className='mr-2 h-4 w-4' />
              Spending Trends
            </TabsTrigger>
            <TabsTrigger value='insights'>
              <BarChart3 className='mr-2 h-4 w-4' />
              Price Insights
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent
            value='summary'
            className='mt-4 space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{formatCurrency(totalCostAmount, currency)}</div>
                  <p className='text-muted-foreground text-xs'>{totalItems} items purchased</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>Average Item Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{formatCurrency(averageItemPrice, currency)}</div>
                  <p className='text-muted-foreground text-xs'>Per item average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>Category Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center'>
                    <div className='text-2xl font-bold'>
                      {categoryComparison.percentDifference > 0 ? "+" : ""}
                      {categoryComparison.percentDifference.toFixed(1)}%
                    </div>
                    {categoryComparison.percentDifference > 0 ? (
                      <ArrowUpIcon className='text-destructive ml-2 h-4 w-4' />
                    ) : (
                      <ArrowDownIcon className='ml-2 h-4 w-4 text-success' />
                    )}
                  </div>
                  <p className='text-muted-foreground text-xs'>Compared to your average {InvoiceCategory[invoice.category]} spending</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Price Range</CardTitle>
                <CardDescription>Breakdown of item prices in this invoice</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Least Expensive</span>
                    <span className='font-medium'>Most Expensive</span>
                  </div>
                  <Progress
                    value={75}
                    className='h-2'
                  />
                  <div className='flex justify-between text-sm'>
                    <div>
                      <p className='font-medium'>{leastExpensiveItem.rawName}</p>
                      <p className='text-muted-foreground text-xs'>{formatCurrency(leastExpensiveItem.price, currency)}</p>
                    </div>
                    <div className='text-right'>
                      <p className='font-medium'>{mostExpensiveItem.rawName}</p>
                      <p className='text-muted-foreground text-xs'>{formatCurrency(mostExpensiveItem.price, currency)}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className='mb-3 text-sm font-medium'>Item Price Distribution</h4>
                  <div className='grid grid-cols-3 gap-2'>
                    <div className='bg-muted flex flex-col items-center rounded-md p-3'>
                      <span className='text-muted-foreground mb-1 text-xs'>Budget</span>
                      <span className='font-medium'>33%</span>
                      <span className='text-muted-foreground mt-1 text-xs'>2 items</span>
                    </div>
                    <div className='bg-muted flex flex-col items-center rounded-md p-3'>
                      <span className='text-muted-foreground mb-1 text-xs'>Mid-range</span>
                      <span className='font-medium'>50%</span>
                      <span className='text-muted-foreground mt-1 text-xs'>3 items</span>
                    </div>
                    <div className='bg-muted flex flex-col items-center rounded-md p-3'>
                      <span className='text-muted-foreground mb-1 text-xs'>Premium</span>
                      <span className='font-medium'>17%</span>
                      <span className='text-muted-foreground mt-1 text-xs'>1 item</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent
            value='trends'
            className='mt-4 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Spending at TODO:MERCHANT_NAME</CardTitle>
                <CardDescription>Your spending pattern over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='flex h-[300px] items-end justify-between'>
                  {spendingTrends.map((month, i) => (
                    <div
                      key={i}
                      className='flex flex-col items-center'>
                      <div
                        className={`w-12 ${i === spendingTrends.length - 1 ? "bg-primary" : "bg-muted"} rounded-t-md`}
                        style={{
                          height: `${(month.amount / Math.max(...spendingTrends.map((m) => m.amount))) * 250}px`,
                        }}></div>
                      <div className='text-muted-foreground mt-2 text-xs'>{month.month}</div>
                      <div className='text-xs font-medium'>{formatCurrency(month.amount, currency)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Insights</CardTitle>
                <CardDescription>Analysis of your spending patterns</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='flex items-start space-x-4'>
                    <div className='rounded-full bg-primary/10 p-2'>
                      <TrendingUp className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>Spending Trend</h4>
                      <p className='text-muted-foreground text-sm'>
                        Your spending at TODO:MERCHANT_NAME has increased by 11% compared to last month.
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-4'>
                    <div className='rounded-full bg-primary/10 p-2'>
                      <ShoppingCart className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>Shopping Frequency</h4>
                      <p className='text-muted-foreground text-sm'>You shop at TODO:MERCHANT_NAME about 2.5 times per month on average.</p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-4'>
                    <div className='rounded-full bg-primary/10 p-2'>
                      <DollarSign className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>Average Transaction</h4>
                      <p className='text-muted-foreground text-sm'>
                        Your average transaction at this merchant is {formatCurrency(112.5, currency)}.
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-4'>
                    <div className='rounded-full bg-primary/10 p-2'>
                      <TrendingDown className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='text-sm font-medium'>Saving Opportunity</h4>
                      <p className='text-muted-foreground text-sm'>You could save up to 15% by shopping during promotional periods.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent
            value='insights'
            className='mt-4 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Price Comparison</CardTitle>
                <CardDescription>How your prices compare to market averages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {priceInsights.map((item, i) => (
                    <div
                      key={i}
                      className='space-y-1'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium'>{item.item}</span>
                        <div className='flex items-center'>
                          {item.status === "higher" ? (
                            <>
                              <span className='text-destructive text-sm'>+{item.percent}%</span>
                              <ArrowUpIcon className='text-destructive ml-1 h-4 w-4' />
                            </>
                          ) : item.status === "lower" ? (
                            <>
                              <span className='text-sm text-success'>-{item.percent}%</span>
                              <ArrowDownIcon className='ml-1 h-4 w-4 text-success' />
                            </>
                          ) : (
                            <span className='text-muted-foreground text-sm'>Average price</span>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={item.status === "higher" ? 50 + item.percent : item.status === "lower" ? 50 - item.percent : 50}
                        className='h-2'
                      />
                      <div className='text-muted-foreground flex justify-between text-xs'>
                        <span>Below average</span>
                        <span>Average</span>
                        <span>Above average</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Savings Recommendations</CardTitle>
                <CardDescription>Ways to save on future purchases</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='rounded-md border p-4'>
                  <h4 className='mb-2 font-medium'>Consider alternative brands</h4>
                  <p className='text-muted-foreground mb-2 text-sm'>
                    You could save approximately {formatCurrency(12.5, currency)} by choosing alternative brands for some items.
                  </p>
                  <div className='text-sm'>
                    <span className='font-medium'>Example: </span>
                    <span className='text-muted-foreground'>
                      "Grass-fed Ground Beef" could be replaced with "Store Brand Ground Beef" for a 20% savings.
                    </span>
                  </div>
                </div>

                <div className='rounded-md border p-4'>
                  <h4 className='mb-2 font-medium'>Bulk purchase opportunities</h4>
                  <p className='text-muted-foreground mb-2 text-sm'>
                    Buying in bulk could save you up to 15% on items you purchase frequently.
                  </p>
                  <div className='text-sm'>
                    <span className='font-medium'>Example: </span>
                    <span className='text-muted-foreground'>
                      "Almond Milk" is purchased regularly and available in bulk packs at a discount.
                    </span>
                  </div>
                </div>

                <div className='rounded-md border p-4'>
                  <h4 className='mb-2 font-medium'>Seasonal shopping</h4>
                  <p className='text-muted-foreground mb-2 text-sm'>Some items on your list are out of season and cost more as a result.</p>
                  <div className='text-sm'>
                    <span className='font-medium'>Example: </span>
                    <span className='text-muted-foreground'>"Organic Bananas" are currently imported and more expensive than usual.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
