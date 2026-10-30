import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  MapPin,
  Minus,
  Plus,
  Receipt,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react-native";
import { type ComponentRef, memo, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  CELEBRATION_EMOJIS,
  TIP_OPTIONS,
} from "../../constants/mockData";
import { getDeliverySpeed } from "../../services/api/customer";

const { height } = Dimensions.get("window");

const hasImageUri = (uri: unknown): uri is string =>
  typeof uri === "string" && uri.trim().length > 0;

const CelebrationParticle = ({ progress, index, total }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = index * (360 / total) * (Math.PI / 180);
    const maxDistance = height * 0.7 + (index % 5) * 60;
    const distance = interpolate(
      progress.value,
      [0, 1],
      [0, maxDistance],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(progress.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);
    const rotate = interpolate(progress.value, [0, 1], [0, 720]);
    const scale = interpolate(progress.value, [0, 0.1, 1], [0, 1.8, 0.6]);

    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance + progress.value * 400 },
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[{ position: "absolute", zIndex: 9999 }, animatedStyle]}
    >
      <Text style={{ fontSize: 32 }}>
        {CELEBRATION_EMOJIS[index % CELEBRATION_EMOJIS.length]}
      </Text>
    </Animated.View>
  );
};

const getNumericPrice = (priceString: any) => {
  if (typeof priceString === "number") return priceString;
  return parseFloat(String(priceString).replace(/[^\d.]/g, "")) || 0;
};

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

