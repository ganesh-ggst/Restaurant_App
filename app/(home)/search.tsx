import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, Search, UserRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { FOOD_ITEMS } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

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
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isVegOnly, setIsVegOnly] = useState(false);

  // Hook up global cart logic
  const {
    mode: orderMode,
    carts,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = carts[orderMode] || [];

  // Calculate items to dynamically pad the bottom (prevents View Cart from hiding cards)
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  useEffect(() => {
    if (params.category) {
      setActiveCategory(params.category as string);
    } else {
      setActiveCategory("All");
    }
  }, [params.category]);

  const filteredItems = FOOD_ITEMS.filter(
    (item) =>
      (activeCategory === "All" || item.category === activeCategory) &&
      (!isVegOnly || item.isVeg) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* UNIVERSAL HEADER & SEARCH */}
      <View className="px-4 py-3 z-10" style={{ backgroundColor: theme.bg }}>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-3xl font-black" style={{ color: theme.text }}>
            Full Menu
          </Text>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.push("/(home)/favorites")}
              className="h-11 w-11 items-center justify-center rounded-full border mr-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <Heart size={20} color={theme.text} strokeWidth={2.5} />
            </Pressable>

            <Pressable
              onPress={() => router.push("/(home)/profile")}
              className="h-11 w-11 items-center justify-center rounded-full border"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <UserRound size={22} color={theme.text} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View className="flex-row gap-3">
          {/* Search Input */}
          <View
            className="flex-1 flex-row items-center rounded-2xl px-4 h-12 border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Search size={20} color={theme.muted} strokeWidth={2.5} />
            <TextInput
              placeholder="Search dishes..."
              placeholderTextColor={theme.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-base font-medium"
              style={{
                color: theme.text,
                includeFontPadding: false,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Veg Toggle */}
          <Pressable
            onPress={() => setIsVegOnly(!isVegOnly)}
            className="flex-row items-center justify-center rounded-2xl px-4 border"
            style={{
              backgroundColor: isVegOnly ? theme.primary : theme.card,
              borderColor: isVegOnly ? theme.primary : theme.border,
            }}
          >
            <View
              className="w-3 h-3 border justify-center items-center rounded-[2px] mr-1.5"
              style={{ borderColor: isVegOnly ? "#fff" : theme.muted }}
            >
              {isVegOnly && (
                <View className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </View>
            <Text
              className="text-xs font-black tracking-wider"
              style={{ color: isVegOnly ? "#fff" : theme.muted }}
            >
              VEG
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        // Dynamic bottom padding prevents the floating cart from covering cards
        contentContainerStyle={{
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* CATEGORY FILTERS (Sticky) */}
        <View className="py-2 pb-4" style={{ backgroundColor: theme.bg }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  className="px-5 py-2 rounded-full border"
                  style={{
                    backgroundColor: isActive ? theme.primary : theme.card,
                    borderColor: isActive ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: isActive ? "#fff" : theme.text }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* UNIFIED FOOD CARDS GRID */}
        <View className="flex-row flex-wrap justify-between px-4">
          {filteredItems.map((item) => {
            const cartItem = activeCart.find((c: any) => c.id === item.id);
            return (
              <View key={item.id} style={{ width: "48%" }} className="mb-4">
                <FoodCard
                  item={item}
                  cartQuantity={cartItem?.quantity || 0}
                  onAddToCart={(qty, addons, total) =>
                    handleAddToCart(item, qty, addons, total)
                  }
                  onDecrement={() => handleDecrementCartItem(item.id)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
