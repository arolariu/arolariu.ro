import {Card, CardContent, CardFooter, CardHeader, Skeleton} from "@arolariu/components";
import styles from "./EULA.module.scss";

/**
 * Skeleton loading state for the EULA component.
 * Displayed while the EULA cookie state is being resolved.
 */
export default function EulaShimmer(): React.JSX.Element {
  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["headerCenter"]}>
        <div className={styles["shieldIcon"]}>
          <Skeleton className={styles["shimmerCircle"]} />
        </div>
        <Skeleton className={styles["shimmerTitle"]} />

        <div className={styles["tabsWrapper"]}>
          <Skeleton className={styles["shimmerTabs"]} />
        </div>
      </CardHeader>

      <CardContent className={styles["contentArea"]}>
        <Skeleton className={styles["shimmerContentBlock"]} />

        <div className={styles["policyGrid"]}>
          <Skeleton className={styles["shimmerPolicyCard"]} />
          <Skeleton className={styles["shimmerPolicyCard"]} />
        </div>

        <Skeleton className={styles["shimmerSeparator"]} />

        <div className={styles["cookiesSection"]}>
          <Skeleton className={styles["shimmerCookiesHeader"]} />
          <Skeleton className={styles["shimmerAccordionItem"]} />
          <Skeleton className={styles["shimmerAccordionItem"]} />
        </div>
      </CardContent>

      <CardFooter className={styles["footer"]}>
        <Skeleton className={styles["shimmerButton"]} />
        <Skeleton className={styles["shimmerFooterNote"]} />
      </CardFooter>
    </Card>
  );
}
