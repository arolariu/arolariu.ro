import {InvoiceCategory} from "@/types/invoices";
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
 *
 * @remarks
 * **Usage Context**: Used in dropdowns, lists, and selection grids for categorizing invoices.
 *
 * **Visuals**: Includes an icon and color styling for UI representation.
 *
 * @property id - The unique identifier for the category (enum value or string key).
 * @property name - The display name of the category.
 * @property icon - The React node representing the category icon.
 * @property color - CSS classes for hover states and coloring.
 */
type CategoryOption = Readonly<{
  id: InvoiceCategory | string;
  name: string;
  icon: React.ReactNode;
  color: string;
}>;

/**
 * Primary invoice categories displayed prominently in the UI.
 *
 * @remarks
 * **Selection Criteria**: These are the most frequent categories used in the application.
 *
 * **Mapping**: Maps directly to `InvoiceCategory` enum values.
 *
 * **Styling**: Each category has distinct hover colors for better visual distinction.
 *
 * @example
 * ```tsx
 * {mainCategories.map(category => (
 *   <CategoryCard key={category.id} category={category} />
 * ))}
 * ```
 */
export const mainCategories: CategoryOption[] = [
  {
    id: InvoiceCategory.GROCERY,
    name: "Grocery",
    icon: <TbShoppingCart className={styles["iconMain"]} />,
    color: "",
  },
  {
    id: InvoiceCategory.FAST_FOOD,
    name: "Dining",
    icon: <TbToolsKitchen className={styles["iconMain"]} />,
    color: "",
  },
  {
    id: InvoiceCategory.HOME_CLEANING,
    name: "Home",
    icon: <TbHome className={styles["iconMain"]} />,
    color: "",
  },
  {
    id: InvoiceCategory.CAR_AUTO,
    name: "Auto",
    icon: <TbCar className={styles["iconMain"]} />,
    color: "",
  },
  {
    id: InvoiceCategory.OTHER,
    name: "Other",
    icon: <TbPackage className={styles["iconMain"]} />,
    color: "",
  },
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
