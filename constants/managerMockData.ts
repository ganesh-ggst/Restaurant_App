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
  orders: any[];
  storefrontDisplay: any[];
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
      options: [{ id: "opt_1", value: "Foodie Verse", isActive: true }],
    },
    {
      id: "sd_address",
      title: "Manage Hotel Address",
      selectionType: "single",
      isSectionActive: true,
      options: [
        {
          id: "opt_addr_1",
          value: "Hitech City, Hyderabad, Telangana",
          isActive: true,
        },
      ],
    },
    {
      id: "sd_tax",
      title: "Tax Details (GST)",
      selectionType: "single",
      isSectionActive: true,
      options: [{ id: "opt_2", value: "5%", isActive: true }],
    },
    {
      id: "sd_wifi",
      title: "Wi-Fi Connections",
      selectionType: "multiple",
      isSectionActive: true,
      options: [
        {
          id: "opt_3",
          value: "FoodieVerse_Guest",
          subValue: "SpicyBiryani!",
          isActive: true,
        },
      ],
    },
    {
      id: "sd_charges",
      title: "Restaurant Charges",
      selectionType: "single",
      isSectionActive: true,
      options: [
        {
          id: "opt_charges_1",
          value: "Packaging: ₹20 | Platform: ₹10 | Delivery: ₹30",
          subValue:
            "Packaging Charge: ₹20, Platform Fee: ₹10, Base Delivery Fee: ₹30",
          isActive: true,
        },
      ],
    },
    {
      id: "sd_delivery",
      title: "Delivery Options",
      selectionType: "multiple",
      isSectionActive: true,
      options: [
        {
          id: "opt_del_1",
          value: "Express (₹29)",
          subValue: "Fastest delivery, directly to you! • 20-25 mins",
          isActive: true,
        },
        {
          id: "opt_del_2",
          value: "Standard (Free)",
          subValue: "Minimal order grouping • 25-30 mins",
          isActive: false,
        },
        {
          id: "opt_del_3",
          value: "Eco Saver (-₹10)",
          subValue: "Lesser CO2 by order grouping • 30-40 mins",
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
  storefrontDisplay: [
    {
      id: "sf_greetings",
      title: "Greetings",
      selectionType: "multiple",
      isSectionActive: true,
      options: [
        { id: "g_1", value: "What are you craving?", isActive: true },
        { id: "g_2", value: "Let's get you something tasty!", isActive: true },
        { id: "g_3", value: "Ready for a delicious meal?", isActive: true },
        { id: "g_4", value: "How are you eating today?", isActive: true },
      ],
    },
    {
      id: "sf_search",
      title: "Search Placeholders",
      selectionType: "multiple",
      isSectionActive: true,
      options: [
        { id: "sp_1", value: "Search for 'Sweets'", isActive: true },
        { id: "sp_2", value: "Search for 'Pizza'", isActive: true },
        { id: "sp_3", value: "Search for 'Biryani'", isActive: true },
        { id: "sp_4", value: "Search for 'Cake'", isActive: true },
      ],
    },
    {
      id: "sf_featured",
      title: "Featured Content",
      selectionType: "single",
      options: [
        {
          id: "fc_1",
          value: "Freshly Crafted Daily",
          subValue: "Featured Reel Banner • Image/Video",
          isActive: true,
        },
      ],
    },
    {
      id: "sf_empty",
      title: "Empty State",
      selectionType: "single",
      isSectionActive: true,
      options: [
        {
          id: "es_1",
          value: "Oops! No matches found.",
          subValue: "We couldn't find anything exactly matching.",
          isActive: true,
        },
      ],
    },
    {
      id: "sf_celebrations",
      title: "Celebration Emojis",
      selectionType: "multiple",
      options: [
        {
          id: "sf_cel_1",
          value: "🎉",
          subValue: "Checkout success confetti effect",
          isActive: true,
        },
        {
          id: "sf_cel_2",
          value: "✨",
          subValue: "Checkout success sparkle effect",
          isActive: false,
        },
        {
          id: "sf_cel_3",
          value: "🌸",
          subValue: "Checkout success floral effect",
          isActive: false,
        },
      ],
    },
  ],
  orders: [
    {
      id: "ord_01",
      customerName: "Siva Narayana",
      phone: "+91 9999999996",
      branch: "Hitech City Premium",
      mode: "Delivery",
      items: [
        { name: "Chicken Dum Biryani", qty: 2, price: 340 },
        { name: "Coke (500ml)", qty: 2, price: 60 },
      ],
      totalAmount: 800,
      status: "pending", // pending -> preparing -> ready -> completed
      time: "2 mins ago",
    },
    {
      id: "ord_02",
      customerName: "Rahul Sharma",
      phone: "+91 9876543210",
      branch: "Hitech City Premium",
      mode: "Takeaway",
      items: [{ name: "Grills & Starters Platter", qty: 1, price: 450 }],
      totalAmount: 450,
      status: "pending",
      time: "12 mins ago",
    },
    {
      id: "ord_03",
      customerName: "Anita Reddy",
      phone: "+91 9123456789",
      branch: "Hitech City Premium",
      mode: "Delivery",
      items: [
        { name: "Butter Naan & Paneer Butter Masala", qty: 2, price: 320 },
      ],
      totalAmount: 640,
      status: "preparing",
      time: "25 mins ago",
    },
  ],
};
