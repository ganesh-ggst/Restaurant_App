import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function ManagerDashboard() {
  const theme = useAppTheme();
  const router = useRouter();

  const { phone } = useLocalSearchParams<{ phone: string }>();
  const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  const currentManager = MANAGER_MOCK_DATA.managers.find(
    (m) => m.phone === normalizedPhone,
  );

  if (!currentManager) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Manager profile not found.</Text>
      </SafeAreaView>
    );
  }

  const myTables = MANAGER_MOCK_DATA.tables.filter(
    (t) => t.managerId === currentManager.id,
  );
  const myWaiters = MANAGER_MOCK_DATA.waiters.filter(
    (w) => w.managerId === currentManager.id,
  );

  const occupiedTables = myTables.filter(
    (t) => t.status !== "available",
  ).length;
  const availableWaiters = myWaiters.filter(
    (w) => w.status === "available",
  ).length;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <ScrollView
        className="flex-1 px-6 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 mt-2">
          <View>
            <Text className="text-3xl font-black" style={{ color: theme.text }}>
              Hi, {currentManager.name.split(" ")[0]} 👋
            </Text>
            <Text
              className="text-sm font-medium mt-1"
              style={{ color: theme.muted }}
            >
              Here's your shift overview
            </Text>
          </View>

          <View className="flex-row items-center">
            <Pressable
              // FIX: Passing phone to notifications
              onPress={() =>
                router.push(
                  `/(manager)/notifications?phone=${encodeURIComponent(normalizedPhone)}` as any,
                )
              }
              className="p-3 rounded-full relative mr-2"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-lg">🔔</Text>
              <View
                className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.danger }}
              />
            </Pressable>

            <Pressable
              onPress={() => alert("Profile & Sign Out coming soon!")}
              className="p-3 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-lg">👤</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-between mb-8">
          <Card
            variant="default"
            className="w-[31%] py-5 items-center rounded-3xl border-0"
          >
            <Text
              className="text-3xl font-black mb-1"
              style={{ color: theme.text }}
            >
              {myTables.length}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Total{"\n"}Tables
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
              {occupiedTables}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Active{"\n"}Tables
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
              {availableWaiters}
            </Text>
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Free{"\n"}Waiters
            </Text>
          </Card>
        </View>

        {/* Tables */}
        <Text className="text-xl font-bold mb-4" style={{ color: theme.text }}>
          Live Tables
        </Text>

        <View className="flex-row flex-wrap justify-between">
          {myTables.map((table) => (
            <Pressable
              key={table.id}
              className="w-[48%] mb-4"
              // FIX: Passing phone to table details
              onPress={() =>
                router.push(
                  `/(manager)/table/${table.id}?phone=${encodeURIComponent(normalizedPhone)}` as any,
                )
              }
            >
              <Card variant="default" className="p-4 rounded-3xl border-0">
                <View className="flex-row justify-between items-center mb-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <Text
                      className="text-base font-black"
                      style={{ color: theme.text }}
                    >
                      T{table.number}
                    </Text>
                  </View>

                  <View
                    className="px-2 py-1 rounded-md"
                    style={{
                      backgroundColor:
                        table.status === "available"
                          ? "#22c55e"
                          : table.status === "occupied"
                            ? "#eab308"
                            : "#ef4444",
                    }}
                  >
                    <Text className="text-[9px] font-bold text-white uppercase tracking-wider">
                      {table.status === "needs_attention"
                        ? "Alert"
                        : table.status}
                    </Text>
                  </View>
                </View>

                <View className="mt-1">
                  <Text
                    className="text-sm font-medium mb-1"
                    style={{ color: theme.muted }}
                  >
                    Guests:{" "}
                    <Text style={{ color: theme.text, fontWeight: "bold" }}>
                      {table.activeCustomers.length}
                    </Text>
                  </Text>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: theme.muted }}
                    numberOfLines={1}
                  >
                    Waiter:{" "}
                    <Text style={{ color: theme.text, fontWeight: "bold" }}>
                      {table.assignedWaiterId
                        ? myWaiters
                            .find((w) => w.id === table.assignedWaiterId)
                            ?.name.split(" ")[0]
                        : "None"}
                    </Text>
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        {/* Waiters */}
        <Text
          className="text-xl font-bold mb-4 mt-4"
          style={{ color: theme.text }}
        >
          Team Status
        </Text>

        {myWaiters.map((waiter) => (
          <Card
            key={waiter.id}
            variant="default"
            className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: theme.bg }}
              >
                <Text className="text-base">🧑‍🍳</Text>
              </View>
              <Text
                className="text-base font-bold"
                style={{ color: theme.text }}
              >
                {waiter.name}
              </Text>
            </View>

            <View className="flex-row items-center">
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{
                  backgroundColor:
                    waiter.status === "available" ? "#22c55e" : "#ef4444",
                }}
              />
              <Text
                className="text-sm font-semibold capitalize"
                style={{ color: theme.muted }}
              >
                {waiter.status}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
