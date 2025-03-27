/** @format */

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";

export default async function Loading() {
  return (
    <div className='container mx-auto max-w-7xl py-10'>
      {/* Header skeleton */}
      <div className='mb-10 text-center'>
        <Skeleton className='mx-auto mb-2 h-10 w-64' />
        <Skeleton className='mx-auto mb-1 h-4 w-96' />
        <Skeleton className='mx-auto h-4 w-80' />
      </div>

      {/* Last updated skeleton */}
      <div className='mb-6 text-center'>
        <Skeleton className='mx-auto h-4 w-56' />
      </div>

      {/* Search and filter controls skeleton */}
      <div className='mb-6 space-y-4'>
        <div className='relative mx-auto max-w-md'>
          <Skeleton className='h-10 w-full' />
        </div>

        <div className='mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row'>
          <Skeleton className='h-10 flex-1' />
          <Skeleton className='h-10 flex-1' />
          <Skeleton className='h-10 flex-1' />
        </div>
      </div>

      {/* Tabs skeleton */}
      <Tabs
        defaultValue='grid'
        className='w-full'>
        <TabsList className='mx-auto mb-8 grid w-full max-w-md grid-cols-2'>
          <TabsTrigger
            value='grid'
            disabled>
            Grid View
          </TabsTrigger>
          <TabsTrigger
            value='table'
            disabled>
            Table View
          </TabsTrigger>
        </TabsList>

        <div className='min-h-[600px]'>
          <TabsContent
            value='grid'
            className='w-full'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
              {Array(9)
                .fill(0)
                .map((_, index) => (
                  <Card
                    key={index}
                    className='h-full'>
                    <CardHeader>
                      <div className='flex items-center justify-between'>
                        <Skeleton className='h-6 w-32' />
                        <Skeleton className='h-5 w-16 rounded-full' />
                      </div>
                      <div className='mt-2 flex items-center'>
                        <Skeleton className='h-5 w-24 rounded-full' />
                      </div>
                      <div className='mt-2 space-y-2'>
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-full' />
                        <Skeleton className='h-4 w-3/4' />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='flex flex-col space-y-2'>
                        <div className='flex items-center'>
                          <Skeleton className='mr-2 h-4 w-24' />
                          <Skeleton className='h-4 w-16' />
                        </div>
                        <div className='flex items-center'>
                          <Skeleton className='mr-2 h-4 w-28' />
                          <Skeleton className='h-4 w-8' />
                        </div>
                        <div className='mt-4 flex items-center justify-between'>
                          <Skeleton className='h-8 w-24' />
                          <Skeleton className='h-8 w-32' />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value='table'>
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className='h-4 w-24' />
                    </TableHead>
                    <TableHead>
                      <Skeleton className='h-4 w-16' />
                    </TableHead>
                    <TableHead>
                      <Skeleton className='h-4 w-12' />
                    </TableHead>
                    <TableHead className='hidden md:table-cell'>
                      <Skeleton className='h-4 w-32' />
                    </TableHead>
                    <TableHead>
                      <Skeleton className='h-4 w-16' />
                    </TableHead>
                    <TableHead>
                      <Skeleton className='h-4 w-24' />
                    </TableHead>
                    <TableHead>
                      <Skeleton className='h-4 w-16' />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(8)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className='h-4 w-32' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-16' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-5 w-24 rounded-full' />
                        </TableCell>
                        <TableCell className='hidden md:table-cell'>
                          <Skeleton className='h-4 w-full' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-4 w-12' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='h-8 w-28' />
                        </TableCell>
                        <TableCell>
                          <Skeleton className='mx-auto h-8 w-8 rounded-md' />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer skeleton */}
      <div className='mt-16 text-center'>
        <div className='mb-4 flex items-center justify-center'>
          <Skeleton className='mr-2 h-6 w-6' />
          <Skeleton className='h-6 w-48' />
        </div>
        <Skeleton className='mx-auto mb-1 h-4 w-96' />
        <Skeleton className='mx-auto h-4 w-80' />
      </div>
    </div>
  );
}
