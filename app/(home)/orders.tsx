import { useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Heart,
  Package,
  Receipt,
  ScrollText,
  UserRound,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FOOD_ITEMS, TAX_DETAILS } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

const { width, height } = Dimensions.get("window");

// --- ENHANCED MOCK ORDERS DATA ---
const ENHANCED_MOCK_ORDERS = [
  {
    id: "ORD-9823",
    date: "Today, 1:45 PM",
    status: "Preparing",
    total: "₹429", // Now ignored, dynamically calculated
    isActive: true,
    items: [
      {
        id: 1,
        quantity: 1,
        name: "Special Chicken Dum Biryani",
        price: "₹319",
      },
      { id: 4, quantity: 2, name: "Garlic Naan", price: "₹55" },
    ],
  },
  {
    id: "ORD-9710",
    date: "Aug 12, 8:30 PM",
    status: "Delivered",
    total: "₹1,127", // Now ignored, dynamically calculated
    isActive: false,
    items: [
      { id: 3, quantity: 2, name: "Paneer Butter Masala", price: "₹289" },
      { id: 2, quantity: 1, name: "Tandoori Platter Full", price: "₹549" },
    ],
  },
  {
    id: "ORD-9654",
    date: "Aug 02, 1:15 PM",
    status: "Delivered",
    total: "₹418", // Now ignored, dynamically calculated
    isActive: false,
    items: [
      {
        id: 1,
        quantity: 1,
        name: "Special Chicken Dum Biryani",
        price: "₹319",
      },
      { id: 5, quantity: 1, name: "Gulab Jamun", price: "₹99" },
    ],
  },
];

// --- UNIVERSAL MATH & FORMATTING HELPERS ---

const formatPrice = (price: number) => price.toFixed(2);

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

  // 1. Calculate item total (Base Price * Quantity)
  const itemTotal = order.items.reduce((sum: number, item: any) => {
    const basePrice = parseFloat(item.price.replace(/[^\d.]/g, "")) || 0;
    return sum + basePrice * item.quantity;
  }, 0);

  // 2. Delivery logic
  const isFreeDelivery = itemTotal >= 99;
  const actualDeliveryFee = isFreeDelivery
    ? 0
    : TAX_DETAILS?.baseDeliveryFee || 40;

  // 3. Taxes & Fees
  const packagingCharge = TAX_DETAILS?.packagingCharge || 15;
  const platformFee = TAX_DETAILS?.platformFee || 5;
  const gstRate = TAX_DETAILS?.gstRate || 0.05; // Default 5%

  const gstAmount = itemTotal * gstRate;
  const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;

  // 4. Final Grand Total
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

