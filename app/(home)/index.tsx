import { useUser } from "@clerk/expo";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  BellRing,
  ChevronDown,
  ChevronRightCircle,
  Croissant,
  Flame,
  GlassWater,
  Heart,
  IceCreamBowl,
  MapPin,
  Mic,
  Receipt,
  ScanLine,
  Search,
  ShoppingBag,
  Soup,
  Store,
  UserRound,
  Utensils,
  Wifi,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FoodCard from "../../components/home/FoodCard";
import { getUserByPhone } from "../../lib/db";
import { useOrderMode } from "./_layout";

const { width } = Dimensions.get("window");

// --- MOCK DATA ---
const OFFERS = [
  {
    id: 1,
    title: "50% OFF",
    subtitle: "On your first Biryani order",
    image:
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "FREE DESSERT",
    subtitle: "On orders above ₹499",
    image:
      "https://images.unsplash.com/photo-1551024506-0baa2740d303?auto=format&fit=crop&w=800&q=80",
  },
];

const CATEGORIES = [
  { id: 1, name: "Biryani", icon: Utensils },
  { id: 2, name: "Grills", icon: Flame },
  { id: 3, name: "Curries", icon: Soup },
  { id: 4, name: "Breads", icon: Croissant },
  { id: 5, name: "Desserts", icon: IceCreamBowl },
];

