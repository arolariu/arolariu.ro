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
        <main className={styles["shieldIcon"]}>
          <Skeleton className={styles["shimmerCircle"]} />
        </main>
        <Skeleton className={styles["shimmerTitle"]} />

        <main className={styles["localePicker"]}>
          <Skeleton className={styles["shimmerTabs"]} />
        </main>
      </CardHeader>

      <CardContent className={styles["contentArea"]}>
        <Skeleton className={styles["shimmerContentBlock"]} />

        <main className={styles["policyGrid"]}>
          <Skeleton className={styles["shimmerPolicyCard"]} />
          <Skeleton className={styles["shimmerPolicyCard"]} />
        </main>

        <Skeleton className={styles["shimmerSeparator"]} />

        <main className={styles["cookiesSection"]}>
          <Skeleton className={styles["shimmerCookiesHeader"]} />
          <Skeleton className={styles["shimmerAccordionItem"]} />
          <Skeleton className={styles["shimmerAccordionItem"]} />
        </main>
      </CardContent>

      <CardFooter className={styles["footer"]}>
        <Skeleton className={styles["shimmerButton"]} />
        <Skeleton className={styles["shimmerFooterNote"]} />
      </CardFooter>
    </Card>
  );
}
