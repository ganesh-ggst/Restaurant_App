import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Heart,
  Package,
  Receipt,
  ScrollText,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react-native";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileAvatarButton } from "../../../components/profile/ProfileAvatarButton";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import { authApi } from "../../../services/api/auth";
import type {
  CustomerCartItemInput,
  CustomerCustomizationSelection,
  CustomerDineInSession,
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
  const normalized = normalizeFulfillmentType(fulfillmentType);

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

function normalizeFulfillmentType(fulfillmentType: unknown) {
  return String(fulfillmentType || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function getEffectiveOrderStatus(
  order: any,
  activeDineInSessionId: string | null | undefined,
) {
  const status = normalizeOrderStatus(order?.status);
  if (
    normalizeFulfillmentType(order?.fulfillmentType) !== "dine-in" ||
    ["rejected", "cancelled", "refunded"].includes(status) ||
    activeDineInSessionId === undefined
  ) {
    return status;
  }

  const sessionId =
    typeof order?.dineInSessionId === "string"
      ? order.dineInSessionId
      : order?.dineInSessionId?._id;
  if (
    activeDineInSessionId === null ||
    (sessionId && sessionId !== activeDineInSessionId)
  ) {
    return "completed";
  }
  return status === "pending" ? "accepted" : status;
}

function mapCustomerOrder(order: CustomerOrder) {
  const isPaymentRejected =
    String(order.paymentStatus || "")
      .trim()
      .toLowerCase() === "rejected";
  const status = isPaymentRejected
    ? "rejected"
    : normalizeOrderStatus(order.status);
  const isActive = !["completed", "cancelled", "rejected", "refunded"].includes(
    status,
  );
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
      unitPrice: item.unitPrice,
      itemTotal: item.itemTotal,
    })),
  };
}

function getOrderStatusTimeline(
  order: any,
  activeDineInSessionId: string | null | undefined,
) {
  const fulfillmentType = normalizeFulfillmentType(
    order?.fulfillmentType || "delivery",
  );
  const isDineIn = fulfillmentType === "dine-in";
  const currentStatus = getEffectiveOrderStatus(order, activeDineInSessionId);
  const history = Array.isArray(order?.statusHistory)
    ? order.statusHistory
    : [];
  const statusDescriptions: Record<string, string> = {
    pending: "Order placed",
    accepted: isDineIn
      ? "Order submitted to the kitchen"
      : "Order accepted by the restaurant",
    preparing: "Your order is being prepared",
    ready: "Your order is ready",
    "out for delivery": "Your order is on the way",
    completed: isDineIn ? "Dine-in session ended" : "Order completed",
    rejected: "Order rejected by the restaurant",
  };
  const standardStatuses =
    fulfillmentType === "dine-in"
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

function getOrderItemTotal(
  order: any,
  numericValue: (value: unknown) => number,
): number {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) return numericValue(order.subtotal);

  return items.reduce((sum: number, item: any) => {
    const unitPrice =
      item.unitPrice ??
      (typeof item.price === "string"
        ? parseFloat(item.price.replace(/[^\d.]/g, ""))
        : item.price);
    const itemTotal =
      item.itemTotal ?? numericValue(unitPrice) * numericValue(item.quantity);
    return sum + numericValue(itemTotal);
  }, 0);
}

