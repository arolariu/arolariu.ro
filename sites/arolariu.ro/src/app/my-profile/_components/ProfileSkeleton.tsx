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
            <Skeleton style={{height: "6rem", width: "6rem", borderRadius: "9999px"}} />
            <div className={styles["textGroup"]}>
              <Skeleton style={{height: "1.5rem", width: "12rem"}} />
              <Skeleton style={{height: "1rem", width: "8rem"}} />
              <div className={styles["badgeRow"]}>
                <Skeleton style={{height: "1.25rem", width: "6rem"}} />
                <Skeleton style={{height: "1.25rem", width: "6rem"}} />
                <Skeleton style={{height: "1.25rem", width: "6rem"}} />
              </div>
            </div>
          </div>
          <div className={styles["progressGroup"]}>
            <Skeleton style={{height: "1rem", width: "100%"}} />
            <Skeleton style={{height: "0.5rem", width: "100%"}} />
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
                    <Skeleton style={{height: "1rem", width: "1rem"}} />
                    <Skeleton style={{height: "1rem", width: "8rem"}} />
                  </div>
                  <Skeleton style={{height: "0.75rem", width: "12rem"}} />
                </CardHeader>
                <CardContent className={styles["cardContentSpaceY"]}>
                  <Skeleton style={{height: "2.5rem", width: "100%"}} />
                  <Skeleton style={{height: "2.5rem", width: "100%"}} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