const FOOD_ITEMS = [
  {
    id: 1,
    name: "Special Chicken Dum Biryani",
    price: "₹319",
    time: "30 mins",
    rating: "4.8",
    offer: "₹50 OFF",
    image:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
  {
    id: 2,
    name: "Tandoori Platter Full",
    price: "₹549",
    time: "40 mins",
    rating: "4.9",
    offer: "BESTSELLER",
    image:
      "https://images.unsplash.com/photo-1544025162-8315ea011505?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
  {
    id: 3,
    name: "Paneer Butter Masala",
    price: "₹289",
    time: "25 mins",
    rating: "4.6",
    offer: "20% OFF",
    image:
      "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const { mode: orderMode, setMode: setOrderMode } = useOrderMode();
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const player = useVideoPlayer(
    require("../../assets/videos/show-video.mp4"),
    (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    },
  );

  const { phone } = useGlobalSearchParams<{ phone?: string }>();
  const [dbFirstName, setDbFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (phone) {
      getUserByPhone(phone).then((data) => {
        if (data) setDbFirstName(data.first_name);
      });
    }
  }, [phone]);

  const displayFirstName = dbFirstName || user?.firstName || "Siva";

  const theme = {
    bg: isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)",
    card: isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)",
    text: isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)",
    muted: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
    primary: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
    border: isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)",
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center justify-between px-4 pb-2 pt-2 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <View className="flex-1">
          <View className="flex-row items-center">
            {orderMode === "Delivery" ? (
              <MapPin size={22} color={theme.primary} strokeWidth={2.5} />
            ) : (
              <Store size={22} color={theme.primary} strokeWidth={2.5} />
            )}
            <Text
              className="ml-1 text-xl font-black tracking-tight"
              style={{ color: theme.text }}
            >
              {orderMode === "Delivery" ? "Deliver to" : "Currently at"}
            </Text>
            <ChevronDown
              size={20}
              color={theme.text}
              strokeWidth={2.5}
              style={{ marginLeft: 4 }}
            />
          </View>
          <Text
            className="ml-7 text-xs font-bold mt-0.5 tracking-wide"
            style={{ color: theme.primary }}
            numberOfLines={1}
          >
            {orderMode === "Delivery"
              ? "Silicon Valley, Madhapur"
              : "Hitech City Premium Branch"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View className="px-4 mt-2 mb-4 flex-row items-center justify-between">
          <Text
            className="text-2xl font-black tracking-tight"
            style={{ color: theme.text }}
          >
            Hello, {displayFirstName}!
          </Text>

          <Pressable
            onPress={() =>
              setOrderMode(
                orderMode === "Delivery" ? "Dine-in/Takeaway" : "Delivery",
              )
            }
            className="flex-row items-center"
          >
            <Text
              className="text-[10px] font-black uppercase tracking-wider mr-2"
              style={{
                color: orderMode === "Delivery" ? theme.primary : theme.muted,
              }}
            >
              Delivery
            </Text>
            <View
              className="w-10 h-5 rounded-full justify-center px-0.5 border"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <View
                className={`w-4 h-4 rounded-full shadow-sm ${orderMode === "Delivery" ? "self-start" : "self-end"}`}
                style={{ backgroundColor: theme.primary }}
              />
            </View>
            <Text
              className="text-[10px] font-black uppercase tracking-wider ml-2"
              style={{
                color: orderMode !== "Delivery" ? theme.primary : theme.muted,
              }}
            >
              Dine-in/Takeaway
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: theme.bg,
            paddingHorizontal: 16,
            paddingVertical: 12,
            zIndex: 50,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.card,
                borderRadius: 16,
                paddingHorizontal: 16,
                height: 48,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Search size={20} color={theme.muted} strokeWidth={2.5} />
              <TextInput
                placeholder={
                  orderMode === "Delivery"
                    ? "Search for delivery..."
                    : "Search in-store menu..."
                }
                placeholderTextColor={theme.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  marginLeft: 12,
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "500",
                  includeFontPadding: false,
                  paddingVertical: 0,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingLeft: 12,
                }}
              >
                <View
                  style={{
                    height: 20,
                    width: 1,
                    marginRight: 12,
                    backgroundColor: theme.border,
                  }}
                />
                <Pressable onPress={() => console.log("Mic pressed")}>
                  <Mic size={18} color={theme.primary} strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
            <Pressable
              onPress={() => setIsVegOnly(!isVegOnly)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isVegOnly ? theme.primary : theme.card,
                borderRadius: 16,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: isVegOnly ? theme.primary : theme.border,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderWidth: 1,
                  borderColor: isVegOnly ? "#fff" : theme.muted,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 2,
                  marginRight: 6,
                }}
              >
                {isVegOnly && (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "#fff",
                      borderRadius: 3,
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  color: isVegOnly ? "#fff" : theme.muted,
                  fontSize: 12,
                  fontWeight: "900",
                  letterSpacing: 0.5,
                }}
              >
                VEG
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-2">
          {orderMode === "Delivery" ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <View className="px-4 mb-2">
                <View
                  className="relative h-48 w-full overflow-hidden rounded-[24px] shadow-sm border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <VideoView
                    player={player}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                  <View className="absolute inset-0 bg-black/20 pointer-events-none" />
                  <View className="absolute bottom-4 left-4 pointer-events-none">
                    <View
                      className="self-start rounded-lg px-2.5 py-1 mb-1"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                        Featured Reel
                      </Text>
                    </View>
                    <Text className="text-xl font-black text-white shadow-md">
                      Freshly Crafted Daily
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-2 mb-8">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                >
                  {OFFERS.map((offer) => (
                    <Pressable
                      key={offer.id}
                      onPress={() =>
                        router.push({
                          pathname: "/(home)/offers",
                          params: { offerId: offer.id },
                        })
                      }
                      className="relative h-40 overflow-hidden rounded-[24px]"
                      style={{ width: width * 0.85 }}
                    >
                      <Image
                        source={{ uri: offer.image }}
                        className="absolute h-full w-full"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/20" />
                      <View className="absolute inset-0 p-5 justify-center">
                        <Text className="text-4xl font-black text-white tracking-tighter">
                          {offer.title}
                        </Text>
                        <Text className="text-base font-bold text-gray-200 mt-1">
                          {offer.subtitle}
                        </Text>
                        <View className="mt-4 self-start rounded-xl bg-white px-5 py-2">
                          <Text
                            className="text-xs font-black"
                            style={{ color: theme.primary }}
                          >
                            ORDER NOW
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View className="mb-10 px-4">
                <Text
                  className="mb-4 text-xl font-black"
                  style={{ color: theme.text }}
                >
                  Explore Menu
                </Text>
                <View className="flex-row flex-wrap justify-between gap-y-4">
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      className="items-center w-[18%]"
                      onPress={() =>
                        router.push({
                          pathname: "/(home)/search",
                          params: { category: cat.name },
                        })
                      }
                    >
                      <View
                        className="h-16 w-16 items-center justify-center rounded-2xl shadow-sm border mb-2"
                        style={{
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        }}
                      >
                        <cat.icon
                          size={26}
                          color={theme.primary}
                          strokeWidth={2}
                        />
                      </View>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.muted }}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-4 mb-8">
                <Text
                  className="mb-4 text-2xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  In The Spotlight
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {FOOD_ITEMS.filter((i) => !isVegOnly || i.isVeg).map(
                    (item) => (
                      <FoodCard key={item.id} item={item} />
                    ),
                  )}
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <View className="px-4 mb-6">
                <Pressable
                  className="w-full rounded-[24px] overflow-hidden shadow-sm border p-6 flex-row items-center justify-between"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.border,
                  }}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-white/20 px-2 py-1 rounded-md mr-2">
                        <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                          Step 1
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-white/90 uppercase tracking-widest">
                        Order to Table
                      </Text>
                    </View>
                    <Text className="text-2xl font-black text-white tracking-tight leading-tight">
                      Scan Table QR
                    </Text>
                    <Text className="text-sm font-semibold text-white/80 mt-1">
                      Open digital menu instantly.
                    </Text>
                  </View>
                  <View className="h-16 w-16 bg-white rounded-2xl items-center justify-center shadow-lg transform rotate-3">
                    <ScanLine size={32} color={theme.primary} strokeWidth={2} />
                  </View>
                </Pressable>
              </View>

              <View className="px-4 mb-10">
                <Text
                  className="mb-4 text-lg font-black uppercase tracking-wider"
                  style={{ color: theme.muted }}
                >
                  In-Store Services
                </Text>
                <View className="flex-row justify-between">
                  <Pressable className="items-center">
                    <View
                      className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <BellRing
                        size={28}
                        color={theme.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.text }}
                    >
                      Call Waiter
                    </Text>
                  </Pressable>

                  <Pressable className="items-center">
                    <View
                      className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <GlassWater
                        size={28}
                        color={theme.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.text }}
                    >
                      Water
                    </Text>
                  </Pressable>

                  <Pressable className="items-center">
                    <View
                      className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <Wifi size={28} color={theme.primary} strokeWidth={1.5} />
                    </View>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.text }}
                    >
                      Free Wi-Fi
                    </Text>
                  </Pressable>

                  <Pressable className="items-center">
                    <View
                      className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <Receipt
                        size={28}
                        color={theme.primary}
                        strokeWidth={1.5}
                      />
                    </View>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.text }}
                    >
                      Pay Bill
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View className="px-4 mb-8">
                <Pressable
                  className="w-full rounded-[20px] shadow-sm border p-5 flex-row items-center justify-between"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="h-12 w-12 rounded-full items-center justify-center border mr-4"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                        borderColor: theme.border,
                      }}
                    >
                      <ShoppingBag
                        size={22}
                        color={theme.text}
                        strokeWidth={2}
                      />
                    </View>
                    <View>
                      <Text
                        className="text-lg font-black"
                        style={{ color: theme.text }}
                      >
                        Order Takeaway
                      </Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.muted }}
                      >
                        Pick up at the counter in 15 mins.
                      </Text>
                    </View>
                  </View>
                  <ChevronRightCircle
                    size={24}
                    color={theme.primary}
                    strokeWidth={2}
                  />
                </Pressable>
              </View>

              <View className="mb-8">
                <View className="flex-row justify-between items-center px-4 mb-4">
                  <Text
                    className="text-2xl font-black tracking-tight"
                    style={{ color: theme.text }}
                  >
                    Trending at this Branch
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
                >
                  {FOOD_ITEMS.filter((i) => !isVegOnly || i.isVeg).map(
                    (item) => (
                      <FoodCard
                        key={item.id}
                        item={item}
                        widthOverride={width * 0.65}
                      />
                    ),
                  )}
                </ScrollView>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