// --- STABLE EXTERNAL UI COMPONENTS ---

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
            <View className="flex-row items-center flex-1">
              <View className="bg-gray-500/10 px-2 py-1 rounded mr-3">
                <Text
                  className="font-black text-xs"
                  style={{ color: theme.text }}
                >
                  {item.quantity}x
                </Text>
              </View>
              <Text
                className="font-bold text-sm flex-1"
                style={{ color: theme.text }}
              >
                {item.name}
              </Text>
            </View>
            <Text
              className="font-bold text-sm ml-2"
              style={{ color: theme.muted }}
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
        style={{ marginBottom: isExpanded ? 16 : 0 }}
      >
        <View className="flex-row items-center">
          <View className="bg-emerald-500 p-1.5 rounded-md mr-2">
            <Receipt size={16} color="white" />
          </View>
          <Text style={{ color: theme.text }} className="font-black text-lg">
            Bill Details
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text
            style={{ color: theme.text }}
            className="font-black text-lg ml-1"
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

          {/* Delivery Fee Hover Row */}
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

          {/* GST & Other Charges Hover Row */}
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

  // Modals state
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [detailsOrder, setDetailsOrder] = useState<any>(null);

  const { mode: orderMode, carts, handleAddToCart } = useOrderMode();
  const activeCart = carts[orderMode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const displayOrders = ENHANCED_MOCK_ORDERS.filter((o) =>
    activeTab === "Active" ? o.isActive : !o.isActive,
  );

  const handleReorder = (e: any, order: any) => {
    e.stopPropagation();

    let itemsAdded = 0;
    order.items.forEach((orderItem: any) => {
      const foodItem = FOOD_ITEMS.find((f: any) => f.id === orderItem.id);
      if (foodItem) {
        const basePrice =
          parseFloat(foodItem.price.replace(/[^\d.]/g, "")) || 0;
        handleAddToCart(
          foodItem,
          orderItem.quantity,
          [],
          basePrice * orderItem.quantity,
        );
        itemsAdded++;
      }
    });

    if (itemsAdded > 0) {
      Alert.alert(
        "Added to Cart",
        "Items from your previous order have been added to your cart!",
      );
    } else {
      Alert.alert("Error", "These items are no longer available on the menu.");
    }
  };

  const getItemsString = (items: any[]) =>
    items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* UNIVERSAL HEADER */}
      <View className="flex-row justify-between items-center px-4 py-3 z-10">
        <Text className="text-3xl font-black" style={{ color: theme.text }}>
          Your Orders
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* CUSTOM 2-WAY TAB SWITCH */}
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

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: activeCartTotalItems > 0 ? 180 : 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
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
              Craving something delicious?
            </Text>
          </Animated.View>
        ) : (
          displayOrders.map((order) => {
            const totals = calculateOrderTotals(order);

            return (
              <Pressable
                key={order.id}
                onPress={() => {
                  order.isActive
                    ? setTrackingOrder(order)
                    : setDetailsOrder(order);
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
                  <View>
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
                      {order.status}
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
                        setTrackingOrder(order);
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

      {/* ========================================================================= */}
      {/* MODAL 1: ACTIVE ORDER TRACKING (COMPREHENSIVE) */}
      {/* ========================================================================= */}
      <Modal
        visible={!!trackingOrder}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTrackingOrder(null)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={() => setTrackingOrder(null)}
          />
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
                  Track Order
                </Text>
                <Text
                  className="text-sm font-semibold mt-1"
                  style={{ color: theme.muted }}
                >
                  {trackingOrder?.id}
                </Text>
              </View>
              <Pressable
                onPress={() => setTrackingOrder(null)}
                className="p-2 bg-gray-500/10 rounded-full"
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                className="p-5 rounded-2xl border mb-4 shadow-sm"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              >
                <View className="flex-row items-start mb-6">
                  <View className="items-center mr-4">
                    <CheckCircle2 size={24} color={theme.primary} />
                    <View className="w-0.5 h-10 bg-emerald-500 my-1" />
                  </View>
                  <View>
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.text }}
                    >
                      Order Accepted
                    </Text>
                    <Text
                      className="text-xs font-semibold mt-1"
                      style={{ color: theme.muted }}
                    >
                      Restaurant has confirmed your order.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start mb-6">
                  <View className="items-center mr-4">
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <View className="w-2 h-2 bg-white rounded-full" />
                    </View>
                    <View
                      className="w-0.5 h-10 my-1"
                      style={{ backgroundColor: theme.border }}
                    />
                  </View>
                  <View>
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.text }}
                    >
                      Preparing Food
                    </Text>
                    <Text
                      className="text-xs font-semibold mt-1"
                      style={{ color: theme.primary }}
                    >
                      Currently being cooked!
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start">
                  <View className="items-center mr-4">
                    <CircleDashed size={24} color={theme.muted} />
                  </View>
                  <View>
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.muted }}
                    >
                      Out for Delivery
                    </Text>
                    <Text
                      className="text-xs font-semibold mt-1"
                      style={{ color: theme.muted }}
                    >
                      Waiting for partner assignment.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: PAST ORDER DETAILS */}
      {/* ========================================================================= */}
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
