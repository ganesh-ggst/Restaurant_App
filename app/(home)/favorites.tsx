import { useRouter } from "expo-router";
import { ArrowLeft, Heart, UserRound } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { FOOD_ITEMS } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useFavorites, useOrderMode } from "./_layout";

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const { favorites } = useFavorites();

  const {
    mode: orderMode,
    carts,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = carts[orderMode] || [];

  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const favoriteItems = FOOD_ITEMS.filter((item) =>
    favorites.includes(item.id),
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row justify-between items-center px-4 py-3 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={28} color={theme.text} strokeWidth={2.5} />
          </Pressable>
          <Text className="text-3xl font-black" style={{ color: theme.text }}>
            Favorites
          </Text>
        </View>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {favoriteItems.length === 0 ? (
          <View className="items-center justify-center py-20 px-6">
            <Heart
              size={64}
              color={theme.muted}
              strokeWidth={1.5}
              className="mb-4"
            />
            <Text
              className="text-xl font-black mb-2 text-center"
              style={{ color: theme.text }}
            >
              No favorites yet
            </Text>
            <Text
              className="text-sm font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Tap the heart icon on any food item to save it here for later.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between px-4 mt-2">
            {favoriteItems.map((item) => {
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
        )}
      </ScrollView>
    </View>
  );
}
