import { useFocusEffect, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Heart,
  Package,
  Receipt,
  Search,
  ScrollText,
  UserRound,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAX_DETAILS } from "../../../constants/mockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import { authApi } from "../../../services/api/auth";
import type {
  CustomerCustomizationSelection,
  CustomerOrder,
} from "../../../services/api/customer";
import { useOrderMode } from "../_layout";

const { width, height } = Dimensions.get("window");

const formatPrice = (price: number) => price.toFixed(2);

function normalizeOrderStatus(status: unknown) {
  const normalized = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, " ");

  switch (normalized) {
    case "accept":
      return "accepted";
    case "cancel":
    case "canceled":
    case "cancled":
    case "cancelled":
      return "rejected";
    case "complete":
    case "delivered":
      return "completed";
    default:
      return normalized;
  }
}

function formatOrderStatus(status: unknown) {
  return normalizeOrderStatus(status).replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
}

function formatFulfillmentType(fulfillmentType: unknown) {
  const normalized = String(fulfillmentType || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  switch (normalized) {
    case "delivery":
      return "Delivery";
    case "takeaway":
      return "Takeaway";
    case "dine-in":
      return "Dine-in";
    default:
      return "Order type unavailable";
  }
}

function mapCustomerOrder(order: CustomerOrder) {
  const isPaymentRejected = ["rejected", "failed", "declined"].includes(
    String(order.paymentStatus || "").trim().toLowerCase(),
  );
  const status = isPaymentRejected
    ? "rejected"
    : normalizeOrderStatus(order.status);
  const isActive = ![
    "completed",
    "cancelled",
    "rejected",
    "refunded",
  ].includes(status);
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : "";

  return {
    ...order,
    orderId: order._id,
    id: order.orderNumber,
    date,
    status: formatOrderStatus(status),
    isPaymentRejected,
    total: order.total,
    isActive,
    items: order.items.map((item) => ({
      id: item.menuItemId,
      quantity: item.quantity,
      name: item.name,
      price: `₹${item.unitPrice}`,
    })),
  };
}

function getOrderStatusTimeline(order: any) {
  const fulfillmentType = String(order?.fulfillmentType || "delivery")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  const currentStatus = normalizeOrderStatus(order?.status);
  const history = Array.isArray(order?.statusHistory)
    ? order.statusHistory
    : [];
  const statusDescriptions: Record<string, string> = {
    pending: "Order placed",
    accepted: "Order accepted by the restaurant",
    preparing: "Your order is being prepared",
    ready: "Your order is ready",
    "out for delivery": "Your order is on the way",
    completed: "Order completed",
    rejected: "Order rejected by the restaurant",
  };
  const standardStatuses = fulfillmentType === "dine-in"
    ? ["pending", "accepted", "completed"]
    : fulfillmentType === "takeaway"
      ? ["pending", "accepted", "preparing", "ready", "completed"]
      : [
          "pending",
          "accepted",
          "preparing",
          "ready",
          "out for delivery",
          "completed",
        ];
  const statuses =
    currentStatus === "rejected" || currentStatus === "cancelled"
      ? ["pending", currentStatus]
      : standardStatuses.includes(currentStatus)
        ? standardStatuses
        : [...standardStatuses, currentStatus];
  const currentIndex = Math.max(statuses.indexOf(currentStatus), 0);

  return statuses.map((status, index) => {
    const historyEntry = [...history]
      .reverse()
      .find((entry: any) => normalizeOrderStatus(entry.status) === status);

    return {
      status,
      label: formatOrderStatus(status),
      note:
        historyEntry?.note ||
        statusDescriptions[status] ||
        (index < currentIndex
          ? "Order status updated"
          : "Status update pending"),
      changedAt: historyEntry?.changedAt,
      isComplete: index < currentIndex,
      isCurrent: index === currentIndex,
    };
  });
}

const calculateOrderTotals = (order: any) => {
  if (!order) {
    return {
      itemTotal: 0,
      actualDeliveryFee: 0,
      isFreeDelivery: false,
      packagingCharge: 0,
      platformFee: 0,
      gstAmount: 0,
      totalTaxesAndCharges: 0,
      finalPayable: 0,
    };
  }

  if (typeof order.total === "number") {
    const itemTotal = order.subtotal ?? 0;
    const actualDeliveryFee = order.deliveryFee ?? 0;
    const packagingCharge = order.packagingFee ?? 0;
    const platformFee = order.platformFee ?? 0;
    const gstAmount = order.tax ?? 0;
    const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;
    return {
      itemTotal,
      actualDeliveryFee,
      isFreeDelivery: actualDeliveryFee === 0,
      packagingCharge,
      platformFee,
      gstAmount,
      totalTaxesAndCharges,
      finalPayable: order.total,
    };
  }

  const itemTotal = order.items.reduce((sum: number, item: any) => {
    const basePrice = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
    return sum + basePrice * item.quantity;
  }, 0);

  const isFreeDelivery = itemTotal >= 99;
  const actualDeliveryFee = isFreeDelivery
    ? 0
    : TAX_DETAILS?.baseDeliveryFee || 40;

  const packagingCharge = TAX_DETAILS?.packagingCharge || 15;
  const platformFee = TAX_DETAILS?.platformFee || 5;
  const gstRate = TAX_DETAILS?.gstRate || 0.05;

  const gstAmount = itemTotal * gstRate;
  const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;

  const finalPayable = itemTotal + actualDeliveryFee + totalTaxesAndCharges;

  return {
    itemTotal,
    actualDeliveryFee,
    isFreeDelivery,
    packagingCharge,
    platformFee,
    gstAmount,
    totalTaxesAndCharges,
    finalPayable,
  };
};

const OrderItemsList = ({ order, theme }: any) => {
  if (!order) return null;
  return (
    <View
      className="p-4 rounded-2xl border mb-6 shadow-sm"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      {order.items.map((item: any, index: number) => {
        const basePrice = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
        const rowTotal = basePrice * item.quantity;

        return (
          <View
            key={index}
            className="flex-row justify-between items-center py-2"
            style={{
              borderBottomWidth: index === order.items.length - 1 ? 0 : 1,
              borderBottomColor: theme.border,
            }}
          >
            <View className="mr-2 flex-1 flex-row items-center">
              <View className="bg-gray-500/10 px-2 py-1 rounded mr-3">
                <Text
                  className="font-black text-xs"
                  style={{ color: theme.text }}
                >
                  {item.quantity}x
                </Text>
              </View>
              <Text
                className="min-w-0 flex-1 font-bold text-sm"
                numberOfLines={1}
                style={{ color: theme.text }}
              >
                {item.name}
              </Text>
            </View>
            <Text
              className="shrink-0 font-bold text-sm"
              numberOfLines={1}
              style={{ color: theme.muted, flexShrink: 0 }}
            >
              ₹{formatPrice(rowTotal)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const BillDetailsAccordion = ({ order, theme }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePopover, setActivePopover] = useState<"delivery" | "gst" | null>(
    null,
  );

  if (!order) return null;

  const totals = calculateOrderTotals(order);

  return (
    <Animated.View
      layout={LinearTransition.duration(300)}
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border,
        zIndex: 10,
      }}
      className="rounded-[24px] border p-5 shadow-sm mb-4"
    >
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row justify-between items-center"
        style={{ marginBottom: isExpanded ? 16 : 0, gap: 8 }}
      >
        <View className="min-w-0 flex-1 flex-row items-center">
          <View className="bg-emerald-500 p-1.5 rounded-md mr-2">
            <Receipt size={16} color="white" />
          </View>
          <Text
            numberOfLines={1}
            style={{ color: theme.text }}
            className="shrink font-black text-base"
          >
            Bill Details
          </Text>
        </View>
        <View className="shrink-0 flex-row items-center">
          <Text
            numberOfLines={1}
            style={{ color: theme.text, flexShrink: 0 }}
            className="font-black text-base"
          >
            ₹{formatPrice(totals.finalPayable)}
          </Text>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.text} className="ml-2" />
          ) : (
            <ChevronDown size={20} color={theme.text} className="ml-2" />
          )}
        </View>
      </Pressable>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
        >
          <View
            className="border-t mb-4"
            style={{ borderTopColor: theme.border, opacity: 0.6 }}
          />

          <View className="flex-row justify-between mb-4">
            <Text
              style={{ color: theme.muted }}
              className="font-semibold text-[14px]"
            >
              Item Total
            </Text>
            <Text style={{ color: theme.text }} className="font-semibold">
              ₹{formatPrice(totals.itemTotal)}
            </Text>
          </View>

          <View
            style={{
              zIndex: activePopover === "delivery" ? 100 : 1,
              elevation: activePopover === "delivery" ? 10 : 0,
            }}
          >
            {activePopover === "delivery" && (
              <>
                <Pressable
                  onPress={() => setActivePopover(null)}
                  style={{
                    position: "absolute",
                    width: width * 3,
                    height: height * 3,
                    top: -height,
                    left: -width,
                    zIndex: 40,
                  }}
                />
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  className="absolute bottom-[100%] mb-2 left-0 right-0 rounded-[16px] p-4 shadow-xl border"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    zIndex: 101,
                    elevation: 15,
                  }}
                >
                  <Text
                    style={{ color: theme.text }}
                    className="font-black text-[14px] mb-3"
                  >
                    Delivery fee breakup
                  </Text>
                  <View className="flex-row justify-between items-center">
                    <Text
                      style={{ color: theme.muted }}
                      className="font-semibold text-[13px]"
                    >
                      Standard Fee
                    </Text>
                    <View className="flex-row items-center">
                      {totals.isFreeDelivery && (
                        <Text
                          style={{ color: theme.muted }}
                          className="font-semibold line-through mr-2 text-[13px]"
                        >
                          ₹{formatPrice(TAX_DETAILS?.baseDeliveryFee || 40)}
                        </Text>
                      )}
                      <Text
                        className={
                          totals.isFreeDelivery
                            ? "text-emerald-600 font-bold text-[13px]"
                            : "font-bold text-[13px]"
                        }
                        style={
                          !totals.isFreeDelivery ? { color: theme.text } : {}
                        }
                      >
                        {totals.isFreeDelivery
                          ? "FREE"
                          : `₹${formatPrice(totals.actualDeliveryFee)}`}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="absolute -bottom-2 left-8 w-4 h-4 rotate-45 border-b border-r"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  />
                </Animated.View>
              </>
            )}

            <Pressable
              onPress={() =>
                setActivePopover(
                  activePopover === "delivery" ? null : "delivery",
                )
              }
              className="mb-4 relative"
            >
              <View className="flex-row justify-between mb-1">
                <View
                  style={{
                    borderBottomWidth: 1,
                    borderStyle: "dashed",
                    borderColor: theme.primary,
                    alignSelf: "flex-start",
                    paddingBottom: 1,
                  }}
                >
                  <Text
                    style={{ color: theme.muted, lineHeight: 18 }}
                    className="font-semibold text-[14px]"
                  >
                    Delivery Fee | {TAX_DETAILS?.deliveryDistance || "2.5 kms"}
                  </Text>
                </View>
                <View className="flex-row">
                  {totals.isFreeDelivery && (
                    <Text
                      style={{ color: theme.muted }}
                      className="font-semibold line-through mr-2"
                    >
                      ₹{formatPrice(TAX_DETAILS?.baseDeliveryFee || 40)}
                    </Text>
                  )}
                  <Text
                    className={
                      totals.isFreeDelivery
                        ? "text-emerald-600 font-bold"
                        : "font-semibold"
                    }
                    style={!totals.isFreeDelivery ? { color: theme.text } : {}}
                  >
                    {totals.isFreeDelivery
                      ? "FREE"
                      : `₹${formatPrice(totals.actualDeliveryFee)}`}
                  </Text>
                </View>
              </View>
              {totals.isFreeDelivery && (
                <Text
                  style={{ color: theme.muted }}
                  className="font-semibold text-[12px] mt-0.5"
                >
                  FREE Delivery on your order!
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={{
              zIndex: activePopover === "gst" ? 100 : 1,
              elevation: activePopover === "gst" ? 10 : 0,
            }}
          >
            {activePopover === "gst" && (
              <>
                <Pressable
                  onPress={() => setActivePopover(null)}
                  style={{
                    position: "absolute",
                    width: width * 3,
                    height: height * 3,
                    top: -height,
                    left: -width,
                    zIndex: 40,
                  }}
                />
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  className="absolute bottom-[100%] mb-2 left-0 right-0 rounded-[16px] p-4 shadow-xl border"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    zIndex: 101,
                    elevation: 15,
                  }}
                >
                  <Text
                    style={{ color: theme.text }}
                    className="font-black text-[15px] mb-4"
                  >
                    GST & Other Charges
                  </Text>
                  <View className="flex-row justify-between mb-3">
                    <Text
                      style={{ color: theme.muted }}
                      className="text-[13px] font-semibold"
                    >
                      Restaurant Packaging
                    </Text>
                    <Text
                      style={{ color: theme.text }}
                      className="text-[13px] font-bold"
                    >
                      ₹{formatPrice(totals.packagingCharge)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text
                      style={{ color: theme.muted }}
                      className="text-[13px] font-semibold"
                    >
                      Platform Fee
                    </Text>
                    <Text
                      style={{ color: theme.text }}
                      className="text-[13px] font-bold"
                    >
                      ₹{formatPrice(totals.platformFee)}
                    </Text>
                  </View>
                  <Text
                    style={{ color: theme.muted, opacity: 0.7 }}
                    className="text-[11px] mb-4 leading-4 pr-10"
                  >
                    Inclusive of GST. This fee helps us operate.
                  </Text>
                  <View className="flex-row justify-between mb-1">
                    <Text
                      style={{ color: theme.muted }}
                      className="text-[13px] font-semibold"
                    >
                      Restaurant GST (5%)
                    </Text>
                    <Text
                      style={{ color: theme.text }}
                      className="text-[13px] font-bold"
                    >
                      ₹{formatPrice(totals.gstAmount)}
                    </Text>
                  </View>
                  <View
                    className="absolute -bottom-2 left-8 w-4 h-4 rotate-45 border-b border-r"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  />
                </Animated.View>
              </>
            )}

            <Pressable
              onPress={() =>
                setActivePopover(activePopover === "gst" ? null : "gst")
              }
              className="flex-row justify-between mb-4 relative"
            >
              <View
                style={{
                  borderBottomWidth: 1,
                  borderStyle: "dashed",
                  borderColor: theme.primary,
                  alignSelf: "flex-start",
                  paddingBottom: 1,
                }}
              >
                <Text
                  style={{ color: theme.muted, lineHeight: 18 }}
                  className="font-semibold text-[14px]"
                >
                  GST & Other Charges
                </Text>
              </View>
              <Text style={{ color: theme.text }} className="font-semibold">
                ₹{formatPrice(totals.totalTaxesAndCharges)}
              </Text>
            </Pressable>
          </View>

          <View
            className="border-t mb-4 mt-2"
            style={{ borderTopColor: theme.border, borderStyle: "dashed" }}
          />

          <View className="flex-row justify-between items-center">
            <Text style={{ color: theme.text }} className="font-black text-lg">
              Grand Total
            </Text>
            <Text style={{ color: theme.text }} className="font-black text-lg">
              ₹{formatPrice(totals.finalPayable)}
            </Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("Active");
  const [branchFilter, setBranchFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [isBranchPickerVisible, setIsBranchPickerVisible] = useState(false);

  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [detailsOrder, setDetailsOrder] = useState<any>(null);

  const {
    mode: orderMode,
    setMode,
    carts,
    reloadCart,
    branches = [],
    setActiveBranch,
  } = useOrderMode();
  const [orders, setOrders] = useState<any[]>([]);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const activeCart = carts[orderMode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const loadOrders = useCallback(async () => {
    const token = await authApi.getAccessToken();
    if (!token) return;
    const fetchedOrders = await api.getOrders();
    return fetchedOrders.map((order) => mapCustomerOrder(order));
  }, []);

  const refreshOrders = useCallback(async () => {
    setIsRefreshingOrders(true);
    try {
      const fetchedOrders = await loadOrders();
      if (fetchedOrders) setOrders(fetchedOrders);
    } catch (error) {
      Alert.alert(
        "Unable to Load Orders",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsRefreshingOrders(false);
    }
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders]),
  );

  const getOrderBranchId = (order: any): string | null => {
    const branch = order.branchId || order.branch;
    if (typeof branch === "string") return branch;
    return branch?._id || branch?.id || null;
  };

  const getOrderBranchLabel = (order: any) => {
    const orderBranch =
      order.branchId && typeof order.branchId === "object"
        ? order.branchId
        : order.branch && typeof order.branch === "object"
          ? order.branch
          : null;
    const branchId = getOrderBranchId(order);
    const branch = branches.find(
      (candidate: any) =>
        String(candidate.id || candidate._id || "").toLowerCase() ===
        String(branchId || "").toLowerCase(),
    );
    const restaurantName = branch?.restaurantNames?.find(
      (restaurant: { name: string; isActive: boolean }) =>
        restaurant.isActive && restaurant.name.trim().length > 0,
    )?.name;

    return (
      orderBranch?.restaurantName ||
      orderBranch?.name ||
      restaurantName ||
      branch?.name ||
      branch?.code ||
      (branchId ? `Branch ${branchId.slice(-6)}` : "Branch unavailable")
    );
  };

  const displayOrders = orders.filter((order) => {
    const matchesStatus =
      activeTab === "Active" ? order.isActive : !order.isActive;
    const orderBranchId = getOrderBranchId(order);
    const matchesBranch =
      branchFilter === "all" ||
      String(orderBranchId || "").toLowerCase() === branchFilter.toLowerCase();
    const fulfillmentType = String(order.fulfillmentType || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    const matchesFulfillment =
      fulfillmentFilter === "all" || fulfillmentType === fulfillmentFilter;
    const searchTerm = orderSearch.trim().toLowerCase();
    const searchableOrder = [
      order.id,
      order.orderId,
      order.status,
      order.isPaymentRejected ? "payment rejected" : "",
      fulfillmentType,
      orderBranchId,
      getOrderBranchLabel(order),
      ...order.items.map((item: any) => item.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      matchesStatus &&
      matchesBranch &&
      matchesFulfillment &&
      (!searchTerm || searchableOrder.includes(searchTerm))
    );
  });

  const handleReorder = async (e: any, order: any) => {
    e.stopPropagation();
    try {
      if (
        order.isPaymentRejected ||
        normalizeOrderStatus(order.status) === "rejected"
      ) {
        const sourceOrder = await api.getOrder(order.orderId);
        const branchId =
          typeof sourceOrder.branchId === "string"
            ? sourceOrder.branchId
            : sourceOrder.branchId?._id;
        if (!branchId) {
          throw new Error(
            "This order does not include its restaurant branch, so it cannot be reordered.",
          );
        }

        const cartItems = sourceOrder.items.map((item) => {
          const menuItemId = item.menuItemId;
          if (!menuItemId || !Number.isFinite(item.quantity) || item.quantity < 1) {
            throw new Error(
              "This order has incomplete item information and cannot be reordered.",
            );
          }
          const customizations =
            item.selectedCustomizations || item.customizations || [];
          const selectedCustomizations: CustomerCustomizationSelection[] =
            customizations.map((customization) => {
              if (
                !customization ||
                typeof customization !== "object" ||
                !("groupId" in customization) ||
                typeof customization.groupId !== "string" ||
                !("optionIds" in customization) ||
                !Array.isArray(customization.optionIds) ||
                !customization.optionIds.every(
                  (optionId) => typeof optionId === "string",
                )
              ) {
                throw new Error(
                  "The saved customizations for this order cannot be restored. Please add the items from the menu.",
                );
              }
              return {
                groupId: customization.groupId,
                optionIds: customization.optionIds,
              };
            });
          return {
            menuItemId,
            quantity: item.quantity,
            selectedCustomizations,
            branchId,
          };
        });

        const matchingBranch = branches.find(
          (branch: any) =>
            String(branch.id || branch._id).toLowerCase() ===
            branchId.toLowerCase(),
        );
        if (!matchingBranch) {
          throw new Error(
            "This restaurant branch is unavailable. Refresh the app and try again.",
          );
        }
        await setActiveBranch(matchingBranch);
        const fulfillmentType = sourceOrder.fulfillmentType
          .trim()
          .toLowerCase()
          .replace(/[_\s]+/g, "-");
        if (fulfillmentType === "delivery") setMode("Delivery");
        else if (fulfillmentType === "takeaway") setMode("Takeaway");
        else if (fulfillmentType === "dine-in") setMode("Dine-in");

        for (const item of cartItems) {
          await api.addCartItem(item);
        }
        await reloadCart(branchId);
      } else {
        await api.reorder(order.orderId);
        await reloadCart();
      }
      Alert.alert(
        "Order Added to Cart",
        "Items from your previous order are ready in your cart.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to Reorder",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const getItemsString = (items: any[]) =>
    items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  const showOrderDetails = (order: any, isTracking: boolean) => {
    if (isTracking) setTrackingOrder(order);
    else setDetailsOrder(order);

    void api
      .getOrder(order.orderId)
      .then((details) => {
        const mappedOrder = mapCustomerOrder(details);
        if (isTracking) setTrackingOrder(mappedOrder);
        else setDetailsOrder(mappedOrder);
      })
      .catch((error: unknown) => {
        Alert.alert(
          "Unable to Load Order",
          error instanceof Error ? error.message : "Please try again.",
        );
      });

    if (isTracking) {
      void api
        .getOrderTracking(order.orderId)
        .then((tracking) => {
          if (tracking && typeof tracking === "object") {
            setTrackingOrder((current: any) =>
              current?.orderId === order.orderId
                ? { ...current, ...(tracking as object) }
                : current,
            );
          }
        })
        .catch((error: unknown) => {
          Alert.alert(
            "Unable to Load Tracking",
            error instanceof Error ? error.message : "Please try again.",
          );
        });
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View className="flex-row justify-between items-center px-4 py-3 z-10">
        <Text className="text-3xl font-black" style={{ color: theme.text }}>
          Your Orders
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/(tabs)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/(tabs)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 mb-4">
        <View
          className="flex-row rounded-2xl p-1 border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          {["Active", "Past Orders"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 items-center py-3 rounded-xl"
              style={{
                backgroundColor:
                  activeTab === tab ? theme.primary : "transparent",
              }}
            >
              <Text
                className="text-sm font-black"
                style={{ color: activeTab === tab ? "#fff" : theme.muted }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-3">
        <Pressable
          onPress={() => setIsBranchPickerVisible(true)}
          className="mx-4 flex-row items-center justify-between rounded-xl border px-4 py-3"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
          accessibilityRole="button"
          accessibilityLabel={`Branch filter: ${
            branches.find(
              (branch: any) =>
                String(branch.id || branch._id) === branchFilter,
            )?.name || "All Branches"
          }`}
        >
          <Text className="text-sm font-bold" style={{ color: theme.text }}>
            {branchFilter === "all"
              ? "All Branches"
              : branches.find(
                    (branch: any) =>
                      String(branch.id || branch._id) === branchFilter,
                  )?.name || "Selected Branch"}
          </Text>
          <ChevronDown size={18} color={theme.muted} />
        </Pressable>
      </View>

      <View className="mb-3 flex-row items-center gap-2 px-4">
        {(["all", "delivery", "takeaway", "dine-in"] as const).map((type) => (
          <Pressable
            key={type}
            onPress={() => setFulfillmentFilter(type)}
            className="rounded-full px-3 py-2"
            style={{
              backgroundColor:
                fulfillmentFilter === type ? theme.primary : theme.card,
              borderWidth: 1,
              borderColor:
                fulfillmentFilter === type ? theme.primary : theme.border,
            }}
          >
            <Text
              className="text-xs font-bold capitalize"
              style={{
                color: fulfillmentFilter === type ? "#fff" : theme.text,
              }}
            >
              {type === "all" ? "All Types" : type.replace("-", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        className="mx-4 mb-3 flex-row items-center rounded-xl border px-3"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <Search size={18} color={theme.muted} />
        <TextInput
          value={orderSearch}
          onChangeText={setOrderSearch}
          placeholder="Search orders or items"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search orders by order number or item"
          className="h-11 flex-1 px-3 text-sm"
          style={{ color: theme.text }}
        />
        {orderSearch.length > 0 ? (
          <Pressable
            onPress={() => setOrderSearch("")}
            accessibilityRole="button"
            accessibilityLabel="Clear order search"
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: activeCartTotalItems > 0 ? 180 : 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingOrders}
            onRefresh={() => void refreshOrders()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {displayOrders.length === 0 ? (
          <Animated.View
            entering={FadeIn}
            className="items-center justify-center py-16 rounded-3xl border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <ScrollText
              size={64}
              color={theme.muted}
              strokeWidth={1.5}
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <Text
              className="text-xl font-black mb-1"
              style={{ color: theme.text }}
            >
              No {activeTab} Orders
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.muted }}
            >
              {orderSearch || branchFilter !== "all" ||
              fulfillmentFilter !== "all"
                ? "Try changing the branch, order type, or search."
                : "Craving something delicious?"}
            </Text>
          </Animated.View>
        ) : (
          displayOrders.map((order) => {
            const totals = calculateOrderTotals(order);

            return (
              <Pressable
                key={order.id}
                onPress={() => {
                  showOrderDetails(order, order.isActive);
                }}
                className="rounded-[24px] p-4 border"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              >
                <View
                  className="flex-row justify-between items-center border-b pb-3 mb-3"
                  style={{ borderBottomColor: theme.border }}
                >
                  <View className="flex-1 mr-2">
                    <Text
                      className="text-base font-black"
                      style={{ color: theme.text }}
                    >
                      {order.id}
                    </Text>
                    <Text
                      className="text-xs font-semibold mt-1"
                      style={{ color: theme.muted }}
                    >
                      {order.date}
                    </Text>
                    <View className="mt-2 flex-row flex-wrap items-center gap-2">
                      <View
                        className="self-start flex-row items-center rounded-full border px-2.5 py-1"
                        style={{
                          backgroundColor: theme.secondaryBg,
                          borderColor: theme.primary,
                        }}
                      >
                        <Text
                          className="text-[10px] font-black"
                          style={{ color: theme.primary }}
                        >
                          {formatFulfillmentType(order.fulfillmentType)}
                        </Text>
                      </View>
                      <View
                        className="self-start flex-row items-center rounded-full border px-2.5 py-1"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: theme.primary,
                          maxWidth: "100%",
                        }}
                      >
                        <Text
                          className="text-[10px] font-black"
                          numberOfLines={1}
                          style={{ color: theme.text }}
                        >
                          {`Branch: ${getOrderBranchLabel(order)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View
                    className="px-3 py-1.5 rounded-lg border"
                    style={{
                      backgroundColor: order.isActive
                        ? theme.primary
                        : theme.isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                      borderColor: order.isActive
                        ? theme.primary
                        : theme.border,
                    }}
                  >
                    <Text
                      className="text-xs font-black"
                      style={{ color: order.isActive ? "#fff" : theme.text }}
                    >
                      {order.isPaymentRejected
                        ? "Payment Rejected"
                        : order.status}
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-sm font-semibold leading-6 mb-4"
                  style={{ color: theme.muted }}
                >
                  {getItemsString(order.items)}
                </Text>

                <View className="flex-row justify-between items-center pt-1">
                  <Text
                    className="text-lg font-black"
                    style={{ color: theme.text }}
                  >
                    ₹{formatPrice(totals.finalPayable)}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      if (order.isActive) {
                        e.stopPropagation();
                        showOrderDetails(order, true);
                      } else {
                        handleReorder(e, order);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl border"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.primary,
                    }}
                  >
                    <Text
                      className="text-sm font-black"
                      style={{ color: theme.primary }}
                    >
                      {order.isActive ? "Track Order" : "Reorder"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={isBranchPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBranchPickerVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/60 px-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => setIsBranchPickerVisible(false)}
            accessibilityLabel="Close branch selector"
          />
          <View
            className="max-h-[70%] rounded-3xl border p-5"
            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-black" style={{ color: theme.text }}>
                Filter by branch
              </Text>
              <Pressable
                onPress={() => setIsBranchPickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close branch selector"
                className="rounded-full p-2"
                style={{ backgroundColor: theme.card }}
              >
                <X size={20} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { id: "all", label: "All Branches" },
                ...branches.map((branch: any) => ({
                  id: String(branch.id || branch._id),
                  label: branch.name || branch.code || "Branch",
                })),
              ].map((branch) => (
                <Pressable
                  key={branch.id}
                  onPress={() => {
                    setBranchFilter(branch.id);
                    setIsBranchPickerVisible(false);
                  }}
                  className="mb-2 rounded-xl border px-4 py-3"
                  style={{
                    backgroundColor:
                      branchFilter === branch.id ? theme.secondaryBg : theme.card,
                    borderColor:
                      branchFilter === branch.id ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color:
                        branchFilter === branch.id ? theme.primary : theme.text,
                    }}
                  >
                    {branch.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!trackingOrder}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setTrackingOrder(null)}
      >
        <View className="flex-1">
          <Pressable
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
            }}
            onPress={() => setTrackingOrder(null)}
          />
          <Animated.View
            entering={SlideInDown.duration(300)}
            className="rounded-t-[32px] p-6"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.bg,
              paddingTop: insets.top + 24,
              paddingBottom: 0,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text
                  className="text-xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  Track Order
                </Text>
                <Text
                  className="text-sm font-semibold mt-1"
                  style={{ color: theme.muted }}
                >
                  {trackingOrder?.id}
                </Text>
                {trackingOrder && (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <View
                      className="rounded-full border px-3 py-1"
                      style={{
                        backgroundColor: theme.secondaryBg,
                        borderColor: theme.primary,
                      }}
                    >
                      <Text
                        className="text-xs font-black"
                        style={{ color: theme.primary }}
                      >
                        {formatFulfillmentType(trackingOrder.fulfillmentType)}
                      </Text>
                    </View>
                    <View
                      className="rounded-full border px-3 py-1"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.primary,
                        maxWidth: "100%",
                      }}
                    >
                      <Text
                        className="text-xs font-black"
                        numberOfLines={1}
                        style={{ color: theme.text }}
                      >
                        {`Branch: ${getOrderBranchLabel(trackingOrder)}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setTrackingOrder(null)}
                className="p-2 bg-gray-500/10 rounded-full"
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <Text
                className="text-xs font-black uppercase tracking-wider mb-3 ml-1"
                style={{ color: theme.muted }}
              >
                Order Items
              </Text>
              <OrderItemsList order={trackingOrder} theme={theme} />

              <Text
                className="text-xs font-black uppercase tracking-wider mb-3 ml-1"
                style={{ color: theme.muted }}
              >
                Bill Summary
              </Text>
              <BillDetailsAccordion order={trackingOrder} theme={theme} />

              <Text
                className="text-xs font-black uppercase tracking-wider mb-3 ml-1"
                style={{ color: theme.muted }}
              >
                Live Status
              </Text>
              <View
                className="p-5 rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  flexGrow: 1,
                }}
              >
                {getOrderStatusTimeline(trackingOrder).map(
                  (step: any, index: number, steps: any[]) => (
                    <View
                      key={step.status}
                      className={`flex-row items-start ${index === steps.length - 1 ? "" : "mb-6"}`}
                    >
                      <View className="items-center mr-4">
                        {step.isComplete ? (
                          <CheckCircle2 size={24} color={theme.primary} />
                        ) : (
                          <View
                            className="w-6 h-6 rounded-full items-center justify-center border-2"
                            style={{
                              backgroundColor: step.isCurrent
                                ? theme.primary
                                : "transparent",
                              borderColor: step.isCurrent
                                ? theme.primary
                                : theme.border,
                            }}
                          >
                            {step.isCurrent && (
                              <View className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </View>
                        )}
                        {index < steps.length - 1 && (
                          <View
                            className="w-0.5 h-10 my-1"
                            style={{
                              backgroundColor: step.isComplete
                                ? theme.primary
                                : theme.border,
                            }}
                          />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-bold"
                          style={{
                            color: step.isCurrent
                              ? theme.primary
                              : step.isComplete
                                ? theme.text
                                : theme.muted,
                          }}
                        >
                          {step.label}
                        </Text>
                        <Text
                          className="text-xs font-semibold mt-1"
                          style={{ color: theme.muted }}
                        >
                          {step.note}
                        </Text>
                        {step.changedAt ? (
                          <Text
                            className="text-[11px] font-medium mt-1"
                            style={{ color: theme.muted }}
                          >
                            {new Date(step.changedAt).toLocaleString()}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ),
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={!!detailsOrder}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailsOrder(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setDetailsOrder(null)} />
          <Animated.View
            entering={SlideInDown.duration(300)}
            className="rounded-t-[32px] p-6 pb-12"
            style={{ backgroundColor: theme.bg, maxHeight: "90%" }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text
                  className="text-xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  Order Summary
                </Text>
                <Text
                  className="text-sm font-semibold mt-1"
                  style={{ color: theme.muted }}
                >
                  {detailsOrder?.id} • {detailsOrder?.date}
                </Text>
                {detailsOrder && (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <View
                      className="rounded-full border px-3 py-1"
                      style={{
                        backgroundColor: theme.secondaryBg,
                        borderColor: theme.primary,
                      }}
                    >
                      <Text
                        className="text-xs font-black"
                        style={{ color: theme.primary }}
                      >
                        {formatFulfillmentType(detailsOrder.fulfillmentType)}
                      </Text>
                    </View>
                    <View
                      className="rounded-full border px-3 py-1"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.primary,
                        maxWidth: "100%",
                      }}
                    >
                      <Text
                        className="text-xs font-black"
                        numberOfLines={1}
                        style={{ color: theme.text }}
                      >
                        {`Branch: ${getOrderBranchLabel(detailsOrder)}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setDetailsOrder(null)}
                className="p-2 bg-gray-500/10 rounded-full"
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              <Text
                className="text-xs font-black uppercase tracking-wider mb-3 ml-1"
                style={{ color: theme.muted }}
              >
                Order Items
              </Text>
              <OrderItemsList order={detailsOrder} theme={theme} />

              <Text
                className="text-xs font-black uppercase tracking-wider mb-3 ml-1"
                style={{ color: theme.muted }}
              >
                Bill Summary
              </Text>
              <BillDetailsAccordion order={detailsOrder} theme={theme} />

              <View className="flex-row justify-between items-center px-2 mt-2 mb-4">
                <Text
                  className="text-lg font-black"
                  style={{ color: theme.text }}
                >
                  Total Paid
                </Text>
                <Text
                  className="text-lg font-black"
                  style={{ color: theme.primary }}
                >
                  ₹
                  {formatPrice(calculateOrderTotals(detailsOrder).finalPayable)}
                </Text>
              </View>
            </ScrollView>

            <Pressable
              onPress={(e) => {
                handleReorder(e, detailsOrder);
                setDetailsOrder(null);
              }}
              className="py-4 rounded-xl items-center shadow-sm flex-row justify-center"
              style={{ backgroundColor: theme.primary }}
            >
              <Package
                size={20}
                color="#fff"
                strokeWidth={2.5}
                className="mr-2"
              />
              <Text className="text-white font-black text-base tracking-wide">
                Reorder Items
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
