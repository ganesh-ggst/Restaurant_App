import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  ShoppingBag,
  XCircle,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";
import {
  OperationsOrder,
  operationsApi,
} from "../../../services/api/operations";

const ORDER_TABS = [
  "pending",
  "rejected",
  "cancelled",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
] as const;

let cachedOrders: { branchId: string; orders: OperationsOrder[] } | null = null;

function getOrderBranchId(order: OperationsOrder): string | null {
  if (typeof order.branchId === "string") return order.branchId;
  return order.branchId?._id || order.branchId?.id || null;
}

function cacheOrderStatus(orderId: string, status: string): OperationsOrder[] {
  const updatedOrders = (cachedOrders?.orders ?? []).map((order) =>
    order._id === orderId ? { ...order, status } : order,
  );
  if (cachedOrders) {
    cachedOrders = { ...cachedOrders, orders: updatedOrders };
  }
  return updatedOrders;
}

function normalizeOrderStatus(status: string) {
  const normalized = status.trim().toLowerCase().replace(/[-\s]+/g, "_");
  return normalized === "canceled" ? "cancelled" : normalized;
}

function normalizeFulfillmentType(fulfillmentType?: string) {
  return fulfillmentType?.trim().toLowerCase().replace(/[_\s]+/g, "-") || "";
}

function nextOrderStatus(order: OperationsOrder): string | null {
  const fulfillmentType = normalizeFulfillmentType(order.fulfillmentType);
  const status = normalizeOrderStatus(order.status);
  switch (status) {
    case "pending":
      return "accepted";
    case "accepted":
      return fulfillmentType === "dine-in" ? "completed" : "preparing";
    case "preparing":
      return "ready";
    case "ready":
      if (fulfillmentType === "delivery") return "out_for_delivery";
      if (fulfillmentType === "takeaway" || fulfillmentType === "dine-in") {
        return "completed";
      }
      return null;
    case "out_for_delivery":
      return fulfillmentType === "delivery" ? "delivered" : null;
    case "delivered":
      return fulfillmentType === "delivery" ? "completed" : null;
    default:
      return null;
  }
}

