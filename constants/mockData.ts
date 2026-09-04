import {
  Croissant,
  Flame,
  IceCreamBowl,
  Soup,
  Utensils,
} from "lucide-react-native";

export const OFFERS = [
  {
    id: 1,
    title: "50% OFF",
    subtitle: "On first order",
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
    category: "Biryani",
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
    category: "Grills",
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
    category: "Curries",
  },
];
