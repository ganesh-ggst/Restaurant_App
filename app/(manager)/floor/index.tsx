import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import {
  FloorTable,
  INITIAL_FLOOR_NOTIFICATIONS,
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function FloorDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { currentManager, normalizedPhone } = useCurrentManager();

  // Helper to ensure table total always includes GST correctly
  const calculateTableTotal = (table: FloorTable) => {
    if (!table.currentOrder) return 0;
    const storedTotal = table.currentOrder.totalAmount || 0;
    const items = table.currentOrder.items || [];

    const itemSum =
      items.length > 0
        ? items.reduce((acc, item) => acc + (item.price || 0), 0)
        : storedTotal;

    const taxSection = MANAGER_MOCK_DATA.storeDetails?.find(
      (s: any) => s.id === "sd_tax",
    );
    const activeTaxOpt =
      taxSection?.options?.find((o: any) => o.isActive) ||
      taxSection?.options?.[0];
    const taxStr = activeTaxOpt?.value || "5%";
    const taxRate = parseFloat(taxStr.replace(/[^0-9.]/g, "")) / 100 || 0.05;

    // If itemSum is valid, compute total with GST
    if (itemSum > 0) {
      const calculatedWithGst =
        Math.round((itemSum + itemSum * taxRate) * 100) / 100;
      if (
        storedTotal > itemSum &&
        Math.abs(storedTotal - calculatedWithGst) < 2
      ) {
        return storedTotal;
      }
      return calculatedWithGst;
    }

    return storedTotal;
  };

  const getTableNumber = (str: string) => {
    const match = String(str).match(/\d+/);
    return match ? match[0] : String(str).toUpperCase().trim();
  };

  const assignedTableValues = currentManager?.assignedTables || [];
  const assignedTableNums = new Set(
    assignedTableValues.map((val: string) => getTableNumber(val)),
  );

  const managerAssignedTables = INITIAL_FLOOR_TABLES.filter((t) => {
    const tNum = getTableNumber(t.tableName || t.id || "");
    return assignedTableNums.has(tNum);
  });

  const [tables, setTables] = useState<FloorTable[]>([
    ...managerAssignedTables,
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "occupied" | "reserved" | "billed"
  >("all");

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check In / Check Out toggle state
  const [isCheckedIn, setIsCheckedIn] = useState(true);

  useEffect(() => {
    if (hasUnreadNotifications) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [hasUnreadNotifications, pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      const refreshedAssignedTables = currentManager?.assignedTables || [];
      const refreshedNums = new Set(
        refreshedAssignedTables.map((val: string) => getTableNumber(val)),
      );
      const filtered = INITIAL_FLOOR_TABLES.filter((t) => {
        const tNum = getTableNumber(t.tableName || t.id || "");
        return refreshedNums.has(tNum);
      });
      setTables([...filtered]);

      const managerUnread = INITIAL_FLOOR_NOTIFICATIONS.some((n) => {
        if (n.isRead) return false;
        let tNum = "";
        if (n.tableId) {
          tNum = getTableNumber(n.tableId);
        } else if (n.message) {
          const match = n.message.match(/Table\s+(\d+)/i);
          if (match) {
            tNum = match[1];
          }
        }
        return tNum ? refreshedNums.has(tNum) : false;
      });

      setHasUnreadNotifications(managerUnread);
    }, [currentManager]),
  );

  const handleToggleCheckIn = (newValue: boolean) => {
    if (!newValue) {
      // 🔒 SECURITY CHECK: Ensure all assigned tables are free (available) before checking out
      const busyTables = tables.filter((t) => t.status !== "available");
      if (busyTables.length > 0) {
        const tableDetailsList = busyTables
          .map((t) => `• ${t.tableName} (${t.status.toUpperCase()})`)
          .join("\n");
        Alert.alert(
          "⚠️ Cannot Check Out",
          `All assigned tables must be cleared and marked as 'Free' before you can check out.\n\nActive/Billed Tables:\n${tableDetailsList}`,
          [{ text: "OK", style: "default" }],
        );
        return;
      }
    }

    Alert.alert(
      newValue ? "Check In" : "Check Out",
      `Are you sure you want to check ${newValue ? "IN" : "OUT"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Confirm",
          onPress: () => {
            setIsCheckedIn(newValue);
            // Update manager active/inactive status and unassign tables/waiters on check out
            if (currentManager) {
              const matchMgr = MANAGER_MOCK_DATA.managers?.find(
                (m: any) =>
                  m.id === currentManager.id ||
                  m.phone === currentManager.phone,
              );
              if (matchMgr) {
                matchMgr.isActive = newValue;
                if (!newValue) {
                  // Unassign tables and waiters when checked out so other managers can handle them
                  matchMgr.assignedTables = [];
                  matchMgr.assignedWaiters = [];
                }
              }
            }
          },
        },
      ],
    );
  };

  const handleTestFreeTable = () => {
    const freeTableIndex = INITIAL_FLOOR_TABLES.findIndex(
      (t) =>
        t.status === "available" &&
        assignedTableNums.has(getTableNumber(t.tableName || t.id || "")),
    );
    if (freeTableIndex === -1) {
      Alert.alert(
        "No Free Tables",
        "All your assigned tables are currently occupied, reserved, or billed!",
      );
      return;
    }

    const assignedWaiterIds = currentManager?.assignedWaiters || [];
    const defaultWaiterId = assignedWaiterIds[0] || "w1";

    INITIAL_FLOOR_TABLES[freeTableIndex] = {
      ...INITIAL_FLOOR_TABLES[freeTableIndex],
      status: "occupied",
      customerCount: INITIAL_FLOOR_TABLES[freeTableIndex].capacity,
      currentOrder: {
        orderId: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        itemsCount: 2,
        totalAmount: 950,
        waiterId: defaultWaiterId,
        timeSeated: "Just ordered via QR",
      },
    };

    const filtered = INITIAL_FLOOR_TABLES.filter((t) => {
      const tNum = getTableNumber(t.tableName || t.id || "");
      return assignedTableNums.has(tNum);
    });
    setTables([...filtered]);

    Alert.alert(
      "Table Updated",
      `${INITIAL_FLOOR_TABLES[freeTableIndex].tableName} moved to Active (Blocked).`,
    );
  };

  if (!currentManager) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Manager profile not found.</Text>
      </SafeAreaView>
    );
  }

  const totalTables = tables.length;
  const availableCount = tables.filter((t) => t.status === "available").length;
  const occupiedCount = tables.filter((t) => t.status === "occupied").length;
  const reservedCount = tables.filter((t) => t.status === "reserved").length;

  const filteredTables = tables.filter((table) => {
    const matchesSearch = table.tableName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = table.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: FloorTable["status"]) => {
    switch (status) {
      case "available":
        return "#22c55e";
      case "occupied":
        return theme.primary;
      case "reserved":
        return "#eab308";
      case "billed":
        return "#3b82f6";
      default:
        return theme.muted;
    }
  };

  const handleTablePress = (table: FloorTable) => {
    router.push(`/(manager)/floor/table/${table.id}` as any);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      {/* --- TOP HEADER --- */}
      <View className="px-6 mb-4 mt-2">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1 mr-3">
            <Text
              className="text-2xl font-black"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              Floor Manager 🍽️
            </Text>
            <Text
              className="text-xs font-medium mt-0.5"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Live seating • {currentManager.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                setHasUnreadNotifications(false);
                router.push(
                  `/(manager)/floor/profile/notifications?phone=${encodeURIComponent(normalizedPhone)}` as any,
                );
              }}
              className="p-3 rounded-full relative"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="bell" size={20} color={theme.text} />
              {hasUnreadNotifications && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <View
                    className="w-3 h-3 rounded-full shadow-md"
                    style={{ backgroundColor: theme.primary }}
                  />
                </Animated.View>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                router.push(
                  `/(manager)/floor/profile?phone=${encodeURIComponent(normalizedPhone)}` as any,
                )
              }
              className="p-3 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-lg">👤</Text>
            </Pressable>
          </View>
        </View>

        {/* --- CHECK IN / CHECK OUT TOGGLE BAR --- */}
        <Card
          variant="default"
          className="p-3.5 mb-4 rounded-2xl border-0 flex-row items-center justify-between"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: isCheckedIn ? "#22c55e" : "#ef4444" }}
            />
            <View>
              <Text
                className="text-xs font-black uppercase"
                style={{ color: theme.text }}
              >
                {isCheckedIn ? "CHECKED IN" : "CHECKED OUT"}
              </Text>
              <Text className="text-[10px]" style={{ color: theme.muted }}>
                {isCheckedIn ? "On duty & managing floor" : "Off duty"}
              </Text>
            </View>
          </View>

          <Switch
            value={isCheckedIn}
            onValueChange={handleToggleCheckIn}
            trackColor={{ false: theme.border, true: "#22c55e" }}
            thumbColor={"#ffffff"}
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </Card>

        {/* --- TEST FREE TABLE BUTTON --- */}
        <Pressable
          onPress={handleTestFreeTable}
          className="p-3 mb-4 rounded-2xl items-center flex-row justify-center border border-dashed"
          style={{ borderColor: theme.primary }}
        >
          <Text
            className="text-xs font-bold uppercase text-center"
            style={{ color: theme.primary }}
          >
            ▶️ Test Free Table (Move to Active & Block)
          </Text>
        </Pressable>

        {/* --- FORMATTED STATS CARDS --- */}
        <View className="flex-row justify-between mb-4">
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: theme.text }}
            >
              {totalTables}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Total
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: "#22c55e" }}
            >
              {availableCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Free
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: theme.primary }}
            >
              {occupiedCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Active
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: "#eab308" }}
            >
              {reservedCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Reserved
            </Text>
          </Card>
        </View>

        {/* --- SEARCH BAR --- */}
        <TextInput
          placeholder="Search tables..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="px-4 rounded-xl mb-3 font-semibold"
          style={{
            backgroundColor: theme.card,
            color: theme.text,
            fontSize: 15,
            height: 48,
          }}
        />

        {/* --- SEGMENTED TAB FILTER --- */}
        <View
          className="flex-row p-1 rounded-2xl mb-2"
          style={{ backgroundColor: theme.card }}
        >
          {[
            { id: "all", label: "All" },
            { id: "available", label: "Free" },
            { id: "occupied", label: "Active" },
            { id: "reserved", label: "Reserved" },
            { id: "billed", label: "Billed" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setStatusFilter(tab.id as any)}
                className="flex-1 py-2.5 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isActive ? theme.primary : "transparent",
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: isActive ? "#ffffff" : theme.muted,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* --- TABLE GRID LIST OR CHECKED OUT NOTICE --- */}
      {isCheckedIn ? (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredTables.length > 0 ? (
            filteredTables.map((table) => {
              const statusColor = getStatusColor(table.status);
              const capacity = table.capacity;
              const isBlocked = table.status !== "available";

              return (
                <Pressable
                  key={table.id}
                  onPress={() => handleTablePress(table)}
                >
                  <Card
                    variant="default"
                    className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text
                          className="text-lg font-black"
                          style={{ color: theme.text }}
                        >
                          {table.tableName}
                        </Text>
                        <View
                          className="px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        >
                          <Text
                            className="text-[10px] font-extrabold uppercase"
                            style={{ color: "#ffffff" }}
                          >
                            {table.status}
                          </Text>
                        </View>

                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isBlocked ? "#ef4444" : "#22c55e",
                          }}
                        >
                          <Text className="text-[9px] font-bold text-white">
                            {isBlocked ? "BLOCKED 🔒" : "OPEN 🔓"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className="text-xs font-medium mb-1"
                        style={{ color: theme.muted }}
                      >
                        Capacity: {capacity} Guests Max
                      </Text>

                      {table.status === "reserved" || !table.currentOrder ? (
                        <Text
                          className="text-xs italic"
                          style={{ color: theme.muted }}
                        >
                          Ready for seating
                        </Text>
                      ) : (
                        (() => {
                          const assignedWaiter = MANAGER_MOCK_DATA.waiters.find(
                            (w: any) => w.id === table.currentOrder?.waiterId,
                          );
                          const waiterNameDisplay = assignedWaiter
                            ? assignedWaiter.name
                            : "";
                          return (
                            <Text
                              className="text-xs font-bold"
                              style={{ color: theme.text }}
                            >
                              {waiterNameDisplay
                                ? `Waiter: ${waiterNameDisplay} • `
                                : ""}
                              {calculateTableTotal(table) > 0
                                ? `₹${calculateTableTotal(table)}`
                                : table.currentOrder.timeSeated}
                            </Text>
                          );
                        })()
                      )}
                    </View>

                    <View className="items-end">
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.primary }}
                      >
                        Manage →
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          ) : (
            <Card
              variant="default"
              className="p-8 rounded-2xl border border-dashed items-center mt-6"
              style={{ borderColor: theme.border }}
            >
              <Text
                className="text-sm italic text-center"
                style={{ color: theme.muted }}
              >
                No tables found matching your filter.
              </Text>
            </Card>
          )}
        </ScrollView>
      ) : (
        <View className="flex-1 px-6 justify-center items-center">
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center w-full shadow-lg"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-3xl mb-2">🔒</Text>
            <Text
              className="text-lg font-black mb-1 text-center"
              style={{ color: theme.text }}
            >
              You are Checked Out
            </Text>
            <Text
              className="text-xs font-medium text-center mb-4"
              style={{ color: theme.muted }}
            >
              Toggle 'Check In' above to view and manage your assigned floor
              tables.
            </Text>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}
