export const MANAGER_PHONES = {
  // Dine-in Floor Managers
  floor_1: "+919999999991",
  floor_2: "+919999999992",
  // Delivery/Takeaway Operations Manager
  ops_1: "+919999999996",
};

export const MANAGER_MOCK_DATA = {
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

  // ==========================================
  // DINE-IN / FLOOR MANAGER DATA
  // ==========================================
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

  // ==========================================
  // DELIVERY / TAKEAWAY OPERATIONS DATA
  // ==========================================
  storeDetails: {
    restaurantName: "Foodie Verse",
    wifi: { ssid: "FoodieVerse_Guest", password: "SpicyBiryani!" },
    taxDetails: { gstPercentage: 5, serviceCharge: 0 },
    celebrationEmojis: ["🎉", "🎊", "🎂", "🥳"],
    greetingPhrases: [
      "How are you eating today?",
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
    { id: "c2", name: "Grills", icon: "🍢", isActive: true },
    { id: "c3", name: "Breads", icon: "🥖", isActive: true },
  ],
  foodItems: [
    {
      id: "fi1",
      name: "Chicken Dum Biryani",
      categoryId: "c1",
      price: 299,
      isAvailable: true,
      crossSellItems: ["a1", "a2"],
    },
    {
      id: "fi2",
      name: "Mutton Mandi",
      categoryId: "c1",
      price: 499,
      isAvailable: false,
      crossSellItems: ["a1"],
    },
    {
      id: "fi3",
      name: "Tandoori Chicken",
      categoryId: "c2",
      price: 349,
      isAvailable: true,
      crossSellItems: [],
    },
  ],
  addOns: [
    { id: "a1", name: "Extra Raita", price: 20, isAvailable: true },
    { id: "a2", name: "Thumbs Up 250ml", price: 40, isAvailable: true },
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
