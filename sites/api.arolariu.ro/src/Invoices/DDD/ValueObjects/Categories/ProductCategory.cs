namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Selectable categories for products. A nullable value represents no selection.</summary>
[SuppressMessage("Design", "CA1008:Enums should have zero value", Justification = "Zero is intentionally not a category; a nullable value represents no selection.")]
[JsonConverter(typeof(StrictNumericCategoryConverter<ProductCategory>))]
public enum ProductCategory
{
  /// <summary>Fresh fruit.</summary>
  FreshFruit = 1001,
  /// <summary>Fresh vegetables.</summary>
  FreshVegetables = 1002,
  /// <summary>Fresh herbs.</summary>
  FreshHerbs = 1003,
  /// <summary>Potatoes.</summary>
  Potatoes = 1004,
  /// <summary>Rice.</summary>
  Rice = 1005,
  /// <summary>Pasta.</summary>
  Pasta = 1006,
  /// <summary>Bread.</summary>
  Bread = 1007,
  /// <summary>Flour.</summary>
  Flour = 1008,
  /// <summary>Breakfast cereal.</summary>
  BreakfastCereal = 1009,
  /// <summary>Oats.</summary>
  Oats = 1010,
  /// <summary>Beans and lentils.</summary>
  BeansLentils = 1011,
  /// <summary>Nuts and seeds.</summary>
  NutsSeeds = 1012,
  /// <summary>Eggs.</summary>
  Eggs = 1013,
  /// <summary>Milk.</summary>
  Milk = 1014,
  /// <summary>Plant milk.</summary>
  PlantMilk = 1015,
  /// <summary>Cheese.</summary>
  Cheese = 1016,
  /// <summary>Yogurt.</summary>
  Yogurt = 1017,
  /// <summary>Butter and margarine.</summary>
  ButterMargarine = 1018,
  /// <summary>Cooking cream.</summary>
  CookingCream = 1019,
  /// <summary>Beef.</summary>
  Beef = 1020,
  /// <summary>Pork.</summary>
  Pork = 1021,
  /// <summary>Chicken.</summary>
  Chicken = 1022,
  /// <summary>Turkey.</summary>
  Turkey = 1023,
  /// <summary>Lamb.</summary>
  Lamb = 1024,
  /// <summary>Fish.</summary>
  Fish = 1025,
  /// <summary>Seafood.</summary>
  Seafood = 1026,
  /// <summary>Deli meat.</summary>
  DeliMeat = 1027,
  /// <summary>Plant-based protein.</summary>
  PlantProtein = 1028,
  /// <summary>Cooking oil.</summary>
  CookingOil = 1029,
  /// <summary>Sugar.</summary>
  Sugar = 1030,
  /// <summary>Salt and spices.</summary>
  SaltSpices = 1031,
  /// <summary>Honey and jam.</summary>
  HoneyJam = 1032,
  /// <summary>Sauces and condiments.</summary>
  SaucesCondiments = 1033,
  /// <summary>Canned vegetables.</summary>
  CannedVegetables = 1034,
  /// <summary>Other canned foods.</summary>
  CannedFoods = 1035,
  /// <summary>Frozen foods.</summary>
  FrozenFoods = 1036,
  /// <summary>Ready meals.</summary>
  ReadyMeals = 1037,
  /// <summary>Soups.</summary>
  Soups = 1038,
  /// <summary>Bakery pastries.</summary>
  BakeryPastries = 1039,
  /// <summary>Biscuits.</summary>
  Biscuits = 1040,
  /// <summary>Chocolate.</summary>
  Chocolate = 1041,
  /// <summary>Candy.</summary>
  Candy = 1042,
  /// <summary>Snack chips.</summary>
  SnackChips = 1043,
  /// <summary>Crackers.</summary>
  Crackers = 1044,
  /// <summary>Coffee.</summary>
  Coffee = 1045,
  /// <summary>Tea.</summary>
  Tea = 1046,
  /// <summary>Bottled water.</summary>
  BottledWater = 1047,
  /// <summary>Juice.</summary>
  Juice = 1048,
  /// <summary>Soft drinks.</summary>
  SoftDrinks = 1049,
  /// <summary>Beer.</summary>
  Beer = 1050,
  /// <summary>Wine.</summary>
  Wine = 1051,
  /// <summary>Spirits.</summary>
  Spirits = 1052,
  /// <summary>Baby food.</summary>
  BabyFood = 1053,
  /// <summary>Pet food.</summary>
  PetFood = 1054,
  /// <summary>Supplements.</summary>
  Supplements = 1055,
  /// <summary>Medicine.</summary>
  Medicine = 1056,
  /// <summary>First aid.</summary>
  FirstAid = 1057,
  /// <summary>Dental care.</summary>
  DentalCare = 1058,
  /// <summary>Soap and body wash.</summary>
  SoapBodyWash = 1059,
  /// <summary>Hair care.</summary>
  HairCare = 1060,
  /// <summary>Deodorant.</summary>
  Deodorant = 1061,
  /// <summary>Skin care.</summary>
  SkinCare = 1062,
  /// <summary>Cosmetics.</summary>
  Cosmetics = 1063,
  /// <summary>Shaving products.</summary>
  ShavingProducts = 1064,
  /// <summary>Feminine care.</summary>
  FeminineCare = 1065,
  /// <summary>Diapers and baby care.</summary>
  DiapersBabyCare = 1066,
  /// <summary>Toilet paper.</summary>
  ToiletPaper = 1067,
  /// <summary>Paper towels and tissues.</summary>
  PaperTowelsTissues = 1068,
  /// <summary>Laundry products.</summary>
  LaundryProducts = 1069,
  /// <summary>Dishwashing products.</summary>
  DishwashingProducts = 1070,
  /// <summary>Household cleaners.</summary>
  HouseholdCleaners = 1071,
  /// <summary>Cleaning tools.</summary>
  CleaningTools = 1072,
  /// <summary>Trash bags.</summary>
  TrashBags = 1073,
  /// <summary>Food wrap and storage.</summary>
  FoodWrapStorage = 1074,
  /// <summary>Kitchen utensils.</summary>
  KitchenUtensils = 1075,
  /// <summary>Cookware.</summary>
  Cookware = 1076,
  /// <summary>Tableware.</summary>
  Tableware = 1077,
  /// <summary>Small appliances.</summary>
  SmallAppliances = 1078,
  /// <summary>Large appliances.</summary>
  LargeAppliances = 1079,
  /// <summary>Consumer electronics.</summary>
  ConsumerElectronics = 1080,
  /// <summary>Phones and accessories.</summary>
  PhonesAccessories = 1081,
  /// <summary>Computers and accessories.</summary>
  ComputersAccessories = 1082,
  /// <summary>Batteries.</summary>
  Batteries = 1083,
  /// <summary>Light bulbs.</summary>
  LightBulbs = 1084,
  /// <summary>Furniture.</summary>
  Furniture = 1085,
  /// <summary>Bedding and bath linens.</summary>
  BeddingBathLinens = 1086,
  /// <summary>Clothing.</summary>
  Clothing = 1087,
  /// <summary>Footwear.</summary>
  Footwear = 1088,
  /// <summary>Bags and accessories.</summary>
  BagsAccessories = 1089,
  /// <summary>Office and school supplies.</summary>
  OfficeSchoolSupplies = 1090,
  /// <summary>Books and magazines.</summary>
  BooksMagazines = 1091,
  /// <summary>Toys and games.</summary>
  ToysGames = 1092,
  /// <summary>Sports goods.</summary>
  SportsGoods = 1093,
  /// <summary>Outdoor goods.</summary>
  OutdoorGoods = 1094,
  /// <summary>Hardware and tools.</summary>
  HardwareTools = 1095,
  /// <summary>Garden supplies.</summary>
  GardenSupplies = 1096,
  /// <summary>Pet accessories.</summary>
  PetAccessories = 1097,
  /// <summary>Tobacco and smoking supplies.</summary>
  TobaccoSmokingSupplies = 1098,
  /// <summary>Fuel and automotive supplies.</summary>
  FuelAutomotiveSupplies = 1099,
  /// <summary>Other.</summary>
  Other = 1100,
}
