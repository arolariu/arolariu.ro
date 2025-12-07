"use client";

import {InvoiceCategory} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useState} from "react";
import {
  TbBriefcase,
  TbCar,
  TbDeviceGamepad2,
  TbGift,
  TbGymnastics,
  TbHeart,
  TbHelpCircle,
  TbHome,
  TbPackage,
  TbPhone,
  TbPlane,
  TbSchool,
  TbShirt,
  TbShoppingCart,
  TbToolsKitchen,
} from "react-icons/tb";

type Props = {
  onCategorySelect?: (category: InvoiceCategory) => void;
};

type CategoryOption = {
  id: InvoiceCategory | string;
  name: string;
  icon: React.ReactNode;
  color: string;
};

export function CategorySuggestionCard({onCategorySelect}: Props) {
  const [selected, setSelected] = useState<InvoiceCategory | string | null>(null);

  // Main categories
  const mainCategories: CategoryOption[] = [
    {
      id: InvoiceCategory.GROCERY,
      name: "Grocery",
      icon: <TbShoppingCart className='h-5 w-5' />,
      color: "hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950",
    },
    {
      id: InvoiceCategory.FAST_FOOD,
      name: "Dining",
      icon: <TbToolsKitchen className='h-5 w-5' />,
      color: "hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950",
    },
    {
      id: InvoiceCategory.HOME_CLEANING,
      name: "Home",
      icon: <TbHome className='h-5 w-5' />,
      color: "hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950",
    },
    {
      id: InvoiceCategory.CAR_AUTO,
      name: "Auto",
      icon: <TbCar className='h-5 w-5' />,
      color: "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950",
    },
    {
      id: InvoiceCategory.OTHER,
      name: "Other",
      icon: <TbPackage className='h-5 w-5' />,
      color: "hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900",
    },
  ];

  // Extended categories
  const extendedCategories: CategoryOption[] = [
    {id: "clothing", name: "Clothing", icon: <TbShirt className='h-4 w-4' />, color: ""},
    {id: "health", name: "Health", icon: <TbHeart className='h-4 w-4' />, color: ""},
    {id: "entertainment", name: "Entertainment", icon: <TbDeviceGamepad2 className='h-4 w-4' />, color: ""},
    {id: "travel", name: "Travel", icon: <TbPlane className='h-4 w-4' />, color: ""},
    {id: "education", name: "Education", icon: <TbSchool className='h-4 w-4' />, color: ""},
    {id: "business", name: "Business", icon: <TbBriefcase className='h-4 w-4' />, color: ""},
    {id: "fitness", name: "Fitness", icon: <TbGymnastics className='h-4 w-4' />, color: ""},
    {id: "gifts", name: "Gifts", icon: <TbGift className='h-4 w-4' />, color: ""},
    {id: "technology", name: "Technology", icon: <TbPhone className='h-4 w-4' />, color: ""},
  ];

  // Gamification progress (mock)
  const categorizedCount = 8;
  const goal = 10;

  const handleSelect = (id: InvoiceCategory | string) => {
    setSelected(id);
    if (typeof id === "number" && onCategorySelect) {
      onCategorySelect(id);
    }
  };

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbHelpCircle className='h-5 w-5 text-amber-500' />
          Help Us Categorize This Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Explanation */}
        <p className='text-muted-foreground text-sm'>
          We couldn't automatically categorize this invoice. Select the right category to unlock insights:
        </p>

        {/* Main Categories Grid */}
        <div className='grid grid-cols-5 gap-2'>
          {mainCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleSelect(cat.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-3 transition-all ${cat.color} ${
                selected === cat.id ? "border-primary bg-primary/10 ring-primary/20 ring-2" : ""
              }`}>
              {cat.icon}
              <span className='text-xs font-medium'>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* More Categories */}
        <div className='space-y-2'>
          <p className='text-muted-foreground text-sm'>More categories:</p>
          <div className='grid grid-cols-3 gap-2'>
            {extendedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={`hover:bg-muted flex items-center gap-2 rounded-lg border p-2 text-sm transition-all ${
                  selected === cat.id ? "border-primary bg-primary/10" : ""
                }`}>
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gamification */}
        <div className='space-y-2 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 dark:border-amber-800'>
          <div className='flex items-center gap-2'>
            <TbGift className='h-4 w-4 text-amber-600' />
            <span className='text-sm font-medium'>Categorize {goal} invoices to unlock detailed insights!</span>
          </div>
          <div className='flex items-center gap-3'>
            <Progress
              value={(categorizedCount / goal) * 100}
              className='h-2 flex-1'
            />
            <span className='text-muted-foreground text-sm font-medium'>
              {categorizedCount}/{goal}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

