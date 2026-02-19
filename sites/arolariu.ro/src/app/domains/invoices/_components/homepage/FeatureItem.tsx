import {type IconType} from "react-icons/lib";
import styles from "./FeatureItem.module.scss";

interface Props {
  icon: IconType;
  title: string;
  description: string;
}

/**
 * Renders a single feature item in the features list.
 *
 * @param props - Component props.
 * @returns The feature item.
 */
export default function FeatureItem({icon: Icon, title, description}: Readonly<Props>): React.JSX.Element {
  return (
    <div className={styles["featureItem"]}>
      <div className={styles["featureIconBox"]}>
        <Icon className={styles["featureIcon"]} />
      </div>
      <div>
        <h3 className={styles["featureTitle"]}>{title}</h3>
        <p className={styles["featureDescription"]}>{description}</p>
      </div>
    </div>
  );
}
