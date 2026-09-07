import {
  CheckCircle2,
  Circle,
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
import { useAppTheme } from "../../constants/theme";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.43;

const BEVERAGES = [
  {
    id: 1,
    name: "Lemon Ice Tea",
    price: 79,
    isVeg: true,
    bestseller: true,
    selected: true,
  },
  { id: 2, name: "Peach Ice Tea", price: 89, isVeg: true, selected: false },
  {
    id: 3,
    name: "Cold Pressed Watermelon",
    price: 99,
    isVeg: true,
    selected: false,
  },
];

const DESSERTS = [
  {
    id: 4,
    name: "Gulab Jamun (2pc)",
    price: 59,
    isVeg: true,
    selected: false,
    available: true,
  },
  {
    id: 5,
    name: "Chocolate Brownie",
    price: 119,
    isVeg: false,
    selected: false,
    available: false,
  },
];

interface FoodCardProps {
  item: any;
  widthOverride?: number;
}

const StarParticle = ({
  angle,
  progress,
  color,
}: {
  angle: number;
  progress: Animated.SharedValue<number>;
  color: string;
}) => {
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
      style={[
        {
          position: "absolute",
          top: "40%",
          left: "45%",
          zIndex: -1,
          pointerEvents: "none",
        },
        animatedStyle,
      ]}
    >
      <Star size={24} color={color} fill={color} />
    </Animated.View>
  );
};

