namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Selectable categories for merchants. A nullable value represents no selection.</summary>
[SuppressMessage("Design", "CA1008:Enums should have zero value", Justification = "Zero is intentionally not a category; a nullable value represents no selection.")]
[JsonConverter(typeof(StrictNumericCategoryConverter<MerchantCategory>))]
public enum MerchantCategory
{
  /// <summary>Supermarket.</summary>
  Supermarket = 2001,
  /// <summary>Hypermarket.</summary>
  Hypermarket = 2002,
  /// <summary>Convenience store.</summary>
  ConvenienceStore = 2003,
  /// <summary>Discount store.</summary>
  DiscountStore = 2004,
  /// <summary>Grocery store.</summary>
  GroceryStore = 2005,
  /// <summary>Farmers market.</summary>
  FarmersMarket = 2006,
  /// <summary>Fruit and vegetable shop.</summary>
  FruitVegetableShop = 2007,
  /// <summary>Butcher.</summary>
  Butcher = 2008,
  /// <summary>Fishmonger.</summary>
  Fishmonger = 2009,
  /// <summary>Bakery.</summary>
  Bakery = 2010,
  /// <summary>Pastry shop.</summary>
  PastryShop = 2011,
  /// <summary>Specialty food shop.</summary>
  SpecialtyFoodShop = 2012,
  /// <summary>Organic food store.</summary>
  OrganicFoodStore = 2013,
  /// <summary>Frozen food store.</summary>
  FrozenFoodStore = 2014,
  /// <summary>Wholesale food store.</summary>
  WholesaleFoodStore = 2015,
  /// <summary>Restaurant.</summary>
  Restaurant = 2016,
  /// <summary>Fast-food restaurant.</summary>
  FastFoodRestaurant = 2017,
  /// <summary>Cafe.</summary>
  Cafe = 2018,
  /// <summary>Coffee shop.</summary>
  CoffeeShop = 2019,
  /// <summary>Tea shop.</summary>
  TeaShop = 2020,
  /// <summary>Bar or pub.</summary>
  BarPub = 2021,
  /// <summary>Food truck.</summary>
  FoodTruck = 2022,
  /// <summary>Caterer.</summary>
  Caterer = 2023,
  /// <summary>Food delivery service.</summary>
  FoodDeliveryService = 2024,
  /// <summary>Ice cream and dessert shop.</summary>
  IceCreamDessertShop = 2025,
  /// <summary>Pharmacy.</summary>
  Pharmacy = 2026,
  /// <summary>Health and beauty store.</summary>
  HealthBeautyStore = 2027,
  /// <summary>Cosmetics store.</summary>
  CosmeticsStore = 2028,
  /// <summary>Hair salon.</summary>
  HairSalon = 2029,
  /// <summary>Barber.</summary>
  Barber = 2030,
  /// <summary>Beauty salon.</summary>
  BeautySalon = 2031,
  /// <summary>Spa and wellness.</summary>
  SpaWellness = 2032,
  /// <summary>Medical clinic.</summary>
  MedicalClinic = 2033,
  /// <summary>Dental clinic.</summary>
  DentalClinic = 2034,
  /// <summary>Optician.</summary>
  Optician = 2035,
  /// <summary>Hospital.</summary>
  Hospital = 2036,
  /// <summary>Diagnostic laboratory.</summary>
  DiagnosticLab = 2037,
  /// <summary>Physiotherapy.</summary>
  Physiotherapy = 2038,
  /// <summary>Fitness gym.</summary>
  FitnessGym = 2039,
  /// <summary>Sports and leisure center.</summary>
  SportsLeisureCenter = 2040,
  /// <summary>Clothing store.</summary>
  ClothingStore = 2041,
  /// <summary>Shoe store.</summary>
  ShoeStore = 2042,
  /// <summary>Fashion accessory store.</summary>
  FashionAccessoryStore = 2043,
  /// <summary>Jewelry store.</summary>
  JewelryStore = 2044,
  /// <summary>Department store.</summary>
  DepartmentStore = 2045,
  /// <summary>Shopping marketplace.</summary>
  ShoppingMarketplace = 2046,
  /// <summary>Electronics store.</summary>
  ElectronicsStore = 2047,
  /// <summary>Phone store.</summary>
  PhoneStore = 2048,
  /// <summary>Computer store.</summary>
  ComputerStore = 2049,
  /// <summary>Appliance store.</summary>
  ApplianceStore = 2050,
  /// <summary>Furniture store.</summary>
  FurnitureStore = 2051,
  /// <summary>Home decor store.</summary>
  HomeDecorStore = 2052,
  /// <summary>Bedding and bath store.</summary>
  BeddingBathStore = 2053,
  /// <summary>Kitchenware store.</summary>
  KitchenwareStore = 2054,
  /// <summary>Hardware store.</summary>
  HardwareStore = 2055,
  /// <summary>Building materials store.</summary>
  BuildingMaterialsStore = 2056,
  /// <summary>Garden center.</summary>
  GardenCenter = 2057,
  /// <summary>Flower shop.</summary>
  FlowerShop = 2058,
  /// <summary>Pet store.</summary>
  PetStore = 2059,
  /// <summary>Veterinary clinic.</summary>
  VeterinaryClinic = 2060,
  /// <summary>Bookstore.</summary>
  Bookstore = 2061,
  /// <summary>Stationery store.</summary>
  StationeryStore = 2062,
  /// <summary>Toy store.</summary>
  ToyStore = 2063,
  /// <summary>Sports store.</summary>
  SportsStore = 2064,
  /// <summary>Outdoor store.</summary>
  OutdoorStore = 2065,
  /// <summary>Baby store.</summary>
  BabyStore = 2066,
  /// <summary>Gift shop.</summary>
  GiftShop = 2067,
  /// <summary>Second-hand store.</summary>
  SecondHandStore = 2068,
  /// <summary>Charity shop.</summary>
  CharityShop = 2069,
  /// <summary>Tobacconist.</summary>
  Tobacconist = 2070,
  /// <summary>Fuel station.</summary>
  FuelStation = 2071,
  /// <summary>Vehicle dealer.</summary>
  VehicleDealer = 2072,
  /// <summary>Auto parts store.</summary>
  AutoPartsStore = 2073,
  /// <summary>Auto repair.</summary>
  AutoRepair = 2074,
  /// <summary>Tire shop.</summary>
  TireShop = 2075,
  /// <summary>Car wash.</summary>
  CarWash = 2076,
  /// <summary>Car rental.</summary>
  CarRental = 2077,
  /// <summary>Taxi and ride-hailing.</summary>
  TaxiRideHailing = 2078,
  /// <summary>Public transport.</summary>
  PublicTransport = 2079,
  /// <summary>Rail operator.</summary>
  RailOperator = 2080,
  /// <summary>Airline.</summary>
  Airline = 2081,
  /// <summary>Parking operator.</summary>
  ParkingOperator = 2082,
  /// <summary>Toll operator.</summary>
  TollOperator = 2083,
  /// <summary>Hotel.</summary>
  Hotel = 2084,
  /// <summary>Short-stay accommodation.</summary>
  ShortStayAccommodation = 2085,
  /// <summary>Travel agency.</summary>
  TravelAgency = 2086,
  /// <summary>Entertainment venue.</summary>
  EntertainmentVenue = 2087,
  /// <summary>Cinema.</summary>
  Cinema = 2088,
  /// <summary>Theatre and concert venue.</summary>
  TheatreConcertVenue = 2089,
  /// <summary>Museum and attraction.</summary>
  MuseumAttraction = 2090,
  /// <summary>Utility provider.</summary>
  UtilityProvider = 2091,
  /// <summary>Telecom provider.</summary>
  TelecomProvider = 2092,
  /// <summary>Internet provider.</summary>
  InternetProvider = 2093,
  /// <summary>Postal and courier service.</summary>
  PostalCourier = 2094,
  /// <summary>Bank and financial service.</summary>
  BankFinancialService = 2095,
  /// <summary>Insurance provider.</summary>
  InsuranceProvider = 2096,
  /// <summary>Laundry and dry cleaner.</summary>
  LaundryDryCleaner = 2097,
  /// <summary>Repair service.</summary>
  RepairService = 2098,
  /// <summary>Online retailer.</summary>
  OnlineRetailer = 2099,
  /// <summary>Other.</summary>
  Other = 2100,
}
