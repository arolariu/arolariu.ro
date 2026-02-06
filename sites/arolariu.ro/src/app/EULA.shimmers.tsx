import {Card, CardContent, CardFooter, CardHeader} from "@arolariu/components";
import styles from "./EULA.module.scss";

// ===========================================
// SHIMMER BASE
// ===========================================
const shimmer = `${styles["shimmerBlock"]} ${styles["shimmerAnimate"]}`;

/**
 * Skeleton loading state for the EULA component.
 * Displayed while the EULA cookie state is being resolved.
 */
export default function EulaShimmer(): React.JSX.Element {
  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["headerCenter"]}>
        <div className={styles["shieldIcon"]}>
          <div className={shimmer} style={{width: "3rem", height: "3rem", borderRadius: "9999px"}} />
        </div>
        <div className={shimmer} style={{width: "12rem", height: "1rem", borderRadius: "0.375rem", marginInline: "auto"}} />

        <div className={styles["tabsWrapper"]}>
          <div className={shimmer} style={{width: "100%", height: "2.5rem", borderRadius: "0.375rem"}} />
        </div>
      </CardHeader>

      <CardContent className={styles["contentArea"]}>
        <div className={shimmer} style={{height: "4rem", borderRadius: "0.375rem"}} />

        <div className={styles["policyGrid"]}>
          <div className={shimmer} style={{height: "12rem", borderRadius: "0.375rem"}} />
          <div className={shimmer} style={{height: "12rem", borderRadius: "0.375rem"}} />
        </div>

        <div className={shimmer} style={{height: "0.25rem", borderRadius: "0.375rem"}} />

        <div className={styles["cookiesSection"]}>
          <div className={shimmer} style={{height: "2rem", borderRadius: "0.375rem"}} />
          <div className={shimmer} style={{height: "6rem", borderRadius: "0.375rem"}} />
          <div className={shimmer} style={{height: "6rem", borderRadius: "0.375rem"}} />
        </div>
      </CardContent>

      <CardFooter className={styles["footer"]}>
        <div className={shimmer} style={{width: "100%", height: "3rem", borderRadius: "0.375rem"}} />
        <div
          className={shimmer}
          style={{width: "75%", height: "1rem", borderRadius: "0.375rem", marginInline: "auto"}}
        />
      </CardFooter>
    </Card>
  );
}
