import {
  CheckCircle2,
  Drumstick,
  Heart,
  Leaf,
  Minus,
  Plus,
  Star,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFavorites } from "../../app/(home)/_layout";
import { ADD_ONS } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.43;

interface FoodCardProps {
  item: any;
  widthOverride?: number;
  cartQuantity?: number;
  onAddToCart?: (qty: number, addons: string[], total: number) => void;
  onDecrement?: () => void;
}

const StarParticle = ({ angle, progress, color }: any) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = interpolate(
      progress.value,
      [0, 1],
      [0, 80],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [0.2, 1, 0.2]);
    const rotate = interpolate(progress.value, [0, 1], [0, 180]);

    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle * (Math.PI / 180)) * distance },
        { translateY: Math.sin(angle * (Math.PI / 180)) * distance },
        { scale },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      className="absolute top-[40%] left-[45%] -z-10 pointer-events-none"
      style={animatedStyle}
    >
      <Star size={24} color={color} fill={color} />
    </Animated.View>
  );
};

export default function FoodCard({
  item,
  widthOverride,
  cartQuantity = 0,
  onAddToCart,
  onDecrement,
}: FoodCardProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useFavorites();

  const [showDetails, setShowDetails] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Customization State
  const [customQty, setCustomQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Use dynamic gallery from item, fallback to main image if not provided
  const galleryImages =
    item.gallery && item.gallery.length > 0 ? item.gallery : [item.image];

  const isFav = favorites?.includes(item.id);

  // Animation Values
  const cardScale = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const cardRotateY = useSharedValue(0);
  const cardZIndex = useSharedValue(1);
  const particleProgress = useSharedValue(0);
  const heartScale = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      zIndex: cardZIndex.value,
      elevation: cardZIndex.value * 10,
      transform: [
        { translateY: cardTranslateY.value },
        { scale: cardScale.value },
        { perspective: 1000 },
        { rotateY: `${cardRotateY.value}deg` },
      ],
    };
  });

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleHeartPress = (e: any) => {
    e.stopPropagation();
    toggleFavorite(item.id);
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 10 }),
      withSpring(1, { damping: 10 }),
    );
  };

  const handleCardPress = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    cardZIndex.value = 100;

    cardScale.value = withSequence(
      withTiming(1.1, { duration: 150 }),
      withTiming(1, { duration: 250 }),
    );
    cardTranslateY.value = withSequence(
      withTiming(-15, { duration: 150 }),
      withTiming(0, { duration: 250 }),
    );

    particleProgress.value = withDelay(150, withTiming(1, { duration: 500 }));

    cardRotateY.value = withTiming(360, { duration: 500 }, () => {
      // Open modal instantly regardless of animation interruption
      runOnJS(setShowDetails)(true);
      runOnJS(setIsAnimating)(false);
    });
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setTimeout(() => {
      cardRotateY.value = 0;
      cardZIndex.value = 1;
      particleProgress.value = 0;
      setActiveImageIndex(0);
    }, 400);
  };

  const openCustomization = () => {
    setCustomQty(1);
    setSelectedAddons([]);
    setShowCustomization(true);
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  const getBasePrice = () => parseInt(item.price.replace(/\D/g, ""), 10);

  const calculateTotal = () => {
    const base = getBasePrice();
    const addonsCost = selectedAddons.reduce((sum, id) => {
      const addon = ADD_ONS.find((a) => a.id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);
    return (base + addonsCost) * customQty;
  };

  return (
    <View
      style={{ width: widthOverride || CARD_WIDTH }}
      className="relative mb-4"
    >
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <StarParticle
          key={i}
          angle={angle}
          progress={particleProgress}
          color={i % 2 === 0 ? "#EAB308" : theme.primary}
        />
      ))}

      <Pressable onPress={handleCardPress}>
        <Animated.View
          style={[
            { backgroundColor: theme.card, borderColor: theme.border },
            animatedCardStyle,
          ]}
          className="border rounded-[24px] overflow-hidden"
        >
          <View className="relative h-36 w-full">
            <Image
              source={{ uri: item.image }}
              className="h-full w-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            <View className="absolute top-3 left-3 flex-row items-center rounded-lg bg-white/95 px-1.5 py-1 backdrop-blur-md">
              {item.isVeg ? (
                <Leaf size={14} color="hsl(146, 80%, 40%)" strokeWidth={3} />
              ) : (
                <Drumstick
                  size={14}
                  color="hsl(8, 100%, 65%)"
                  strokeWidth={3}
                />
              )}
            </View>
            <Pressable
              onPress={handleHeartPress}
              className="absolute top-3 right-3 rounded-full bg-black/40 p-2 backdrop-blur-md"
            >
              <Animated.View style={animatedHeartStyle}>
                <Heart
                  size={16}
                  color={isFav ? "#EF4444" : "white"}
                  fill={isFav ? "#EF4444" : "transparent"}
                  strokeWidth={2.5}
                />
              </Animated.View>
            </Pressable>
            {item.offer && (
              <Text className="absolute bottom-3 left-3 text-lg font-black text-white tracking-tight">
                {item.offer}
              </Text>
            )}
          </View>

          <View className="p-3.5">
            <Text
              className="text-[15px] font-extrabold"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View className="mt-1.5 flex-row items-center">
              <Star size={14} color={theme.primary} fill={theme.primary} />
              <Text
                className="ml-1 text-xs font-bold"
                style={{ color: theme.muted }}
              >
                {item.rating}
              </Text>
              <Text className="mx-1.5 text-xs" style={{ color: theme.muted }}>
                •
              </Text>
              <Text
                className="text-xs font-semibold"
                style={{ color: theme.muted }}
              >
                {item.time}
              </Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text
                className="text-lg font-black"
                style={{ color: theme.text }}
              >
                {item.price}
              </Text>

              {cartQuantity > 0 ? (
                <View
                  className="flex-row items-center rounded-lg border"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  }}
                >
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onDecrement && onDecrement();
                    }}
                    className="p-1.5 px-2"
                  >
                    <Minus size={16} color="#fff" strokeWidth={3} />
                  </Pressable>
                  <Text className="font-black text-white px-1.5">
                    {cartQuantity}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      openCustomization();
                    }}
                    className="p-1.5 px-2"
                  >
                    <Plus size={16} color="#fff" strokeWidth={3} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    openCustomization();
                  }}
                  className="rounded-xl px-5 py-2.5 border"
                  style={{
                    backgroundColor: theme.isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-black uppercase"
                    style={{ color: theme.primary }}
                  >
                    ADD
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* --- 1. ITEM DETAILS MODAL --- */}
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDetails}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={handleCloseDetails} />
          <View
            style={{ height: height * 0.85, backgroundColor: theme.bg }}
            className="rounded-t-[32px] overflow-hidden"
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              <View className="h-[280px] w-full relative">
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const newIndex = Math.round(
                      e.nativeEvent.contentOffset.x / width,
                    );
                    setActiveImageIndex(newIndex);
                  }}
                >
                  {galleryImages.map((img: string, idx: number) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={{ width }}
                      className="h-[280px]"
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <View className="absolute bottom-4 inset-x-0 flex-row justify-center pointer-events-none">
                  {galleryImages.map((_: any, idx: number) => (
                    <View
                      key={idx}
                      style={{
                        width: activeImageIndex === idx ? 18 : 6,
                        backgroundColor:
                          activeImageIndex === idx
                            ? theme.primary
                            : "rgba(255,255,255,0.6)",
                      }}
                      className="h-1.5 rounded-full mx-1"
                    />
                  ))}
                </View>
                <Pressable
                  onPress={handleCloseDetails}
                  className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
                >
                  <X size={24} color="#fff" />
                </Pressable>
              </View>
              <View className="p-5">
                <Text
                  style={{ color: theme.text }}
                  className="text-2xl font-black mb-2"
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: theme.text }}
                  className="text-xl font-black mb-4"
                >
                  {item.price}
                </Text>
                <Text
                  style={{ color: theme.text }}
                  className="text-[15px] font-medium leading-6"
                >
                  {item.description}
                </Text>
              </View>
            </ScrollView>
            <View
              style={{
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: Platform.OS === "ios" ? insets.bottom : 20,
              }}
              className="absolute bottom-0 inset-x-0 px-5 pt-4 border-t"
            >
              <Pressable
                onPress={() => {
                  handleCloseDetails();
                  setTimeout(() => openCustomization(), 350);
                }}
                style={{ backgroundColor: theme.primary }}
                className="py-3.5 rounded-xl items-center"
              >
                <Text className="text-white text-[15px] font-black tracking-wide">
                  ADD CUSTOMISABLE
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- 2. CUSTOMIZATION MODAL --- */}
      <Modal
        visible={showCustomization}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomization(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={() => setShowCustomization(false)}
          />
          <View
            style={{ height: height * 0.85, backgroundColor: theme.bg }}
            className="rounded-t-[24px] overflow-hidden"
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderBottomColor: theme.border,
              }}
              className="flex-row items-center p-4 border-b z-10"
            >
              <Image
                source={{ uri: item.image }}
                className="w-10 h-10 rounded-full mr-3"
              />
              <Text
                style={{ color: theme.text }}
                className="flex-1 text-base font-extrabold"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Pressable
                onPress={() => setShowCustomization(false)}
                style={{
                  backgroundColor: theme.isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                }}
                className="p-2 rounded-full"
              >
                <X size={20} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
            >
              <View style={{ backgroundColor: theme.bg }} className="p-5">
                <Text
                  style={{ color: theme.text }}
                  className="text-lg font-black mb-4"
                >
                  Select Quantity
                </Text>
                <View className="flex-row items-center">
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    }}
                    className="flex-row items-center rounded-xl border"
                  >
                    <Pressable
                      onPress={() => setCustomQty((q) => Math.max(1, q - 1))}
                      className="p-3"
                    >
                      <Minus
                        size={20}
                        color={customQty > 1 ? theme.primary : theme.muted}
                        strokeWidth={3}
                      />
                    </Pressable>
                    <Text
                      style={{ color: theme.text }}
                      className="text-lg font-black px-4"
                    >
                      {customQty}
                    </Text>
                    <Pressable
                      onPress={() => setCustomQty((q) => Math.min(3, q + 1))}
                      className="p-3"
                    >
                      <Plus
                        size={20}
                        color={customQty < 3 ? theme.primary : theme.muted}
                        strokeWidth={3}
                      />
                    </Pressable>
                  </View>
                  {customQty === 3 && (
                    <Text className="ml-4 text-xs font-bold text-red-500">
                      Max 3 allowed
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ backgroundColor: theme.bg }} className="px-5 pb-5">
                <Text
                  style={{ color: theme.text }}
                  className="text-lg font-black mb-1"
                >
                  Add-ons (Optional)
                </Text>
                <Text
                  style={{ color: theme.muted }}
                  className="text-[13px] font-semibold mb-4"
                >
                  Choose as many as you like
                </Text>

                <View
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                  className="rounded-[20px] border overflow-hidden"
                >
                  {ADD_ONS.map((addon, index) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <Pressable
                        key={addon.id}
                        onPress={() => toggleAddon(addon.id)}
                        style={{
                          borderBottomWidth:
                            index === ADD_ONS.length - 1 ? 0 : 1,
                          borderBottomColor: theme.border,
                        }}
                        className="flex-row items-center p-4"
                      >
                        <View
                          style={{
                            borderColor: isSelected
                              ? theme.primary
                              : theme.muted,
                            backgroundColor: isSelected
                              ? theme.primary
                              : "transparent",
                          }}
                          className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                        >
                          {isSelected && (
                            <CheckCircle2 size={14} color="#fff" />
                          )}
                        </View>
                        <Text
                          style={{ color: theme.text }}
                          className="flex-1 text-[15px] font-bold"
                        >
                          {addon.name}
                        </Text>
                        <Text
                          style={{ color: theme.muted }}
                          className="text-sm font-semibold"
                        >
                          + ₹{addon.price}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View
              style={{
                backgroundColor: theme.card,
                borderTopColor: theme.border,
                paddingBottom: Platform.OS === "ios" ? insets.bottom : 20,
              }}
              className="absolute bottom-0 inset-x-0 px-5 pt-4 border-t"
            >
              <Pressable
                onPress={() => {
                  if (onAddToCart)
                    onAddToCart(customQty, selectedAddons, calculateTotal());
                  setShowCustomization(false);
                }}
                style={{ backgroundColor: theme.primary }}
                className="py-3.5 rounded-xl items-center flex-row justify-center"
              >
                <Text className="text-white text-[15px] font-black tracking-wide">
                  Add Item
                </Text>
                <View className="w-[1px] h-3.5 bg-white/40 mx-3" />
                <Text className="text-white text-[15px] font-black">
                  ₹{calculateTotal()}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
