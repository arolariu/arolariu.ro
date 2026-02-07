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
import styles from "./loading.module.scss";

const GRID_SKELETON_KEYS = [
  "ack-grid-skel-1",
  "ack-grid-skel-2",
  "ack-grid-skel-3",
  "ack-grid-skel-4",
  "ack-grid-skel-5",
  "ack-grid-skel-6",
  "ack-grid-skel-7",
  "ack-grid-skel-8",
  "ack-grid-skel-9",
] as const;

const TABLE_SKELETON_KEYS = [
  "ack-table-skel-1",
  "ack-table-skel-2",
  "ack-table-skel-3",
  "ack-table-skel-4",
  "ack-table-skel-5",
  "ack-table-skel-6",
  "ack-table-skel-7",
  "ack-table-skel-8",
] as const;

/**
 * This component renders a loading skeleton for the acknowledgements page.
 * It displays placeholders for the header, last updated date, search and filter controls,
 * tabs, and footer.
 * The skeletons are used to indicate that the content is being loaded.
 * @returns The loading skeleton for the acknowledgements page.
 */
export default function Loading(): React.JSX.Element {
  return (
    <div className={styles["container"]}>
      {/* Header skeleton */}
      <div className={styles["headerSkeleton"]}>
        <Skeleton className='mx-auto mb-2 h-10 w-64' />
        <Skeleton className='mx-auto mb-1 h-4 w-96' />
        <Skeleton className='mx-auto h-4 w-80' />
      </div>

      {/* Last updated skeleton */}
      <div className={styles["lastUpdatedSkeleton"]}>
        <Skeleton className='mx-auto h-4 w-56' />
      </div>

      {/* Search and filter controls skeleton */}
      <div className={styles["filtersSkeleton"]}>
        <div className={styles["searchSkeleton"]}>
          <Skeleton className='h-10 w-full' />
        </div>

        <div className={styles["filterRowSkeleton"]}>
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

        <div className={styles["tabsContentWrapper"]}>
          <TabsContent
            value='grid'
            className='w-full'>
            <div className={styles["gridSkeleton"]}>
              {GRID_SKELETON_KEYS.map((key) => (
                <Card
                  key={key}
                  className='h-full'>
                  <CardHeader>
                    <div className={styles["cardHeaderRow"]}>
                      <Skeleton className='h-6 w-32' />
                      <Skeleton className='h-5 w-16 rounded-full' />
                    </div>
                    <div className={styles["cardBadgeRow"]}>
                      <Skeleton className='h-5 w-24 rounded-full' />
                    </div>
                    <div className={styles["cardDescriptionSkeleton"]}>
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-full' />
                      <Skeleton className='h-4 w-3/4' />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={styles["cardDetailColumn"]}>
                      <div className={styles["cardDetailRow"]}>
                        <Skeleton className='mr-2 h-4 w-24' />
                        <Skeleton className='h-4 w-16' />
                      </div>
                      <div className={styles["cardDetailRow"]}>
                        <Skeleton className='mr-2 h-4 w-28' />
                        <Skeleton className='h-4 w-8' />
                      </div>
                      <div className={styles["cardActionsRow"]}>
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
            <div className={styles["tableBorder"]}>
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
                    <TableHead className={styles["hiddenMd"]}>
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
                  {TABLE_SKELETON_KEYS.map((key) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Skeleton className='h-4 w-32' />
                      </TableCell>
                      <TableCell>
                        <Skeleton className='h-4 w-16' />
                      </TableCell>
                      <TableCell>
                        <Skeleton className='h-5 w-24 rounded-full' />
                      </TableCell>
                      <TableCell className={styles["hiddenMd"]}>
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
      <div className={styles["footerSkeleton"]}>
        <div className={styles["footerHeaderSkeleton"]}>
          <Skeleton className='mr-2 h-6 w-6' />
          <Skeleton className='h-6 w-48' />
        </div>
        <Skeleton className='mx-auto mb-1 h-4 w-96' />
        <Skeleton className='mx-auto h-4 w-80' />
      </div>
    </div>
  );
}
