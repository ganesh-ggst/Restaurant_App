export const MANAGER_PHONES = {
  floor_1: "+919999999991",
  floor_2: "+919999999992",
  ops_1: "+919999999996",
};

export interface AddOnOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface AddOnGroup {
  id: string;
  name: string;
  isActive?: boolean;
  options: AddOnOption[];
}

export interface FoodItemBadge {
  type: "none" | "auto_discount" | "bestseller" | "hot" | "new" | "custom";
  text?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  offerPrice?: number | null;
  coupon?: string;
  quantity?: number | null;
  isAvailable: boolean;

  // NEW FIELDS
  images: string[];
  description: string;
  dietaryPreference: "veg" | "non-veg" | "egg" | "vegan";
  rating: number; // Mock rating for display
  prepTime: string;
  badge: FoodItemBadge;

  addOns: AddOnGroup[];
  crossSellItems: string[];
}

export interface CrossSellList {
  id: string;
  categoryName: string;
  triggerCategoryId: string;
  items: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
}

export interface StoreDetailOption {
  id: string;
  value: string;
  subValue?: string;
  isActive: boolean;
}

export interface StoreDetailSection {
  id: string;
  title: string;
  selectionType: "single" | "multiple";
  isSectionActive: boolean;
  options: StoreDetailOption[];
}

