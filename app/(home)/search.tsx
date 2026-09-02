import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const subtitleColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";

  return (
    <ScrollView
      style={{ backgroundColor: bgColor }}
      contentContainerStyle={{ flexGrow: 1 }}
      className="px-6 py-4"
    >
      {/* Search Bar */}
      <Input
        placeholder="Search restaurants..."
        keyboardType="default"
        icon={
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)"}
          />
        }
      />

      {/* Filters Section */}
      <View className="mb-6 mt-4">
        <Text className="mb-3 text-lg font-bold" style={{ color: textColor }}>
          Filters
        </Text>
        <View className="flex-row gap-2">
          {["Cuisine", "Price", "Rating", "Delivery", "Open Now"].map(
            (filter) => (
              <Card key={filter} variant="elevated" className="flex-1">
                <Text
                  className="text-center text-sm font-semibold"
                  style={{ color: textColor }}
                >
                  {filter}
                </Text>
              </Card>
            ),
          )}
        </View>
      </View>

      {/* Results Placeholder */}
      <Card variant="elevated">
        <View className="items-center gap-3 py-8">
          <MaterialCommunityIcons
            name="magnify"
            size={48}
            color={isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)"}
          />
          <Text
            className="text-center text-lg font-semibold"
            style={{ color: textColor }}
          >
            Start Searching
          </Text>
          <Text
            className="text-center text-sm"
            style={{ color: subtitleColor }}
          >
            Find your favorite restaurants
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}
