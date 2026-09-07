import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FoodCard from "../../components/home/FoodCard";
import { FOOD_ITEMS } from "../../constants/mockData";
import { useAppTheme } from "../../constants/theme";
import { useFavorites } from "./_layout";

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites } = useFavorites();

  const favoriteItems = FOOD_ITEMS.filter((item) =>
    favorites?.includes(item.id),
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center px-4 py-4 border-b"
        style={{ borderColor: theme.border, backgroundColor: theme.bg }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full border shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <ChevronLeft size={24} color={theme.text} strokeWidth={2.5} />
        </Pressable>
        <Text
          className="ml-4 text-2xl font-black tracking-tight"
          style={{ color: theme.text }}
        >
          My Favorites
        </Text>
      </View>

      {!favoriteItems || favoriteItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-center text-lg font-bold"
            style={{ color: theme.muted }}
          >
            No favorites yet.
          </Text>
          <Text
            className="text-center text-sm mt-2"
            style={{ color: theme.muted }}
          >
            Tap the heart icon on any dish to save it here for quick ordering.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          <View className="flex-row flex-wrap justify-between">
            {favoriteItems.map((item) => (
              <FoodCard key={`fav-${item.id}`} item={item} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
