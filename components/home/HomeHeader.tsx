import { VideoView } from "expo-video";
import {
  BellRing,
  Bike,
  ChevronRightCircle,
  GlassWater,
  Mic,
  Receipt,
  ScanLine,
  Search,
  ShoppingBag,
  Store,
  Wifi,
} from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  CATEGORIES,
  FEATURED_CONTENT,
  GREETING_PHRASES,
  OFFERS,
  RESTAURANT_NAME,
  SEARCH_PLACEHOLDERS,
} from "../../constants/mockData";

const { width } = Dimensions.get("window");

export const HomeHeader = memo(
  ({
    theme,
    orderMode,
    setOrderMode,
    searchQuery,
    setSearchQuery,
    isListening,
    handleVoiceSearch,
    isVegOnly,
    setIsVegOnly,
    player,
    router,
  }: any) => {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const placeholderOpacity = useSharedValue(1);

    const [greetingIndex, setGreetingIndex] = useState(0);
    const greetingOpacity = useSharedValue(1);

    const titleScale = useSharedValue(1);
    const micPulse = useSharedValue(1);

    useEffect(() => {
      const searchInterval = setInterval(() => {
        placeholderOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(setPlaceholderIndex)(
            (prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length,
          );
          placeholderOpacity.value = withTiming(1, { duration: 300 });
        });
      }, 3000);

      const greetingInterval = setInterval(() => {
        greetingOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(setGreetingIndex)(
            (prev) => (prev + 1) % GREETING_PHRASES.length,
          );
          greetingOpacity.value = withTiming(1, { duration: 300 });
        });
      }, 4000);

      titleScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1200 }),
          withTiming(0.98, { duration: 1200 }),
        ),
        -1,
        true,
      );

      return () => {
        clearInterval(searchInterval);
        clearInterval(greetingInterval);
      };
    }, []);

    useEffect(() => {
      if (isListening) {
        micPulse.value = withRepeat(
          withSequence(
            withTiming(1.5, { duration: 500 }),
            withTiming(1, { duration: 500 }),
          ),
          -1,
          true,
        );
      } else {
        micPulse.value = withTiming(1);
      }
    }, [isListening]);

    const animatedPlaceholderStyle = useAnimatedStyle(() => ({
      opacity: placeholderOpacity.value,
    }));
    const animatedGreetingStyle = useAnimatedStyle(() => ({
      opacity: greetingOpacity.value,
    }));
    const animatedTitleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: titleScale.value }],
    }));
    const animatedMicStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micPulse.value }],
    }));

    const renderOffer = ({ item }: any) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(home)/offers",
            params: { offerId: item.id },
          })
        }
        className="relative h-40 overflow-hidden rounded-[24px]"
        style={{ width: width * 0.85 }}
      >
        <Image
          source={{ uri: item.image }}
          className="absolute h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/20" />
        <View className="absolute inset-0 p-5 justify-center">
          <Text className="text-4xl font-black text-white tracking-tighter">
            {item.title}
          </Text>
          <Text className="text-base font-bold text-gray-200 mt-1">
            {item.subtitle}
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
    );

    const renderCategory = ({ item }: any) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(home)/search",
            params: { category: item.name },
          })
        }
        className="items-center mx-3"
      >
        <View
          className="h-16 w-16 items-center justify-center rounded-2xl shadow-sm border mb-2"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <item.icon size={26} color={theme.primary} strokeWidth={2} />
        </View>
        <Text className="text-xs font-bold" style={{ color: theme.muted }}>
          {item.name}
        </Text>
      </Pressable>
    );

    return (
      <View>
        <Animated.View
          style={animatedTitleStyle}
          className="items-center mt-2 mb-1"
        >
          <Text
            className="text-4xl font-black italic tracking-widest uppercase"
            style={{
              color: theme.primary,
              textShadowColor: "rgba(0,0,0,0.1)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {RESTAURANT_NAME}
          </Text>
        </Animated.View>

        <View className="px-4 mb-4 mt-2 flex-row items-center justify-between">
          <Animated.View style={animatedGreetingStyle} className="flex-1">
            <Text
              className="text-lg font-black tracking-tight"
              style={{ color: theme.text }}
            >
              {GREETING_PHRASES[greetingIndex]}
            </Text>
          </Animated.View>

          <Pressable
            onPress={() =>
              setOrderMode(
                orderMode === "Delivery" ? "Dine-in/Takeaway" : "Delivery",
              )
            }
            className="flex-row items-center justify-center rounded-xl px-3 py-1.5 border shadow-sm"
            style={{
              backgroundColor:
                orderMode === "Delivery" ? theme.primary : theme.card,
              borderColor:
                orderMode === "Delivery" ? theme.primary : theme.border,
            }}
          >
            {orderMode === "Delivery" ? (
              <Bike
                size={16}
                color="#fff"
                strokeWidth={2.5}
                style={{ marginRight: 6 }}
              />
            ) : (
              <Store
                size={16}
                color={theme.muted}
                strokeWidth={2.5}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              className="font-black text-xs uppercase tracking-wider"
              style={{ color: orderMode === "Delivery" ? "#fff" : theme.muted }}
            >
              {orderMode === "Delivery" ? "Delivery" : "Dine-In"}
            </Text>
          </Pressable>
        </View>

        <View
          className="px-4 py-3 z-50 mb-2"
          style={{ backgroundColor: theme.bg }}
        >
          <View className="flex-row gap-3">
            <View
              className="flex-1 flex-row items-center rounded-2xl px-4 h-12 border"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <Search size={20} color={theme.muted} strokeWidth={2.5} />
              <View className="flex-1 justify-center ml-3 relative h-full">
                {searchQuery.length === 0 && !isListening && (
                  <Animated.View
                    style={[
                      { position: "absolute", left: 0 },
                      animatedPlaceholderStyle,
                    ]}
                    pointerEvents="none"
                  >
                    <Text
                      style={{
                        color: theme.muted,
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      Search for '{SEARCH_PLACEHOLDERS[placeholderIndex]}'
                    </Text>
                  </Animated.View>
                )}
                {isListening && (
                  <View
                    style={{ position: "absolute", left: 0 }}
                    pointerEvents="none"
                  >
                    <Text
                      style={{
                        color: theme.primary,
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      Listening...
                    </Text>
                  </View>
                )}
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "500",
                    paddingVertical: 0,
                  }}
                />
              </View>
              <View className="flex-row items-center pl-3">
                <View
                  className="h-5 w-[1px] mr-3"
                  style={{ backgroundColor: theme.border }}
                />
                <Pressable onPress={handleVoiceSearch}>
                  <Animated.View style={animatedMicStyle}>
                    <Mic
                      size={18}
                      color={isListening ? theme.danger : theme.primary}
                      strokeWidth={2.5}
                    />
                  </Animated.View>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => setIsVegOnly(!isVegOnly)}
              className="flex-row items-center justify-center rounded-2xl px-4 border"
              style={{
                backgroundColor: isVegOnly ? theme.primary : theme.card,
                borderColor: isVegOnly ? theme.primary : theme.border,
              }}
            >
              <View
                className="w-3 h-3 border justify-center items-center rounded-[2px] mr-1.5"
                style={{ borderColor: isVegOnly ? "#fff" : theme.muted }}
              >
                {isVegOnly && (
                  <View className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </View>
              <Text
                className="text-xs font-black tracking-wider"
                style={{ color: isVegOnly ? "#fff" : theme.muted }}
              >
                VEG
              </Text>
            </Pressable>
          </View>
        </View>

        {orderMode === "Delivery" && !searchQuery ? (
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
                {FEATURED_CONTENT.type === "video" ? (
                  <VideoView
                    player={player}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                ) : (
                  <Image
                    source={{ uri: FEATURED_CONTENT.source }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                )}
                <View className="absolute inset-0 bg-black/20 pointer-events-none" />
                <View className="absolute bottom-4 left-4 pointer-events-none">
                  <View
                    className="self-start rounded-lg px-2.5 py-1 mb-1"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                      {FEATURED_CONTENT.tag}
                    </Text>
                  </View>
                  <Text className="text-xl font-black text-white shadow-md">
                    {FEATURED_CONTENT.title}
                  </Text>
                </View>
              </View>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={OFFERS}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderOffer}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              className="mt-2 mb-8"
            />

            <View className="mb-10">
              <Text
                className="mb-4 text-xl font-black px-4"
                style={{ color: theme.text }}
              >
                Explore Menu
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderCategory}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>
            <Text
              className="mb-4 text-2xl font-black tracking-tight px-4"
              style={{ color: theme.text }}
            >
              In The Spotlight
            </Text>
          </Animated.View>
        ) : null}

        {orderMode !== "Delivery" && !searchQuery ? (
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
                      backgroundColor: theme.isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                      borderColor: theme.border,
                    }}
                  >
                    <ShoppingBag size={22} color={theme.text} strokeWidth={2} />
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
            <Text
              className="text-2xl font-black tracking-tight px-4 mb-4"
              style={{ color: theme.text }}
            >
              Trending at this Branch
            </Text>
          </Animated.View>
        ) : null}

        {searchQuery && (
          <Text
            className="text-xl font-black tracking-tight px-4 mb-4 mt-2"
            style={{ color: theme.text }}
          >
            Search Results
          </Text>
        )}
      </View>
    );
  },
);
