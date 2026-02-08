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
        <Skeleton className={styles["skelTitle"]} />
        <Skeleton className={styles["skelSubtitleWide"]} />
        <Skeleton className={styles["skelSubtitleNarrow"]} />
      </div>

      {/* Last updated skeleton */}
      <div className={styles["lastUpdatedSkeleton"]}>
        <Skeleton className={styles["skelLastUpdated"]} />
      </div>

      {/* Search and filter controls skeleton */}
      <div className={styles["filtersSkeleton"]}>
        <div className={styles["searchSkeleton"]}>
          <Skeleton className={styles["skelSearchInput"]} />
        </div>

        <div className={styles["filterRowSkeleton"]}>
          <Skeleton className={styles["skelFilterInput"]} />
          <Skeleton className={styles["skelFilterInput"]} />
          <Skeleton className={styles["skelFilterInput"]} />
        </div>
      </div>

      {/* Tabs skeleton */}
      <Tabs
        defaultValue='grid'
        className={styles["tabsFull"]}>
        <TabsList className={styles["tabsListLayout"]}>
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
            className={styles["tabsFull"]}>
            <div className={styles["gridSkeleton"]}>
              {GRID_SKELETON_KEYS.map((key) => (
                <Card
                  key={key}
                  className={styles["cardFullHeight"]}>
                  <CardHeader>
                    <div className={styles["cardHeaderRow"]}>
                      <Skeleton className={styles["skelCardName"]} />
                      <Skeleton className={styles["skelVersionBadge"]} />
                    </div>
                    <div className={styles["cardBadgeRow"]}>
                      <Skeleton className={styles["skelLicenseBadge"]} />
                    </div>
                    <div className={styles["cardDescriptionSkeleton"]}>
                      <Skeleton className={styles["skelLineFull"]} />
                      <Skeleton className={styles["skelLineFull"]} />
                      <Skeleton className={styles["skelLineThreeQuarter"]} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={styles["cardDetailColumn"]}>
                      <div className={styles["cardDetailRow"]}>
                        <Skeleton className={styles["skelLabelSm"]} />
                        <Skeleton className={styles["skelValueSm"]} />
                      </div>
                      <div className={styles["cardDetailRow"]}>
                        <Skeleton className={styles["skelLabelMd"]} />
                        <Skeleton className={styles["skelValueXs"]} />
                      </div>
                      <div className={styles["cardActionsRow"]}>
                        <Skeleton className={styles["skelBtnSm"]} />
                        <Skeleton className={styles["skelBtnMd"]} />
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
                      <Skeleton className={styles["skelColMd"]} />
                    </TableHead>
                    <TableHead>
                      <Skeleton className={styles["skelColSm"]} />
                    </TableHead>
                    <TableHead>
                      <Skeleton className={styles["skelColXs"]} />
                    </TableHead>
                    <TableHead className={styles["hiddenMd"]}>
                      <Skeleton className={styles["skelColLg"]} />
                    </TableHead>
                    <TableHead>
                      <Skeleton className={styles["skelColSm"]} />
                    </TableHead>
                    <TableHead>
                      <Skeleton className={styles["skelColMd"]} />
                    </TableHead>
                    <TableHead>
                      <Skeleton className={styles["skelColSm"]} />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TABLE_SKELETON_KEYS.map((key) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Skeleton className={styles["skelColLg"]} />
                      </TableCell>
                      <TableCell>
                        <Skeleton className={styles["skelColSm"]} />
                      </TableCell>
                      <TableCell>
                        <Skeleton className={styles["skelTableBadge"]} />
                      </TableCell>
                      <TableCell className={styles["hiddenMd"]}>
                        <Skeleton className={styles["skelColFull"]} />
                      </TableCell>
                      <TableCell>
                        <Skeleton className={styles["skelColXs"]} />
                      </TableCell>
                      <TableCell>
                        <Skeleton className={styles["skelActionBtn"]} />
                      </TableCell>
                      <TableCell>
                        <Skeleton className={styles["skelIconBtn"]} />
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
          <Skeleton className={styles["skelFooterIcon"]} />
          <Skeleton className={styles["skelFooterTitle"]} />
        </div>
        <Skeleton className={styles["skelSubtitleWide"]} />
        <Skeleton className={styles["skelSubtitleNarrow"]} />
      </div>
    </div>
  );
}
