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
  UtensilsCrossed,
  Wifi,
} from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const hasImageUri = (uri: unknown): uri is string =>
  typeof uri === "string" && uri.trim().length > 0;
const MAX_VISIBLE_CATEGORIES = 4;
const CATEGORY_ITEM_WIDTH = 88;
const TYPEWRITER_CHARACTER_INTERVAL_MS = 35;
const TYPEWRITER_PAUSE_MS = 1000;

function useTypewriter(messages: string[], enabled: boolean) {
  const [typedValue, setTypedValue] = useState<{
    messages: string[];
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    let messageIndex = 0;
    let characterIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const typeNextCharacter = () => {
      const message = messages[messageIndex];
      if (characterIndex < message.length) {
        characterIndex += 1;
        setTypedValue({ messages, text: message.slice(0, characterIndex) });
        timeout = setTimeout(
          typeNextCharacter,
          TYPEWRITER_CHARACTER_INTERVAL_MS,
        );
        return;
      }

      timeout = setTimeout(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        characterIndex = 0;
        typeNextCharacter();
      }, TYPEWRITER_PAUSE_MS);
    };

    timeout = setTimeout(typeNextCharacter, TYPEWRITER_CHARACTER_INTERVAL_MS);

    return () => clearTimeout(timeout);
  }, [enabled, messages]);

  return enabled && typedValue?.messages === messages ? typedValue.text : "";
}

