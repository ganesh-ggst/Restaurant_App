import { useUser } from "@clerk/expo";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  BellRing,
  ChevronDown,
  ChevronRightCircle,
  MapPin,
  Mic,
  Receipt,
  ScanLine,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  Wifi,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { CATEGORIES, FOOD_ITEMS, OFFERS } from "../../constants/mockData";
import { useAppTheme } from "../../constants/theme";
import { getUserByPhone } from "../../lib/db";
import { useOrderMode } from "./_layout";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const theme = useAppTheme(); 

  const { mode, setMode } = useOrderMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);

  const player = useVideoPlayer(
    require("../../assets/videos/show-video.mp4"),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg, paddingTop: insets.top }}>
      
      {/* DYNAMIC TOP HEADER */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-2 z-10" style={{ backgroundColor: theme.bg }}>
        <View className="flex-1">
          <View className="flex-row items-center">
            {mode === "Delivery" ? (
              <MapPin size={22} color={theme.primary} strokeWidth={2.5} />
            ) : (
              <Store size={22} color={theme.primary} strokeWidth={2.5} />
            )}
            <Text className="ml-1 text-xl font-black tracking-tight" style={{ color: theme.text }}>
              {mode === "Delivery" ? "Deliver to:" : "Currently at:"}
            </Text>
            <ChevronDown size={20} color={theme.text} strokeWidth={2.5} style={{ marginLeft: 4 }} />
          </View>
          <Text className="ml-7 text-xs font-bold mt-0.5 tracking-wide" style={{ color: theme.primary }} numberOfLines={1}>
            {mode === "Delivery" ? "Silicon Valley, Madhapur" : "Hitech City Premium Branch"}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(home)/profile")}
          className="ml-4 h-11 w-11 items-center justify-center rounded-full shadow-sm border"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <UserRound size={22} color={theme.text} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        
        {/* GREETING & TOGGLE */}
        <View className="px-4 mt-2 mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>
            Hello, {displayFirstName}!
          </Text>

          <Pressable onPress={() => setMode(mode === "Delivery" ? "Dine-In" : "Delivery")} className="flex-row items-center">
            <Text className="text-[10px] font-black uppercase tracking-wider mr-2" style={{ color: mode === "Delivery" ? theme.primary : theme.muted }}>
              Delivery
            </Text>
            <View className="w-10 h-5 rounded-full justify-center px-0.5 border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <View className={`w-4 h-4 rounded-full shadow-sm ${mode === "Delivery" ? "self-start" : "self-end"}`} style={{ backgroundColor: theme.primary }} />
            </View>
            <Text className="text-[10px] font-black uppercase tracking-wider ml-2" style={{ color: mode !== "Delivery" ? theme.primary : theme.muted }}>
              Dine-In
            </Text>
          </Pressable>
        </View>

        {/* SHARED STICKY SEARCH BAR */}
        <View style={{ backgroundColor: theme.bg, paddingHorizontal: 16, paddingVertical: 12, zIndex: 50 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: 16, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: theme.border }}>
              <Search size={20} color={theme.muted} strokeWidth={2.5} />
              <TextInput
                placeholder={mode === "Delivery" ? "Search for 'Biryani'" : "Search in-store menu..."}
                placeholderTextColor={theme.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 16, fontWeight: "500", includeFontPadding: false, paddingVertical: 0 }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 12 }}>
                <View style={{ height: 20, width: 1, marginRight: 12, backgroundColor: theme.border }} />
                <Pressable onPress={() => console.log("Mic pressed")}>
                  <Mic size={18} color={theme.primary} strokeWidth={2.5} />
                </Pressable>
              </View>
            </View>
            <Pressable onPress={() => setIsVegOnly(!isVegOnly)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: isVegOnly ? theme.primary : theme.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: isVegOnly ? theme.primary : theme.border }}>
              <View style={{ width: 12, height: 12, borderWidth: 1, borderColor: isVegOnly ? "#fff" : theme.muted, justifyContent: "center", alignItems: "center", borderRadius: 2, marginRight: 6 }}>
                {isVegOnly && <View style={{ width: 6, height: 6, backgroundColor: "#fff", borderRadius: 3 }} />}
              </View>
              <Text style={{ color: isVegOnly ? "#fff" : theme.muted, fontSize: 12, fontWeight: "900", letterSpacing: 0.5 }}>VEG</Text>
            </Pressable>
          </View>
        </View>

        {/* CONTENT TRANSITION BLOCK */}
        <View className="mt-2">
          
          {/* ==================================================== */}
          {/* 🛵 DELIVERY VIEW */}
          {/* ==================================================== */}
          {mode === "Delivery" ? (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
              
              <View className="px-4 mb-2">
                <View className="relative h-48 w-full overflow-hidden rounded-[24px] shadow-sm border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                  <VideoView player={player} style={{ width: "100%", height: "100%" }} contentFit="cover" nativeControls={false} />
                  <View className="absolute inset-0 bg-black/20 pointer-events-none" />
                  <View className="absolute bottom-4 left-4 pointer-events-none">
                    <View className="self-start rounded-lg px-2.5 py-1 mb-1" style={{ backgroundColor: theme.primary }}>
                      <Text className="text-[10px] font-black text-white uppercase tracking-wider">Featured Reel</Text>
                    </View>
                    <Text className="text-xl font-black text-white shadow-md">Freshly Crafted Daily</Text>
                  </View>
                </View>
              </View>

              <View className="mt-2 mb-8">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
                  {OFFERS.map((offer) => (
                    <Pressable key={offer.id} className="relative h-40 overflow-hidden rounded-[24px]" style={{ width: width * 0.85 }}>
                      <Image source={{ uri: offer.image }} className="absolute h-full w-full" resizeMode="cover" />
                      <View className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/20" />
                      <View className="absolute inset-0 p-5 justify-center">
                        <Text className="text-4xl font-black text-white tracking-tighter">{offer.title}</Text>
                        <Text className="text-base font-bold text-gray-200 mt-1">{offer.subtitle}</Text>
                        <View className="mt-4 self-start rounded-xl bg-white px-5 py-2">
                          <Text className="text-xs font-black" style={{ color: theme.primary }}>ORDER NOW</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View className="mb-10 px-4">
                <Text className="mb-4 text-xl font-black" style={{ color: theme.text }}>Explore Menu</Text>
                <View className="flex-row flex-wrap justify-between gap-y-4">
                  {CATEGORIES.map((cat) => (
                    <Pressable key={cat.id} className="items-center w-[18%]">
                      <View className="h-16 w-16 items-center justify-center rounded-2xl shadow-sm border mb-2" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                        <cat.icon size={26} color={theme.primary} strokeWidth={2} />
                      </View>
                      <Text className="text-xs font-bold" style={{ color: theme.muted }}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="px-4 mb-8">
                <Text className="mb-4 text-2xl font-black tracking-tight" style={{ color: theme.text }}>In The Spotlight</Text>
                <View className="flex-row flex-wrap justify-between">
                  {FOOD_ITEMS.filter((i) => !isVegOnly || i.isVeg).map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </View>
              </View>

            </Animated.View>

          ) : (

          /* ==================================================== */
          /* 🍽️ IN-STORE VIEW (DINE-IN) */
          /* ==================================================== */
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
              
              <View className="px-4 mb-6">
                <Pressable 
                  className="w-full rounded-[24px] overflow-hidden shadow-sm border p-6 flex-row items-center justify-between"
                  style={{ backgroundColor: theme.primary, borderColor: theme.border }}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-white/20 px-2 py-1 rounded-md mr-2">
                        <Text className="text-[10px] font-black text-white uppercase tracking-wider">Step 1</Text>
                      </View>
                      <Text className="text-sm font-bold text-white/90 uppercase tracking-widest">Order to Table</Text>
                    </View>
                    <Text className="text-2xl font-black text-white tracking-tight leading-tight">Scan Table QR</Text>
                    <Text className="text-sm font-semibold text-white/80 mt-1">Open digital menu instantly.</Text>
                  </View>
                  <View className="h-16 w-16 bg-white rounded-2xl items-center justify-center shadow-lg transform rotate-3">
                    <ScanLine size={32} color={theme.primary} strokeWidth={2} />
                  </View>
                </Pressable>
              </View>

              <View className="px-4 mb-10">
                <Text className="mb-4 text-lg font-black uppercase tracking-wider" style={{ color: theme.muted }}>In-Store Services</Text>
                {/* Changed justify-between to justify-around since there are only 3 items now */}
                <View className="flex-row justify-around">
                  <Pressable className="items-center">
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                      <BellRing size={28} color={theme.primary} strokeWidth={1.5} />
                    </View>
                    <Text className="text-xs font-bold" style={{ color: theme.text }}>Call Waiter</Text>
                  </Pressable>
                  <Pressable className="items-center">
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                      <Wifi size={28} color={theme.primary} strokeWidth={1.5} />
                    </View>
                    <Text className="text-xs font-bold" style={{ color: theme.text }}>Free Wi-Fi</Text>
                  </Pressable>
                  <Pressable className="items-center">
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] shadow-sm border mb-2" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                      <Receipt size={28} color={theme.primary} strokeWidth={1.5} />
                    </View>
                    <Text className="text-xs font-bold" style={{ color: theme.text }}>Pay Bill</Text>
                  </Pressable>
                </View>
              </View>

              <View className="px-4 mb-8">
                <Pressable 
                  className="w-full rounded-[20px] shadow-sm border p-5 flex-row items-center justify-between"
                  style={{ backgroundColor: theme.card, borderColor: theme.border }}
                >
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 rounded-full items-center justify-center border mr-4" style={{ backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: theme.border }}>
                      <ShoppingBag size={22} color={theme.text} strokeWidth={2} />
                    </View>
                    <View>
                      <Text className="text-lg font-black" style={{ color: theme.text }}>Order Takeaway</Text>
                      <Text className="text-xs font-semibold" style={{ color: theme.muted }}>Pick up at the counter in 15 mins.</Text>
                    </View>
                  </View>
                  <ChevronRightCircle size={24} color={theme.primary} strokeWidth={2} />
                </Pressable>
              </View>

              <View className="mb-8">
                <View className="flex-row justify-between items-center px-4 mb-4">
                  <Text className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Trending at this Branch</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
                  {FOOD_ITEMS.filter((i) => !isVegOnly || i.isVeg).map((item) => (
                    <FoodCard key={item.id} item={item} widthOverride={width * 0.65} />
                  ))}
                </ScrollView>
              </View>

            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}