const calculateOrderTotals = (order: any) => {
  const numericValue = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const getGstAmount = (taxableItemTotal: number) => {
    const rawTaxPercentage = order.resolvedTaxPercentage ?? order.taxPercentage;
    if (rawTaxPercentage == null) return numericValue(order.tax);
    const taxPercentage = Number(
      typeof rawTaxPercentage === "string"
        ? rawTaxPercentage.replace("%", "").trim()
        : rawTaxPercentage,
    );
    if (!Number.isFinite(taxPercentage)) return numericValue(order.tax);
    return Math.round(((taxableItemTotal * taxPercentage) / 100) * 100) / 100;
  };

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

  const fulfillmentType = normalizeFulfillmentType(order.fulfillmentType);
  if (fulfillmentType === "dine-in" || fulfillmentType === "takeaway") {
    const itemTotal = getOrderItemTotal(order, numericValue);
    const discount = numericValue(order.discount);
    const gstAmount = getGstAmount(Math.max(0, itemTotal - discount));

    return {
      itemTotal,
      actualDeliveryFee: 0,
      isFreeDelivery: false,
      packagingCharge: 0,
      platformFee: 0,
      gstAmount,
      totalTaxesAndCharges: gstAmount,
      finalPayable:
        order.total != null
          ? Math.max(
              0,
              numericValue(order.total) - numericValue(order.tax) + gstAmount,
            )
          : Math.max(0, itemTotal - discount + gstAmount),
    };
  }

  if (typeof order.total === "number") {
    const itemTotal = getOrderItemTotal(order, numericValue);
    const savedDeliveryFee = numericValue(order.deliveryFee);
    const isFreeDelivery = fulfillmentType === "delivery" && itemTotal >= 99;
    const actualDeliveryFee = isFreeDelivery ? 0 : savedDeliveryFee;
    const packagingCharge = numericValue(order.packagingFee);
    const platformFee = numericValue(order.platformFee);
    const savedTax = numericValue(order.tax);
    const gstAmount = getGstAmount(
      Math.max(0, itemTotal - numericValue(order.discount)),
    );
    const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;
    return {
      itemTotal,
      actualDeliveryFee,
      isFreeDelivery,
      packagingCharge,
      platformFee,
      gstAmount,
      totalTaxesAndCharges,
      finalPayable: Math.max(
        0,
        numericValue(order.total) -
          savedTax -
          (isFreeDelivery ? savedDeliveryFee : 0) +
          gstAmount,
      ),
    };
  }

  const itemTotal = getOrderItemTotal(order, numericValue);
  const discount = numericValue(order.discount);
  const taxableItemTotal = Math.max(0, itemTotal - discount);
  const savedDeliveryFee = numericValue(order.deliveryFee);
  const isFreeDelivery = fulfillmentType === "delivery" && itemTotal >= 99;
  const actualDeliveryFee = isFreeDelivery ? 0 : savedDeliveryFee;
  const packagingCharge = numericValue(order.packagingFee);
  const platformFee = numericValue(order.platformFee);
  const gstAmount = getGstAmount(taxableItemTotal);
  const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;
  const finalPayable =
    order.total != null
      ? Math.max(
          0,
          numericValue(order.total) -
            numericValue(order.tax) -
            (isFreeDelivery ? savedDeliveryFee : 0) +
            gstAmount,
        )
      : Math.max(
          0,
          itemTotal -
            discount +
            actualDeliveryFee +
            totalTaxesAndCharges +
            numericValue(order.tipAmount),
        );

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
  const fulfillmentType = normalizeFulfillmentType(order.fulfillmentType);
  const isDineInOrder = fulfillmentType === "dine-in";
  const isGstOnlyOrder = isDineInOrder || fulfillmentType === "takeaway";

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

          {!isGstOnlyOrder && (
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
                        Delivery Fee
                      </Text>
                      <View className="flex-row items-center">
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
                      Delivery Fee
                    </Text>
                  </View>
                  <View className="flex-row">
                    <Text
                      className={
                        totals.isFreeDelivery
                          ? "text-emerald-600 font-bold"
                          : "font-semibold"
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
          )}

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
                    {isGstOnlyOrder ? "GST" : "GST & Other Charges"}
                  </Text>
                  {!isGstOnlyOrder && (
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
                  )}
                  {!isGstOnlyOrder && (
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
                  )}
                  {!isGstOnlyOrder && (
                    <Text
                      style={{ color: theme.muted, opacity: 0.7 }}
                      className="text-[11px] mb-4 leading-4 pr-10"
                    >
                      Inclusive of GST. This fee helps us operate.
                    </Text>
                  )}
                  <View className="flex-row justify-between mb-1">
                    <Text
                      style={{ color: theme.muted }}
                      className="text-[13px] font-semibold"
                    >
                      {isGstOnlyOrder ||
                      (order.resolvedTaxPercentage ?? order.taxPercentage) ==
                        null
                        ? "GST"
                        : `Restaurant GST (${order.resolvedTaxPercentage ?? order.taxPercentage}%)`}
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
                  {isGstOnlyOrder ? "GST" : "GST & Other Charges"}
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

function OrderReviewSection({
  order,
  theme,
  onFeedbackFocus,
  onReviewSubmitted,
}: {
  order: any;
  theme: ReturnType<typeof useAppTheme>;
  onFeedbackFocus: () => void;
  onReviewSubmitted: () => void;
}) {
  const [rating, setRating] = useState(
    Number.isInteger(order.orderReview?.rating) ? order.orderReview.rating : 0,
  );
  const [comment, setComment] = useState(order.orderReview?.comment || "");
  const [hasReview, setHasReview] = useState(
    order.hasOrderReview === true || Boolean(order.orderReview),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canEdit = order.canEditOrderReview !== false;
  const canReview = order.canReviewOrder !== false;
  const isEditable = hasReview ? canEdit : canReview;

  const submitReview = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert("Rating required", "Choose a star rating before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const savedReview = hasReview
        ? await api.updateOrderReview(order.orderId, rating, comment.trim())
        : await api.createOrderReview(order.orderId, rating, comment.trim());
      setRating(savedReview.rating);
      setComment(savedReview.comment);
      setHasReview(true);
      Alert.alert(
        hasReview ? "Review updated" : "Review submitted",
        hasReview
          ? "Your order review has been updated."
          : "Thank you for sharing your feedback.",
      );
      onReviewSubmitted();
    } catch (error) {
      Alert.alert(
        "Unable to submit review",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      className="mb-5 rounded-2xl border p-4"
      style={{ backgroundColor: theme.card, borderColor: theme.border }}
    >
      <Text className="mb-1 text-base font-black" style={{ color: theme.text }}>
        Rate this order
      </Text>
      <Text className="mb-3 text-xs" style={{ color: theme.muted }}>
        How was your order?
      </Text>
      <View className="mb-4 flex-row">
        {[1, 2, 3, 4, 5].map((starRating) => (
          <Pressable
            key={starRating}
            onPress={() => setRating(starRating)}
            disabled={!isEditable || isSubmitting}
            className="mr-2 p-1"
            accessibilityRole="button"
            accessibilityLabel={`${starRating} star${starRating === 1 ? "" : "s"}`}
            accessibilityState={{ selected: rating === starRating }}
          >
            <Star
              size={30}
              color={rating >= starRating ? "#F5A623" : theme.border}
              fill={rating >= starRating ? "#F5A623" : "transparent"}
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        editable={isEditable && !isSubmitting}
        placeholder="Tell us about your experience (optional)"
        placeholderTextColor={theme.muted}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        onFocus={onFeedbackFocus}
        className="mb-3 min-h-[96px] rounded-xl border px-3 py-3 text-sm"
        style={{
          color: theme.text,
          borderColor: theme.border,
          backgroundColor: theme.bg,
        }}
        accessibilityLabel="Order feedback"
      />
      {!isEditable ? (
        <Text className="text-xs font-semibold" style={{ color: theme.muted }}>
          {hasReview
            ? "Your review has already been submitted."
            : "This order is not currently eligible for a review."}
        </Text>
      ) : (
        <Pressable
          onPress={() => void submitReview()}
          disabled={isSubmitting || rating === 0}
          className="items-center rounded-xl py-3"
          style={{
            backgroundColor: theme.primary,
            opacity: isSubmitting || rating === 0 ? 0.55 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={
            hasReview ? "Update order review" : "Submit order review"
          }
        >
          <Text className="text-sm font-black text-white">
            {isSubmitting
              ? "Saving review..."
              : hasReview
                ? "Update Review"
                : "Submit Review"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const activeTab = tab === "past" ? "Past Orders" : "Active";
  const [branchFilter, setBranchFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [isBranchPickerVisible, setIsBranchPickerVisible] = useState(false);

  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [detailsOrder, setDetailsOrder] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const detailsScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const {
    mode: orderMode,
    setMode,
    carts,
    reloadCart,
    branches = [],
    setActiveBranch,
    activeAddress,
  } = useOrderMode();
  const [orders, setOrders] = useState<any[]>([]);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [activeDineInSession, setActiveDineInSession] = useState<
    CustomerDineInSession | null | undefined
  >(undefined);
  const sessionCheckErrorShown = useRef(false);
  const activeCart = carts[orderMode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      let isFocused = true;
      let sessionRequestInProgress = false;
      const refreshDineInSession = async () => {
        if (sessionRequestInProgress) return;
        sessionRequestInProgress = true;
        try {
          const token = await authApi.getAccessToken();
          if (!token || !isFocused) return;
          const session = await api.getDineInSession();
          if (!isFocused) return;
          setActiveDineInSession(session);
          sessionCheckErrorShown.current = false;
        } catch (error) {
          if (!isFocused || sessionCheckErrorShown.current) return;
          sessionCheckErrorShown.current = true;
          Alert.alert(
            "Unable to Refresh Dine-in Status",
            error instanceof Error ? error.message : "Please try again.",
          );
        } finally {
          sessionRequestInProgress = false;
        }
      };

      void refreshOrders();
      void refreshDineInSession();
      const interval = setInterval(() => {
        void refreshDineInSession();
      }, 10_000);
      return () => {
        isFocused = false;
        clearInterval(interval);
      };
    }, [refreshOrders]),
  );

  const getOrderBranchId = (order: any): string | null => {
    const branch = order.branchId || order.branch;
    if (typeof branch === "string") return branch;
    return branch?._id || branch?.id || null;
  };

  const getOrderTaxPercentage = (order: any): number | undefined => {
    const branchId = getOrderBranchId(order);
    const branch = branches.find(
      (candidate: any) =>
        String(candidate.id || candidate._id || "").toLowerCase() ===
        String(branchId || "").toLowerCase(),
    );
    const taxDetails =
      branch?.taxDetailOptions?.find((option: any) => option.isActive) ??
      branch?.taxDetails;
    const activeTaxPercentage =
      taxDetails?.gstPercentage == null
        ? Number.NaN
        : Number(String(taxDetails.gstPercentage).replace("%", "").trim());
    if (Number.isFinite(activeTaxPercentage)) return activeTaxPercentage;

    if (order.taxPercentage == null) return undefined;
    const savedTaxPercentage = Number(
      String(order.taxPercentage).replace("%", "").trim(),
    );
    return Number.isFinite(savedTaxPercentage) ? savedTaxPercentage : undefined;
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

  const endedSessionStatuses = [
    "cancelled",
    "canceled",
    "closed",
    "completed",
    "ended",
    "expired",
  ];
  const activeDineInSessionId =
    activeDineInSession === null ||
    (activeDineInSession?.status &&
      endedSessionStatuses.includes(
        normalizeOrderStatus(activeDineInSession.status),
      ))
      ? null
      : activeDineInSession?._id;
  const ordersWithLiveStatus = orders.map((order) => {
    const status = getEffectiveOrderStatus(order, activeDineInSessionId);
    return {
      ...order,
      resolvedTaxPercentage: getOrderTaxPercentage(order),
      status: formatOrderStatus(status),
      isActive: !["completed", "cancelled", "rejected", "refunded"].includes(
        status,
      ),
    };
  });

  const displayOrders = ordersWithLiveStatus.filter((order) => {
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
      const sourceOrder = await api.getOrder(order.orderId);
      const orderBranch = sourceOrder.branchId || (sourceOrder as any).branch;
      const branchId =
        typeof orderBranch === "string"
          ? orderBranch
          : orderBranch?._id || orderBranch?.id;
      if (!branchId) {
        throw new Error(
          "This order does not include its restaurant branch, so it cannot be reordered.",
        );
      }

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

      if (
        order.isPaymentRejected ||
        normalizeOrderStatus(order.status) === "rejected"
      ) {
        const cartFulfillmentType =
          fulfillmentType === "delivery" ||
          fulfillmentType === "takeaway" ||
          fulfillmentType === "dine-in"
            ? fulfillmentType
            : null;
        if (!cartFulfillmentType) {
          throw new Error(
            "This order has an unsupported fulfillment type and cannot be reordered.",
          );
        }
        const sourceAddressId =
          typeof sourceOrder.addressId === "string"
            ? sourceOrder.addressId
            : sourceOrder.addressId?._id || sourceOrder.addressId?.id;
        const addressId =
          cartFulfillmentType === "delivery"
            ? sourceAddressId || activeAddress?.id
            : undefined;
        const cartItems = sourceOrder.items.map(
          (item): CustomerCartItemInput => {
            const menuItemId = item.menuItemId;
            if (
              !menuItemId ||
              !Number.isFinite(item.quantity) ||
              item.quantity < 1
            ) {
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
            const cartItem = {
              menuItemId,
              quantity: item.quantity,
              selectedCustomizations,
              branchId,
            };
            if (cartFulfillmentType === "delivery") {
              if (!addressId) {
                throw new Error(
                  "Choose a delivery address before reordering this delivery order.",
                );
              }
              return { ...cartItem, fulfillmentType: "delivery", addressId };
            }
            return { ...cartItem, fulfillmentType: cartFulfillmentType };
          },
        );

        for (const item of cartItems) {
          await api.addCartItem(item);
        }
      } else {
        await api.reorder(order.orderId);
      }
      await reloadCart(branchId);
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

  const deleteOrder = async (order: any) => {
    if (deletingOrderId) return;
    setDeletingOrderId(order.orderId);
    try {
      await api.deleteOrder(order.orderId);
      setOrders((currentOrders) =>
        currentOrders.filter(
          (currentOrder) => currentOrder.orderId !== order.orderId,
        ),
      );
      setDetailsOrder((currentOrder: any) =>
        currentOrder?.orderId === order.orderId ? null : currentOrder,
      );
      setTrackingOrder((currentOrder: any) =>
        currentOrder?.orderId === order.orderId ? null : currentOrder,
      );
    } catch (error) {
      Alert.alert(
        "Unable to Delete Order",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setDeletingOrderId(null);
    }
  };

  const confirmDeleteOrder = (event: any, order: any) => {
    event.stopPropagation();
    Alert.alert(
      "Delete Order",
      `Delete order ${order.id}? This cannot be undone.`,
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteOrder(order),
        },
      ],
    );
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
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <ProfileAvatarButton />
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
              onPress={() =>
                router.setParams({
                  tab: tab === "Past Orders" ? "past" : "active",
                })
              }
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
              (branch: any) => String(branch.id || branch._id) === branchFilter,
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
              No {activeTab}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.muted }}
            >
              {orderSearch ||
              branchFilter !== "all" ||
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
                  <View className="flex-row items-center gap-2">
                    {!order.isActive ? (
                      <Pressable
                        onPress={(event) => confirmDeleteOrder(event, order)}
                        disabled={deletingOrderId !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete order ${order.id}`}
                        className="h-10 w-10 items-center justify-center rounded-xl border"
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.danger,
                          opacity: deletingOrderId !== null ? 0.6 : 1,
                        }}
                      >
                        {deletingOrderId === order.orderId ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.danger}
                          />
                        ) : (
                          <Trash2 size={18} color={theme.danger} />
                        )}
                      </Pressable>
                    ) : null}
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
              <Text
                className="text-lg font-black"
                style={{ color: theme.text }}
              >
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
                      branchFilter === branch.id
                        ? theme.secondaryBg
                        : theme.card,
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
        transparent={Platform.OS !== "android"}
        animationType={Platform.OS === "android" ? "slide" : "fade"}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setTrackingOrder(null)}
      >
        <View
          className="flex-1"
          style={{
            backgroundColor:
              Platform.OS === "android" ? theme.bg : "transparent",
          }}
        >
          {Platform.OS !== "android" && (
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
          )}
          <Animated.View
            entering={SlideInDown.duration(300)}
            className={
              Platform.OS === "android" ? "p-6" : "rounded-t-[32px] p-6"
            }
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.bg,
              paddingTop: insets.top + 24,
              paddingBottom: Platform.OS === "android" ? insets.bottom + 12 : 0,
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
                {getOrderStatusTimeline(
                  trackingOrder,
                  activeDineInSessionId,
                ).map((step: any, index: number, steps: any[]) => (
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
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={!!detailsOrder}
        transparent={Platform.OS !== "android"}
        animationType={Platform.OS === "android" ? "slide" : "fade"}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setDetailsOrder(null)}
      >
        <View
          className={
            Platform.OS === "android" ? "flex-1" : "flex-1 justify-end"
          }
          style={{
            backgroundColor:
              Platform.OS === "android" ? theme.bg : "rgba(0, 0, 0, 0.6)",
            paddingTop: Platform.OS === "android" ? insets.top : 0,
            paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
          }}
        >
          {Platform.OS !== "android" && (
            <Pressable
              className="absolute inset-0"
              onPress={() => setDetailsOrder(null)}
            />
          )}
          <Animated.View
            entering={SlideInDown.duration(300)}
            className={
              Platform.OS === "android"
                ? "flex-1 p-6"
                : "rounded-t-[32px] p-6 pb-4"
            }
            style={{
              backgroundColor: theme.bg,
              flex: 1,
              maxHeight: windowHeight * 0.9,
            }}
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

            <ScrollView
              ref={detailsScrollRef}
              showsVerticalScrollIndicator={false}
              className="mb-1"
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              contentContainerStyle={{
                paddingBottom: keyboardHeight > 0 ? 8 : 104,
              }}
            >
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

              {detailsOrder &&
              normalizeOrderStatus(detailsOrder.status) === "completed" ? (
                <OrderReviewSection
                  key={`${detailsOrder.orderId}-${detailsOrder.orderReview?.id || (detailsOrder.hasOrderReview ? "review" : "new")}`}
                  order={detailsOrder}
                  theme={theme}
                  onFeedbackFocus={() => {
                    setTimeout(
                      () =>
                        detailsScrollRef.current?.scrollToEnd({
                          animated: true,
                        }),
                      300,
                    );
                  }}
                  onReviewSubmitted={() => setDetailsOrder(null)}
                />
              ) : null}
            </ScrollView>

            <View pointerEvents="none" style={{ height: keyboardHeight }} />
            <Pressable
              onPress={(e) => {
                handleReorder(e, detailsOrder);
                setDetailsOrder(null);
              }}
              className="absolute items-center justify-center rounded-xl py-4 shadow-sm"
              style={{
                backgroundColor: theme.primary,
                opacity: keyboardHeight > 0 ? 0 : 1,
                bottom: 12,
                left: 24,
                right: 24,
                flexDirection: "row",
              }}
              pointerEvents={keyboardHeight > 0 ? "none" : "auto"}
            >
              <Package size={20} color="#fff" strokeWidth={2.5} />
              <Text className="ml-2 text-base font-black tracking-wide text-white">
                Reorder Items
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