export default function OperationsOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager, loading: managerLoading } = useCurrentManager();
  const branchId = currentManager?.branchId || null;
  const [orders, setOrders] = useState<OperationsOrder[]>(
    () =>
      cachedOrders?.branchId === branchId ? cachedOrders.orders : [],
  );
  const [activeTab, setActiveTab] =
    useState<(typeof ORDER_TABS)[number]>("pending");
  const [modeFilter, setModeFilter] = useState<
    "all" | "delivery" | "takeaway"
  >("all");
  const [loading, setLoading] = useState(
    () => managerLoading || cachedOrders?.branchId !== branchId,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [updatingOrderAction, setUpdatingOrderAction] = useState<
    "advance" | "reject" | "cancel" | null
  >(null);

  const loadOrders = useCallback(async (showRefreshIndicator = false) => {
    if (!branchId) {
      setOrders([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (cachedOrders?.branchId !== branchId) {
      setLoading(true);
      setOrders([]);
    } else if (showRefreshIndicator) {
      setRefreshing(true);
    }
    try {
      const allOrders = await operationsApi.getAllOrders();
      const branchOrders = allOrders.filter(
        (order) => getOrderBranchId(order) === branchId,
      );
      cachedOrders = { branchId, orders: branchOrders };
      setOrders(branchOrders);
    } catch (error) {
      Alert.alert(
        "Unable to load orders",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useFocusEffect(
    useCallback(() => {
      if (managerLoading) return;
      if (!branchId) {
        setLoading(false);
        Alert.alert(
          "Unable to load orders",
          "Your manager account is not linked to a branch.",
        );
        return;
      }
      if (cachedOrders?.branchId === branchId) {
        setOrders(cachedOrders.orders);
      }
      void loadOrders();
    }, [branchId, loadOrders, managerLoading]),
  );

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      activeTab === "completed"
        ? normalizeOrderStatus(order.status) === "completed"
        : normalizeOrderStatus(order.status) === activeTab;
    const matchesMode =
      modeFilter === "all" ||
      normalizeFulfillmentType(order.fulfillmentType) === modeFilter;
    return matchesStatus && matchesMode;
  });

  const advanceOrder = async (order: OperationsOrder) => {
    const status = nextOrderStatus(order);
    if (!status) return;
    await updateOrder(
      order,
      status,
      "Order updated by operations manager",
      "advance",
    );
  };

  const rejectOrder = (order: OperationsOrder) => {
    Alert.alert(
      "Reject this order?",
      `Reject order ${order.orderNumber}?`,
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Reject Order",
          style: "destructive",
          onPress: () =>
            void updateOrder(
              order,
              "rejected",
              "Order rejected by operations manager",
              "reject",
            ),
        },
      ],
    );
  };

  const updateOrder = async (
    order: OperationsOrder,
    status: string,
    note: string,
    action: "advance" | "reject" | "cancel",
  ) => {
    setUpdatingOrderId(order._id);
    setUpdatingOrderAction(action);
    try {
      await operationsApi.updateOrderStatus(
        order._id,
        status,
        note,
      );
      setOrders(cacheOrderStatus(order._id, status));
      if (status === "rejected" || status === "cancelled") {
        setActiveTab(status);
      }
      await loadOrders();
    } catch (error) {
      Alert.alert(
        "Unable to update order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUpdatingOrderId("");
      setUpdatingOrderAction(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center border-b px-4 py-4"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Live Orders
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-14 border-b"
        style={{ borderBottomColor: theme.border }}
        contentContainerStyle={{ paddingHorizontal: 12, alignItems: "center" }}
      >
        {ORDER_TABS.map((status) => (
          <Pressable
            key={status}
            onPress={() => setActiveTab(status)}
            className="mr-2 rounded-full px-4 py-2"
            style={{
              backgroundColor:
                activeTab === status ? theme.primary : theme.card,
            }}
          >
            <Text
              className="text-xs font-bold capitalize"
              style={{
                color: activeTab === status ? "#ffffff" : theme.text,
              }}
            >
              {status.replace(/_/g, " ")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View className="flex-row gap-2 px-4 py-3">
        {(["all", "delivery", "takeaway"] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setModeFilter(mode)}
            className="rounded-full px-4 py-2"
            style={{
              backgroundColor: modeFilter === mode ? theme.primary : theme.card,
            }}
          >
            <Text
              className="text-xs font-bold capitalize"
              style={{ color: modeFilter === mode ? "#ffffff" : theme.text }}
            >
              {mode}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 36 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrders(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {filteredOrders.map((order) => {
            const nextStatus = nextOrderStatus(order);
            const fulfillmentType = normalizeFulfillmentType(
              order.fulfillmentType,
            );
            const orderStatus = normalizeOrderStatus(order.status);
            const FulfillmentIcon =
              fulfillmentType === "delivery"
                ? Bike
                : fulfillmentType === "dine-in"
                  ? ChefHat
                  : ShoppingBag;
            const customerName = [
              order.userId?.firstName,
              order.userId?.lastName,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Card
                key={order._id}
                variant="default"
                className="mb-4 rounded-2xl border-0 p-4"
              >
                <View className="mb-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      className="min-w-0 flex-1 text-base font-black"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ color: theme.text }}
                    >
                      {order.orderNumber}
                    </Text>
                    <Text
                      className="shrink-0 font-bold"
                      style={{ color: theme.primary }}
                    >
                      ₹{Number(order.total || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View
                    className="mt-2 self-start rounded-full px-2 py-1"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Text className="text-[10px] font-bold uppercase text-white">
                      {orderStatus.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>

                <View className="mb-3 flex-row items-center gap-2">
                  <FulfillmentIcon size={16} color={theme.muted} />
                  <Text className="text-xs capitalize" style={{ color: theme.muted }}>
                    {fulfillmentType.replace(/-/g, " ") || "Order"}
                  </Text>
                  {customerName ? (
                    <Text className="flex-1 text-right text-xs" style={{ color: theme.muted }}>
                      {customerName}
                    </Text>
                  ) : null}
                </View>

                {(order.items || []).map((item, index) => (
                  <View
                    key={`${order._id}-${index}`}
                    className="mb-1 flex-row justify-between"
                  >
                    <Text className="flex-1 text-sm" style={{ color: theme.text }}>
                      {item.quantity} × {item.name}
                    </Text>
                    {item.itemTotal !== undefined ? (
                      <Text className="ml-2 text-sm" style={{ color: theme.muted }}>
                        ₹{item.itemTotal.toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {order.createdAt ? (
                  <View className="mt-3 flex-row items-center gap-1">
                    <Clock size={13} color={theme.muted} />
                    <Text className="text-[10px]" style={{ color: theme.muted }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ) : null}

                {nextStatus ? (
                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      onPress={() => void advanceOrder(order)}
                      disabled={updatingOrderId === order._id}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3"
                      style={{ backgroundColor: theme.primary }}
                    >
                      {updatingOrderId === order._id &&
                      updatingOrderAction === "advance" ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <CheckCircle2 size={17} color="#ffffff" />
                      )}
                      <Text className="text-xs font-bold capitalize text-white">
                        Mark {nextStatus.replace(/_/g, " ")}
                      </Text>
                    </Pressable>
                    {orderStatus === "pending" &&
                    fulfillmentType === "delivery" ? (
                      <>
                        <Pressable
                          onPress={() => rejectOrder(order)}
                          disabled={updatingOrderId === order._id}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3"
                          style={{
                            borderColor: theme.danger,
                            backgroundColor: theme.card,
                          }}
                        >
                          {updatingOrderId === order._id &&
                          updatingOrderAction === "reject" ? (
                            <ActivityIndicator size="small" color={theme.danger} />
                          ) : (
                            <XCircle size={17} color={theme.danger} />
                          )}
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.danger }}
                          >
                            {updatingOrderId === order._id &&
                            updatingOrderAction === "reject"
                              ? "Rejecting..."
                              : "Reject"}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              "Cancel this order?",
                              `Cancel order ${order.orderNumber}?`,
                              [
                                { text: "Keep Order", style: "cancel" },
                                {
                                  text: "Cancel Order",
                                  style: "destructive",
                                  onPress: () =>
                                    void updateOrder(
                                      order,
                                      "cancelled",
                                      "Order cancelled by operations manager",
                                      "cancel",
                                    ),
                                },
                              ],
                            )
                          }
                          disabled={updatingOrderId === order._id}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3"
                          style={{
                            borderColor: theme.danger,
                            backgroundColor: theme.card,
                          }}
                        >
                          {updatingOrderId === order._id &&
                          updatingOrderAction === "cancel" ? (
                            <ActivityIndicator size="small" color={theme.danger} />
                          ) : (
                            <XCircle size={17} color={theme.danger} />
                          )}
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.danger }}
                          >
                            Cancel
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}
          {filteredOrders.length === 0 ? (
            <View className="items-center py-16">
              <Package size={40} color={theme.muted} />
              <Text className="mt-3 text-center" style={{ color: theme.muted }}>
                No {activeTab.replace(/_/g, " ")} orders found.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
