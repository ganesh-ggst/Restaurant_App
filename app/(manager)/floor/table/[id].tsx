import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import {
  FloorManagerTableDetails,
  floorManagerApi,
} from "../../../../services/api/floor-manager";
import { useAppTheme } from "../../../../hooks/useAppTheme";

type TableStatus = "available" | "active" | "billed";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function getText(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function normalizeStatus(status: string): TableStatus {
  const normalized = status.toLowerCase();
  if (normalized === "billed") return "billed";
  if (normalized === "occupied" || normalized === "active") return "active";
  return "available";
}

function getSessionCustomerCount(
  table: FloorManagerTableDetails["table"],
  session: Record<string, unknown> | null,
): number {
  const count = getNumber(
    session?.customersSeated,
    session?.customerCount,
    table.customersSeated,
  );
  return count ?? 0;
}

function getOrderItems(orders: Record<string, unknown>[]) {
  return orders.flatMap((order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return items.flatMap((value) => {
      const item = asRecord(value);
      if (!item) return [];
      const quantity = getNumber(item.quantity, item.qty) ?? 1;
      const lineTotal =
        getNumber(item.itemTotal, item.totalPrice, item.total, item.amount) ??
        (getNumber(item.price, item.unitPrice) ?? 0) * quantity;
      return [
        {
          name: getText(item.name, item.itemName, item.title) || "Order item",
          quantity,
          total: lineTotal,
        },
      ];
    });
  });
}

function formatElapsedTime(value?: string) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
}

