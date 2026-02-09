"use client";

import {Card, CardContent, CardHeader, Skeleton} from "@arolariu/components";
import styles from "./ProfileSkeleton.module.scss";

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className={styles["wrapper"]}>
      {/* Header Skeleton */}
      <Card>
        <div className={styles["banner"]} />
        <CardContent className={styles["headerBody"]}>
          <div className={styles["headerRow"]}>
            <Skeleton className='h-24 w-24 rounded-full' />
            <div className={styles["textGroup"]}>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-32' />
              <div className={styles["badgeRow"]}>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-5 w-24' />
              </div>
            </div>
          </div>
          <div className={styles["progressGroup"]}>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-2 w-full' />
          </div>
        </CardContent>
      </Card>

      {/* Layout Skeleton: sidebar + content */}
      <div className={styles["layoutRow"]}>
        <div className={styles["sidebarSkeleton"]}>
          {Array.from({length: 7}).map((_, index) => (
            <Skeleton
              key={`sidebar-pill-${index.toString()}`}
              className={styles["sidebarPill"]}
            />
          ))}
        </div>

        <div className={styles["contentArea"]}>
          <div className={styles["contentGrid"]}>
            {Array.from({length: 4}).map((_, index) => (
              <Card key={`skeleton-card-${index.toString()}`}>
                <CardHeader>
                  <div className={styles["cardHeaderRow"]}>
                    <Skeleton className='h-4 w-4' />
                    <Skeleton className='h-4 w-32' />
                  </div>
                  <Skeleton className='h-3 w-48' />
                </CardHeader>
                <CardContent className='space-y-4'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
