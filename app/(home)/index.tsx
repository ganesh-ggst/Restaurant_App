import { useUser } from "@clerk/expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getUserByPhone } from "../../lib/db";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.43; // Optimal 2-column width with padding

// Inside your component, set up the video player instance:
const player = useVideoPlayer(
  "../../assets/videos/show-video.mp4",
  (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  },
);

// --- MASSIVE MOCK DATA FOR DENSE UI ---
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
  { id: 1, name: "Biryani", icon: "rice" },
  { id: 2, name: "Grills", icon: "fire" },
  { id: 3, name: "Curries", icon: "pot-steam" },
  { id: 4, name: "Breads", icon: "baguette" },
  { id: 5, name: "Desserts", icon: "ice-cream" },
];

const BEST_SELLERS = [
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
  {
    id: 4,
    name: "Mutton Keema Fry",
    price: "₹429",
    time: "35 mins",
    rating: "4.7",
    offer: "SPICY",
    image:
      "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
];

const BIRYANIS = [
  {
    id: 1,
    name: "Hyderabadi Mutton",
    price: "₹449",
    time: "35 mins",
    rating: "4.9",
    offer: "MUST TRY",
    image:
      "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
  {
    id: 2,
    name: "Paneer Tikka Biryani",
    price: "₹299",
    time: "30 mins",
    rating: "4.5",
    offer: "NEW",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80",
    isVeg: true,
  },
];

const GRILLS = [
  {
    id: 1,
    name: "Afghani Chicken",
    price: "₹399",
    time: "30 mins",
    rating: "4.7",
    offer: "₹40 OFF",
    image:
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
  {
    id: 2,
    name: "Seekh Kebab",
    price: "₹349",
    time: "25 mins",
    rating: "4.6",
    offer: "HOT",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80",
    isVeg: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [orderMode, setOrderMode] = useState("Delivery");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch DB User Info
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

  // --- REUSABLE PREMIUM FOOD CARD ---
  const FoodCard = ({
    item,
    widthOverride,
  }: {
    item: any;
    widthOverride?: number;
  }) => (
    <View
      className="mb-4 overflow-hidden rounded-[24px] bg-white shadow-sm dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50"
      style={{ width: widthOverride || CARD_WIDTH }}
    >
      {/* Image & Overlays */}
      <View className="relative h-36 w-full">
        <Image
          source={{ uri: item.image }}
          className="h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

        {/* Veg/Non-Veg Tag */}
        <View className="absolute top-3 left-3 rounded bg-white/95 px-1.5 py-1">
          <MaterialCommunityIcons
            name="circle-box"
            size={14}
            color={item.isVeg ? "#16A34A" : "#DC2626"}
          />
        </View>

        {/* Heart Icon */}
        <Pressable className="absolute top-3 right-3 rounded-full bg-black/40 p-2 backdrop-blur-md">
          <MaterialCommunityIcons
            name="heart-outline"
            size={18}
            color="white"
          />
        </Pressable>

        {/* Bottom Image Overlay (Offer) */}
        <Text className="absolute bottom-3 left-3 text-lg font-black text-white tracking-tight">
          {item.offer}
        </Text>
      </View>

      {/* Card Info & Huge Add Button */}
      <View className="p-3.5">
        <Text
          className="text-[15px] font-extrabold text-gray-900 dark:text-white"
          numberOfLines={1}
        >
          {item.name}
        </Text>

        <View className="mt-1.5 flex-row items-center">
          <MaterialCommunityIcons
            name="star-circle"
            size={15}
            color="#10B981"
          />
          <Text className="ml-1 text-xs font-bold text-gray-600 dark:text-slate-300">
            {item.rating}
          </Text>
          <Text className="mx-1.5 text-xs text-gray-400">•</Text>
          <Text className="text-xs font-semibold text-gray-600 dark:text-slate-300">
            {item.time}
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-lg font-black text-gray-900 dark:text-white">
            {item.price}
          </Text>

          {/* MASSIVE ADD BUTTON */}
          <Pressable className="rounded-xl bg-emerald-100 px-6 py-2.5 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50">
            <Text className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase">
              ADD
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-[#0B1120]"
      style={{ paddingTop: insets.top }}
    >
      {/* 1. TOP HEADER: Location & Profile */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2 bg-gray-50 dark:bg-[#0B1120] z-10">
        <View className="flex-1">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="map-marker"
              size={24}
              color={isDark ? "#34D399" : "#10B981"}
            />
            <Text className="ml-1 text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Silicon Valley
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={24}
              color={isDark ? "white" : "black"}
            />
          </View>
          <Text
            className="ml-7 text-xs font-semibold text-gray-500 dark:text-slate-400"
            numberOfLines={1}
          >
            Madhapur, Hyderabad, Telangana
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(home)/profile")}
          className="ml-4 h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
        >
          <MaterialCommunityIcons
            name="account-outline"
            size={26}
            color={isDark ? "white" : "black"}
          />
        </Pressable>
      </View>

      {/* MAIN SCROLLVIEW - stickyHeaderIndices=[1] makes the Search Bar stick to the top! */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* INDEX 0: GREETING & COMPACT DELIVERY TOGGLE */}
        <View className="px-4 mt-2 mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Hello, {displayFirstName}!
          </Text>

          {/* Compact Toggle container */}
          <View className="flex-row rounded-xl bg-gray-200 p-1 dark:bg-[#1A222C]">
            {["Delivery", "Takeaway", "Dine-in"].map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setOrderMode(tab)}
                className={`items-center justify-center rounded-md px-3 py-1.5 ${
                  orderMode === tab
                    ? "bg-[#3DEC8A] shadow-sm"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs ${
                    orderMode === tab
                      ? "font-extrabold text-gray-900"
                      : "font-semibold text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* INDEX 1: STICKY SEARCH BAR & VEG TOGGLE */}
        <View className="px-4 py-3 bg-gray-50 dark:bg-[#0B1120] z-50">
          <View className="flex-row items-center gap-3">
            {/* Main Search Bar Box (Fixed iOS/Android Center Alignment) */}
            <View className="flex-1 flex-row items-center h-12 rounded-2xl bg-white px-4 shadow-sm dark:bg-[#1E293B] border border-gray-200 dark:border-slate-700/60">
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />

              <TextInput
                placeholder="Search for 'Biryani'"
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="ml-3 flex-1 text-base font-semibold text-gray-900 dark:text-white"
                style={{
                  textAlignVertical: "center",
                  paddingVertical: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                  includeFontPadding: false,
                }}
              />

              {/* Divider & Microphone Icon */}
              <View className="flex-row items-center pl-3">
                <View className="h-5 w-[1px] bg-gray-300 dark:bg-slate-600 mr-3" />
                <Pressable onPress={() => console.log("Mic pressed")}>
                  <MaterialCommunityIcons
                    name="microphone"
                    size={20}
                    color="#F97316"
                  />
                </Pressable>
              </View>
            </View>

            {/* VEG Toggle Button */}
            <Pressable
              onPress={() => setIsVegOnly(!isVegOnly)}
              className={`flex-row items-center justify-center rounded-2xl px-3.5 py-3 border shadow-sm ${
                isVegOnly
                  ? "bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-800"
                  : "bg-white border-gray-200 dark:bg-[#1E293B] dark:border-slate-700/60"
              }`}
            >
              <View className="items-center">
                <Text
                  className={`text-[10px] font-black tracking-wider ${isVegOnly ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-slate-300"}`}
                >
                  VEG
                </Text>
                <View
                  className={`mt-0.5 h-3.5 w-3.5 rounded-sm border items-center justify-center ${isVegOnly ? "border-green-600 bg-green-600" : "border-gray-400 bg-transparent"}`}
                >
                  {isVegOnly && (
                    <View className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* VIDEO BANNER SECTION (Placed right below search bar) */}
        <View className="px-4 mt-4 mb-2">
          <View className="relative h-48 w-full overflow-hidden rounded-[24px] bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-700/50">
            <VideoView
              player={player}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              nativeControls={false}
            />
            <View className="absolute inset-0 bg-black/20 pointer-events-none" />
            <View className="absolute bottom-4 left-4 pointer-events-none">
              <View className="self-start rounded-lg bg-emerald-600 px-2.5 py-1 mb-1">
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

        {/* OFFERS SCROLL */}
        <View className="mt-2 mb-8">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {OFFERS.map((offer) => (
              <Pressable
                key={offer.id}
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
                    <Text className="text-xs font-black text-emerald-600">
                      ORDER NOW
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* CATEGORIES PILLS */}
        <View className="mb-10 px-4">
          <Text className="mb-4 text-xl font-black text-gray-900 dark:text-white">
            Explore Menu
          </Text>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {CATEGORIES.map((cat) => (
              <Pressable key={cat.id} className="items-center w-[18%]">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800 border border-gray-100 dark:border-slate-700/50 mb-2">
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={28}
                    color={isDark ? "#34D399" : "#10B981"}
                  />
                </View>
                <Text className="text-xs font-bold text-gray-600 dark:text-slate-300">
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SPOTLIGHT / BEST SELLERS (2-Column Dense Grid) */}
        <View className="px-4 mb-8">
          <Text className="mb-4 text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            In The Spotlight
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {BEST_SELLERS.filter((i) => !isVegOnly || i.isVeg).map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* HORIZONTAL SECTION: Authentic Biryanis */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Authentic Biryanis
            </Text>
            <MaterialCommunityIcons
              name="arrow-right-circle"
              size={28}
              color={isDark ? "#34D399" : "#10B981"}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {BIRYANIS.filter((i) => !isVegOnly || i.isVeg).map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                widthOverride={width * 0.65}
              />
            ))}
          </ScrollView>
        </View>

        {/* HORIZONTAL SECTION: Grills & Tikkas */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Grills & Tikkas
            </Text>
            <MaterialCommunityIcons
              name="arrow-right-circle"
              size={28}
              color={isDark ? "#34D399" : "#10B981"}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {GRILLS.filter((i) => !isVegOnly || i.isVeg).map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                widthOverride={width * 0.65}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