export const HomeHeader = memo(
  ({
    theme,
    orderMode,
    onSelectOrderMode,
    isOrderLocked,
    onOpenScanner,
    onCallWaiter,
    onRequestWater,
    onRequestWifi,
    onRequestBill,
    onOrderTakeaway,
    onLeaveTable,
    searchQuery,
    setSearchQuery,
    isListening,
    handleVoiceSearch,
    isVegOnly,
    setIsVegOnly,
    categories,
    offersCarousel,
    featuredReel,
    restaurantName,
    greetings = [],
    searchPlaceholders = [],
    branchContentLoaded = false,
    router,
    activeTable,
    timeLeft,
    confirmedOrdersLength = 0,
    isTimerRunning = false,
  }: any) => {
    const [categoryViewportWidth, setCategoryViewportWidth] = useState(0);
    const [categoryContentWidth, setCategoryContentWidth] = useState(0);
    const [categoryScrollProgress, setCategoryScrollProgress] = useState(0);
    const greetingPhrases = greetings;
    const categoryItemWidth =
      categoryViewportWidth > 0
        ? Math.min(
            CATEGORY_ITEM_WIDTH,
            categoryViewportWidth / MAX_VISIBLE_CATEGORIES,
          )
        : CATEGORY_ITEM_WIDTH;
    const visibleCategoryViewportWidth =
      categoryItemWidth * MAX_VISIBLE_CATEGORIES;
    const titleScale = useSharedValue(1);
    const micPulse = useSharedValue(1);
    const typedGreeting = useTypewriter(
      greetings,
      branchContentLoaded && greetings.length > 0,
    );
    const typedPlaceholder = useTypewriter(
      searchPlaceholders,
      branchContentLoaded && searchPlaceholders.length > 0,
    );

    useEffect(() => {
      titleScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1200 }),
          withTiming(0.98, { duration: 1200 }),
        ),
        -1,
        true,
      );
    }, [titleScale]);

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

    const animatedTitleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: titleScale.value }],
    }));
    const animatedMicStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micPulse.value }],
    }));
    const formattedTime = timeLeft
      ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`
      : null;

    const renderCategory = ({ item }: any) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(home)/search",
            params: { category: item.name },
          })
        }
        className="items-center justify-center"
        style={{ width: categoryItemWidth }}
      >
        <View
          className="h-16 w-16 items-center justify-center rounded-2xl shadow-sm border mb-2"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <item.displayIcon size={26} color={theme.primary} strokeWidth={2} />
        </View>
        <Text
          className="text-xs font-bold"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            width: 64,
            color: theme.muted,
            textAlign: "center",
          }}
        >
          {item.name}
        </Text>
      </Pressable>
    );

    return (
      <View style={{ width: "100%" }}>
        <View className="px-4 mb-4 mt-2">
          {branchContentLoaded && greetingPhrases.length > 0 && (
            <View className="mb-3">
              <Text
                className="text-lg font-black tracking-tight"
                numberOfLines={2}
                style={{ color: theme.text }}
              >
                {typedGreeting}
              </Text>
            </View>
          )}
          <View
            className="flex-row rounded-2xl border p-1"
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
          >
            {[
              { id: "Delivery", label: "Delivery", Icon: Bike },
              { id: "Takeaway", label: "Takeaway", Icon: ShoppingBag },
              { id: "Dine-in", label: "Dine-in", Icon: Store },
            ].map(({ id, label, Icon }) => {
              const isActive = orderMode === id;
              return (
                <Pressable
                  key={id}
                  disabled={isOrderLocked || isActive}
                  onPress={() => onSelectOrderMode(id)}
                  className="flex-1 flex-row items-center justify-center rounded-xl px-2 py-2"
                  style={{
                    backgroundColor: isActive ? theme.primary : "transparent",
                    opacity: isOrderLocked && !isActive ? 0.5 : 1,
                  }}
                >
                  <Icon
                    size={14}
                    color={isActive ? "#fff" : theme.muted}
                    strokeWidth={2.5}
                  />
                  <Text
                    numberOfLines={1}
                    className="ml-1 font-black text-[10px] uppercase tracking-wide"
                    style={{ color: isActive ? "#fff" : theme.muted }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
                {branchContentLoaded &&
                  searchPlaceholders.length > 0 &&
                  searchQuery.length === 0 &&
                  !isListening && (
                    <Animated.View
                      style={{ position: "absolute", left: 0, right: 0 }}
                      pointerEvents="none"
                    >
                      <Text
                        style={{
                          color: theme.muted,
                          fontSize: 16,
                          fontWeight: "500",
                        }}
                        numberOfLines={1}
                      >
                        {typedPlaceholder}
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

        {(orderMode === "Delivery" || orderMode === "Takeaway") &&
        !searchQuery ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            {featuredReel ? (
              <View className="px-4 mb-2">
                <View
                  className="relative h-48 w-full overflow-hidden rounded-[24px] shadow-sm border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  {hasImageUri(featuredReel.imageUrl) ? (
                    <Image
                      source={{ uri: featuredReel.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View className="absolute inset-0 bg-black/20 pointer-events-none" />
                  <View className="absolute bottom-4 left-4 pointer-events-none">
                    <View
                      className="self-start rounded-lg px-2.5 py-1 mb-1"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                        {featuredReel.badge || "FEATURED"}
                      </Text>
                    </View>
                    <Text className="text-xl font-black text-white shadow-md">
                      {featuredReel.title}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {offersCarousel}

            <View className="mb-10">
              <Text
                className="mb-4 text-xl font-black px-4"
                style={{ color: theme.text }}
              >
                Explore Menu
              </Text>
              <View
                className="w-full"
                style={{ overflow: "hidden" }}
                onLayout={(event) =>
                  setCategoryViewportWidth(event.nativeEvent.layout.width)
                }
              >
                <View
                  style={{
                    width: visibleCategoryViewportWidth,
                    maxWidth: "100%",
                    alignSelf: "center",
                  }}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{
                      width: visibleCategoryViewportWidth,
                      flexGrow: 0,
                    }}
                    nestedScrollEnabled
                    directionalLockEnabled
                    onContentSizeChange={(contentWidth) =>
                      setCategoryContentWidth(contentWidth)
                    }
                    onScroll={(event) => {
                      const maxOffset =
                        categoryContentWidth - visibleCategoryViewportWidth;
                      setCategoryScrollProgress(
                        maxOffset > 0
                          ? Math.max(
                              0,
                              Math.min(
                                event.nativeEvent.contentOffset.x / maxOffset,
                                1,
                              ),
                            )
                          : 0,
                      );
                    }}
                    scrollEventThrottle={16}
                  >
                    {categories.map((item: any) => (
                      <View key={item.id}>{renderCategory({ item })}</View>
                    ))}
                  </ScrollView>
                </View>
                {categoryContentWidth > visibleCategoryViewportWidth && (
                  <View className="mt-3 mb-1 items-center">
                    <View
                      className="h-1 w-12 overflow-hidden rounded-full"
                      style={{ backgroundColor: theme.border }}
                    >
                      <View
                        className="h-1 w-4 rounded-full"
                        style={{
                          backgroundColor: theme.primary,
                          transform: [
                            {
                              translateX: categoryScrollProgress * 32,
                            },
                          ],
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
            <Text
              className="mb-4 text-2xl font-black tracking-tight px-4"
              style={{ color: theme.text }}
            >
              In The Spotlight
            </Text>
          </Animated.View>
        ) : null}

        {/* STORE UI: Show ONLY for Dine-In */}
        {orderMode === "Dine-in" && !searchQuery ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
          >
            <View className="px-4 mb-6">
              {activeTable ? (
                <View
                  className="w-full rounded-[24px] shadow-sm border p-6 flex-row items-center justify-between"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.border,
                  }}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-white/20 px-2 py-1 rounded-md mr-2">
                        <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                          Connected
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-white/90 uppercase tracking-widest">
                        Table {activeTable}{" "}
                        {formattedTime ? ` • ${formattedTime}` : ""}
                      </Text>
                    </View>
                    <Text className="text-2xl font-black text-white tracking-tight leading-tight">
                      Ready to Order!
                    </Text>
                    <Text className="text-sm font-semibold text-white/80 mt-1 mb-3">
                      Your food will be served directly to your table.
                    </Text>

                    {/* FIX: Re-structured this view so both buttons display cleanly side by side! */}
                    {!(isTimerRunning || confirmedOrdersLength > 0) && (
                      <View className="flex-row">
                        <Pressable
                          onPress={onOpenScanner}
                          className="bg-white/20 px-4 py-2 rounded-xl mr-2"
                        >
                          <Text className="text-white font-bold text-xs">
                            Change Table
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={onLeaveTable}
                          className="bg-white/20 px-4 py-2 rounded-xl"
                        >
                          <Text className="text-white font-bold text-xs">
                            Leave Table
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <View className="h-16 w-16 bg-white rounded-2xl items-center justify-center shadow-lg transform rotate-3 ml-2">
                    <UtensilsCrossed
                      size={32}
                      color={theme.primary}
                      strokeWidth={2}
                    />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={onOpenScanner}
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
                  <View className="h-16 w-16 bg-white rounded-2xl items-center justify-center shadow-lg transform rotate-3 ml-2">
                    <ScanLine size={32} color={theme.primary} strokeWidth={2} />
                  </View>
                </Pressable>
              )}
            </View>

            <View className="px-4 mb-10">
              <Text
                className="mb-4 text-lg font-black uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                In-Store Services
              </Text>
              <View className="flex-row justify-between">
                <Pressable className="items-center" onPress={onCallWaiter}>
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

                <Pressable className="items-center" onPress={onRequestWater}>
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

                <Pressable className="items-center" onPress={onRequestWifi}>
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

                <Pressable className="items-center" onPress={onRequestBill}>
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
                onPress={onOrderTakeaway}
                className="w-full rounded-[20px] shadow-sm border p-5 flex-row items-center justify-between"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-12 w-12 rounded-full items-center justify-center mb-0"
                    style={{
                      backgroundColor: "rgba(5, 150, 105, 0.15)",
                      marginRight: 16,
                    }}
                  >
                    <ShoppingBag size={22} color="#059669" strokeWidth={2} />
                  </View>
                  <View>
                    <Text
                      className="text-lg font-black"
                      style={{ color: theme.text }}
                    >
                      Track Your Order
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
