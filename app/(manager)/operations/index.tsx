import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function OperationsDashboard() {
  const theme = useAppTheme();
  const router = useRouter();

  const { currentManager } = useCurrentManager();

  const [foodItems, setFoodItems] = useState(MANAGER_MOCK_DATA.foodItems);

  if (!currentManager || currentManager.managerType !== "operations") {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Operations profile not found.</Text>
      </SafeAreaView>
    );
  }

  const { storeDetails, categories, availableCoupons } = MANAGER_MOCK_DATA;
  const activeItemsCount = foodItems.filter((item) => item.isAvailable).length;

  const toggleItemStock = (id: string) => {
    setFoodItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item,
      ),
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View className="flex-row justify-between items-center px-6 mb-4 mt-2">
        <View>
          <Text className="text-3xl font-black" style={{ color: theme.text }}>
            Operations ⚙️
          </Text>
          <Text
            className="text-sm font-medium mt-1"
            style={{ color: theme.muted }}
          >
            Manage menu & store settings
          </Text>
        </View>

        <Pressable
          onPress={() => alert("Profile & Sign Out coming soon!")}
          className="p-3 rounded-full"
          style={{ backgroundColor: theme.card }}
        >
          <Text className="text-lg">👤</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between mb-6">
          <Card
            variant="default"
            className="w-[31%] py-5 items-center rounded-3xl border-0"
          >
            <Text
              className="text-3xl font-black mb-1"
              style={{ color: theme.text }}
            >
              {foodItems.length}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Total{"\n"}Items
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[31%] py-5 items-center rounded-3xl border-0"
          >
            <Text
              className="text-3xl font-black mb-1"
              style={{ color: theme.text }}
            >
              {activeItemsCount}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              In Stock{"\n"}Items
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[31%] py-5 items-center rounded-3xl border-0"
          >
            <Text
              className="text-3xl font-black mb-1"
              style={{ color: theme.text }}
            >
              {availableCoupons.length}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Active{"\n"}Coupons
            </Text>
          </Card>
        </View>

        <Text className="text-xl font-bold mb-3" style={{ color: theme.text }}>
          Store Details
        </Text>
        <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
          <View
            className="flex-row justify-between items-center mb-3 border-b pb-3"
            style={{ borderBottomColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              Restaurant Name
            </Text>
            <Text
              className="text-base font-medium"
              style={{ color: theme.primary }}
            >
              {storeDetails.restaurantName}
            </Text>
          </View>
          <View
            className="flex-row justify-between items-center mb-3 border-b pb-3"
            style={{ borderBottomColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              Tax Details (GST)
            </Text>
            <Text
              className="text-base font-medium"
              style={{ color: theme.text }}
            >
              {storeDetails.taxDetails.gstPercentage}%
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              Guest Wi-Fi
            </Text>
            <Text
              className="text-base font-medium"
              style={{ color: theme.text }}
            >
              {storeDetails.wifi.ssid}
            </Text>
          </View>
        </Card>

        <View className="flex-row justify-between items-end mb-3">
          <Text className="text-xl font-bold" style={{ color: theme.text }}>
            Categories
          </Text>
          <Pressable
            onPress={() => router.push("/(manager)/operations/categories")}
          >
            <Text
              className="text-sm font-bold"
              style={{ color: theme.primary }}
            >
              View All
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6 -mx-6 px-6"
        >
          {categories.map((category) => (
            <Card
              key={category.id}
              variant="default"
              className="p-3 mr-3 rounded-2xl border-0 items-center min-w-[90px]"
            >
              <Text className="text-2xl mb-1">{category.icon}</Text>
              <Text className="text-xs font-bold" style={{ color: theme.text }}>
                {category.name}
              </Text>
              <Text
                className="text-[10px] mt-1 uppercase font-bold"
                style={{ color: category.isActive ? "#22c55e" : theme.muted }}
              >
                {category.isActive ? "Active" : "Hidden"}
              </Text>
            </Card>
          ))}
          <View className="w-6" />
        </ScrollView>

        <View className="flex-row justify-between items-end mb-3">
          <Text className="text-xl font-bold" style={{ color: theme.text }}>
            Quick Inventory
          </Text>
        </View>

        {foodItems.map((item) => (
          <Card
            key={item.id}
            variant="default"
            className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
          >
            <Pressable
              className="flex-1 mr-3 justify-center py-1"
              onPress={() =>
                router.push(`/(manager)/operations/item/${item.id}` as any)
              }
            >
              <Text
                className="text-base font-bold mb-1"
                style={{ color: theme.text }}
              >
                {item.name}
              </Text>
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.primary }}
              >
                ₹{item.price}
              </Text>
            </Pressable>

            <View className="items-end">
              <Switch
                value={item.isAvailable}
                onValueChange={() => toggleItemStock(item.id)}
                trackColor={{ false: theme.border, true: theme.primary }}
                ios_backgroundColor={theme.border}
                thumbColor={"#ffffff"}
              />
              <View className="w-30 items-center mt-1">
                <Text
                  className="text-[8px] font-bold uppercase text-center"
                  style={{
                    color: item.isAvailable ? theme.primary : theme.danger,
                  }}
                  numberOfLines={1}
                >
                  {item.isAvailable ? "In Stock" : "Out of Stock"}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
