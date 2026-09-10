import {
  Croissant,
  Flame,
  IceCreamBowl,
  Soup,
  Utensils,
} from "lucide-react-native";

export const RESTAURANT_NAME = "Foodie Verse";

export const MOCK_USER = [
  {
    _id: "6aa0f945635a7fbe5193aa50",
    phone_number: "918686868665",
    first_name: "Guest",
    last_name: "Sample",
    role: "guest",
    createdAt: "2026-09-09T06:14:29.139Z",
    updatedAt: "2026-09-09T06:14:29.139Z",
  },
  {
    _id: "6aa0f945635a7fbe5193aa51",
    phone_number: "918686868666",
    first_name: "Siva",
    last_name: "Narayana",
    role: "user",
    createdAt: "2026-09-09T06:14:29.139Z",
    updatedAt: "2026-09-09T06:14:29.139Z",
  },
  {
    _id: "6aa0f945635a7fbe5193aa52",
    phone_number: "918686868667",
    first_name: "Sita",
    last_name: "Mahitha",
    role: "manager",
    createdAt: "2026-09-09T06:14:29.139Z",
    updatedAt: "2026-09-09T06:14:29.139Z",
  },
  {
    _id: "6aa0f945635a7fbe5193aa53",
    phone_number: "918686868668",
    first_name: "Ram",
    last_name: "Das",
    role: "admin",
    createdAt: "2026-09-09T06:14:29.139Z",
    updatedAt: "2026-09-09T06:14:29.139Z",
  },
  {
    _id: "6aa0f945635a7fbe5193aa54",
    phone_number: "918686868669",
    first_name: "Deelip",
    last_name: "Setty",
    role: "waiter",
    createdAt: "2026-09-09T06:14:29.139Z",
    updatedAt: "2026-09-09T06:14:29.139Z",
  },
];

export const FEATURED_CONTENT = {
  type: "video",

  source: "https://www.pexels.com/download/video/31877282/",
  tag: "FEATURED REEL",
  title: "Freshly Crafted Daily",
};

export const EMPTY_STATE = {
  emoji: "🍽️",
  title: "Oops! No matches found.",
  subtitle:
    'We couldn\'t find anything exactly matching "{query}". Try searching for Biryani, Sweets, or Pizza!',
};

export const MOCK_ADDRESSES = [
  { id: "1", type: "Home", address: "Silicon Valley, Madhapur, Hyderabad" },
  { id: "2", type: "Office", address: "Hitech City, Phase 2, Floor 4" },
  { id: "3", type: "Other", address: "Jubilee Hills, Road No 36" },
];

export const MOCK_BRANCHES = [
  {
    id: "b1",
    name: "Hitech City Premium",
    address: "Inorbit Mall Road, Madhapur",
  },
  {
    id: "b2",
    name: "Jubilee Hills Outlet",
    address: "Road No 36, Jubilee Hills",
  },
  {
    id: "b3",
    name: "Gachibowli Express",
    address: "DLF Cyber City, Gachibowli",
  },
];

export const SEARCH_PLACEHOLDERS = [
  "Biryani",
  "Cake",
  "Sweets",
  "Pizza",
  "Burgers",
];

export const GREETING_PHRASES = [
  "How are you eating today?",
  "What are you craving?",
  "Let's get you something tasty!",
  "Ready for a delicious meal?",
];

export const OFFERS = [
  {
    id: 1,
    title: "50% OFF",
    subtitle: "On your first Biryani order",
    image:
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "FREE DESSERT",
    subtitle: "On orders above ₹499",
    image:
      "https://images.unsplash.com/photo-1551024506-0baa2740d303?auto=format&fit=crop&w=800&q=80",
  },
];

export const CATEGORIES = [
  { id: 1, name: "Biryani", icon: Utensils },
  { id: 2, name: "Grills", icon: Flame },
  { id: 3, name: "Curries", icon: Soup },
  { id: 4, name: "Breads", icon: Croissant },
  { id: 5, name: "Desserts", icon: IceCreamBowl },
];

export const ADD_ONS = [
  { id: "ao1", name: "Extra Cheese", price: 30 },
  { id: "ao2", name: "Extra Dip", price: 20 },
  { id: "ao3", name: "Large Portion", price: 75 },
];

