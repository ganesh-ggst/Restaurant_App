import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ErrorScreen } from "../../../../components/ui/ErrorScreen";
import { SectionTitle } from "../../../../components/ui/SectionTitle";
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../../hooks/useCurrentManager";

export default function TableDetailsScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  // Extract id from params, let the hook handle the phone parsing and manager lookup
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentManager } = useCurrentManager();

  const [table, setTable] = useState(
    MANAGER_MOCK_DATA.tables.find((t) => t.id === id),
  );

  // Security Check: Does the table exist AND does it belong to this logged-in manager?
  if (!table || !currentManager || table.managerId !== currentManager.id) {
    return (
      <ErrorScreen
        message="Access Denied"
        description={`You do not have permission to view or manage Table ${table?.number || id}.`}
      />
    );
  }

  const availableWaiters = MANAGER_MOCK_DATA.waiters.filter(
    (w) => w.managerId === table.managerId,
  );
  const currentWaiter = availableWaiters.find(
    (w) => w.id === table.assignedWaiterId,
  );

  const handleAssignWaiter = (waiterId: string) => {
    setTable({ ...table, assignedWaiterId: waiterId, status: "occupied" });
  };

  const handleClearTable = () => {
    setTable({
      ...table,
      status: "available",
      activeCustomers: [],
      assignedWaiterId: null,
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View className="flex-row items-center px-6 pt-4 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-4"
          hitSlop={20}
        >
          <Text className="text-2xl" style={{ color: theme.text }}>
            ←
          </Text>
        </Pressable>
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Table {table.number}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4 pb-8">
        <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
          <SectionTitle text="CURRENT STATUS" />
          <View className="flex-row justify-between items-center">
            <Text
              className="text-xl font-black capitalize"
              style={{ color: theme.text }}
            >
              {table.status.replace("_", " ")}
            </Text>
            {table.status !== "available" && (
              <Button
                title="Clear Table"
                onPress={handleClearTable}
                variant="outline"
                className="py-1.5 px-3"
              />
            )}
          </View>
        </Card>

        <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
          <SectionTitle
            text={`ACTIVE CUSTOMERS (${table.activeCustomers.length})`}
            className="mb-3"
          />
          {table.activeCustomers.length > 0 ? (
            table.activeCustomers.map((customer, index) => (
              <View
                key={customer.id}
                className={`py-2 ${index !== table.activeCustomers.length - 1 ? "border-b" : ""}`}
                style={{ borderBottomColor: theme.border }}
              >
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.text }}
                >
                  Customer {index + 1}
                </Text>
                <Text className="text-sm" style={{ color: theme.primary }}>
                  {customer.phone}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-sm" style={{ color: theme.muted }}>
              No active customers at this table.
            </Text>
          )}
        </Card>

        <View className="mb-4">
          <Text
            className="text-xl font-bold mb-1"
            style={{ color: theme.text }}
          >
            Assign Waiter
          </Text>
          <Text className="text-sm mb-4" style={{ color: theme.muted }}>
            Currently Assigned:{" "}
            <Text style={{ color: theme.primary, fontWeight: "bold" }}>
              {currentWaiter ? currentWaiter.name : "None"}
            </Text>
          </Text>

          {availableWaiters.map((waiter) => (
            <Pressable
              key={waiter.id}
              onPress={() => handleAssignWaiter(waiter.id)}
              className="mb-3 border-2 rounded-2xl overflow-hidden"
              style={{
                borderColor:
                  table.assignedWaiterId === waiter.id
                    ? theme.primary
                    : "transparent",
              }}
            >
              <Card
                variant="default"
                className="p-4 flex-row justify-between items-center border-0 rounded-2xl"
              >
                <View>
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    {waiter.name}
                  </Text>
                  <Text
                    className="text-xs capitalize mt-1"
                    style={{
                      color:
                        waiter.status === "available"
                          ? theme.primary
                          : theme.muted,
                    }}
                  >
                    {waiter.status}
                  </Text>
                </View>
                {table.assignedWaiterId === waiter.id && (
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
