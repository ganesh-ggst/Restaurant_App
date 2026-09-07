import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, Search, UserRound } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FoodCard from "../../components/home/FoodCard";

// --- SYNCHRONIZED MENU DATA FOR FOODCARD COMPATIBILITY ---
const FOOD_ITEMS = [
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
    category: "Breads",
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
    category: "Desserts",
  },
];

const CATEGORIES = [
  "All",
  "Biryani",
  "Curries",
  "Grills",
  "Breads",
  "Desserts",
];

export default function SearchScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  // FIX: useLocalSearchParams combined with the tab bar override prevents sticky state
  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isVegOnly, setIsVegOnly] = useState(false);

  // FIX: Added 'else' block so it properly resets to 'All' when clicking the bottom menu tab
  useEffect(() => {
    if (params.category) {
      setActiveCategory(params.category as string);
    } else {
      setActiveCategory("All");
    }
  }, [params.category]);

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const cardBg = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const mutedText = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  const filteredItems = FOOD_ITEMS.filter(
    (item) =>
      (activeCategory === "All" || item.category === activeCategory) &&
      (!isVegOnly || item.isVeg) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      {/* UNIVERSAL HEADER & SEARCH (Sticky) */}
      <View
        style={{
          backgroundColor: bgColor,
          paddingHorizontal: 16,
          paddingVertical: 12,
          zIndex: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: textColor, fontSize: 28, fontWeight: "900" }}>
            Full Menu
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={() => router.push("/(home)/favorites")}
              style={{
                height: 44,
                width: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderColor,
                marginRight: 12,
              }}
            >
              <Heart size={20} color={textColor} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(home)/profile")}
              style={{
                height: 44,
                width: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              <UserRound size={22} color={textColor} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Search Input */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: cardBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              height: 48,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <Search size={20} color={mutedText} strokeWidth={2.5} />
            <TextInput
              placeholder="Search dishes..."
              placeholderTextColor={mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{
                flex: 1,
                marginLeft: 12,
                color: textColor,
                fontSize: 16,
                fontWeight: "500",
                includeFontPadding: false,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Veg Toggle */}
          <Pressable
            onPress={() => setIsVegOnly(!isVegOnly)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isVegOnly ? primaryColor : cardBg,
              borderRadius: 16,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: isVegOnly ? primaryColor : borderColor,
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderWidth: 1,
                borderColor: isVegOnly ? "#fff" : mutedText,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 2,
                marginRight: 6,
              }}
            >
              {isVegOnly && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: "#fff",
                    borderRadius: 3,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: isVegOnly ? "#fff" : mutedText,
                fontSize: 12,
                fontWeight: "900",
                letterSpacing: 0.5,
              }}
            >
              VEG
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* CATEGORY FILTERS */}
        <View
          style={{
            backgroundColor: bgColor,
            paddingVertical: 8,
            paddingBottom: 16,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    activeCategory === cat ? primaryColor : cardBg,
                  borderWidth: 1,
                  borderColor:
                    activeCategory === cat ? primaryColor : borderColor,
                }}
              >
                <Text
                  style={{
                    color: activeCategory === cat ? "#fff" : textColor,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* UNIFIED FOOD CARDS GRID */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            paddingHorizontal: 16,
          }}
        >
          {filteredItems.map((item) => (
            <FoodCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
