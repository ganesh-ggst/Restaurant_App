import { useUser } from "@clerk/expo";
import { useColorScheme } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../../components/ui/Card";

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useUser();

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const subtitleColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";

  return (
    <ScrollView
      style={{ backgroundColor: bgColor }}
      contentContainerStyle={{ flexGrow: 1 }}
      className="px-6 py-4"
    >
      {/* Welcome Section */}
      <View className="mb-6">
        <Text className="text-3xl font-bold" style={{ color: textColor }}>
          👋 Welcome back, {user?.firstName || "there"}!
        </Text>
        <Text className="mt-2 text-base" style={{ color: subtitleColor }}>
          Ready to order some delicious meals?
        </Text>
      </View>

      {/* Featured Section */}
      <Card variant="elevated" className="mb-6">
        <View className="gap-2">
          <Text className="text-xl font-bold" style={{ color: textColor }}>
            🎉 Special Offers
          </Text>
          <Text className="text-sm" style={{ color: subtitleColor }}>
            Get up to 40% off on your favorite restaurants
          </Text>
        </View>
      </Card>

      {/* Upcoming Orders */}
      <Card variant="elevated" className="mb-6">
        <View className="gap-2">
          <Text className="text-xl font-bold" style={{ color: textColor }}>
            📦 Upcoming Orders
          </Text>
          <Text className="text-sm" style={{ color: subtitleColor }}>
            No active orders right now
          </Text>
        </View>
      </Card>

      {/* Recommendations */}
      <Card variant="elevated">
        <View className="gap-2">
          <Text className="text-xl font-bold" style={{ color: textColor }}>
            ⭐ Recommended
          </Text>
          <Text className="text-sm" style={{ color: subtitleColor }}>
            Explore restaurants based on your preferences
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}