export default function FoodCard({ item, widthOverride }: FoodCardProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useFavorites();

  const [showDetails, setShowDetails] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- CAROUSEL STATE & DATA ---
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryImages = [
    item.image,
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=800&q=80",
  ];

  const isFav = favorites?.includes(item.id);

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

    cardRotateY.value = withTiming(360, { duration: 500 }, (finished) => {
      // FIX 1: Open modal if finished successfully
      if (finished) {
        runOnJS(setShowDetails)(true);
      } else {
        // Reset card silently if interrupted
        cardRotateY.value = 0;
        cardZIndex.value = 1;
        particleProgress.value = 0;
      }
      // FIX 2: ALWAYS unlock the card animation state
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

  // FIX 3: Modals are now directly inside the return statement to prevent scroll-glitching
  return (
    <View
      style={{ width: widthOverride || CARD_WIDTH, position: "relative" }}
      className="mb-4"
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
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              overflow: "hidden",
            },
            animatedCardStyle,
          ]}
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

            <Text className="absolute bottom-3 left-3 text-lg font-black text-white tracking-tight">
              {item.offer}
            </Text>
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

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setShowCustomization(true);
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
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* --- 1. ITEM DETAILS MODAL INLINED --- */}
      <Modal
        visible={showDetails}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDetails}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={handleCloseDetails} />

          <View
            style={{
              height: height * 0.85,
              backgroundColor: theme.bg,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              overflow: "hidden",
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              <View
                style={{ height: 280, width: "100%", position: "relative" }}
              >
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
                  {galleryImages.map((img, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: img }}
                      style={{ height: 280, width: width }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                <View
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  {galleryImages.map((_, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: activeImageIndex === idx ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          activeImageIndex === idx
                            ? theme.primary
                            : "rgba(255,255,255,0.6)",
                        marginHorizontal: 4,
                      }}
                    />
                  ))}
                </View>

                <Pressable
                  onPress={handleCloseDetails}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    padding: 8,
                    borderRadius: 20,
                  }}
                >
                  <X size={24} color="#fff" />
                </Pressable>

                <View
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    backgroundColor: theme.card,
                    padding: 8,
                    borderRadius: 12,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 16,
                      fontWeight: "900",
                    }}
                  >
                    💪
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 10,
                      fontWeight: "800",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    HIGH{"\n"}PROTEIN
                  </Text>
                </View>
              </View>

              <View style={{ padding: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      padding: 2,
                      borderWidth: 1,
                      borderColor: item.isVeg ? "#16A34A" : "#DC2626",
                      borderRadius: 4,
                      marginRight: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: item.isVeg ? "#16A34A" : "#DC2626",
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(22, 163, 74, 0.1)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Star size={12} color="#16A34A" fill="#16A34A" />
                    <Text
                      style={{
                        color: "#16A34A",
                        fontSize: 12,
                        fontWeight: "800",
                        marginLeft: 4,
                      }}
                    >
                      {item.rating} (34)
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    color: theme.text,
                    fontSize: 24,
                    fontWeight: "900",
                    marginBottom: 8,
                    lineHeight: 32,
                  }}
                >
                  {item.name}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 20,
                      fontWeight: "900",
                      marginRight: 8,
                    }}
                  >
                    {item.price}
                  </Text>
                  <Text
                    style={{
                      color: theme.muted,
                      fontSize: 16,
                      fontWeight: "600",
                      textDecorationLine: "line-through",
                    }}
                  >
                    ₹399
                  </Text>
                </View>

                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 16,
                  }}
                >
                  27g protein • 376 kcal
                </Text>

                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.border,
                    marginBottom: 16,
                  }}
                />

                <Text
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "500",
                    lineHeight: 24,
                    letterSpacing: 0.2,
                  }}
                >
                  A nutrient-dense fusion of soft paneer, superfood quinoa, and
                  vibrant vegetables—crafted to deliver 80g of wholesome
                  vegetarian protein for complete nourishment and sustained
                  energy. Perfectly balanced with our house-special dressing.
                </Text>
              </View>
            </ScrollView>

            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.card,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: Platform.OS === "ios" ? insets.bottom : 20,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <Pressable
                onPress={() => {
                  handleCloseDetails();
                  setTimeout(() => setShowCustomization(true), 350);
                }}
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  ADD CUSTOMISABLE
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- 2. CUSTOMIZATION MODAL INLINED --- */}
      <Modal
        visible={showCustomization}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomization(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowCustomization(false)}
          />

          <View
            style={{
              height: height * 0.9,
              backgroundColor: theme.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                backgroundColor: theme.card,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                zIndex: 10,
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                }}
              />
              <Text
                style={{
                  flex: 1,
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "800",
                }}
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
                  padding: 8,
                  borderRadius: 20,
                }}
              >
                <X size={20} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}
            >
              <View style={{ padding: 20, backgroundColor: theme.bg }}>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Choose Your Beverages
                </Text>
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 16,
                  }}
                >
                  Select upto 3
                </Text>

                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: "hidden",
                  }}
                >
                  {BEVERAGES.map((bev, index) => (
                    <Pressable
                      key={bev.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        borderBottomWidth:
                          index === BEVERAGES.length - 1 ? 0 : 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          padding: 2,
                          borderWidth: 1,
                          borderColor: bev.isVeg ? "#16A34A" : "#DC2626",
                          borderRadius: 4,
                          marginRight: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: bev.isVeg ? "#16A34A" : "#DC2626",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        {bev.bestseller && (
                          <Text
                            style={{
                              color: "#DC2626",
                              fontSize: 10,
                              fontWeight: "800",
                              marginBottom: 2,
                            }}
                          >
                            Bestseller
                          </Text>
                        )}
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          {bev.name}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: theme.muted,
                          fontSize: 14,
                          fontWeight: "600",
                          marginRight: 12,
                        }}
                      >
                        + ₹{bev.price}
                      </Text>
                      {bev.selected ? (
                        <CheckCircle2
                          size={24}
                          color={theme.primary}
                          fill="rgba(22, 163, 74, 0.1)"
                        />
                      ) : (
                        <Circle size={24} color={theme.muted} />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              <View
                style={{
                  paddingHorizontal: 20,
                  paddingBottom: 20,
                  backgroundColor: theme.bg,
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Choose Your Dessert
                </Text>
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 16,
                  }}
                >
                  Select upto 1
                </Text>

                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: "hidden",
                  }}
                >
                  {DESSERTS.map((des, index) => (
                    <View
                      key={des.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        borderBottomWidth:
                          index === DESSERTS.length - 1 ? 0 : 1,
                        borderBottomColor: theme.border,
                        opacity: des.available ? 1 : 0.5,
                      }}
                    >
                      <View
                        style={{
                          padding: 2,
                          borderWidth: 1,
                          borderColor: des.isVeg ? "#16A34A" : "#DC2626",
                          borderRadius: 4,
                          marginRight: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: des.isVeg ? "#16A34A" : "#DC2626",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 15,
                            fontWeight: "700",
                          }}
                        >
                          {des.name}
                        </Text>
                        {!des.available && (
                          <Text
                            style={{
                              color: "#D97706",
                              fontSize: 12,
                              fontWeight: "600",
                              marginTop: 4,
                            }}
                          >
                            Unavailable at the moment
                          </Text>
                        )}
                      </View>
                      {des.available && (
                        <Text
                          style={{
                            color: theme.muted,
                            fontSize: 14,
                            fontWeight: "600",
                            marginRight: 12,
                          }}
                        >
                          + ₹{des.price}
                        </Text>
                      )}
                      {des.available && (
                        <Circle size={24} color={theme.muted} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.card,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: Platform.OS === "ios" ? insets.bottom : 20,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.bg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginRight: 12,
                }}
              >
                <Pressable style={{ padding: 12 }}>
                  <Minus size={18} color={theme.primary} strokeWidth={3} />
                </Pressable>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "900",
                    paddingHorizontal: 6,
                  }}
                >
                  1
                </Text>
                <Pressable style={{ padding: 12 }}>
                  <Plus size={18} color={theme.primary} strokeWidth={3} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => setShowCustomization(false)}
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  Add Item
                </Text>
                <View
                  style={{
                    width: 1,
                    height: 14,
                    backgroundColor: "rgba(255,255,255,0.4)",
                    marginHorizontal: 12,
                  }}
                />
                <Text
                  style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}
                >
                  ₹308
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