function currency(value: number) {
  return `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export default function TableDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Array.isArray(id) ? id[0] : id;

  const [details, setDetails] = useState<FloorManagerTableDetails | null>(null);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerNameError, setCustomerNameError] = useState("");
  const [bill, setBill] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<TableStatus>("available");
  const [capacity, setCapacity] = useState("");
  const [customerCount, setCustomerCount] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [billError, setBillError] = useState("");

  const loadTableDetails = useCallback(async (showLoading = false) => {
    if (!tableId) {
      setLoadError("A table ID was not provided.");
      setIsLoading(false);
      return;
    }
    setLoadError("");
    setBillError("");
    setCustomerNameError("");
    if (showLoading) setIsLoading(true);
    try {
      const nextDetails = await floorManagerApi.getTableDetails(tableId);
      setDetails(nextDetails);
      setStatus(normalizeStatus(nextDetails.table.status));
      setCapacity(String(nextDetails.table.capacity));
      setCustomerCount(
        String(getSessionCustomerCount(nextDetails.table, nextDetails.session)),
      );
      setBill(null);
      setCustomerFirstName("");

      if (nextDetails.session) {
        const sessionId = getText(
          nextDetails.session._id,
          nextDetails.session.id,
          nextDetails.session.sessionId,
        );
        if (sessionId) {
          try {
            const sessionDetails =
              await floorManagerApi.getSessionDetails(sessionId);
            const userId = asRecord(sessionDetails.userId);
            const user = asRecord(sessionDetails.user);
            const customer = asRecord(sessionDetails.customer);
            setCustomerFirstName(
              getText(
                userId?.firstName,
                user?.firstName,
                customer?.firstName,
                sessionDetails.firstName,
              ) || "",
            );
          } catch (error) {
            setCustomerNameError(
              error instanceof Error
                ? error.message
                : "Unable to load the customer name.",
            );
          }
        } else {
          setCustomerNameError(
            "The active session did not include a session ID.",
          );
        }

        try {
          setBill(await floorManagerApi.getTableBill(tableId));
        } catch (error) {
          setBillError(
            error instanceof Error ? error.message : "Unable to load the bill.",
          );
        }
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load table details.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadTableDetails(true));
  }, [loadTableDetails]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTableDetails();
    setIsRefreshing(false);
  }, [loadTableDetails]);

  const table = details?.table;
  const session = details?.session ?? null;
  const tableStatus = table ? normalizeStatus(table.status) : "available";
  const isBlocked = status !== "available";
  const assignedWaiter =
    table && asRecord(table.assignedWaiterId)
      ? getText(asRecord(table.assignedWaiterId)?.name)
      : undefined;

  const orderItems = useMemo(
    () => getOrderItems(details?.orders ?? []),
    [details?.orders],
  );
  const billRecord = asRecord(bill?.bill) || bill;
  const subtotal =
    getNumber(billRecord?.subtotal, billRecord?.subTotal) ??
    orderItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = getNumber(
    billRecord?.gstAmount,
    billRecord?.taxAmount,
    billRecord?.gst,
    billRecord?.tax,
  );
  const totalAmount = getNumber(
    billRecord?.totalAmount,
    billRecord?.grandTotal,
    billRecord?.total,
  );
  const sessionStartedAt = getText(
    session?.startedAt,
    session?.startTime,
    session?.createdAt,
  );
  const elapsedText = formatElapsedTime(sessionStartedAt);

  const handleSaveTable = async () => {
    if (!table || !tableId || isSaving) return;
    const parsedCapacity = Number(capacity);
    const parsedCustomers = Number(customerCount);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      Alert.alert("Invalid capacity", "Enter a seating capacity of at least 1.");
      return;
    }
    if (!Number.isInteger(parsedCustomers) || parsedCustomers < 0) {
      Alert.alert("Invalid customer count", "Enter zero or a positive whole number.");
      return;
    }
    if (parsedCustomers > parsedCapacity) {
      Alert.alert(
        "Invalid customer count",
        "Customers seated cannot exceed the table capacity.",
      );
      return;
    }
    if (status === tableStatus) {
      Alert.alert(
        "Action Required",
        "You forgot to change option to related next option.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const changes: {
        capacity?: number;
        status?: TableStatus;
        customersSeated?: number;
      } = {};
      if (parsedCapacity !== table.capacity) changes.capacity = parsedCapacity;
      if (status !== tableStatus) changes.status = status;
      if (
        parsedCustomers !==
        getSessionCustomerCount(table, details?.session ?? null)
      ) {
        changes.customersSeated = parsedCustomers;
      }
      if (Object.keys(changes).length > 0) {
        await floorManagerApi.updateTable(tableId, changes);
      }
      await loadTableDetails();
      Alert.alert("Saved", "Table changes were saved successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      await loadTableDetails();
      Alert.alert(
        "Unable to save table changes",
        error instanceof Error
          ? error.message
          : "Some changes may not have been saved. Refresh the table and try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const statusOptions: { id: TableStatus; label: string; color: string }[] =
    tableStatus === "available"
      ? [
          { id: "available", label: "Free", color: "#22c55e" },
          { id: "active", label: "Active", color: theme.primary },
        ]
      : tableStatus === "billed"
        ? [
            { id: "active", label: "Active", color: theme.primary },
            { id: "billed", label: "Billed", color: "#168f50" },
            { id: "available", label: "Free", color: "#22c55e" },
          ]
        : [
            { id: "active", label: "Active", color: theme.primary },
            { id: "billed", label: "Billed", color: "#168f50" },
          ];

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.muted }}>Loading table details...</Text>
      </SafeAreaView>
    );
  }

  if (!table) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text className="mb-4 text-center" style={{ color: theme.text }}>
          {loadError || "Table details are unavailable."}
        </Text>
        <Button
          title="Try Again"
          onPress={() => void loadTableDetails(true)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View
        className="flex-row items-center border-b px-6 pb-4 pt-4"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="-ml-2 mr-2 p-2"
          hitSlop={20}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text className="text-2xl" style={{ color: theme.text }}>
            ←
          </Text>
        </Pressable>
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          Manage Table {table.tableNumber}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View
          className="mb-6 flex-row items-center justify-between rounded-2xl border p-4"
          style={{
            backgroundColor: isBlocked
              ? "rgba(239, 68, 68, 0.1)"
              : "rgba(34, 197, 94, 0.1)",
            borderColor: isBlocked ? "#ef4444" : "#22c55e",
          }}
        >
          <View className="mr-2 flex-1">
            <Text className="text-sm font-bold" style={{ color: theme.text }}>
              📱 Table Block Status
            </Text>
            <Text
              className="mt-0.5 text-xs font-medium"
              style={{ color: theme.muted }}
            >
              {isBlocked
                ? "Table is currently blocked & active."
                : "Table is open and available."}
            </Text>
          </View>
          <View
            className="rounded-xl px-3 py-1.5"
            style={{ backgroundColor: isBlocked ? "#ef4444" : "#22c55e" }}
          >
            <Text className="text-xs font-bold text-white">
              {isBlocked ? "Blocked 🔒" : "Open 🔓"}
            </Text>
          </View>
        </View>

        <Text
          className="mb-3 text-xs font-bold uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Table Status *
        </Text>
        <View className="mb-6 flex-row gap-2">
          {statusOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setStatus(option.id)}
              accessibilityRole="button"
              className="flex-1 items-center justify-center rounded-xl border-2 px-1 py-3"
              style={{
                borderColor: status === option.id ? option.color : theme.border,
                backgroundColor:
                  status === option.id ? option.color : "transparent",
              }}
            >
              <Text
                className="text-[11px] font-extrabold uppercase"
                style={{ color: status === option.id ? "#ffffff" : theme.text }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Card variant="default" className="mb-6 rounded-3xl border-0 p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="flex-1 text-xs font-bold uppercase"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Seating Capacity
            </Text>
            {customerFirstName || customerNameError ? (
              <Text
                className="ml-3 text-right text-base font-extrabold"
                style={{
                  color: customerFirstName ? theme.text : theme.danger,
                  width: "45%",
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
                accessibilityLabel={
                  customerFirstName || "Customer name unavailable"
                }
              >
                {customerFirstName || "Name unavailable"}
              </Text>
            ) : null}
          </View>
          {customerNameError ? (
            <Text className="mb-2 text-xs" style={{ color: theme.danger }}>
              {customerNameError}
            </Text>
          ) : null}
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            accessibilityLabel="Seating capacity"
            className="mb-4 rounded-xl px-4 font-bold"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              fontSize: 16,
              height: 52,
            }}
          />

          <Text
            className="mb-2 text-xs font-bold uppercase"
            style={{ color: theme.muted }}
          >
            Number of Customers Seated
          </Text>
          <TextInput
            value={customerCount}
            onChangeText={setCustomerCount}
            keyboardType="number-pad"
            accessibilityLabel="Number of customers seated"
            className="mb-2 rounded-xl px-4 font-bold"
            style={{
              backgroundColor: theme.bg,
              color: theme.text,
              fontSize: 16,
              height: 52,
            }}
          />

          {elapsedText ? (
            <Text className="mb-4 text-xs italic" style={{ color: theme.muted }}>
              ⏱️ Session Time: {elapsedText}
            </Text>
          ) : null}

          {details.orders.length > 0 ? (
            <View
              className="mb-4 rounded-2xl p-3"
              style={{ backgroundColor: theme.bg }}
            >
              <Text
                className="mb-2 text-xs font-bold uppercase"
                style={{ color: theme.muted }}
              >
                🛒 Ordered Items & Charges Breakdown
              </Text>
              {orderItems.map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  className="flex-row items-center justify-between py-1"
                >
                  <Text
                    className="flex-1 text-xs font-medium"
                    style={{ color: theme.text }}
                  >
                    {item.name} (x{item.quantity})
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: theme.text }}>
                    {currency(item.total)}
                  </Text>
                </View>
              ))}
              {subtotal > 0 || totalAmount !== undefined ? (
                <View
                  className="mt-2 border-t pt-2"
                  style={{ borderTopColor: theme.border }}
                >
                  {subtotal > 0 ? (
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs" style={{ color: theme.muted }}>
                        Subtotal
                      </Text>
                      <Text className="text-xs font-bold" style={{ color: theme.text }}>
                        {currency(subtotal)}
                      </Text>
                    </View>
                  ) : null}
                  {taxAmount !== undefined ? (
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs font-bold" style={{ color: theme.primary }}>
                        GST
                      </Text>
                      <Text className="text-xs font-bold" style={{ color: theme.text }}>
                        {currency(taxAmount)}
                      </Text>
                    </View>
                  ) : null}
                  {totalAmount !== undefined ? (
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs font-black uppercase" style={{ color: theme.primary }}>
                        Total Bill Amount
                      </Text>
                      <Text className="text-sm font-black" style={{ color: theme.primary }}>
                        {currency(totalAmount)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {billError ? (
            <Text className="mb-3 text-xs" style={{ color: theme.danger }}>
              Bill unavailable: {billError}
            </Text>
          ) : null}

          <Text
            className="mb-2 text-xs font-bold uppercase"
            style={{ color: theme.muted }}
          >
            Assigned Waiter{tableStatus !== "available" ? " (Locked)" : ""}
          </Text>
          <View
            className="mb-2 flex-row items-center rounded-xl border px-4 py-3"
            style={{
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            }}
          >
            <Text className="text-xs font-bold text-white">
              👤 {assignedWaiter || "No waiter assigned"}
              {assignedWaiter && tableStatus !== "available"
                ? " (Assigned Waiter)"
                : ""}
            </Text>
          </View>
        </Card>

        <Button
          title="Save Table Changes"
          onPress={() => void handleSaveTable()}
          loading={isSaving}
          className="w-full py-4"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
