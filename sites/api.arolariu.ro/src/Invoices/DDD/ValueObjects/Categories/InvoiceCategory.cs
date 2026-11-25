namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Selectable categories for invoices. A nullable value represents no selection.</summary>
[SuppressMessage("Design", "CA1008:Enums should have zero value", Justification = "Zero is intentionally not a category; a nullable value represents no selection.")]
[JsonConverter(typeof(StrictNumericCategoryConverter<InvoiceCategory>))]
public enum InvoiceCategory
{
  /// <summary>Groceries.</summary>
  Groceries = 3001,
  /// <summary>Fresh produce.</summary>
  FreshProduce = 3002,
  /// <summary>Meat and seafood.</summary>
  MeatSeafood = 3003,
  /// <summary>Bakery purchases.</summary>
  BakeryPurchases = 3004,
  /// <summary>Dairy and eggs.</summary>
  DairyEggs = 3005,
  /// <summary>Pantry staples.</summary>
  PantryStaples = 3006,
  /// <summary>Snacks and sweets.</summary>
  SnacksSweets = 3007,
  /// <summary>Non-alcoholic drinks.</summary>
  NonAlcoholicDrinks = 3008,
  /// <summary>Alcohol.</summary>
  Alcohol = 3009,
  /// <summary>Restaurant dining.</summary>
  RestaurantDining = 3010,
  /// <summary>Fast food.</summary>
  FastFood = 3011,
  /// <summary>Cafe drinks.</summary>
  CafeDrinks = 3012,
  /// <summary>Food delivery.</summary>
  FoodDelivery = 3013,
  /// <summary>Catering.</summary>
  Catering = 3014,
  /// <summary>Work meals.</summary>
  WorkMeals = 3015,
  /// <summary>School meals.</summary>
  SchoolMeals = 3016,
  /// <summary>Baby food.</summary>
  BabyFood = 3017,
  /// <summary>Pet food.</summary>
  PetFood = 3018,
  /// <summary>Cleaning supplies.</summary>
  CleaningSupplies = 3019,
  /// <summary>Laundry supplies.</summary>
  LaundrySupplies = 3020,
  /// <summary>Paper household supplies.</summary>
  PaperHouseholdSupplies = 3021,
  /// <summary>Kitchen supplies.</summary>
  KitchenSupplies = 3022,
  /// <summary>Home decor.</summary>
  HomeDecor = 3023,
  /// <summary>Furniture.</summary>
  Furniture = 3024,
  /// <summary>Home appliances.</summary>
  HomeAppliances = 3025,
  /// <summary>Bedding and bath.</summary>
  BeddingBath = 3026,
  /// <summary>Hardware and tools.</summary>
  HardwareTools = 3027,
  /// <summary>Garden and plants.</summary>
  GardenPlants = 3028,
  /// <summary>Home maintenance.</summary>
  HomeMaintenance = 3029,
  /// <summary>Home repairs.</summary>
  HomeRepairs = 3030,
  /// <summary>Clothing.</summary>
  Clothing = 3031,
  /// <summary>Footwear.</summary>
  Footwear = 3032,
  /// <summary>Fashion accessories.</summary>
  FashionAccessories = 3033,
  /// <summary>Jewelry and watches.</summary>
  JewelryWatches = 3034,
  /// <summary>Baby and child supplies.</summary>
  BabyChildSupplies = 3035,
  /// <summary>Toys and games.</summary>
  ToysGames = 3036,
  /// <summary>Books and magazines.</summary>
  BooksMagazines = 3037,
  /// <summary>Stationery and office.</summary>
  StationeryOffice = 3038,
  /// <summary>School supplies.</summary>
  SchoolSupplies = 3039,
  /// <summary>Consumer electronics.</summary>
  ConsumerElectronics = 3040,
  /// <summary>Phones and accessories.</summary>
  PhonesAccessories = 3041,
  /// <summary>Computers and accessories.</summary>
  ComputersAccessories = 3042,
  /// <summary>Software and apps.</summary>
  SoftwareApps = 3043,
  /// <summary>Digital subscriptions.</summary>
  DigitalSubscriptions = 3044,
  /// <summary>Medicines.</summary>
  Medicines = 3045,
  /// <summary>Health supplements.</summary>
  HealthSupplements = 3046,
  /// <summary>Medical consultations.</summary>
  MedicalConsultations = 3047,
  /// <summary>Dental care.</summary>
  DentalCare = 3048,
  /// <summary>Vision care.</summary>
  VisionCare = 3049,
  /// <summary>Medical tests.</summary>
  MedicalTests = 3050,
  /// <summary>Physiotherapy.</summary>
  Physiotherapy = 3051,
  /// <summary>Hospital care.</summary>
  HospitalCare = 3052,
  /// <summary>Personal care.</summary>
  PersonalCare = 3053,
  /// <summary>Cosmetics and skincare.</summary>
  CosmeticsSkincare = 3054,
  /// <summary>Haircuts and styling.</summary>
  HaircutsStyling = 3055,
  /// <summary>Beauty treatments.</summary>
  BeautyTreatments = 3056,
  /// <summary>Spa and wellness.</summary>
  SpaWellness = 3057,
  /// <summary>Gym membership.</summary>
  GymMembership = 3058,
  /// <summary>Sports equipment.</summary>
  SportsEquipment = 3059,
  /// <summary>Outdoor equipment.</summary>
  OutdoorEquipment = 3060,
  /// <summary>Pet accessories.</summary>
  PetAccessories = 3061,
  /// <summary>Veterinary care.</summary>
  VeterinaryCare = 3062,
  /// <summary>Vehicle fuel.</summary>
  VehicleFuel = 3063,
  /// <summary>Vehicle charging.</summary>
  VehicleCharging = 3064,
  /// <summary>Vehicle maintenance.</summary>
  VehicleMaintenance = 3065,
  /// <summary>Vehicle repairs.</summary>
  VehicleRepairs = 3066,
  /// <summary>Vehicle parts.</summary>
  VehicleParts = 3067,
  /// <summary>Tires.</summary>
  Tires = 3068,
  /// <summary>Car wash.</summary>
  CarWash = 3069,
  /// <summary>Parking.</summary>
  Parking = 3070,
  /// <summary>Road tolls.</summary>
  RoadTolls = 3071,
  /// <summary>Public transport.</summary>
  PublicTransport = 3072,
  /// <summary>Taxi and ride-hailing.</summary>
  TaxiRideHailing = 3073,
  /// <summary>Rail travel.</summary>
  RailTravel = 3074,
  /// <summary>Air travel.</summary>
  AirTravel = 3075,
  /// <summary>Car rental.</summary>
  CarRental = 3076,
  /// <summary>Hotels.</summary>
  Hotels = 3077,
  /// <summary>Short-stay accommodation.</summary>
  ShortStayAccommodation = 3078,
  /// <summary>Travel packages.</summary>
  TravelPackages = 3079,
  /// <summary>Tourist attractions.</summary>
  TouristAttractions = 3080,
  /// <summary>Cinema.</summary>
  Cinema = 3081,
  /// <summary>Theatre and concerts.</summary>
  TheatreConcerts = 3082,
  /// <summary>Events and festivals.</summary>
  EventsFestivals = 3083,
  /// <summary>Games and entertainment.</summary>
  GamesEntertainment = 3084,
  /// <summary>Tobacco.</summary>
  Tobacco = 3085,
  /// <summary>Gifts.</summary>
  Gifts = 3086,
  /// <summary>Flowers.</summary>
  Flowers = 3087,
  /// <summary>Celebrations.</summary>
  Celebrations = 3088,
  /// <summary>Postal and courier.</summary>
  PostalCourier = 3089,
  /// <summary>Laundry and dry cleaning.</summary>
  LaundryDryCleaning = 3090,
  /// <summary>Device repairs.</summary>
  DeviceRepairs = 3091,
  /// <summary>Electricity.</summary>
  Electricity = 3092,
  /// <summary>Gas and heating.</summary>
  GasHeating = 3093,
  /// <summary>Water and waste.</summary>
  WaterWaste = 3094,
  /// <summary>Phone service.</summary>
  PhoneService = 3095,
  /// <summary>Internet service.</summary>
  InternetService = 3096,
  /// <summary>Financial fees.</summary>
  FinancialFees = 3097,
  /// <summary>Insurance.</summary>
  Insurance = 3098,
  /// <summary>Mixed purchases.</summary>
  MixedPurchases = 3099,
  /// <summary>Other.</summary>
  Other = 3100,
}