const getCouponReference = (coupon: unknown): string | null => {
  if (typeof coupon === "string") return coupon.trim() || null;
  if (!coupon || typeof coupon !== "object") return null;

  const couponData = coupon as Record<string, unknown>;
  for (const key of ["code", "couponCode", "offerCode", "offerId", "id", "_id"]) {
    const value = couponData[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return getCouponReference(couponData.offer);
};

export const DeliveryCartModal = memo(
  ({
    onClose,
    cart,
    onIncrement,
    onDecrement,
    theme,
    insets,
    activeAddress,
    restaurantName,
    setActiveAddress,
    orderMode = "Delivery",
    activeBranch,
    addresses = [],
    branches = [],
    offers = [],
    selectedDeliveryOptionId,
    onSelectDeliveryOption,
    crossSellItems = [],
    onRemoveCartItems,
    onClearCart,
    cartPricing,
    onApplyCoupon,
    onRemoveCoupon,
    onCheckout,
    onCreateOrder,
    onOrderPlaced,
    isRefreshing = false,
    onRefresh,
  }: any) => {
    const { width } = useWindowDimensions();
    const cartScrollRef = useRef<KeyboardAwareScrollView | null>(null);
    const isDelivery = orderMode === "Delivery";
    const crossSellCardWidth = (width - 48) / 3;
    const deliveryOptions = (activeBranch?.deliveryOptions || [])
      .filter((option: any) => option.isActive)
      .map((option: any, index: number) => ({
        id: option._id || `${option.name}-${index}`,
        title: option.name,
        speed:
          getDeliverySpeed(option.deliverySpeed) ??
          getDeliverySpeed(option.name),
        subtitle: option.description || "",
        price: Number(option.price) || 0,
        time: option.estimatedTimeRange || "",
      }));

    const [showAddressModal, setShowAddressModal] = useState(false);
    const [currentAddress, setCurrentAddress] = useState(activeAddress);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const instructionInputRef = useRef<ComponentRef<typeof TextInput> | null>(null);

    useEffect(() => {
      if (activeAddress) setCurrentAddress(activeAddress);
    }, [activeAddress]);

    useEffect(() => {
      const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
        setIsKeyboardVisible(true),
      );
      const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
        setIsKeyboardVisible(false),
      );

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, []);

    const [activeTab, setActiveTab] = useState(
      isDelivery ? "Delivery" : "Instructions",
    );
    const [tipAmount, setTipAmount] = useState(0);
    const [isCustomTip, setIsCustomTip] = useState(false);
    const [customTipInput, setCustomTipInput] = useState("");

    const [instructions, setInstructions] = useState("");
    const [instructionStatus, setInstructionStatus] = useState("");

    const [couponInput, setCouponInput] = useState("");
    const [couponError, setCouponError] = useState("");

    const [isBillExpanded, setIsBillExpanded] = useState(false);
    const [showInlineTip, setShowInlineTip] = useState(false);
    const [activePopover, setActivePopover] = useState<
      "delivery" | "gst" | null
    >(null);
    const [expandedCustomizationItemId, setExpandedCustomizationItemId] =
      useState<string | null>(null);

    const [isCelebrating, setIsCelebrating] = useState(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const celebrationProgress = useSharedValue(0);

    const TABS = isDelivery
      ? ["Delivery", "Tip", "Instructions"]
      : ["Instructions"];
    const isAndroidInstructionsDockVisible =
      Platform.OS === "android" &&
      isKeyboardVisible &&
      activeTab === "Instructions";

    useEffect(() => {
      if (!isAndroidInstructionsDockVisible) return;

      const frame = requestAnimationFrame(() =>
        instructionInputRef.current?.focus(),
      );
      return () => cancelAnimationFrame(frame);
    }, [isAndroidInstructionsDockVisible]);

    useEffect(() => {
      if (!cart || cart.length === 0) {
        setTipAmount(0);
        setCustomTipInput("");
        setIsCustomTip(false);
        setIsBillExpanded(false);
      }
    }, [cart]);

    const handleClose = () => {
      Keyboard.dismiss();
      setActivePopover(null);
      setShowAddressModal(false);
      onClose();
    };

    const handleClearCart = () => {
      Alert.alert(
        "Clear Cart",
        "Remove all items from this cart?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear Cart",
            style: "destructive",
            onPress: () => {
              void onClearCart().catch((error: unknown) => {
                Alert.alert(
                  "Unable to Clear Cart",
                  error instanceof Error ? error.message : "Please try again.",
                );
              });
            },
          },
        ],
      );
    };

    const handleRemoveCartItem = (item: any) => {
      if (item.quantity > 1) {
        onDecrement(item.id, item.cartItemId);
        return;
      }

      const isCrossSellItem = crossSellItems.some(
        (crossSell: any) => crossSell.id === item.id,
      );
      if (isCrossSellItem) {
        onDecrement(item.id, item.cartItemId);
        return;
      }

      const removedCategoryId =
        typeof item.categoryId === "string"
          ? item.categoryId
          : item.categoryId?._id || item.categoryId?.id;
      const remainingItems = cart.filter(
        (cartItem: any) =>
          item.cartItemId
            ? cartItem.cartItemId !== item.cartItemId
            : cartItem !== item,
      );
      const remainingCategoryIds = new Set(
        remainingItems
          .filter(
            (cartItem: any) =>
              !crossSellItems.some(
                (crossSell: any) => crossSell.id === cartItem.id,
              ),
          )
          .map((cartItem: any) =>
            typeof cartItem.categoryId === "string"
              ? cartItem.categoryId
              : cartItem.categoryId?._id || cartItem.categoryId?.id,
          )
          .filter(Boolean),
      );
      const orphanedCrossSells = removedCategoryId
        ? crossSellItems.filter(
            (crossSell: any) =>
              remainingItems.some(
                (cartItem: any) => cartItem.id === crossSell.id,
              ) &&
              crossSell.sourceCategoryIds?.includes(removedCategoryId) &&
              !crossSell.sourceCategoryIds.some((categoryId: string) =>
                remainingCategoryIds.has(categoryId),
              ),
          )
          : [];

      if (orphanedCrossSells.length === 0) {
          onDecrement(item.id, item.cartItemId);
          return;
      }

      if (!onRemoveCartItems) {
          Alert.alert(
            "Unable to Remove Related Items",
            "Refresh the cart and try again.",
          );
          return;
      }

      void onRemoveCartItems([
        { menuItemId: item.id, cartItemId: item.cartItemId },
        ...orphanedCrossSells.map((crossSell: any) => ({
          menuItemId: crossSell.id,
        })),
      ]).catch((error: unknown) => {
          Alert.alert(
            "Unable to Remove Cart Items",
            error instanceof Error ? error.message : "Please try again.",
          );
      });
    };

    const cartTotal = cart.reduce(
      (sum: number, item: any) =>
        sum + (item.total || getNumericPrice(item.price) * item.quantity),
      0,
    );
    const itemTotal = cartPricing?.subtotal ?? cartTotal;
    const couponReference = getCouponReference(cartPricing?.coupon);
    const appliedOfferFromCart = couponReference
      ? offers.find(
          (offer: any) =>
            [offer.code, offer.id, offer._id].some(
              (value: unknown) =>
                typeof value === "string" &&
                value.toUpperCase() === couponReference.toUpperCase(),
            ),
        )
      : null;
    const couponData =
      cartPricing?.coupon && typeof cartPricing.coupon === "object"
        ? (cartPricing.coupon as Record<string, unknown>)
        : null;
    const appliedCoupon = couponReference
      ? {
          code: appliedOfferFromCart?.code || couponReference,
          description:
            (typeof couponData?.description === "string" &&
              couponData.description) ||
            appliedOfferFromCart?.description ||
            appliedOfferFromCart?.title ||
            "Offer applied to your cart.",
          discount:
            cartPricing?.discount ??
            (typeof couponData?.discount === "number"
              ? couponData.discount
              : typeof couponData?.discountAmount === "number"
                ? couponData.discountAmount
                : 0),
        }
      : null;
    const couponDiscount = appliedCoupon
      ? (cartPricing?.discount ?? appliedCoupon.discount)
      : cartPricing?.discount || 0;
    const originalItemTotal = itemTotal + couponDiscount;
    const cartItemIds = new Set(cart.map((item: any) => item.id));
    const isOfferApplicableToCart = (offer: any) =>
      offer.appliesToAllItems === true ||
      (offer.applicableMenuItemIds || []).some((itemId: string) =>
        cartItemIds.has(itemId),
      );
    const eligibleOffers = offers.filter(isOfferApplicableToCart);
    const getOfferEligibleSubtotal = (offer: any) =>
      cart.reduce((subtotal: number, item: any) => {
        const appliesToItem =
          offer.appliesToAllItems === true ||
          (offer.applicableMenuItemIds || []).includes(item.id);
        return appliesToItem
          ? subtotal +
            (item.total ?? getNumericPrice(item.price) * item.quantity)
          : subtotal;
      }, 0);
    const appliedOffer = offers.find(
      (offer: any) =>
        offer.code?.toUpperCase() === appliedCoupon?.code?.toUpperCase(),
    );
    const getAppliedCouponItemDiscount = (item: any) => {
      if (!appliedOffer || !appliedCoupon) return 0;
      const appliesToItem =
        appliedOffer.appliesToAllItems === true ||
        (appliedOffer.applicableMenuItemIds || []).includes(item.id);
      if (!appliesToItem) return 0;

      const eligibleSubtotal = getOfferEligibleSubtotal(appliedOffer);
      return eligibleSubtotal > 0
        ? (appliedCoupon.discount *
            (item.total ?? getNumericPrice(item.price) * item.quantity)) /
            eligibleSubtotal
        : 0;
    };

    const charges =
      activeBranch?.restaurantChargeOptions?.find(
        (option: any) => option.isActive,
      ) ??
      activeBranch?.restaurantCharges ??
      {};
    const isFreeDeliveryEligible = !isDelivery || itemTotal >= 99;
    const baseDeliveryFee = isDelivery ? charges.delivery || 0 : 0;
    const payableBaseDeliveryFee = isFreeDeliveryEligible
      ? 0
      : baseDeliveryFee;

    const selectedOption =
      deliveryOptions.find(
        (option: any) =>
          option.id === selectedDeliveryOptionId ||
          option.speed === selectedDeliveryOptionId,
      ) ||
      deliveryOptions.find((option: any) =>
        /normal|standard/i.test(option.title),
      ) ||
      deliveryOptions[0];
    const optionPrice = isDelivery && selectedOption ? selectedOption.price : 0;
    const deliveryOptionCharge = Math.max(0, optionPrice);
    const deliveryOptionDiscount = Math.max(0, -optionPrice);
    const actualDeliveryFee = payableBaseDeliveryFee;
    const isFreeDelivery = isDelivery && isFreeDeliveryEligible;
    const discount = couponDiscount + deliveryOptionDiscount;

    const packagingCharge =
      orderMode === "Dine-in" ? 0 : charges.packaging || 0;
    const platformFee = charges.platform || 0;
    const taxDetails =
      activeBranch?.taxDetailOptions?.find((option: any) => option.isActive) ??
      activeBranch?.taxDetails ??
      {};
    const gstRate = (taxDetails.gstPercentage || 0) / 100;
    const taxableItemTotal = Math.max(0, itemTotal - couponDiscount);
    const gstAmount = Math.round(taxableItemTotal * gstRate * 100) / 100;
    const originalGstAmount = Math.round(itemTotal * gstRate * 100) / 100;
    const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;

    const finalPayable = Math.max(
      0,
      itemTotal +
        actualDeliveryFee +
        deliveryOptionCharge +
        totalTaxesAndCharges +
        (isDelivery ? tipAmount : 0) -
        discount,
    );
    const originalPayable =
      itemTotal +
      baseDeliveryFee +
      deliveryOptionCharge +
      packagingCharge +
      platformFee +
      originalGstAmount +
      (isDelivery ? tipAmount : 0);
    const totalSavings = Math.max(0, originalPayable - finalPayable);

    const triggerCelebration = () => {
      celebrationProgress.value = 0; // Reset
      setIsCelebrating(true);
      celebrationProgress.value = withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 0 }),
      );
      setTimeout(() => {
        setIsCelebrating(false);
      }, 3100);
    };

    const handleApplyCoupon = () => {
      setCouponInput("");
      setCouponError("");
      triggerCelebration();
    };

    const validateAndApplyCoupon = async (codeToApply: string) => {
      Keyboard.dismiss();
      const code = codeToApply.trim().toUpperCase();
      if (!code) {
        setCouponError("Please enter a coupon code");
        return;
      }

      try {
        const offer = offers.find(
          (candidate: any) => candidate.code?.toUpperCase() === code,
        );
        if (offer && !isOfferApplicableToCart(offer)) {
          setCouponError("This coupon does not apply to items in your cart.");
          return;
        }

        await onApplyCoupon(code);
        handleApplyCoupon();
      } catch (error) {
        setCouponError(
          error instanceof Error ? error.message : "Unable to apply this offer.",
        );
      }
    };

    const handleRemoveCoupon = async () => {
      try {
        await onRemoveCoupon();
        setCouponInput("");
        setCouponError("");
      } catch (error) {
        setCouponError(
          error instanceof Error ? error.message : "Unable to remove offer.",
        );
      }
    };

    const handleSaveInstructions = () => {
      Keyboard.dismiss();
      setInstructionStatus("Instructions saved securely!");
      setTimeout(() => setInstructionStatus(""), 3000);
    };

    const renderInstructionEditor = () => (
      <View className="p-4">
        <View
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bg,
          }}
          className="border rounded-xl px-3 py-2 h-24 mb-3"
        >
          <TextInput
            ref={instructionInputRef}
            multiline
            placeholder="e.g. Extra spicy, specific packaging requests..."
            placeholderTextColor={theme.muted}
            value={instructions}
            onChangeText={setInstructions}
            className="flex-1"
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: "500",
              paddingVertical: 0,
              margin: 0,
              textAlignVertical: "top",
            }}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            style={{ color: theme.primary }}
            className="font-bold text-xs"
          >
            {instructionStatus}
          </Text>
          <Pressable
            onPress={handleSaveInstructions}
            style={{ backgroundColor: theme.primary }}
            className="px-6 py-2.5 rounded-lg"
          >
            <Text className="text-white font-black text-xs uppercase tracking-wider">
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    );

    const handleSubmitOrder = async () => {
      if (isSubmittingOrder) return;
      setIsSubmittingOrder(true);
      try {
        await onCreateOrder(
          "success",
          isDelivery ? tipAmount : 0,
          instructions.trim(),
          taxableItemTotal,
          gstAmount,
          Math.round(finalPayable * 100) / 100,
        );
        Alert.alert(
          "Payment Successful",
          "Your order is placed and is now Pending.",
          [
            {
              text: "View Orders",
              onPress: () => {
                void Promise.resolve(onOrderPlaced?.("success")).catch(
                  (error: unknown) => {
                    Alert.alert(
                      "Unable to Open Orders",
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    );
                  },
                );
              },
            },
          ],
        );
      } catch (error) {
        Alert.alert(
          "Unable to Place Order",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setIsSubmittingOrder(false);
      }
    };

    const handlePayPress = async () => {
      if (isSubmittingOrder) return;
      try {
        await onCheckout(appliedCoupon?.code);
        Alert.alert("Choose Payment Result", "Select a payment outcome.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Payment Success",
            onPress: () => void handleSubmitOrder(),
          },
          {
            text: "Payment Rejected",
            style: "destructive",
            onPress: () =>
              Alert.alert("Payment Rejected", "Payment was rejected.", [
                { text: "OK" },
              ]),
          },
        ]);
      } catch (error) {
        Alert.alert(
          "Unable to Continue",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    };

    return (
        <View
          style={{ backgroundColor: theme.bg, paddingTop: insets.top, flex: 1 }}
        >
          {/* FIX: Emojis ONLY mount to screen while actively celebrating */}
          {isCelebrating && (
            <View
              style={{
                position: "absolute",
                top: height * 0.35,
                left: width * 0.45,
                zIndex: 9999,
              }}
              pointerEvents="none"
            >
              {Array.from({ length: 45 }).map((_, i) => (
                <CelebrationParticle
                  key={i}
                  index={i}
                  total={45}
                  progress={celebrationProgress}
                />
              ))}
            </View>
          )}

          <View
            style={{
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            }}
            className="flex-row items-center px-4 py-4 border-b z-10 shadow-sm"
          >
            <Pressable
              onPress={handleClose}
              className="mr-3 p-1"
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <ArrowLeft size={24} color={theme.text} />
            </Pressable>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setShowAddressModal(true);
              }}
              className="flex-1"
            >
              <Text
                style={{ color: theme.text }}
                className="text-lg font-black tracking-tight mb-1"
              >
                {restaurantName || "Restaurant"}
              </Text>
              <View
                className="flex-row items-center rounded-lg px-2.5 py-1.5 border self-start"
                style={{
                  backgroundColor: theme.isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#f3f4f6",
                  borderColor: theme.border,
                }}
              >
                <MapPin size={14} color={theme.primary} />
                <Text
                  style={{ color: theme.text }}
                  className="text-xs font-bold mx-1.5 max-w-[200px]"
                  numberOfLines={1}
                >
                  {isDelivery
                    ? `${currentAddress?.type} | ${currentAddress?.address}`
                    : `Pickup from ${currentAddress?.name || "Counter"}`}
                </Text>
                <ChevronDown size={14} color={theme.primary} />
              </View>
            </Pressable>
            {cart.length > 0 && (
              <Pressable
                onPress={handleClearCart}
                className="ml-2 p-2"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Clear cart"
              >
                <Trash2 size={20} color={theme.primary} />
              </Pressable>
            )}
          </View>

          <KeyboardAwareScrollView
            ref={cartScrollRef}
            enableOnAndroid={activeTab !== "Instructions"}
            enableResetScrollToCoords={false}
            extraScrollHeight={24}
            keyboardOpeningTime={350}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 150 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => void onRefresh()}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              ) : undefined
            }
          >
            {discount > 0 && (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                className="bg-emerald-100/80 px-4 py-2.5 flex-row items-center justify-center"
              >
                <Sparkles size={16} color="#059669" />
                <Text className="text-emerald-700 font-bold ml-2">
                  ₹{formatPrice(discount)} saved! On this order
                </Text>
              </Animated.View>
            )}

            <View className="p-4">
              <Animated.View
                layout={LinearTransition.duration(300)}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  display: isAndroidInstructionsDockVisible ? "none" : "flex",
                }}
                className="rounded-[24px] border p-4 mb-6 shadow-sm"
              >
                {cart.map((item: any, index: number) => {
                  const itemPriceNumber = getNumericPrice(item.price);
                  const customizationDetails = Array.isArray(
                    item.customizationDetails,
                  )
                    ? item.customizationDetails
                    : [];
                  const customizationPrice = customizationDetails.reduce(
                    (sum: number, option: any) =>
                      sum + (Number(option.price) || 0),
                    0,
                  );
                  const basePrice =
                    Number(item.basePrice) || itemPriceNumber;
                  const customizedUnitPrice =
                    customizationDetails.length > 0
                      ? Math.max(
                          itemPriceNumber,
                          basePrice + customizationPrice,
                        )
                      : itemPriceNumber;
                  const couponItemDiscount =
                    getAppliedCouponItemDiscount(item);
                  const displayUnitPrice = Math.max(
                    0,
                    customizedUnitPrice - couponItemDiscount / item.quantity,
                  );
                  const itemTotal = Math.max(
                    Number(item.total) || 0,
                    customizedUnitPrice * item.quantity,
                  );

                  return (
                    <View
                      key={`${item.id}-${index}`}
                      style={{
                        borderBottomWidth: index === cart.length - 1 ? 0 : 1,
                        borderBottomColor: theme.border,
                      }}
                      className="py-4 flex-row items-start justify-between"
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-start">
                          <View
                            style={{
                              borderColor: item.isVeg ? "#16A34A" : "#DC2626",
                            }}
                            className="p-[2px] border rounded mr-2 mt-1"
                          >
                            <View
                              style={{
                                backgroundColor: item.isVeg
                                  ? "#16A34A"
                                  : "#DC2626",
                              }}
                              className="w-1.5 h-1.5 rounded-full"
                            />
                          </View>
                          <View>
                            <Text
                              style={{ color: theme.text }}
                              className="text-base font-bold"
                            >
                              {item.name}
                            </Text>
                            <View className="mt-1 flex-row items-center gap-2">
                              <Text
                                style={{ color: theme.muted }}
                                className="text-xs font-semibold"
                              >
                                ₹{formatPrice(displayUnitPrice)}
                              </Text>
                              {couponItemDiscount > 0 ? (
                                <Text
                                  style={{
                                    color: theme.muted,
                                    textDecorationLine: "line-through",
                                  }}
                                  className="text-xs"
                                >
                                  ₹{formatPrice(itemPriceNumber)}
                                </Text>
                              ) : Number(item.compareAtPrice) > itemPriceNumber ? (
                                <Text
                                  style={{
                                    color: theme.muted,
                                    textDecorationLine: "line-through",
                                  }}
                                  className="text-xs"
                                >
                                  ₹{formatPrice(Number(item.compareAtPrice))}
                                </Text>
                              ) : null}
                            </View>
                            {item.addons?.length > 0 && (
                              <View>
                                <Pressable
                                  onPress={() =>
                                    setExpandedCustomizationItemId((current) =>
                                      current ===
                                      String(item.cartItemId || item.id)
                                        ? null
                                        : String(item.cartItemId || item.id),
                                    )
                                  }
                                  className="mt-1 self-start"
                                >
                                  <Text
                                    style={{ color: theme.muted }}
                                    className="text-xs"
                                  >
                                    Customized ·{" "}
                                    {expandedCustomizationItemId ===
                                    String(item.cartItemId || item.id)
                                      ? "Hide details"
                                      : "View details"}
                                  </Text>
                                </Pressable>
                                {expandedCustomizationItemId ===
                                  String(item.cartItemId || item.id) && (
                                  <Animated.View
                                    entering={FadeIn.duration(200)}
                                    exiting={FadeOut.duration(200)}
                                    className="mt-2 rounded-xl border p-3"
                                    style={{
                                      backgroundColor: theme.bg,
                                      borderColor: theme.border,
                                    }}
                                  >
                                    <Text
                                      className="mb-2 text-sm font-black"
                                      style={{ color: theme.text }}
                                    >
                                      Selected add-ons
                                    </Text>
                                    {customizationDetails.length > 0 ? (
                                      <>
                                        {customizationDetails.map(
                                          (option: any, optionIndex: number) => (
                                            <View
                                              key={`${option.groupName}-${option.name}-${optionIndex}`}
                                              className="mb-1 flex-row justify-between"
                                            >
                                              <Text
                                                className="flex-1 pr-2 text-xs font-semibold"
                                                style={{ color: theme.muted }}
                                              >
                                                {option.groupName
                                                  ? `${option.groupName}: `
                                                  : ""}
                                                {option.name}
                                              </Text>
                                              <Text
                                                className="text-xs font-bold"
                                                style={{ color: theme.text }}
                                              >
                                                +₹{formatPrice(option.price)}
                                              </Text>
                                            </View>
                                          ),
                                        )}
                                        <View
                                          className="mt-2 flex-row justify-between border-t pt-2"
                                          style={{ borderColor: theme.border }}
                                        >
                                          <Text
                                            className="text-xs font-bold"
                                            style={{ color: theme.muted }}
                                          >
                                            Add-ons total
                                          </Text>
                                          <Text
                                            className="text-xs font-black"
                                            style={{ color: theme.text }}
                                          >
                                            +₹{formatPrice(customizationPrice)}
                                          </Text>
                                        </View>
                                      </>
                                    ) : (
                                      <Text
                                        className="text-xs"
                                        style={{ color: theme.muted }}
                                      >
                                        Add-on details are unavailable.
                                      </Text>
                                    )}
                                  </Animated.View>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View className="items-end">
                        <View
                          style={{
                            backgroundColor: theme.isDark
                              ? "rgba(255,255,255,0.05)"
                              : "#f3f4f6",
                            borderColor: theme.border,
                          }}
                          className="flex-row items-center rounded-lg border"
                        >
                          <Pressable
                            onPress={() => handleRemoveCartItem(item)}
                            className="p-2"
                          >
                            <Minus
                              size={16}
                              color={theme.primary}
                              strokeWidth={3}
                            />
                          </Pressable>
                          <Text
                            style={{ color: theme.text }}
                            className="font-black px-2"
                          >
                            {item.quantity}
                          </Text>
                          <Pressable
                            onPress={() =>
                              onIncrement(
                                item,
                                1,
                                item.addons,
                                customizedUnitPrice,
                              )
                            }
                            className="p-2"
                          >
                            <Plus
                              size={16}
                              color={theme.primary}
                              strokeWidth={3}
                            />
                          </Pressable>
                        </View>
                        <Text
                          style={{ color: theme.text }}
                          className="text-sm font-black mt-2"
                        >
                          ₹{formatPrice(itemTotal - couponItemDiscount)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                <View
                  className="flex-row items-center justify-between mt-2 pt-4 border-t"
                  style={{ borderTopColor: theme.border }}
                >
                  <Pressable
                    onPress={handleClose}
                    className="flex-row items-center border rounded-xl py-2 px-4"
                    style={{ borderColor: theme.border }}
                  >
                    <Plus size={16} color={theme.text} />
                    <Text
                      style={{ color: theme.text }}
                      className="font-bold ml-2"
                    >
                      Add Items
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>

              {crossSellItems.length > 0 && (
                <>
                  <Text
                    style={{ color: theme.muted }}
                    className="text-xs font-black uppercase tracking-wider mb-3 ml-2"
                  >
                    Complete Your Meal
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-6"
                    style={{ flexGrow: 0 }}
                    contentContainerStyle={{ gap: 8 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {crossSellItems.map((cross: any) => {
                      const currentQty = cart
                        .filter((cartItem: any) => cartItem.id === cross.id)
                        .reduce(
                          (quantity: number, cartItem: any) =>
                            quantity + cartItem.quantity,
                          0,
                        );
                      const availableQuantity = Number(cross.availableQuantity);
                      const hasInventoryCount =
                        cross.availableQuantity !== null &&
                        cross.availableQuantity !== undefined &&
                        Number.isFinite(availableQuantity);
                      const canAddCrossSell =
                        cross.isAvailable === true &&
                        (!hasInventoryCount ||
                          currentQty < Math.floor(availableQuantity));

                      return (
                        <View
                          key={cross.id}
                          style={{
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                            width: crossSellCardWidth,
                          }}
                          className="rounded-[20px] border p-2"
                        >
                          <View className="relative">
                            {hasImageUri(cross.image) ? (
                              <Image
                                source={{ uri: cross.image }}
                                className="w-full h-24 rounded-2xl mb-2"
                                resizeMode="cover"
                              />
                            ) : null}

                            {currentQty > 0 && (
                              <View className="absolute top-2 right-2 bg-emerald-500 rounded-full px-1.5 py-0.5">
                                <Text className="text-[10px] font-black text-white">
                                  {currentQty}
                                </Text>
                              </View>
                            )}

                            <Pressable
                              disabled={!canAddCrossSell}
                              onPress={() =>
                                onIncrement(
                                  cross,
                                  1,
                                  [],
                                  getNumericPrice(cross.price),
                                )
                              }
                              className={`absolute -bottom-3 right-2 rounded-full p-1 shadow-sm border border-gray-100 ${canAddCrossSell ? "bg-white" : "bg-gray-200"}`}
                            >
                              {canAddCrossSell ? (
                                <Plus
                                  size={20}
                                  color={theme.primary}
                                  strokeWidth={3}
                                />
                              ) : currentQty > 0 ? (
                                <CheckCircle2
                                  size={20}
                                  color={theme.muted}
                                  strokeWidth={3}
                                />
                              ) : (
                                <X
                                  size={20}
                                  color={theme.danger}
                                  strokeWidth={3}
                                />
                              )}
                            </Pressable>
                          </View>
                          <View className="p-1 pt-2">
                            <View
                              style={{
                                borderColor: cross.isVeg ? "#16A34A" : "#DC2626",
                              }}
                              className="p-[2px] border rounded self-start mb-1"
                            >
                              <View
                                style={{
                                  backgroundColor: cross.isVeg
                                    ? "#16A34A"
                                    : "#DC2626",
                                }}
                                className="w-1 h-1 rounded-full"
                              />
                            </View>
                            <Text
                              style={{ color: theme.text }}
                              className="text-xs font-bold leading-tight"
                              numberOfLines={2}
                            >
                              {cross.name}
                            </Text>
                            {!canAddCrossSell && (
                              <Text
                                style={{ color: theme.danger }}
                                className="mt-1 text-[10px] font-black uppercase"
                              >
                                Out of stock
                              </Text>
                            )}
                            <View className="mt-1 flex-row flex-wrap items-center gap-1">
                              <Text
                                style={{ color: theme.muted }}
                                className="text-xs font-semibold"
                              >
                                {cross.price}
                              </Text>
                              {Number(cross.compareAtPrice) >
                                getNumericPrice(cross.price) && (
                                <Text
                                  style={{
                                    color: theme.muted,
                                    textDecorationLine: "line-through",
                                  }}
                                  className="text-[10px]"
                                >
                                  ₹{formatPrice(Number(cross.compareAtPrice))}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text
                style={{ color: theme.muted }}
                className="text-xs font-black uppercase tracking-wider mb-3 ml-2"
              >
                Savings Corner
              </Text>

              <Animated.View
                layout={LinearTransition.duration(300)}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                className="rounded-[24px] border p-4 mb-6 shadow-sm"
              >
                {appliedCoupon ? (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                    className="flex-row items-center justify-between p-3 border rounded-2xl"
                    style={{
                      borderColor: theme.primary,
                      backgroundColor: theme.isDark
                        ? "rgba(22, 163, 74, 0.1)"
                        : "#f0fdf4",
                    }}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-11 h-11 rounded-2xl items-center justify-center mr-4"
                        style={{
                          backgroundColor: theme.isDark
                            ? "rgba(34,197,94,0.14)"
                            : "#dcfce7",
                        }}
                      >
                        <Tag size={21} color={theme.primary} />
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ color: theme.text }}
                          className="font-bold text-base tracking-wide"
                        >
                          {appliedCoupon.code}
                        </Text>
                        <Text
                          style={{ color: theme.primary }}
                          className="font-semibold text-[11px] mt-0.5 tracking-wide"
                        >
                          {appliedCoupon.description}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={handleRemoveCoupon}
                      className="ml-2 bg-white rounded-full p-2 shadow-sm border border-gray-100"
                    >
                      <X size={16} color={theme.muted} />
                    </Pressable>
                  </Animated.View>
                ) : (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                  >
                    <View
                      className="flex-row items-center border rounded-xl px-3 h-12 mb-2"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bg,
                      }}
                    >
                      <View className="flex-1 min-w-0 justify-center h-full">
                        <TextInput
                          placeholder="Enter coupon code"
                          placeholderTextColor={theme.muted}
                          value={couponInput}
                          onChangeText={(val) => {
                            setCouponInput(
                              val.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
                            );
                            setCouponError("");
                          }}
                          onSubmitEditing={() =>
                            validateAndApplyCoupon(couponInput)
                          }
                          className="flex-1 h-full"
                          style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: "bold",
                            letterSpacing: 2,
                            flex: 1,
                            minWidth: 0,
                            paddingVertical: 0,
                            margin: 0,
                            includeFontPadding: false,
                            textAlignVertical: "center",
                          }}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                      </View>
                      <Pressable
                        onPress={() => validateAndApplyCoupon(couponInput)}
                        style={{
                          width: 72,
                          flexShrink: 0,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{ color: theme.primary }}
                          numberOfLines={1}
                          className="font-black tracking-wider uppercase text-xs"
                        >
                          Apply
                        </Text>
                      </Pressable>
                    </View>

                    {couponError ? (
                      <Text className="text-red-500 font-bold text-xs ml-1 mb-2">
                        {couponError}
                      </Text>
                    ) : null}

                    {eligibleOffers.map((coupon: any, idx: number) => {
                      return (
                        <View
                          key={coupon.code}
                          style={{
                            borderBottomWidth:
                              idx === eligibleOffers.length - 1 ? 0 : 1,
                            borderBottomColor: theme.border,
                          }}
                          className="py-4 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1 pr-4">
                            <View
                              className="w-11 h-11 rounded-2xl items-center justify-center mr-4"
                              style={{
                                backgroundColor: theme.isDark
                                  ? "rgba(34,197,94,0.14)"
                                  : "#dcfce7",
                              }}
                            >
                              <Tag size={20} color={theme.primary} />
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{ color: theme.text }}
                                className="font-bold text-[15px] tracking-wide"
                              >
                                {coupon.code}
                              </Text>
                              <Text
                                style={{ color: theme.muted }}
                                className="text-xs font-semibold mt-1"
                              >
                                {coupon.description}
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => validateAndApplyCoupon(coupon.code)}
                          >
                            <Text
                              style={{ color: theme.primary }}
                              className="font-bold text-xs uppercase p-3 -mr-3"
                            >
                              Apply
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                    {eligibleOffers.length === 0 && (
                      <View
                        style={{
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                        }}
                        className="mt-2 rounded-2xl border px-4 py-5 items-center"
                      >
                        <View
                          style={{
                            backgroundColor: theme.isDark
                              ? "rgba(22, 163, 74, 0.12)"
                              : "#f0fdf4",
                          }}
                          className="w-11 h-11 rounded-full items-center justify-center mb-3"
                        >
                          <Tag size={21} color={theme.primary} />
                        </View>
                        <Text
                          style={{ color: theme.text }}
                          className="text-sm font-bold text-center"
                        >
                          No offers for these items yet
                        </Text>
                        <Text
                          style={{ color: theme.muted }}
                          className="text-xs font-medium text-center mt-1 leading-5"
                        >
                          Add eligible items or check back later for savings.
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                )}
              </Animated.View>

              <Animated.View
                layout={LinearTransition.duration(300)}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                className="rounded-[24px] border overflow-hidden mb-6 shadow-sm"
              >
                <View
                  style={{
                    backgroundColor: theme.bg,
                    borderBottomColor: theme.border,
                  }}
                  className="px-3 py-3 border-b flex-row items-center justify-between"
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <Pressable
                        key={tab}
                        onPress={() => {
                          Keyboard.dismiss();
                          setActiveTab(tab);
                        }}
                        style={{
                          backgroundColor: isActive
                            ? theme.text
                            : "transparent",
                        }}
                        className="px-4 py-2 rounded-full"
                      >
                        <Text
                          style={{
                            color: isActive ? theme.bg : theme.muted,
                          }}
                          className="font-black text-xs uppercase tracking-wider"
                        >
                          {tab}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {activeTab === "Delivery" && isDelivery && (
                  <View>
                    {deliveryOptions.length === 0 ? (
                      <Text
                        style={{ color: theme.muted }}
                        className="p-4 text-sm"
                      >
                        Delivery options are not available for this branch.
                      </Text>
                    ) : (
                      deliveryOptions.map((opt: any, index: number) => {
                      const isSelected = selectedOption?.id === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => onSelectDeliveryOption(opt.speed)}
                          style={{
                            borderBottomWidth:
                              index === deliveryOptions.length - 1 ? 0 : 1,
                            borderBottomColor: theme.border,
                          }}
                          className="p-4 flex-row items-center"
                        >
                          {isSelected ? (
                            <CheckCircle2 size={24} color={theme.primary} />
                          ) : (
                            <Circle size={24} color={theme.muted} />
                          )}
                          <View className="ml-3 flex-1 min-w-0">
                            <View className="flex-row flex-wrap items-center">
                              <Text
                                style={{
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                }}
                                className="font-bold text-base"
                                numberOfLines={1}
                              >
                                {opt.title}
                              </Text>
                              {opt.price > 0 && (
                                <Text
                                  style={{ color: theme.text }}
                                  className="font-semibold text-xs ml-2"
                                >
                                  | Pay ₹{formatPrice(opt.price)} extra
                                </Text>
                              )}
                              {opt.price < 0 && (
                                <Text
                                  style={{ color: theme.primary }}
                                  className="font-semibold text-xs ml-2"
                                >
                                  | Save ₹{formatPrice(Math.abs(opt.price))}
                                </Text>
                              )}
                            </View>
                            <View className="flex-row items-center justify-between mt-1">
                              <Text
                                style={{ color: theme.muted }}
                                className="text-xs font-medium flex-1 mr-2"
                                numberOfLines={2}
                              >
                                {opt.subtitle}
                              </Text>
                              <Text
                                style={{
                                  color: isSelected ? theme.primary : theme.text,
                                }}
                                className="text-xs font-bold shrink-0"
                              >
                                {opt.time}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                     })
                    )}
                  </View>
                )}

                {activeTab === "Tip" && isDelivery && (
                  <View className="p-5">
                    <Text
                      style={{ color: theme.text }}
                      className="font-bold mb-3"
                    >
                      Support your delivery partner
                    </Text>

                    {isCustomTip ? (
                      <Animated.View
                        entering={FadeIn.duration(200)}
                        className="flex-row justify-end w-full"
                      >
                        <View
                          className="flex-row items-center border rounded-xl px-3 h-12 flex-1"
                          style={{
                            borderColor: theme.primary,
                            backgroundColor: theme.bg,
                          }}
                        >
                          <Text
                            style={{ color: theme.text }}
                            className="font-bold text-lg mr-2"
                          >
                            ₹
                          </Text>

                          <View className="flex-1 justify-center h-full">
                            <TextInput
                              autoFocus
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor={theme.muted}
                              value={customTipInput}
                              onSubmitEditing={() => {
                                Keyboard.dismiss();
                                const val = Number(customTipInput) || 0;
                                setTipAmount(val);
                                setIsCustomTip(false);
                              }}
                              onChangeText={(val) => {
                                const cleaned = val.replace(/[^0-9]/g, "");
                                setCustomTipInput(cleaned);
                                setTipAmount(Number(cleaned) || 0);
                              }}
                              className="flex-1 h-full"
                              style={{
                                color: theme.text,
                                fontSize: 18,
                                fontWeight: "bold",
                                paddingVertical: 0,
                                margin: 0,
                                includeFontPadding: false,
                                textAlignVertical: "center",
                              }}
                            />
                          </View>
                        </View>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            const val = Number(customTipInput) || 0;
                            setTipAmount(val);
                            setIsCustomTip(false);
                          }}
                          className="bg-emerald-500 rounded-xl h-12 w-12 items-center justify-center ml-2"
                        >
                          <CheckCircle2 size={24} color="#fff" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Keyboard.dismiss();
                            setIsCustomTip(false);
                            setCustomTipInput("");
                            setTipAmount(0);
                          }}
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.bg,
                          }}
                          className="border rounded-xl h-12 w-12 items-center justify-center ml-2"
                        >
                          <X size={24} color={theme.text} />
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <Animated.View
                        entering={FadeIn.duration(200)}
                        className="flex-row items-center justify-between"
                      >
                        {TIP_OPTIONS.map((amt) => {
                          const isSelected = tipAmount === amt;
                          return (
                            <Pressable
                              key={amt}
                              onPress={() => setTipAmount(isSelected ? 0 : amt)}
                              style={{
                                borderColor: isSelected
                                  ? theme.primary
                                  : theme.border,
                                backgroundColor: isSelected
                                  ? theme.isDark
                                    ? "rgba(22, 163, 74, 0.1)"
                                    : "#f0fdf4"
                                  : theme.bg,
                              }}
                              className="flex-1 mr-2 border rounded-xl py-3 items-center"
                            >
                              <Text
                                style={{
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                }}
                                className="font-bold"
                              >
                                ₹{amt}
                              </Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          onPress={() => {
                            setIsCustomTip(true);
                            setCustomTipInput(
                              tipAmount > 0 && !TIP_OPTIONS.includes(tipAmount)
                                ? String(tipAmount)
                                : "",
                            );
                          }}
                          style={{
                            borderColor:
                              !TIP_OPTIONS.includes(tipAmount) && tipAmount > 0
                                ? theme.primary
                                : theme.border,
                            backgroundColor:
                              !TIP_OPTIONS.includes(tipAmount) && tipAmount > 0
                                ? theme.isDark
                                  ? "rgba(22, 163, 74, 0.1)"
                                  : "#f0fdf4"
                                : theme.bg,
                          }}
                          className="flex-1 border rounded-xl py-3 items-center"
                        >
                          <Text
                            style={{
                              color:
                                !TIP_OPTIONS.includes(tipAmount) &&
                                tipAmount > 0
                                  ? theme.primary
                                  : theme.text,
                            }}
                            className="font-bold"
                          >
                            {!TIP_OPTIONS.includes(tipAmount) && tipAmount > 0
                              ? `₹${tipAmount}`
                              : "Custom"}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    )}
                  </View>
                )}

                {activeTab === "Instructions" && (
                  renderInstructionEditor()
                )}
              </Animated.View>

              {/* AUTHENTIC BILL DETAILS REPLICA */}
              <Animated.View
                layout={LinearTransition.duration(300)}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  zIndex: 10,
                }}
                className="rounded-[24px] border p-5 shadow-sm mb-4"
              >
                {/* Header Row (Accordion Toggle) */}
                <Pressable
                  onPress={() => setIsBillExpanded(!isBillExpanded)}
                  className="flex-row items-center mb-2"
                >
                  <View
                    className="flex-1 flex-row items-center"
                    style={{ minWidth: 0 }}
                  >
                    <View className="bg-emerald-500 p-1.5 rounded-md mr-2 flex-shrink-0">
                      <Receipt size={16} color="white" />
                    </View>
                    <Text
                      style={{ color: theme.text, flexShrink: 0 }}
                      className="font-black text-lg mr-1"
                      numberOfLines={1}
                    >
                      To Pay
                    </Text>
                    {totalSavings > 0 && (
                      <Text
                        style={{ color: theme.muted, flexShrink: 1 }}
                        className="font-bold text-sm line-through ml-2"
                        numberOfLines={1}
                      >
                        ₹{formatPrice(originalPayable)}
                      </Text>
                    )}
                    <Text
                      style={{ color: theme.text, flexShrink: 1, minWidth: 0 }}
                      className="font-black text-lg ml-1"
                      numberOfLines={1}
                    >
                      ₹{formatPrice(finalPayable)}
                    </Text>
                  </View>
                  <View className="ml-2">
                    {isBillExpanded ? (
                      <ChevronUp size={20} color={theme.text} />
                    ) : (
                      <ChevronDown size={20} color={theme.text} />
                    )}
                  </View>
                </Pressable>

                {/* Savings Banner */}
                {totalSavings > 0 && (
                  <Text className="text-emerald-600 font-bold text-[13px] ml-10 mb-4">
                    ₹{formatPrice(totalSavings)} saved on the total!
                  </Text>
                )}

                {/* Displayed directly below Header when Collapsed */}
                {!isBillExpanded && isFreeDeliveryEligible && isDelivery && (
                  <View
                    className="bg-gray-100 rounded-xl px-4 py-2.5 mb-2 mt-2 relative"
                    style={{
                      backgroundColor: theme.isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#f3f4f6",
                    }}
                  >
                    <View
                      className="absolute -top-1.5 left-8 w-3 h-3 rotate-45"
                      style={{
                        backgroundColor: theme.isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#f3f4f6",
                      }}
                    />
                    <Text
                      style={{ color: theme.muted }}
                      className="font-semibold text-[13px]"
                    >
                      FREE Delivery on your order!
                    </Text>
                  </View>
                )}

                {/* Displayed directly below Header when Collapsed */}
                {!isBillExpanded && !isFreeDeliveryEligible && isDelivery && (
                  <View className="mb-2 mt-2 px-1">
                    <Text
                      style={{ color: theme.primary }}
                      className="font-semibold text-[13px]"
                    >
                      Add ₹{formatPrice(99 - itemTotal)} more to get FREE
                      Delivery!
                    </Text>
                  </View>
                )}

                {isBillExpanded && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                  >
                    <View
                      className="border-t mb-4 mt-2"
                      style={{ borderTopColor: theme.border, opacity: 0.6 }}
                    />

                    {/* Item Total */}
                    <View className="flex-row justify-between mb-4">
                      <Text
                        style={{ color: theme.muted }}
                        className="font-semibold text-[14px]"
                      >
                        Item Total
                      </Text>
                      <View className="flex-row">
                        {discount > 0 && (
                          <Text
                            style={{ color: theme.muted }}
                            className="font-semibold line-through mr-2"
                          >
                            ₹{formatPrice(originalItemTotal)}
                          </Text>
                        )}
                        <Text
                          style={{ color: theme.text }}
                          className="font-semibold"
                        >
                          ₹{formatPrice(itemTotal)}
                        </Text>
                      </View>
                    </View>

                    {/* Delivery Fee Clickable Hover Row (Only Delivery) */}
                    {isDelivery && (
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
                              <View className="flex-row justify-between items-center mb-2">
                                <Text
                                  style={{ color: theme.muted }}
                                  className="font-semibold text-[13px]"
                                >
                                  Base delivery fee
                                </Text>
                                <View className="flex-row items-center">
                                  {isFreeDelivery && (
                                    <Text
                                      style={{ color: theme.muted }}
                                      className="font-semibold line-through mr-2 text-[13px]"
                                    >
                                      ₹{formatPrice(baseDeliveryFee)}
                                    </Text>
                                  )}
                                  <Text
                                    className={
                                      isFreeDelivery
                                        ? "text-emerald-600 font-bold text-[13px]"
                                        : "font-bold text-[13px]"
                                    }
                                    style={
                                      !isFreeDelivery
                                        ? { color: theme.text }
                                        : {}
                                    }
                                  >
                                    {isFreeDelivery
                                      ? "FREE"
                                      : `₹${formatPrice(actualDeliveryFee)}`}
                                  </Text>
                                </View>
                              </View>
                              {selectedOption && (
                                <View className="flex-row justify-between items-center">
                                  <Text
                                    style={{ color: theme.muted }}
                                    className="font-semibold text-[13px] flex-1 mr-3"
                                    numberOfLines={1}
                                  >
                                    {selectedOption.title}
                                  </Text>
                                  <Text
                                    style={{ color: theme.text }}
                                    className="font-bold text-[13px]"
                                  >
                                    {optionPrice < 0
                                      ? `Save ₹${formatPrice(deliveryOptionDiscount)}`
                                      : `₹${formatPrice(deliveryOptionCharge)}`}
                                  </Text>
                                </View>
                              )}
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
                                {activeBranch?.distanceKm
                                  ? ` | ${activeBranch.distanceKm} km`
                                  : ""}
                              </Text>
                            </View>

                            <View className="flex-row">
                              {isFreeDeliveryEligible && (
                                <Text
                                  style={{ color: theme.muted }}
                                  className="font-semibold line-through mr-2"
                                >
                                  ₹{formatPrice(baseDeliveryFee)}
                                </Text>
                              )}
                              <Text
                                className={
                                  isFreeDelivery
                                    ? "text-emerald-600 font-bold"
                                    : "font-semibold"
                                }
                                style={
                                  !isFreeDelivery ? { color: theme.text } : {}
                                }
                              >
                                {isFreeDelivery
                                  ? "FREE"
                                  : `₹${formatPrice(actualDeliveryFee)}`}
                              </Text>
                            </View>
                          </View>
                          {isFreeDeliveryEligible ? (
                            <Text
                              style={{ color: theme.muted }}
                              className="font-semibold text-[12px] mt-0.5"
                            >
                              FREE Delivery on your order!
                            </Text>
                          ) : (
                            <Text
                              style={{ color: theme.primary }}
                              className="font-semibold text-[12px] mt-0.5"
                            >
                              Add ₹{formatPrice(99 - itemTotal)} more to get
                              FREE Delivery!
                            </Text>
                          )}
                        </Pressable>
                        {selectedOption && optionPrice > 0 && (
                          <View className="flex-row justify-between mb-4">
                            <Text
                              style={{ color: theme.muted }}
                              className="font-semibold text-[14px] flex-1 mr-3"
                              numberOfLines={1}
                            >
                              {selectedOption.title}
                            </Text>
                            <Text
                              style={{ color: theme.text }}
                              className="font-semibold"
                            >
                              ₹{formatPrice(deliveryOptionCharge)}
                            </Text>
                          </View>
                        )}
                        {selectedOption && optionPrice < 0 && (
                          <View className="flex-row justify-between mb-4">
                            <Text
                              style={{ color: theme.muted }}
                              className="font-semibold text-[14px] flex-1 mr-3"
                              numberOfLines={1}
                            >
                              {selectedOption.title} discount
                            </Text>
                            <Text
                              style={{ color: theme.primary }}
                              className="font-semibold"
                            >
                              −₹{formatPrice(deliveryOptionDiscount)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Extra Discount */}
                    {discount > 0 && (
                      <View className="flex-row justify-between mb-4">
                        <Text
                          style={{ color: theme.muted }}
                          className="font-semibold text-[14px]"
                        >
                          Extra discount for you
                        </Text>
                        <Text className="text-emerald-600 font-bold">
                          -₹{formatPrice(discount)}
                        </Text>
                      </View>
                    )}

                    {/* Dynamic Delivery Tip (Only Delivery) */}
                    {isDelivery && (
                      <View className="mb-4 mt-2">
                        <View className="flex-row justify-between items-center">
                          <Text
                            style={{ color: theme.muted }}
                            className="font-semibold text-[14px]"
                          >
                            Delivery Tip
                          </Text>
                          {tipAmount > 0 ? (
                            <View className="flex-row items-center">
                              <Text
                                style={{ color: theme.text }}
                                className="font-semibold mr-3"
                              >
                                ₹{formatPrice(tipAmount)}
                              </Text>
                              <Pressable
                                onPress={() => {
                                  setTipAmount(0);
                                  setCustomTipInput("");
                                  setIsCustomTip(false);
                                }}
                              >
                                <Text className="text-red-500 font-bold text-[13px]">
                                  Remove
                                </Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => setShowInlineTip(!showInlineTip)}
                            >
                              <Text className="text-orange-600 font-bold text-[14px]">
                                Add tip
                              </Text>
                            </Pressable>
                          )}
                        </View>

                        {showInlineTip && tipAmount === 0 && (
                          <Animated.View
                            entering={FadeIn.duration(200)}
                            className="flex-row items-center justify-between mt-3"
                          >
                            {TIP_OPTIONS.map((amt, idx) => (
                              <Pressable
                                key={amt}
                                onPress={() => {
                                  setTipAmount(amt);
                                  setShowInlineTip(false);
                                }}
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.bg,
                                }}
                                className={`flex-1 border rounded-xl py-2 items-center ${
                                  idx < TIP_OPTIONS.length - 1 ? "mr-2" : ""
                                }`}
                              >
                                <Text
                                  style={{ color: theme.text }}
                                  className="font-bold"
                                >
                                  ₹{amt}
                                </Text>
                              </Pressable>
                            ))}
                          </Animated.View>
                        )}
                      </View>
                    )}

                    {/* GST & Other Charges Clickable Hover Row */}
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

                            {packagingCharge > 0 && (
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
                                  ₹{formatPrice(packagingCharge)}
                                </Text>
                              </View>
                            )}

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
                                ₹{formatPrice(platformFee)}
                              </Text>
                            </View>
                            <Text
                              style={{ color: theme.muted, opacity: 0.7 }}
                              className="text-[11px] mb-4 leading-4 pr-10"
                            >
                              Inclusive of GST. This fee helps us operate and
                              maintain platform
                            </Text>

                            <View className="flex-row justify-between mb-1">
                              <Text
                                style={{ color: theme.muted }}
                                className="text-[13px] font-semibold"
                              >
                                Restaurant GST
                              </Text>
                              <Text
                                style={{ color: theme.text }}
                                className="text-[13px] font-bold"
                              >
                                ₹{formatPrice(gstAmount)}
                              </Text>
                            </View>
                            <Text
                              style={{ color: theme.muted, opacity: 0.7 }}
                              className="text-[11px] leading-4 pr-10"
                            >
                              App plays no role in govt. or restaurant related
                              taxes & charges
                            </Text>
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
                            activePopover === "gst" ? null : "gst",
                          )
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
                        <Text
                          style={{ color: theme.text }}
                          className="font-semibold"
                        >
                          ₹{formatPrice(totalTaxesAndCharges)}
                        </Text>
                      </Pressable>
                    </View>

                    <View
                      className="border-t mb-4 mt-2"
                      style={{
                        borderTopColor: theme.border,
                        borderStyle: "dashed",
                      }}
                    />

                    <View className="flex-row justify-between items-center">
                      <Text
                        style={{ color: theme.text, flexShrink: 0 }}
                        className="font-black text-lg"
                        numberOfLines={1}
                      >
                        To Pay
                      </Text>
                      <Text
                        style={{ color: theme.text, flexShrink: 0 }}
                        className="font-black text-lg"
                        numberOfLines={1}
                      >
                        ₹{formatPrice(finalPayable)}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </Animated.View>

              {/* Cancellation policy outside the bill details */}
              <View className="px-2">
                <Text
                  className="font-bold text-[13px] mb-1"
                  style={{ color: theme.muted }}
                >
                  Cancellation policy:
                </Text>
                <Text
                  className="text-[13px] leading-5"
                  style={{ color: theme.muted, opacity: 0.8 }}
                >
                  Please double-check your order and details. Orders are
                  non-refundable once placed.
                </Text>
              </View>
            </View>
          </KeyboardAwareScrollView>

          {isAndroidInstructionsDockVisible && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderTopWidth: 1,
                zIndex: 20,
                elevation: 20,
              }}
              className="rounded-t-[24px] overflow-hidden"
            >
              <View
                style={{
                  backgroundColor: theme.bg,
                  borderBottomColor: theme.border,
                }}
                className="px-3 py-3 border-b flex-row items-center justify-between"
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => {
                        Keyboard.dismiss();
                        setActiveTab(tab);
                      }}
                      style={{
                        backgroundColor: isActive
                          ? theme.text
                          : "transparent",
                      }}
                      className="px-4 py-2 rounded-full"
                    >
                      <Text
                        style={{
                          color: isActive ? theme.bg : theme.muted,
                        }}
                        className="font-black text-xs uppercase tracking-wider"
                      >
                        {tab}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {renderInstructionEditor()}
            </View>
          )}

          {!isKeyboardVisible && (
            <View
              style={{
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
              }}
              className="absolute bottom-0 inset-x-0 px-4 pt-3 border-t flex-row items-center shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <View className="flex-1 min-w-0 mr-3">
                <Text
                  style={{ color: theme.muted }}
                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                >
                  Pay Using
                </Text>
                <View className="flex-row items-center">
                  <View className="bg-blue-100 px-1.5 py-0.5 rounded mr-2">
                    <Text className="text-blue-800 text-[10px] font-black italic">
                      VISA
                    </Text>
                  </View>
                  <Text style={{ color: theme.text }} className="font-black">
                    Credit card •• 6495
                  </Text>
                  <ChevronDown
                    size={16}
                    color={theme.text}
                    className="ml-1"
                  />
                </View>
              </View>
              <Pressable
                onPress={() => void handlePayPress()}
                disabled={isSubmittingOrder}
                style={{ backgroundColor: theme.primary }}
                className={`shrink-0 ml-2 px-4 py-3.5 rounded-2xl ${isSubmittingOrder ? "opacity-60" : ""}`}
              >
                <Text
                  className="text-white font-black text-base"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {isSubmittingOrder
                    ? "Processing..."
                    : `Pay ₹${formatPrice(finalPayable)}`}
                </Text>
              </Pressable>
            </View>
          )}

          <Modal
            visible={showAddressModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAddressModal(false)}
          >
            <View
              className="absolute inset-0 justify-end bg-black/60"
              style={{ zIndex: 99999, elevation: 99999 }}
            >
              <Pressable
                className="flex-1"
                onPress={() => setShowAddressModal(false)}
              />
              <View
                className="rounded-t-[32px] p-6 pb-12"
                style={{ backgroundColor: theme.bg, maxHeight: "80%" }}
              >
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    className="text-xl font-black tracking-tight"
                    style={{ color: theme.text }}
                  >
                    {isDelivery ? "Choose Delivery Address" : "Choose Branch"}
                  </Text>
                  <Pressable
                    onPress={() => setShowAddressModal(false)}
                    className="p-2"
                  >
                    <X size={24} color={theme.text} />
                  </Pressable>
                </View>
                <View>
                  {((isDelivery ? addresses : branches) as any[]).map(
                    (item: any) => {
                      const isActive = currentAddress?.id === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            setCurrentAddress(item);
                            if (setActiveAddress) setActiveAddress(item);
                            setShowAddressModal(false);
                          }}
                          className="flex-row items-center p-4 mb-3 rounded-2xl border"
                          style={{
                            backgroundColor: theme.card,
                            borderColor: isActive
                              ? theme.primary
                              : theme.border,
                          }}
                        >
                          <MapPin
                            size={24}
                            color={isActive ? theme.primary : theme.muted}
                          />
                          <View className="ml-4 flex-1">
                            <Text
                              className="text-base font-bold"
                              style={{ color: theme.text }}
                            >
                              {isDelivery ? item.type : item.name}
                            </Text>
                            <Text
                              className="text-sm font-semibold mt-1"
                              style={{ color: theme.muted }}
                            >
                              {item.address}
                            </Text>
                          </View>
                          {isActive && (
                            <CheckCircle2 size={24} color={theme.primary} />
                          )}
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>
            </View>
          </Modal>
        </View>
    );
  },
);