export const MANAGER_MOCK_DATA: {
  managers: any[];
  waiters: any[];
  tables: any[];
  storeDetails: StoreDetailSection[];
  categories: Category[];
  addOns: any[];
  crossSellItems: CrossSellList[];
  foodItems: FoodItem[];
  availableCoupons: any[];
} = {
  managers: [
    {
      id: "m1",
      name: "Siva (Floor)",
      phone: MANAGER_PHONES.floor_1,
      role: "manager",
      managerType: "floor",
      assignedTables: ["T1", "T2"],
      assignedWaiters: ["w1", "w2"],
    },
    {
      id: "m2",
      name: "Ganesh (Floor)",
      phone: MANAGER_PHONES.floor_2,
      role: "manager",
      managerType: "floor",
      assignedTables: ["T3", "T4"],
      assignedWaiters: ["w3", "w4"],
    },
    {
      id: "m6",
      name: "Admin (Ops)",
      phone: MANAGER_PHONES.ops_1,
      role: "manager",
      managerType: "operations",
      assignedTables: [],
      assignedWaiters: [],
    },
  ],
  waiters: [
    { id: "w1", name: "Raju", managerId: "m1", status: "available" },
    { id: "w2", name: "Ramesh", managerId: "m1", status: "busy" },
    { id: "w3", name: "Suresh", managerId: "m2", status: "available" },
    { id: "w4", name: "Mahesh", managerId: "m2", status: "available" },
  ],
  tables: [
    {
      id: "T1",
      number: 1,
      managerId: "m1",
      assignedWaiterId: "w1",
      status: "occupied",
      activeCustomers: [{ id: "c1", phone: "+918888888888" }],
    },
    {
      id: "T2",
      number: 2,
      managerId: "m1",
      assignedWaiterId: null,
      status: "available",
      activeCustomers: [],
    },
    {
      id: "T3",
      number: 3,
      managerId: "m2",
      assignedWaiterId: null,
      status: "needs_attention",
      activeCustomers: [{ id: "c2", phone: "+917777777777" }],
    },
    {
      id: "T4",
      number: 4,
      managerId: "m2",
      assignedWaiterId: "w4",
      status: "occupied",
      activeCustomers: [{ id: "c4", phone: "+915555555555" }],
    },
  ],
  storeDetails: [
    {
      id: "sd_rest",
      title: "Restaurant Name",
      selectionType: "single",
      isSectionActive: true,
      options: [
        { id: "rn1", value: "Foodie Verse", isActive: true },
        { id: "rn2", value: "Foodie Verse Express", isActive: false },
      ],
    },
    {
      id: "sd_tax",
      title: "Tax Details (GST)",
      selectionType: "single",
      isSectionActive: true,
      options: [
        { id: "t1", value: "5%", isActive: true },
        { id: "t2", value: "12%", isActive: false },
        { id: "t3", value: "18%", isActive: false },
      ],
    },
    {
      id: "sd_wifi",
      title: "Wi-Fi Connections",
      selectionType: "multiple",
      isSectionActive: true,
      options: [
        {
          id: "w1",
          value: "FoodieVerse_Guest",
          subValue: "SpicyBiryani!",
          isActive: true,
        },
        {
          id: "w2",
          value: "FoodieVerse_Staff",
          subValue: "StaffOnly123",
          isActive: false,
        },
      ],
    },
  ],
  categories: [
    { id: "c1", name: "Biryani", icon: "🍲", isActive: true },
    { id: "c2", name: "Grills & Starters", icon: "🍢", isActive: true },
    { id: "c3", name: "Beverages", icon: "🥤", isActive: true },
    { id: "c4", name: "Ice Creams & Desserts", icon: "🍦", isActive: true },
  ],
  addOns: [
    { id: "a1", name: "Extra Cheese", price: 30, isAvailable: true },
    { id: "a2", name: "Extra Dip", price: 20, isAvailable: true },
    { id: "a3", name: "Large Portion", price: 75, isAvailable: true },
  ],
  crossSellItems: [
    {
      id: "cs1",
      categoryName: "Popular Starters",
      triggerCategoryId: "c1",
      items: ["fi3", "fi4"],
    },
    {
      id: "cs2",
      categoryName: "Cooling Drinks",
      triggerCategoryId: "c2",
      items: ["fi6"],
    },
    {
      id: "cs3",
      categoryName: "Quick Bites",
      triggerCategoryId: "c3",
      items: ["fi2"],
    },
    {
      id: "cs4",
      categoryName: "Extra Toppings",
      triggerCategoryId: "c4",
      items: ["fi8"],
    },
  ],
  foodItems: [
    // --- BIRYANI (c1) ---
    {
      id: "fi1",
      name: "Chicken Dum Biryani",
      categoryId: "c1",
      price: 299,
      offerPrice: 249,
      coupon: "SAVE50",
      quantity: 20,
      isAvailable: true,
      images: ["mock_biryani_image"],
      description:
        "Authentic Hyderabadi chicken dum biryani cooked with fragrant basmati rice and signature spices.",
      dietaryPreference: "non-veg",
      rating: 4.8,
      prepTime: "30 mins",
      badge: { type: "auto_discount" },
      addOns: [
        {
          id: "g1",
          name: "Biryani Extras",
          isActive: true,
          options: [
            { id: "o1", name: "Boiled Egg", price: 15, isAvailable: true },
            { id: "o2", name: "Extra Raita", price: 20, isAvailable: true },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi2",
      name: "Paneer Butter Masala",
      categoryId: "c1",
      price: 289,
      offerPrice: 231,
      coupon: "",
      quantity: 15,
      isAvailable: true,
      images: ["mock_paneer_image"],
      description:
        "Soft paneer cubes cooked in a rich, creamy tomato gravy with butter.",
      dietaryPreference: "veg",
      rating: 4.6,
      prepTime: "25 mins",
      badge: { type: "bestseller" },
      addOns: [
        {
          id: "g2",
          name: "Breads",
          isActive: true,
          options: [
            { id: "o3", name: "Garlic Naan", price: 55, isAvailable: true },
          ],
        },
      ],
      crossSellItems: [],
    },

    // --- GRILLS & STARTERS (c2) ---
    {
      id: "fi3",
      name: "Tandoori Chicken Platter",
      categoryId: "c2",
      price: 499,
      offerPrice: 449,
      coupon: "GRILL50",
      quantity: 10,
      isAvailable: true,
      images: ["mock_tandoori_image"],
      description:
        "Juicy chicken pieces marinated in yogurt and spices, char-grilled in a clay oven.",
      dietaryPreference: "non-veg",
      rating: 4.9,
      prepTime: "35 mins",
      badge: { type: "hot" },
      addOns: [
        {
          id: "g3",
          name: "Dips",
          isActive: true,
          options: [
            { id: "o4", name: "Mint Mayo Dip", price: 25, isAvailable: true },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi4",
      name: "Crispy Veg Spring Rolls",
      categoryId: "c2",
      price: 199,
      offerPrice: null,
      coupon: "",
      quantity: 25,
      isAvailable: true,
      images: ["mock_rolls_image"],
      description:
        "Golden fried rolls stuffed with seasoned mixed vegetables and glass noodles.",
      dietaryPreference: "veg",
      rating: 4.4,
      prepTime: "15 mins",
      badge: { type: "new" },
      addOns: [],
      crossSellItems: [],
    },

    // --- BEVERAGES (c3) ---
    {
      id: "fi5",
      name: "Fresh Mint Mojito",
      categoryId: "c3",
      price: 149,
      offerPrice: 129,
      coupon: "",
      quantity: 30,
      isAvailable: true,
      images: ["mock_mojito_image"],
      description:
        "A refreshing blend of fresh mint leaves, lime juice, soda, and crushed ice.",
      dietaryPreference: "veg",
      rating: 4.7,
      prepTime: "10 mins",
      badge: { type: "bestseller" },
      addOns: [],
      crossSellItems: [],
    },
    {
      id: "fi6",
      name: "Cold Brew Iced Coffee",
      categoryId: "c3",
      price: 179,
      offerPrice: null,
      coupon: "",
      quantity: 20,
      isAvailable: true,
      images: ["mock_coffee_image"],
      description:
        "Slow-steeped smooth cold brew coffee served over ice with a splash of milk.",
      dietaryPreference: "veg",
      rating: 4.5,
      prepTime: "5 mins",
      badge: { type: "none" },
      addOns: [],
      crossSellItems: [],
    },

    // --- ICE CREAMS & DESSERTS (c4) ---
    {
      id: "fi7",
      name: "Sizzling Brownie with Vanilla",
      categoryId: "c4",
      price: 249,
      offerPrice: 199,
      coupon: "SWEET20",
      quantity: 12,
      isAvailable: true,
      images: ["mock_brownie_image"],
      description:
        "Fudgy chocolate brownie served warm on a hot iron skillet with vanilla ice cream and hot fudge.",
      dietaryPreference: "veg",
      rating: 4.9,
      prepTime: "15 mins",
      badge: { type: "hot" },
      addOns: [
        {
          id: "g4",
          name: "Toppings",
          isActive: true,
          options: [
            {
              id: "o5",
              name: "Extra Choco Syrup",
              price: 30,
              isAvailable: true,
            },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi8",
      name: "Alphonso Mango Ice Cream",
      categoryId: "c4",
      price: 159,
      offerPrice: null,
      coupon: "",
      quantity: 18,
      isAvailable: true,
      images: ["mock_icecream_image"],
      description:
        "Rich and creamy artisanal ice cream made with real Alphonso mango pulp.",
      dietaryPreference: "veg",
      rating: 4.6,
      prepTime: "5 mins",
      badge: { type: "new" },
      addOns: [],
      crossSellItems: [],
    },
  ],
  availableCoupons: [
    {
      id: "coup1",
      code: "WELCOME50",
      description: "50% OFF on first order",
      isActive: true,
    },
    {
      id: "coup2",
      code: "FESTIVAL20",
      description: "20% OFF on all items",
      isActive: false,
    },
  ],
};
