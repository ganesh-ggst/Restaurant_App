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
  Ticket,
  X,
} from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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
  AVAILABLE_COUPONS,
  CROSS_SELL_ITEMS,
  DELIVERY_OPTIONS,
  MOCK_ADDRESSES,
  RESTAURANT_NAME,
  TAX_DETAILS,
  TIP_OPTIONS,
} from "../../constants/mockData";

const { height, width } = Dimensions.get("window");

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

  const emojis = ["🎉", "🌸", "⭐", "🎊", "💸", "🎈", "🎀"];
  return (
    <Animated.View
      style={[{ position: "absolute", zIndex: 9999 }, animatedStyle]}
    >
      <Text style={{ fontSize: 32 }}>{emojis[index % emojis.length]}</Text>
    </Animated.View>
  );
};

export const DeliveryCartModal = memo(
  ({
    visible,
    onClose,
    cart,
    onIncrement,
    onDecrement,
    theme,
    insets,
    activeAddress,
  }: any) => {
    // Address State
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [currentAddress, setCurrentAddress] = useState(
      activeAddress || MOCK_ADDRESSES[0],
    );

    useEffect(() => {
      if (activeAddress) setCurrentAddress(activeAddress);
    }, [activeAddress]);

    const [activeTab, setActiveTab] = useState("Delivery");
    const [selectedDelivery, setSelectedDelivery] = useState(
      DELIVERY_OPTIONS[1].id,
    );

    const [tipAmount, setTipAmount] = useState(0);
    const [isCustomTip, setIsCustomTip] = useState(false);
    const [customTipInput, setCustomTipInput] = useState("");

    const [instructions, setInstructions] = useState("");
    const [instructionStatus, setInstructionStatus] = useState("");

    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponInput, setCouponInput] = useState("");
    const [couponError, setCouponError] = useState("");

    // BILL DETAILS STATES - Default to closed
    const [isBillExpanded, setIsBillExpanded] = useState(false);
    const [showInlineTip, setShowInlineTip] = useState(false);
    const [activePopover, setActivePopover] = useState<
      "delivery" | "gst" | null
    >(null);

    const celebrationProgress = useSharedValue(0);

    // Reset accordion to closed when modal opens
    useEffect(() => {
      if (visible) {
        setIsBillExpanded(false);
      }
    }, [visible]);

    // RESET STATE IF CART EMPTIES
    useEffect(() => {
      if (!cart || cart.length === 0) {
        setTipAmount(0);
        setCustomTipInput("");
        setIsCustomTip(false);
        setIsBillExpanded(false); // Reset dropdown to closed
        setSelectedDelivery(DELIVERY_OPTIONS[1].id); // Reset delivery to Standard
      }
    }, [cart]);

    if (!visible) return null;

    // Helper to format exact prices and preserve paise decimals without forcing .00 on integers
    const formatPrice = (price: number) =>
      Number.isInteger(price) ? price : price.toFixed(2);

    // --- SAFE CLOSE HANDLER TO PREVENT DISTURBANCES ---
    const handleClose = () => {
      Keyboard.dismiss();
      setActivePopover(null);
      setShowAddressModal(false);
      onClose();
    };

    // --- SMART BILLING MATHEMATICS ---
    const cartTotal = cart.reduce(
      (sum: number, item: any) => sum + item.total,
      0,
    );
    const originalItemTotal = cartTotal + Math.floor(cartTotal * 0.2);

    // ₹99 FREE DELIVERY & SELECTED DELIVERY OPTION LOGIC
    const isFreeDeliveryEligible = cartTotal >= 99;
    const baseDeliveryFee = TAX_DETAILS.baseDeliveryFee;
    const standardFee = isFreeDeliveryEligible ? 0 : baseDeliveryFee;

    const selectedOption = DELIVERY_OPTIONS.find(
      (o) => o.id === selectedDelivery,
    );
    const optionPrice = selectedOption ? selectedOption.price : 0;

    // Calculate actual delivery fee taking into account base delivery fee and option offset
    const actualDeliveryFee = Math.max(0, standardFee + optionPrice);
    const isFreeDelivery = actualDeliveryFee === 0;

    // Eco discount applied when order was already eligible for free delivery
    const ecoDiscount =
      isFreeDeliveryEligible && optionPrice < 0 ? Math.abs(optionPrice) : 0;
    const discount = (appliedCoupon ? appliedCoupon.discount : 0) + ecoDiscount;

    // Backend simulated GST and Fees
    const packagingCharge = TAX_DETAILS.packagingCharge;
    const platformFee = TAX_DETAILS.platformFee;
    const gstAmount = cartTotal * TAX_DETAILS.gstRate;
    const totalTaxesAndCharges = packagingCharge + platformFee + gstAmount;

    // Final calculations
    const finalPayable =
      cartTotal +
      actualDeliveryFee +
      totalTaxesAndCharges +
      tipAmount -
      discount;

    const totalSavings =
      originalItemTotal -
      cartTotal +
      discount +
      (isFreeDeliveryEligible ? baseDeliveryFee : 0) +
      (!isFreeDeliveryEligible && optionPrice < 0 ? Math.abs(optionPrice) : 0);

    const originalPayable = finalPayable + totalSavings;

    const triggerCelebration = () => {
      celebrationProgress.value = withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0, { duration: 0 }),
      );
    };

    const handleApplyCoupon = (coupon: any) => {
      setAppliedCoupon(coupon);
      setCouponInput("");
      setCouponError("");
      triggerCelebration();
    };

    const validateAndApplyCoupon = (codeToApply: string) => {
      Keyboard.dismiss();
      const code = codeToApply.trim().toUpperCase();
      if (!code) {
        setCouponError("Please enter a coupon code");
        return;
      }

      const existingCoupon = AVAILABLE_COUPONS.find((c) => c.code === code);

      if (existingCoupon) {
        handleApplyCoupon(existingCoupon);
      } else {
        setCouponError(`'${code}' is not a valid coupon code.`);
      }
    };

    const handleRemoveCoupon = () => {
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponError("");
    };

    const getNumericPrice = (priceString: string) =>
      parseInt(priceString.replace(/\D/g, ""), 10);

    const handleSaveInstructions = () => {
      Keyboard.dismiss();
      setInstructionStatus("Instructions saved securely!");
      setTimeout(() => setInstructionStatus(""), 3000);
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View
          style={{ backgroundColor: theme.bg, paddingTop: insets.top, flex: 1 }}
        >
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

          <View
            style={{
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            }}
            className="flex-row items-center px-4 py-4 border-b z-10 shadow-sm"
          >
            {/* Added hitSlop to ensure taps slightly off-center still close the modal and don't trigger the address selector */}
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
              className="flex-1 mr-2"
            >
              <Text
                style={{ color: theme.text }}
                className="text-lg font-black tracking-tight mb-1"
              >
                {RESTAURANT_NAME}
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
                  {currentAddress?.type} | {currentAddress?.address}
                </Text>
                <ChevronDown size={14} color={theme.primary} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 150 }}
            keyboardShouldPersistTaps="handled"
          >
            {discount > 0 && (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                className="bg-emerald-100/80 px-4 py-2.5 flex-row items-center justify-center"
              >
                <Sparkles size={16} color="#059669" />
                <Text className="text-emerald-700 font-bold ml-2">
                  ₹{discount} saved! On this order
                </Text>
              </Animated.View>
            )}

            <View className="p-4">
              <Animated.View
                layout={LinearTransition.duration(300)}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                className="rounded-[24px] border p-4 mb-6 shadow-sm"
              >
                {cart.map((item: any, index: number) => (
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
                          <Text
                            style={{ color: theme.muted }}
                            className="text-xs font-semibold mt-1"
                          >
                            {item.price}
                          </Text>
                          {item.addons?.length > 0 && (
                            <Text
                              style={{ color: theme.muted }}
                              className="text-xs mt-1"
                            >
                              Customized
                            </Text>
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
                          onPress={() => {
                            if (item.quantity > 1) {
                              const unitPrice = item.total / item.quantity;
                              onIncrement(
                                item,
                                -1,
                                item.addons || [],
                                -unitPrice,
                              );
                            } else {
                              onDecrement(item.id);
                            }
                          }}
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
                              getNumericPrice(item.price),
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
                        ₹{item.total}
                      </Text>
                    </View>
                  </View>
                ))}

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

              <Text
                style={{ color: theme.muted }}
                className="text-xs font-black uppercase tracking-wider mb-3 ml-2"
              >
                Complete Your Meal
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6 -mx-4 px-4"
                keyboardShouldPersistTaps="handled"
              >
                {CROSS_SELL_ITEMS.map((cross) => {
                  const cartItem = cart.find((c: any) => c.id === cross.id);
                  const currentQty = cartItem ? cartItem.quantity : 0;

                  return (
                    <View
                      key={cross.id}
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                      className="w-32 rounded-[20px] border p-2 mr-4"
                    >
                      <View className="relative">
                        <Image
                          source={{ uri: cross.image }}
                          className="w-full h-24 rounded-2xl mb-2"
                          resizeMode="cover"
                        />

                        {currentQty > 0 && (
                          <View className="absolute top-2 right-2 bg-emerald-500 rounded-full px-1.5 py-0.5">
                            <Text className="text-[10px] font-black text-white">
                              {currentQty}
                            </Text>
                          </View>
                        )}

                        <Pressable
                          onPress={() => {
                            if (currentQty < 3) {
                              onIncrement(
                                cross,
                                1,
                                [],
                                getNumericPrice(cross.price),
                              );
                            }
                          }}
                          className={`absolute -bottom-3 right-2 rounded-full p-1 shadow-sm border border-gray-100 ${currentQty >= 3 ? "bg-gray-200" : "bg-white"}`}
                        >
                          {currentQty >= 3 ? (
                            <CheckCircle2
                              size={20}
                              color={theme.muted}
                              strokeWidth={3}
                            />
                          ) : (
                            <Plus
                              size={20}
                              color={theme.primary}
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
                        <Text
                          style={{ color: theme.muted }}
                          className="text-xs font-semibold mt-1"
                        >
                          {cross.price}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

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
                      <View className="bg-orange-100 p-2.5 rounded-xl mr-4">
                        <Ticket size={24} color="#EA580C" />
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
                      className="flex-row items-center border rounded-xl px-4 h-12 mb-2"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bg,
                      }}
                    >
                      <View className="flex-1 justify-center h-full">
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
                      >
                        <Text
                          style={{ color: theme.primary }}
                          className="font-black tracking-wider uppercase text-xs pl-2"
                        >
                          Apply
                        </Text>
                      </Pressable>
                    </View>

                    <Text
                      className="text-red-500 font-bold text-xs ml-1 mb-2"
                      style={{ minHeight: 16 }}
                    >
                      {couponError ? couponError : " "}
                    </Text>

                    {AVAILABLE_COUPONS.map((coupon, idx) => {
                      return (
                        <View
                          key={coupon.code}
                          style={{
                            borderBottomWidth:
                              idx === AVAILABLE_COUPONS.length - 1 ? 0 : 1,
                            borderBottomColor: theme.border,
                          }}
                          className="py-4 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1 pr-4">
                            <View className="bg-orange-100/50 p-2.5 rounded-xl mr-4">
                              <Ticket size={22} color="#EA580C" />
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
                  {["Delivery", "Tip", "Instructions"].map((tab) => {
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
                          style={{ color: isActive ? theme.bg : theme.muted }}
                          className="font-black text-xs uppercase tracking-wider"
                        >
                          {tab}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {activeTab === "Delivery" && (
                  <View>
                    {DELIVERY_OPTIONS.map((opt, index) => {
                      const isSelected = selectedDelivery === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setSelectedDelivery(opt.id)}
                          style={{
                            borderBottomWidth:
                              index === DELIVERY_OPTIONS.length - 1 ? 0 : 1,
                            borderBottomColor: theme.border,
                          }}
                          className="p-4 flex-row items-center"
                        >
                          {isSelected ? (
                            <CheckCircle2 size={24} color={theme.primary} />
                          ) : (
                            <Circle size={24} color={theme.muted} />
                          )}
                          <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                              <Text
                                style={{
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                }}
                                className="font-bold text-base"
                              >
                                {opt.title}
                              </Text>
                              {opt.price > 0 && (
                                <Text
                                  style={{ color: theme.text }}
                                  className="font-semibold text-xs ml-2"
                                >
                                  | Pay ₹{opt.price} extra
                                </Text>
                              )}
                              {opt.price < 0 && (
                                <Text
                                  style={{ color: theme.primary }}
                                  className="font-semibold text-xs ml-2"
                                >
                                  | Save ₹{Math.abs(opt.price)}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={{ color: theme.muted }}
                              className="text-xs font-medium mt-1"
                            >
                              {opt.subtitle}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: isSelected ? theme.primary : theme.text,
                            }}
                            className="font-bold"
                          >
                            {opt.time}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {activeTab === "Tip" && (
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
                  <View className="p-4">
                    <View
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.bg,
                      }}
                      className="border rounded-xl px-3 py-2 h-24 mb-3"
                    >
                      <TextInput
                        multiline
                        placeholder="e.g. Leave at the door, don't ring the bell..."
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
                  className="flex-row justify-between items-center mb-2"
                >
                  <View className="flex-row items-center">
                    <View className="bg-emerald-500 p-1.5 rounded-md mr-2">
                      <Receipt size={16} color="white" />
                    </View>
                    <Text
                      style={{ color: theme.text }}
                      className="font-black text-lg"
                    >
                      To Pay
                    </Text>
                    {totalSavings > 0 && (
                      <Text
                        style={{ color: theme.muted }}
                        className="font-bold text-base line-through ml-2"
                      >
                        ₹{formatPrice(originalPayable)}
                      </Text>
                    )}
                    <Text
                      style={{ color: theme.text }}
                      className="font-black text-lg ml-1"
                    >
                      ₹{formatPrice(finalPayable)}
                    </Text>
                  </View>
                  {isBillExpanded ? (
                    <ChevronUp size={20} color={theme.text} />
                  ) : (
                    <ChevronDown size={20} color={theme.text} />
                  )}
                </Pressable>

                {/* Savings Banner */}
                {totalSavings > 0 && (
                  <Text className="text-emerald-600 font-bold text-[13px] ml-10 mb-4">
                    ₹{formatPrice(totalSavings)} saved on the total!
                  </Text>
                )}

                {/* Displayed directly below Header when Collapsed */}
                {!isBillExpanded && isFreeDeliveryEligible && (
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
                {!isBillExpanded && !isFreeDeliveryEligible && (
                  <View className="mb-2 mt-2 px-1">
                    <Text
                      style={{ color: theme.primary }}
                      className="font-semibold text-[13px]"
                    >
                      Add ₹{formatPrice(99 - cartTotal)} more to get FREE
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
                          ₹{formatPrice(cartTotal)}
                        </Text>
                      </View>
                    </View>

                    {/* Delivery Fee Clickable Hover Row */}
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
                              Delivery fee breakup for this order
                            </Text>
                            <View className="flex-row justify-between items-center">
                              <Text
                                style={{ color: theme.muted }}
                                className="font-semibold text-[13px]"
                              >
                                {selectedOption?.title || "Standard Fee"}
                              </Text>
                              <View className="flex-row items-center">
                                {isFreeDeliveryEligible && (
                                  <Text
                                    style={{ color: theme.muted }}
                                    className="font-semibold line-through mr-2 text-[13px]"
                                  >
                                    ₹{formatPrice(TAX_DETAILS.baseDeliveryFee)}
                                  </Text>
                                )}
                                <Text
                                  className={
                                    isFreeDelivery
                                      ? "text-emerald-600 font-bold text-[13px]"
                                      : "font-bold text-[13px]"
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
                              Delivery Fee | {TAX_DETAILS.deliveryDistance}
                            </Text>
                          </View>

                          <View className="flex-row">
                            {isFreeDeliveryEligible && (
                              <Text
                                style={{ color: theme.muted }}
                                className="font-semibold line-through mr-2"
                              >
                                ₹{formatPrice(TAX_DETAILS.baseDeliveryFee)}
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
                            Add ₹{formatPrice(99 - cartTotal)} more to get FREE
                            Delivery!
                          </Text>
                        )}
                      </Pressable>
                    </View>

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

                    {/* Dynamic Delivery Tip (Inline Selector without Custom) */}
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
                        style={{ color: theme.text }}
                        className="font-black text-lg"
                      >
                        To Pay
                      </Text>
                      <Text
                        style={{ color: theme.text }}
                        className="font-black text-lg"
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
                  Please double-check your order and address details. Orders are
                  non-refundable once placed.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: Platform.OS === "ios" ? insets.bottom : 20,
            }}
            className="absolute bottom-0 inset-x-0 p-4 border-t flex-row items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
          >
            <View>
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
                <ChevronDown size={16} color={theme.text} className="ml-1" />
              </View>
            </View>
            <Pressable
              style={{ backgroundColor: theme.primary }}
              className="px-8 py-3.5 rounded-2xl"
            >
              <Text className="text-white font-black text-lg">
                Pay ₹{formatPrice(finalPayable)}
              </Text>
            </Pressable>
          </View>

          {/* =========================================
              MODALS / OVERLAYS 
              ========================================= */}

          <Modal
            visible={showAddressModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAddressModal(false)}
          >
            <View className="flex-1 justify-end bg-black/60">
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
                    Choose Delivery Address
                  </Text>
                  <Pressable
                    onPress={() => setShowAddressModal(false)}
                    className="p-2"
                  >
                    <X size={24} color={theme.text} />
                  </Pressable>
                </View>
                <View>
                  {MOCK_ADDRESSES.map((item: any) => {
                    const isActive = currentAddress.id === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setCurrentAddress(item);
                          setShowAddressModal(false);
                        }}
                        className="flex-row items-center p-4 mb-3 rounded-2xl border"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: isActive ? theme.primary : theme.border,
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
                            {item.type}
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
                  })}
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>
    );
  },
);
