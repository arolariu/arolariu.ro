import {
  TbBriefcase,
  TbCar,
  TbDeviceGamepad2,
  TbGift,
  TbGymnastics,
  TbHeart,
  TbHome,
  TbPackage,
  TbPhone,
  TbPlane,
  TbSchool,
  TbShirt,
  TbShoppingCart,
  TbToolsKitchen,
} from "react-icons/tb";
import styles from "./categories.module.scss";

/**
 * Represents a selectable category option for invoice classification.
 */
type CategoryOption = Readonly<{
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}>;

export const mainCategories: CategoryOption[] = [
  {id: "grocery", name: "Grocery", icon: <TbShoppingCart className={styles["iconMain"]} />, color: ""},
  {id: "dining", name: "Dining", icon: <TbToolsKitchen className={styles["iconMain"]} />, color: ""},
  {id: "home", name: "Home", icon: <TbHome className={styles["iconMain"]} />, color: ""},
  {id: "auto", name: "Auto", icon: <TbCar className={styles["iconMain"]} />, color: ""},
  {id: "other", name: "Other", icon: <TbPackage className={styles["iconMain"]} />, color: ""},
];

/**
 * Secondary or extended list of invoice categories.
 *
 * @remarks
 * **Purpose**: Provides additional granularity for categorization beyond the main categories.
 *
 * **Usage**: Typically shown in a "More" section or extended dropdown.
 *
 * **Note**: Currently uses string IDs which may need mapping to backend enums if persisted.
 */
export const extendedCategories: CategoryOption[] = [
  {id: "clothing", name: "Clothing", icon: <TbShirt className={styles["iconExtended"]} />, color: ""},
  {id: "health", name: "Health", icon: <TbHeart className={styles["iconExtended"]} />, color: ""},
  {id: "entertainment", name: "Entertainment", icon: <TbDeviceGamepad2 className={styles["iconExtended"]} />, color: ""},
  {id: "travel", name: "Travel", icon: <TbPlane className={styles["iconExtended"]} />, color: ""},
  {id: "education", name: "Education", icon: <TbSchool className={styles["iconExtended"]} />, color: ""},
  {id: "business", name: "Business", icon: <TbBriefcase className={styles["iconExtended"]} />, color: ""},
  {id: "fitness", name: "Fitness", icon: <TbGymnastics className={styles["iconExtended"]} />, color: ""},
  {id: "gifts", name: "Gifts", icon: <TbGift className={styles["iconExtended"]} />, color: ""},
  {id: "technology", name: "Technology", icon: <TbPhone className={styles["iconExtended"]} />, color: ""},
];
