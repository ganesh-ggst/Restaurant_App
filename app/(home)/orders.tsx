import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../../components/ui/Card";

export default function OrdersScreen() {
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
      {/* Tabs */}
      <View className="mb-6 flex-row gap-3">
        {["Active", "Completed", "Cancelled", "All"].map((tab) => (
          <Card
            key={tab}
            variant={tab === "Active" ? "elevated" : "subtle"}
            className="flex-1"
          >
            <Text
              className="text-center text-sm font-semibold"
              style={{ color: textColor }}
            >
              {tab}
            </Text>
          </Card>
        ))}
      </View>

      {/* Empty State */}
      <Card variant="elevated">
        <View className="items-center gap-3 py-12">
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={48}
            color={isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)"}
          />
          <Text
            className="text-center text-lg font-semibold"
            style={{ color: textColor }}
          >
            No Active Orders
          </Text>
          <Text
            className="text-center text-sm"
            style={{ color: subtitleColor }}
          >
            Start ordering from your favorite restaurants
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}