export const CROSS_SELL_ITEMS = [
  {
    id: "cs1",
    name: "Cappuccino",
    price: "₹175",
    image:
      "https://images.unsplash.com/photo-1585494156145-1c60a4fe952c?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
  },
  {
    id: "cs2",
    name: "Choco Lava Cake",
    price: "₹115",
    image:
      "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
  },
  {
    id: "cs3",
    name: "French Fries",
    price: "₹149",
    image:
      "https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
  },
];

export const DELIVERY_OPTIONS = [
  {
    id: "del1",
    title: "Express",
    subtitle: "Fastest delivery, directly to you!",
    price: 29,
    time: "20-25 mins",
  },
  {
    id: "del2",
    title: "Standard",
    subtitle: "Minimal order grouping",
    price: 0,
    time: "25-30 mins",
  },
  {
    id: "del3",
    title: "Eco Saver",
    subtitle: "Lesser CO2 by order grouping",
    price: -10,
    time: "30-40 mins",
  },
];

export const TIP_OPTIONS = [20, 30, 50];

export const AVAILABLE_COUPONS = [
  {
    code: "FOODIE63",
    description: "₹63 saved with 'Items at ₹62'",
    discount: 63,
  },
  {
    code: "WELCOME100",
    description: "Flat ₹100 off on first order",
    discount: 100,
  },
];

// --- ADD THIS TO THE BOTTOM OF YOUR mockData.ts ---
export const TAX_DETAILS = {
  packagingCharge: 23.81,
  platformFee: 17.98,
  gstRate: 0.05, // 5% Standard Restaurant GST
  deliveryDistance: "2.1 kms",
  baseDeliveryFee: 38,
};

export const ALL_OFFERS = [
  {
    id: 1,
    title: "50% OFF",
    subtitle: "On your first Biryani order",
    code: "BIRYANI50",
    image:
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "FREE DESSERT",
    subtitle: "On orders above ₹499",
    code: "SWEET",
    image:
      "https://images.unsplash.com/photo-1551024506-0baa2740d303?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    title: "FLAT ₹150 OFF",
    subtitle: "Weekend Special Festival",
    code: "WEEKEND150",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    title: "20% OFF",
    subtitle: "Midnight cravings sorted",
    code: "MIDNIGHT20",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
  },
];

export const FOOD_ITEMS = [
  {
    id: 1,
    name: "Special Chicken Dum Biryani",
    price: "₹319",
    time: "30 mins",
    rating: "4.8",
    offer: "₹50 OFF",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    description:
      "Authentic Hyderabadi dum biryani cooked with tender chicken and aromatic spices.",
    gallery: [
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
    ],
    category: "Biryani", // <-- Added category
  },
  {
    id: 2,
    name: "Tandoori Platter Full",
    price: "₹549",
    time: "40 mins",
    rating: "4.9",
    offer: "BESTSELLER",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
    description:
      "A delicious assortment of chicken tikka, seekh kebab, and tandoori chicken.",
    gallery: [
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=800&q=80",
    ],
    category: "Grills", // <-- Added category
  },
  {
    id: 3,
    name: "Paneer Butter Masala",
    price: "₹289",
    time: "25 mins",
    rating: "4.6",
    offer: "20% OFF",
    image:
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    description:
      "Soft paneer cubes cooked in a rich, creamy tomato gravy with butter.",
    gallery: [
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800&q=80",
    ],
    category: "Curries", // <-- Added category
  },
  {
    id: 4,
    name: "Garlic Naan",
    price: "₹55",
    time: "15 mins",
    rating: "4.7",
    offer: "HOT",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    description:
      "Soft and fluffy Indian bread topped with minced garlic and cilantro.",
    gallery: [
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80",
    ],
    category: "Breads", // <-- Added category
  },
  {
    id: 5,
    name: "Gulab Jamun",
    price: "₹99",
    time: "10 mins",
    rating: "4.8",
    offer: "SWEET",
    image:
      "https://images.unsplash.com/photo-1596803822253-625d8122a613?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
    description:
      "Classic Indian sweet of deep-fried milk dumplings soaked in rose-flavored sugar syrup.",
    gallery: [
      "https://images.unsplash.com/photo-1596803822253-625d8122a613?auto=format&fit=crop&w=800&q=80",
    ],
    category: "Desserts", // <-- Added category
  },
];
