import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Bike,
    CheckCircle2,
    ChefHat,
    Clock,
    Eye,
    MapPin,
    Package,
    Phone,
    ShoppingBag,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function ManagerOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();

  const assignedBranch =
    (currentManager as any)?.assignedBranch || "Hitech City Premium";

  const [orders, setOrders] = useState<any[]>(MANAGER_MOCK_DATA.orders || []);
  const [activeTab, setActiveTab] = useState<
    "pending" | "preparing" | "ready" | "out_for_delivery" | "completed"
  >("pending");
  const [modeFilter, setModeFilter] = useState<"all" | "delivery" | "takeaway">(
    "all",
  );

  // 30-Second Auto-Completion Timer for "Out For Delivery" orders
  useEffect(() => {
    const timer = setInterval(() => {
      let updated = false;
      const newOrders = MANAGER_MOCK_DATA.orders.map((order) => {
        if (order.status === "out_for_delivery") {
          updated = true;
          return { ...order, status: "completed" };
        }
        return order;
      });

      if (updated) {
        MANAGER_MOCK_DATA.orders = newOrders;
        setOrders([...newOrders]);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    const isAssignedBranch =
      o.branch?.trim().toLowerCase() === assignedBranch?.trim().toLowerCase();
    const mode = o.mode?.trim().toLowerCase();
    const isDeliveryOrTakeaway = mode === "delivery" || mode === "takeaway";

    if (!isAssignedBranch || !isDeliveryOrTakeaway || o.status !== activeTab)
      return false;
    if (modeFilter !== "all" && mode !== modeFilter) return false;

    return true;
  });

  const updateOrderStatus = (orderId: string, nextStatus: string) => {
    const index = MANAGER_MOCK_DATA.orders.findIndex((o) => o.id === orderId);
    if (index > -1) {
      MANAGER_MOCK_DATA.orders[index].status = nextStatus;
      setOrders([...MANAGER_MOCK_DATA.orders]);
    }
  };

  const getNextActionLabel = (status: string, mode: string) => {
    const isDelivery = mode?.toLowerCase() === "delivery";

    switch (status) {
      case "pending":
        return { label: "Accept & Prepare", next: "preparing", icon: ChefHat };
      case "preparing":
        return { label: "Mark as Ready", next: "ready", icon: CheckCircle2 };
      case "ready":
        if (isDelivery) {
          return {
            label: "Dispatch (Out for Delivery)",
            next: "out_for_delivery",
            icon: Bike,
          };
        }
        return {
          label: "Complete Order (Picked Up)",
          next: "completed",
          icon: ShoppingBag,
        };
      case "out_for_delivery":
        return null; // View only, auto completes in 30s
      default:
        return null;
    }
  };

  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "out_for_delivery", label: "Out For Delivery" },
    { key: "completed", label: "Completed" },
  ] as const;

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-black" style={{ color: theme.text }}>
            Delivery & Takeaway Queue
          </Text>
          <Text
            className="text-xs font-semibold mt-0.5"
            style={{ color: theme.primary }}
          >
            Outlet: {assignedBranch}
          </Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View
        style={{
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingVertical: 10,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 8,
            alignItems: "center",
          }}
          style={{ maxHeight: 46 }}
        >
          {tabs.map((tab) => {
            const count = orders.filter((o) => {
              const isAssignedBranch =
                o.branch?.trim().toLowerCase() ===
                assignedBranch?.trim().toLowerCase();
              const mode = o.mode?.trim().toLowerCase();
              return (
                o.status === tab.key &&
                isAssignedBranch &&
                (mode === "delivery" || mode === "takeaway")
              );
            }).length;
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                className="px-3.5 rounded-xl items-center justify-center border"
                style={{
                  height: 36,
                  backgroundColor: isActive ? theme.primary : theme.bg,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold capitalize"
                  style={{ color: isActive ? "#ffffff" : theme.text }}
                  numberOfLines={1}
                >
                  {tab.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Mode Sub-Filters */}
      <View
        className="px-4 py-2.5 flex-row gap-2 items-center"
        style={{
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text
          className="text-[10px] font-black uppercase tracking-wider mr-1"
          style={{ color: theme.muted }}
        >
          Filter:
        </Text>
        {(["all", "delivery", "takeaway"] as const).map((m) => {
          const isSelected = modeFilter === m;
          return (
            <Pressable
              key={m}
              onPress={() => setModeFilter(m)}
              className="px-3 py-1 rounded-lg border"
              style={{
                backgroundColor: isSelected ? theme.text : theme.bg,
                borderColor: isSelected ? theme.text : theme.border,
              }}
            >
              <Text
                className="text-xs font-bold capitalize"
                style={{ color: isSelected ? theme.bg : theme.text }}
              >
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Orders List */}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const action = getNextActionLabel(order.status, order.mode);
            const ActionIcon = action?.icon || CheckCircle2;
            const isDelivery = order.mode?.toLowerCase() === "delivery";
            const isOutForDelivery = order.status === "out_for_delivery";

            return (
              <Card
                key={order.id}
                variant="default"
                className="p-5 mb-4 rounded-3xl border-0 shadow-sm"
              >
                {/* Order Header */}
                <View
                  className="flex-row justify-between items-center mb-3 pb-3 border-b"
                  style={{ borderBottomColor: theme.border }}
                >
                  <View>
                    <Text
                      className="text-base font-black"
                      style={{ color: theme.text }}
                    >
                      {order.customerName}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Phone size={12} color={theme.muted} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.muted }}
                      >
                        {order.phone}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text
                      className="text-sm font-black"
                      style={{ color: theme.primary }}
                    >
                      ₹{order.totalAmount}
                    </Text>
                    <Text
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: theme.muted }}
                    >
                      {order.time}
                    </Text>
                  </View>
                </View>

                {/* Branch & Mode Badge */}
                <View className="flex-row items-center justify-between mb-4 bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                  <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                    <MapPin size={14} color={theme.primary} />
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.text }}
                      numberOfLines={1}
                    >
                      {order.branch}
                    </Text>
                  </View>
                  <View
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {isDelivery ? (
                      <Bike size={14} color="#ffffff" />
                    ) : (
                      <Package size={14} color="#ffffff" />
                    )}
                    <Text className="text-xs font-black uppercase tracking-wider text-white">
                      {order.mode}
                    </Text>
                  </View>
                </View>

                {/* Ordered Items */}
                <View className="mb-4 gap-1.5">
                  <Text
                    className="text-xs font-bold uppercase mb-1"
                    style={{ color: theme.muted }}
                  >
                    Items Ordered:
                  </Text>
                  {order.items.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      className="flex-row justify-between items-center"
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.text }}
                      >
                        {item.qty}x {item.name}
                      </Text>
                      <Text
                        className="text-sm font-medium"
                        style={{ color: theme.muted }}
                      >
                        ₹{item.price * item.qty}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Action Button or View-Only Notice */}
                {action ? (
                  <Pressable
                    onPress={() => updateOrderStatus(order.id, action.next)}
                    className="py-3.5 px-4 rounded-2xl items-center flex-row justify-center gap-2 shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <ActionIcon size={18} color="#ffffff" />
                    <Text className="text-white text-sm font-black tracking-wide">
                      {action.label}
                    </Text>
                  </Pressable>
                ) : isOutForDelivery ? (
                  <View
                    className="py-3 px-4 rounded-2xl items-center flex-row justify-center gap-2 border border-dashed"
                    style={{
                      borderColor: theme.primary,
                      backgroundColor: theme.card,
                    }}
                  >
                    <Eye size={16} color={theme.primary} />
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.primary }}
                    >
                      Waiting for delivery (Auto-completes in 30s)
                    </Text>
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : (
          <Card
            variant="default"
            className="p-10 rounded-3xl border-0 items-center justify-center mt-10"
          >
            <Clock size={44} color={theme.muted} className="mb-3 opacity-50" />
            <Text
              className="text-base font-bold mb-1"
              style={{ color: theme.text }}
            >
              No Orders in "{tabs.find((t) => t.key === activeTab)?.label}"
            </Text>
            <Text
              className="text-xs text-center"
              style={{ color: theme.muted }}
            >
              Orders flow through Pending → Preparing → Ready → Out For Delivery
              (Auto 30s) → Completed.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
