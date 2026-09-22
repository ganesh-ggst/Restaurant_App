export const MANAGER_PHONES = {
  floor_1: "+919999999991",
  floor_2: "+919999999992",
  ops_1: "+919999999996",
};

// --- TYPESCRIPT INTERFACES ---
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

export interface FoodItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  offerPrice?: number;
  coupon?: string;
  isAvailable: boolean;
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

// --- MOCK DATA ---
export const MANAGER_MOCK_DATA: {
  managers: any[];
  waiters: any[];
  tables: any[];
  storeDetails: any;
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

  storeDetails: {
    restaurantName: "Foodie Verse",
    wifi: { ssid: "FoodieVerse_Guest", password: "SpicyBiryani!" },
    taxDetails: { gstPercentage: 5, serviceCharge: 0 },
    celebrationEmojis: ["🎉", "🎊", "🎂", "🥳"],
    greetingPhrases: [
      "How are eating today?",
      "Hungry for Biryani?",
      "Welcome back!",
    ],
    searchPlaceholders: [
      "Search for 'Biryani'",
      "Try 'Chicken Tikka'",
      "Craving 'Dessert'?",
    ],
    featuredContent: [
      { id: "f1", title: "Freshly Crafted Daily", type: "reel" },
    ],
    mockBranches: [
      "Silicon Valley, Madhapur, Hyderabad",
      "Banjara Hills, Hyderabad",
    ],
  },

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

  // --- CROSS SELLS (Linked to Categories) ---
  crossSellItems: [
    {
      id: "cs1",
      categoryName: "Popular Starters",
      triggerCategoryId: "c1", // Triggered when a user views/adds Biryani
      items: ["fi6", "fi3"], // Recommends standalone starters: Chicken 65 Full & Tandoori Chicken
    },
    {
      id: "cs2",
      categoryName: "More Sweet Treats",
      triggerCategoryId: "c4", // Triggered by Desserts
      items: ["fi4", "fi5"],
    },
  ],

  // --- FOOD ITEMS (Containing Item-Specific Add-Ons) ---
  foodItems: [
    {
      id: "fi1",
      name: "Chicken Dum Biryani",
      categoryId: "c1",
      price: 299,
      offerPrice: 249,
      coupon: "SAVE50",
      isAvailable: true,
      addOns: [
        {
          id: "g1",
          name: "Beverage Add-ons",
          isActive: true,
          options: [
            {
              id: "o1",
              name: "Thums Up (250ml)",
              price: 40,
              isAvailable: true,
            },
          ],
        },
        {
          id: "g2",
          name: "Biryani Extras",
          isActive: true,
          options: [
            { id: "o2", name: "Boiled Egg", price: 15, isAvailable: true },
            { id: "o3", name: "Extra Raita", price: 20, isAvailable: true },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi2",
      name: "Mutton Mandi",
      categoryId: "c1",
      price: 499,
      offerPrice: 449,
      coupon: "MANDI50",
      isAvailable: false,
      addOns: [
        {
          id: "g3",
          name: "Mandi Add Ons",
          isActive: true,
          options: [
            { id: "o4", name: "Extra Mayo Dip", price: 30, isAvailable: true },
            { id: "o5", name: "Fried Onions", price: 25, isAvailable: true },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi3",
      name: "Tandoori Chicken",
      categoryId: "c2", // Grills & Starters
      price: 349,
      offerPrice: 349,
      coupon: "",
      isAvailable: true,
      addOns: [],
      crossSellItems: [],
    },
    {
      id: "fi6",
      name: "Chicken 65 Full",
      categoryId: "c2", // Grills & Starters
      price: 269,
      offerPrice: 249,
      coupon: "",
      isAvailable: true,
      addOns: [],
      crossSellItems: [],
    },
    {
      id: "fi4",
      name: "Choco Lava Cake",
      categoryId: "c4", // Desserts
      price: 130,
      offerPrice: 110,
      coupon: "",
      isAvailable: true,
      addOns: [
        {
          id: "g4",
          name: "Toppings",
          isActive: true,
          options: [
            {
              id: "o6",
              name: "Extra Chocolate Syrup",
              price: 20,
              isAvailable: true,
            },
          ],
        },
      ],
      crossSellItems: [],
    },
    {
      id: "fi5",
      name: "Vanilla Scoop",
      categoryId: "c4", // Desserts
      price: 80,
      offerPrice: 70,
      coupon: "",
      isAvailable: true,
      addOns: [
        {
          id: "g5",
          name: "Sprinkles & Nuts",
          isActive: true,
          options: [
            {
              id: "o7",
              name: "Rainbow Sprinkles",
              price: 15,
              isAvailable: true,
            },
            { id: "o8", name: "Roasted Almonds", price: 25, isAvailable: true },
          ],
        },
      ],
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
