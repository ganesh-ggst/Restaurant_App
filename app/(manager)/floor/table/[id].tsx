import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import {
  FINANCIAL_MOCK_STATE,
  FloorTable,
  INITIAL_FLOOR_NOTIFICATIONS,
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
} from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../../hooks/useCurrentManager";

export default function TableDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentManager } = useCurrentManager();

  const tableIndex = INITIAL_FLOOR_TABLES.findIndex((t) => t.id === id);
  const table = INITIAL_FLOOR_TABLES[tableIndex];

  if (!table) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Table not found.</Text>
      </SafeAreaView>
    );
  }

  const tNum = table.tableName.replace(/[^0-9]/g, "");
  const tableKey = `T${tNum}`;
  const tableManager =
    MANAGER_MOCK_DATA.managers.find((m: any) =>
      m.assignedTables.includes(tableKey),
    ) || currentManager;

  const assignedWaiterIds = tableManager?.assignedWaiters || [];

  const busyWaiterIds = new Set(
    INITIAL_FLOOR_TABLES.filter(
      (t) =>
        t.id !== table.id &&
        (t.status === "occupied" || t.status === "billed") &&
        t.currentOrder?.waiterId,
    ).map((t) => t.currentOrder?.waiterId),
  );

  const availableWaiters = (MANAGER_MOCK_DATA.waiters || []).filter(
    (w: any) => {
      const belongsToManager =
        w.managerId === tableManager?.id || assignedWaiterIds.includes(w.id);
      const notBusyElsewhere = !busyWaiterIds.has(w.id);
      const isAvailableStatus = w.status === "available";
      return belongsToManager && notBusyElsewhere && isAvailableStatus;
    },
  );

  const matchedWaiterId =
    table.currentOrder?.waiterId || availableWaiters[0]?.id;
  const [selectedWaiterId, setSelectedWaiterId] = useState<string | undefined>(
    matchedWaiterId,
  );

  const [status, setStatus] = useState<FloorTable["status"]>(table.status);
  const [guestCount, setGuestCount] = useState(table.capacity.toString());
  const [customerCount, setCustomerCount] = useState<string>(
    table.customerCount?.toString() || "",
  );

  const [showTaxPopup, setShowTaxPopup] = useState(false);

  const [elapsedText, setElapsedText] = useState("");

  useEffect(() => {
    if (
      table.status === "available" ||
      table.status === "reserved" ||
      !table.currentOrder?.startTime
    )
      return;

    const updateElapsedTime = () => {
      const diffMs = Date.now() - (table.currentOrder?.startTime || Date.now());
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) {
        setElapsedText("Just now");
      } else if (diffMins === 1) {
        setElapsedText("1 min ago");
      } else {
        setElapsedText(`${diffMins} mins ago`);
      }
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 30000);
    return () => clearInterval(interval);
  }, [table]);

  const isBlocked = status !== "available";

  const allowedStatuses =
    table.status === "available"
      ? [
          { id: "available", label: "Free", color: "#22c55e" },
          { id: "occupied", label: "Active", color: theme.primary },
        ]
      : table.status === "occupied"
        ? [
            { id: "occupied", label: "Active", color: theme.primary },
            { id: "billed", label: "Billed", color: "#3b82f6" },
          ]
        : table.status === "billed"
          ? [
              { id: "billed", label: "Billed", color: "#3b82f6" },
              { id: "available", label: "Free", color: "#22c55e" },
            ]
          : table.status === "reserved"
            ? [
                { id: "reserved", label: "Reserved", color: "#eab308" },
                { id: "occupied", label: "Active", color: theme.primary },
              ]
            : [
                { id: "available", label: "Free", color: "#22c55e" },
                { id: "occupied", label: "Active", color: theme.primary },
                { id: "reserved", label: "Reserved", color: "#eab308" },
                { id: "billed", label: "Billed", color: "#3b82f6" },
              ];

  const handleStatusChange = (newStatus: FloorTable["status"]) => {
    setStatus(newStatus);
  };

  const taxSection = MANAGER_MOCK_DATA.storeDetails?.find(
    (s: any) => s.id === "sd_tax",
  );
  const activeTaxOpt =
    taxSection?.options?.find((o: any) => o.isActive) ||
    taxSection?.options?.[0];
  const taxStr = activeTaxOpt?.value || "5%";
  const taxRate = parseFloat(taxStr.replace(/[^0-9.]/g, "")) / 100 || 0.05;

  const handleSaveTable = () => {
    if (status === table.status) {
      Alert.alert(
        "Action Required",
        "You forgot to change option to related next option.",
      );
      return;
    }

    if ((status === "occupied" || status === "reserved") && !selectedWaiterId) {
      Alert.alert("Error", "Please select an assigned waiter for this table!");
      return;
    }

    const parsedCapacity = parseInt(guestCount) || table.capacity;
    const parsedCustomers = parseInt(customerCount) || 0;

    if (status === "occupied" && parsedCustomers <= 0) {
      Alert.alert(
        "Validation Error",
        "An active table must have at least 1 customer seated.",
      );
      setStatus(table.status);
      return;
    }

    if (table.status === "billed" && parsedCustomers <= 0) {
      Alert.alert(
        "Validation Error",
        "A billed table must have at least 1 customer seated.",
      );
      setStatus(table.status);
      return;
    }

    let timeTakenText = "15 mins";
    if (
      table.status !== "available" &&
      table.status !== "reserved" &&
      status === "available"
    ) {
      const startTime =
        table.currentOrder?.startTime || Date.now() - 15 * 60 * 1000;
      const diffMs = Date.now() - startTime;
      const diffMins = Math.max(1, Math.floor(diffMs / 60000));
      timeTakenText = `${diffMins} min${diffMins > 1 ? "s" : ""}`;
    }

    const isMovingToActive =
      table.status !== "occupied" && status === "occupied";
    const startTime = isMovingToActive
      ? Date.now()
      : table.currentOrder?.startTime || Date.now();

    // 🟢 DYNAMIC REVENUE CALCULATION: Capture bill amount when moving Billed -> Free
    if (table.status === "billed" && status === "available") {
      const billAmt = table.currentOrder?.totalAmount || 1207.5;
      FINANCIAL_MOCK_STATE.completedTableBills += billAmt;

      if (!(FINANCIAL_MOCK_STATE as any).completedTableTransactions) {
        (FINANCIAL_MOCK_STATE as any).completedTableTransactions = [];
      }
      const alreadyExists = (
        FINANCIAL_MOCK_STATE as any
      ).completedTableTransactions.some(
        (b: any) => b.tableName === table.tableName && b.amount === billAmt,
      );
      if (!alreadyExists) {
        (FINANCIAL_MOCK_STATE as any).completedTableTransactions.push({
          tableName: table.tableName,
          amount: billAmt,
        });
      }

      FINANCIAL_MOCK_STATE.salesDistribution.dineIn.amount += billAmt;

      // Dynamically update today's weekly trend bar (Thu)
      const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const liveDayStr = daysMap[new Date().getDay()];
      const todayEntry = FINANCIAL_MOCK_STATE.weeklyTrend.find(
        (w) => w.day === liveDayStr,
      );
      const targetIndex = FINANCIAL_MOCK_STATE.weeklyTrend.findIndex(
        (w) => w.day === liveDayStr,
      );
      if (todayEntry) {
        todayEntry.amount += billAmt;
        todayEntry.dineIn += billAmt;
      } else if (targetIndex > -1) {
        FINANCIAL_MOCK_STATE.weeklyTrend[targetIndex].amount += billAmt;
        FINANCIAL_MOCK_STATE.weeklyTrend[targetIndex].dineIn += billAmt;
      } else {
        FINANCIAL_MOCK_STATE.weeklyTrend[4].amount += billAmt;
        FINANCIAL_MOCK_STATE.weeklyTrend[4].dineIn += billAmt;
      }
    }

    if (tableIndex > -1) {
      const defaultOrderItems = [
        { name: "House Special Dish", qty: 1, price: 450 },
        { name: "Beverage", qty: 2, price: 300 },
      ];
      const activeItems = table.currentOrder?.items || defaultOrderItems;
      const subtotalVal = activeItems.reduce(
        (acc, item) => acc + item.price,
        0,
      );
      const calculatedTotalWithGst =
        Math.round((subtotalVal + subtotalVal * taxRate) * 100) / 100;

      INITIAL_FLOOR_TABLES[tableIndex] = {
        ...table,
        status,
        capacity: parsedCapacity,
        customerCount: status === "available" ? 0 : parsedCustomers,
        currentOrder:
          status === "available"
            ? undefined
            : status === "reserved"
              ? {
                  orderId:
                    table.currentOrder?.orderId ||
                    `RES-${Math.floor(100 + Math.random() * 900)}`,
                  itemsCount: table.currentOrder?.itemsCount || 0,
                  totalAmount: table.currentOrder?.totalAmount || 0,
                  waiterId: selectedWaiterId,
                  timeSeated: table.currentOrder?.timeSeated || "Reserved",
                  startTime: table.currentOrder?.startTime || Date.now(),
                }
              : {
                  orderId:
                    table.currentOrder?.orderId ||
                    `ORD-${Math.floor(100 + Math.random() * 900)}`,
                  itemsCount: table.currentOrder?.itemsCount || 2,
                  totalAmount: calculatedTotalWithGst,
                  waiterId: selectedWaiterId,
                  timeSeated: isMovingToActive
                    ? "Just now"
                    : table.currentOrder?.timeSeated || "Just now",
                  startTime,
                  items: activeItems,
                },
      };
    }

    const statusLabelMap: Record<FloorTable["status"], string> = {
      available: "Free",
      occupied: "Active",
      reserved: "Reserved",
      billed: "Billed",
    };

    const targetOptionLabel = statusLabelMap[status] || status;

    INITIAL_FLOOR_NOTIFICATIONS.unshift({
      id: `fn_${Date.now()}`,
      title: "Table Status Changed",
      message: `${table.tableName} successfully moved to "${targetOptionLabel}".`,
      timestamp: "Just now",
      type: "status_change",
      isRead: false,
      tableId: table.id,
    });

    const successMessage =
      status === "available"
        ? `Successfully moved to "${targetOptionLabel}"!\n⏱️ Total Session Time: ${timeTakenText}`
        : `Successfully moved to "${targetOptionLabel}"!`;

    Alert.alert("Success", successMessage, [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const isLockedState =
    table.status === "occupied" || table.status === "billed";

  const lockedWaiterObj = MANAGER_MOCK_DATA.waiters.find(
    (w: any) => w.id === table.currentOrder?.waiterId,
  );
  const assignedWaiterName = lockedWaiterObj?.name || "Assigned Waiter";

  const showCart = table.status === "occupied" || table.status === "billed";
  const orderedItems = table.currentOrder?.items || [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View
        className="flex-row items-center px-6 pt-4 pb-4 border-b"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
          hitSlop={20}
        >
          <Text className="text-2xl" style={{ color: theme.text }}>
            ←
          </Text>
        </Pressable>
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Manage {table.tableName}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="p-4 mb-6 rounded-2xl flex-row justify-between items-center border"
          style={{
            backgroundColor: isBlocked
              ? "rgba(239, 68, 68, 0.1)"
              : "rgba(34, 197, 94, 0.1)",
            borderColor: isBlocked ? "#ef4444" : "#22c55e",
          }}
        >
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold" style={{ color: theme.text }}>
              📱 Table Block Status
            </Text>
            <Text
              className="text-xs font-medium mt-0.5"
              style={{ color: theme.muted }}
            >
              {isBlocked
                ? "Table is currently blocked & active."
                : "Table is open and available."}
            </Text>
          </View>
          <View
            className="px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: isBlocked ? "#ef4444" : "#22c55e" }}
          >
            <Text className="text-xs font-bold text-white">
              {isBlocked ? "Blocked 🔒" : "Open 🔓"}
            </Text>
          </View>
        </View>

        <Text
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Table Status *
        </Text>
        <View className="flex-row gap-2 mb-6">
          {allowedStatuses.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => handleStatusChange(s.id as any)}
              className="py-3 rounded-xl border-2 flex-1 items-center justify-center px-1"
              style={{
                borderColor: status === s.id ? s.color : theme.border,
                backgroundColor: status === s.id ? s.color : "transparent",
              }}
            >
              <Text
                className="text-[11px] font-extrabold uppercase text-center"
                style={{
                  color: status === s.id ? "#ffffff" : theme.text,
                }}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
          <Text
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: theme.muted }}
          >
            Seating Capacity
          </Text>
          <TextInput
            placeholder="e.g. 4"
            placeholderTextColor={theme.muted}
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="number-pad"
            className="px-4 rounded-xl mb-4 font-bold"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              fontSize: 16,
              height: 52,
            }}
          />

          <Text
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: theme.muted }}
          >
            Number of Customers Seated
          </Text>
          <TextInput
            placeholder="0"
            placeholderTextColor={theme.muted}
            value={customerCount}
            onChangeText={setCustomerCount}
            keyboardType="number-pad"
            className="px-4 rounded-xl mb-2 font-bold"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              fontSize: 16,
              height: 52,
            }}
          />

          {table.status !== "available" && table.status !== "reserved" && (
            <Text
              className="text-xs font-medium mb-4 italic"
              style={{ color: theme.muted }}
            >
              ⏱️ Session Time:{" "}
              {elapsedText || table.currentOrder?.timeSeated || "Just now"}
            </Text>
          )}

          {showCart && orderedItems.length > 0 && (
            <View
              className="mb-4 p-3 rounded-2xl"
              style={{ backgroundColor: theme.bg }}
            >
              <Text
                className="text-xs font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                🛒 Ordered Items & Charges Breakdown
              </Text>
              {orderedItems.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row justify-between items-center py-1"
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.text }}
                  >
                    {item.name} (x{item.qty})
                  </Text>
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.text }}
                  >
                    ₹{item.price}
                  </Text>
                </View>
              ))}

              {(() => {
                const subtotal =
                  orderedItems.reduce((acc, item) => acc + item.price, 0) ||
                  950;
                const gstAmount = Math.round(subtotal * taxRate * 100) / 100;
                const totalWithGst = subtotal + gstAmount;
                const halfRatePct = (taxRate * 100) / 2;

                return (
                  <>
                    <View
                      className="flex-row justify-between items-center pt-2 mt-2 border-t"
                      style={{ borderTopColor: theme.border }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: theme.muted }}
                      >
                        Subtotal
                      </Text>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.text }}
                      >
                        ₹{subtotal}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => setShowTaxPopup(!showTaxPopup)}
                      className="flex-row justify-between items-center py-1"
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.primary }}
                      >
                        GST ({taxStr})
                      </Text>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.text }}
                      >
                        ₹{gstAmount}
                      </Text>
                    </Pressable>

                    {showTaxPopup && (
                      <View
                        className="p-2.5 my-1.5 rounded-xl border"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        }}
                      >
                        <Text
                          className="text-[11px] font-black uppercase mb-1"
                          style={{ color: theme.primary }}
                        >
                          Tax Breakdown ({taxStr}):
                        </Text>
                        <View className="flex-row justify-between items-center py-0.5">
                          <Text
                            className="text-[11px]"
                            style={{ color: theme.muted }}
                          >
                            • CGST ({halfRatePct}%)
                          </Text>
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: theme.text }}
                          >
                            ₹{(gstAmount / 2).toFixed(2)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between items-center py-0.5">
                          <Text
                            className="text-[11px]"
                            style={{ color: theme.muted }}
                          >
                            • SGST ({halfRatePct}%)
                          </Text>
                          <Text
                            className="text-[11px] font-bold"
                            style={{ color: theme.text }}
                          >
                            ₹{(gstAmount / 2).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      className="flex-row justify-between items-center pt-2 mt-2 border-t"
                      style={{ borderTopColor: theme.border }}
                    >
                      <Text
                        className="text-xs font-black uppercase"
                        style={{ color: theme.primary }}
                      >
                        Total Bill Amount
                      </Text>
                      <Text
                        className="text-sm font-black"
                        style={{ color: theme.primary }}
                      >
                        ₹{totalWithGst}
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>
          )}

          <Text
            className="text-xs font-bold mb-2 uppercase"
            style={{ color: theme.muted }}
          >
            {isLockedState
              ? "Assigned Waiter (Locked)"
              : "Assigned Waiter (Available Staff Only) *"}
          </Text>

          {isLockedState ? (
            <View
              className="px-4 py-3 rounded-xl border flex-row items-center mb-2"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              }}
            >
              <Text className="text-xs font-bold text-white">
                👤 {assignedWaiterName} (Assigned Waiter)
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2 mb-2">
              {availableWaiters.length > 0 ? (
                availableWaiters.map((waiter) => {
                  const isSelected = selectedWaiterId === waiter.id;
                  return (
                    <Pressable
                      key={waiter.id}
                      onPress={() => setSelectedWaiterId(waiter.id)}
                      className="px-4 py-2.5 rounded-xl border"
                      style={{
                        backgroundColor: isSelected ? theme.primary : theme.bg,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: isSelected ? "#ffffff" : theme.text }}
                      >
                        👤 {waiter.name} (Available)
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="text-xs italic" style={{ color: theme.muted }}>
                  No available waiters on duty. All assigned waiters are
                  currently busy.
                </Text>
              )}
            </View>
          )}
        </Card>

        <Button
          title="Save Table Changes"
          onPress={handleSaveTable}
          className="py-4 w-full"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
