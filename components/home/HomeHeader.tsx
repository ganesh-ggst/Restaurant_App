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
import { Image } from "expo-image";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import type { useAppTheme } from "../../hooks/useAppTheme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LoadingWave } from "../ui/LoadingWave";

const hasImageUri = (uri: unknown): uri is string =>
  typeof uri === "string" && uri.trim().length > 0;
const MAX_VISIBLE_CATEGORIES = 4;
const CATEGORY_ITEM_WIDTH = 88;
const TYPEWRITER_CHARACTER_INTERVAL_MS = 35;
const TYPEWRITER_PAUSE_MS = 1000;
type HomeHeaderTheme = ReturnType<typeof useAppTheme>;

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

const TypewriterText = memo(
  ({
    messages,
    enabled,
    className,
    style,
    numberOfLines,
  }: {
    messages: string[];
    enabled: boolean;
    className?: string;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
  }) => (
    <Text className={className} numberOfLines={numberOfLines} style={style}>
      {useTypewriter(messages, enabled)}
    </Text>
  ),
);
TypewriterText.displayName = "TypewriterText";

const HomeSearchInput = memo(
  ({
    theme,
    searchQuery,
    setSearchQuery,
    isListening,
    isVoiceSearching,
    handleVoiceSearch,
    searchPlaceholders,
    branchContentLoaded,
  }: {
    theme: HomeHeaderTheme;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isListening: boolean;
    isVoiceSearching: boolean;
    handleVoiceSearch: () => void;
    searchPlaceholders: string[];
    branchContentLoaded: boolean;
  }) => {
    const [inputQuery, setInputQuery] = useState(searchQuery);
    const micPulse = useSharedValue(1);

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
    }, [isListening, micPulse]);

    const animatedMicStyle = useAnimatedStyle(() => ({
      transform: [{ scale: micPulse.value }],
    }));

    const handleSearchInputChange = (query: string) => {
      setInputQuery(query);
      startTransition(() => setSearchQuery(query));
    };

    return (
      <View
        className="flex-1 flex-row items-center rounded-2xl px-4 h-12 border"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <Search size={20} color={theme.muted} strokeWidth={2.5} />
        <View className="flex-1 justify-center ml-3 relative h-full">
          {searchPlaceholders.length > 0 &&
            inputQuery.length === 0 &&
            !isListening && (
              <Animated.View
                style={{ position: "absolute", left: 0, right: 0 }}
                pointerEvents="none"
              >
                <TypewriterText
                  messages={searchPlaceholders}
                  enabled={branchContentLoaded}
                  style={{
                    color: theme.muted,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                  numberOfLines={1}
                />
              </Animated.View>
            )}
          {(isListening || isVoiceSearching) && (
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
                {isVoiceSearching ? "Searching menu..." : "Listening..."}
              </Text>
            </View>
          )}
          <TextInput
            value={inputQuery}
            onChangeText={handleSearchInputChange}
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
          <Pressable
            onPress={handleVoiceSearch}
            disabled={isVoiceSearching}
            accessibilityRole="button"
            accessibilityLabel={
              isListening ? "Stop voice search" : "Start voice search"
            }
          >
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
    );
  },
);
HomeSearchInput.displayName = "HomeSearchInput";

const VegFilterButton = memo(
  ({
    theme,
    isVegOnly,
    onChange,
  }: {
    theme: HomeHeaderTheme;
    isVegOnly: boolean;
    onChange: (value: boolean) => void;
  }) => {
    const [optimisticValue, setOptimisticValue] = useState<boolean | null>(
      null,
    );
    const isSelected = optimisticValue ?? isVegOnly;

    const handlePress = useCallback(() => {
      const nextValue = !isSelected;
      setOptimisticValue(nextValue);
      onChange(nextValue);
    }, [isSelected, onChange]);

    return (
      <Pressable
        onPress={handlePress}
        className="flex-row items-center justify-center rounded-2xl px-4 border"
        style={{
          flexShrink: 0,
          backgroundColor: isSelected ? theme.primary : theme.card,
          borderColor: isSelected ? theme.primary : theme.border,
        }}
      >
        <View
          className="w-3 h-3 border justify-center items-center rounded-[2px] mr-1.5"
          style={{ borderColor: isSelected ? "#fff" : theme.muted }}
        >
          {isSelected && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
        </View>
        <Text
          numberOfLines={1}
          className="text-xs font-black tracking-wider"
          style={{ color: isSelected ? "#fff" : theme.muted }}
        >
          VEG
        </Text>
      </Pressable>
    );
  },
);
VegFilterButton.displayName = "VegFilterButton";

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
    searchInputRevision = 0,
    setSearchQuery,
    isListening,
    isVoiceSearching,
    handleVoiceSearch,
    isVegOnly,
    onVegFilterChange,
    categories,
    hasSpotlightItems = false,
    offersCarousel,
    featuredReel,
    restaurantName,
    greetings = [],
    searchPlaceholders = [],
    branchContentLoaded = false,
    featuredReelsLoaded = false,
    isBranchOnline = false,
    isBranchStatusLoading = true,
    hasSelectedBranch = false,
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
    const greetingTextStyle = useMemo(
      () => ({ color: theme.text }),
      [theme.text],
    );
    const categoryItemWidth =
      categoryViewportWidth > 0
        ? categoryViewportWidth / MAX_VISIBLE_CATEGORIES
        : CATEGORY_ITEM_WIDTH;
    const visibleCategoryViewportWidth =
      categoryViewportWidth || categoryItemWidth * MAX_VISIBLE_CATEGORIES;
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
          {hasImageUri(item.iconUrl) ? (
            <Image
              source={{ uri: item.iconUrl }}
              style={{ width: 40, height: 40 }}
              contentFit="contain"
              cachePolicy="disk"
            />
          ) : item.icon?.trim() ? (
            <Text className="text-3xl">{item.icon}</Text>
          ) : (
            <UtensilsCrossed
              size={26}
              color={theme.primary}
              strokeWidth={2}
            />
          )}
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
              <TypewriterText
                messages={greetingPhrases}
                enabled={branchContentLoaded}
                className="text-lg font-black tracking-tight"
                numberOfLines={2}
                style={greetingTextStyle}
              />
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
            <HomeSearchInput
              key={searchInputRevision}
              theme={theme}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isListening={isListening}
              isVoiceSearching={isVoiceSearching}
              handleVoiceSearch={handleVoiceSearch}
              searchPlaceholders={searchPlaceholders}
              branchContentLoaded={branchContentLoaded}
            />

            <VegFilterButton
              theme={theme}
              isVegOnly={isVegOnly}
              onChange={onVegFilterChange}
            />
          </View>
        </View>

        {isBranchStatusLoading ? (
          <View>
            {(orderMode === "Delivery" || orderMode === "Takeaway") &&
            !searchQuery ? (
              <>
                <View className="mb-6 px-4">
                  <LoadingWave
                    className="mb-3 h-5 w-32 rounded"
                    isDark={theme.isDark}
                    style={{ backgroundColor: theme.card }}
                  />
                  <LoadingWave
                    className="h-48 rounded-[24px] border"
                    isDark={theme.isDark}
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    }}
                  />
                </View>
                <View className="mb-6 px-4">
                  <LoadingWave
                    className="mb-3 h-5 w-36 rounded"
                    isDark={theme.isDark}
                    style={{ backgroundColor: theme.card }}
                  />
                  <LoadingWave
                    className="h-40 rounded-[24px] border"
                    isDark={theme.isDark}
                    style={{
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      borderWidth: 1,
                    }}
                  />
                </View>
                <View className="mb-6 px-4">
                  <LoadingWave
                    className="mb-4 h-6 w-36 rounded"
                    isDark={theme.isDark}
                    style={{ backgroundColor: theme.card }}
                  />
                  <View className="flex-row justify-between">
                    {[0, 1, 2, 3].map((item) => (
                      <View key={item} className="items-center">
                        <LoadingWave
                          className="h-16 w-16 rounded-2xl border"
                          isDark={theme.isDark}
                          style={{
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          }}
                        />
                        <LoadingWave
                          className="mt-2 h-3 w-12 rounded"
                          isDark={theme.isDark}
                          style={{ backgroundColor: theme.card }}
                        />
                      </View>
                    ))}
                  </View>
                </View>
                <View className="mb-4 px-4">
                  <LoadingWave
                    className="h-6 w-40 rounded"
                    isDark={theme.isDark}
                    style={{ backgroundColor: theme.card }}
                  />
                </View>
              </>
            ) : (
              <LoadingWave
                className="mx-4 mb-6 h-32 rounded-[24px] border"
                isDark={theme.isDark}
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
              />
            )}
          </View>
        ) : !hasSelectedBranch ? (
          <View
            className="mx-4 mb-6 rounded-2xl border p-5"
            style={{ borderColor: theme.border, backgroundColor: theme.card }}
          >
            <Text className="text-lg font-black" style={{ color: theme.text }}>
              Choose a restaurant branch
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.muted }}>
              Select a branch above to browse its menu and offers.
            </Text>
          </View>
        ) : !isBranchOnline ? (
          <View
            className="mx-4 mb-6 rounded-2xl border p-5"
            style={{ borderColor: theme.border, backgroundColor: theme.card }}
          >
            <Text className="text-lg font-black" style={{ color: theme.text }}>
              {restaurantName
                ? `${restaurantName} is closed`
                : "Restaurant is closed"}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: theme.muted }}>
              This restaurant is currently offline. Please check back later or
              choose another branch.
            </Text>
          </View>
        ) : (
          <>
            {(orderMode === "Delivery" || orderMode === "Takeaway") &&
            !searchQuery ? (
              <View>
                {!featuredReelsLoaded ? (
                  <View className="w-full px-4 mb-2">
                    <Text
                      className="mb-3 text-xl font-black"
                      style={{ color: theme.text }}
                    >
                      Featured Content
                    </Text>
                    <LoadingWave
                      className="h-48 w-full rounded-[24px] border"
                      isDark={theme.isDark}
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    />
                  </View>
                ) : featuredReel ? (
                  <View className="w-full px-4 mb-2">
                    <Text
                      className="mb-3 text-xl font-black"
                      style={{ color: theme.text }}
                    >
                      Featured Content
                    </Text>
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
                          contentFit="cover"
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
                        {featuredReel.subtitle?.trim() ? (
                          <Text
                            className="mt-1 text-sm font-semibold text-white/90"
                            numberOfLines={2}
                          >
                            {featuredReel.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : null}

            {offersCarousel}

                {categories.length > 0 ? (
                  <View className="mb-10">
                    <Text
                      className="mb-4 text-xl font-black px-4"
                      style={{ color: theme.text }}
                    >
                      Explore Menu
                    </Text>
                    <View
                      className="w-full px-4"
                      style={{
                        overflow: "hidden",
                      }}
                    >
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        overScrollMode="never"
                        style={{
                          width: "100%",
                          flexGrow: 0,
                        }}
                        nestedScrollEnabled
                        directionalLockEnabled
                        snapToInterval={categoryItemWidth}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        onLayout={(event) =>
                          setCategoryViewportWidth(
                            event.nativeEvent.layout.width,
                          )
                        }
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
                                    event.nativeEvent.contentOffset.x /
                                      maxOffset,
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
                ) : null}
                {hasSpotlightItems ? (
                  <Text
                    className="mb-4 text-2xl font-black tracking-tight px-4"
                    style={{ color: theme.text }}
                  >
                    In The Spotlight
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* STORE UI: Show ONLY for Dine-In */}
            {orderMode === "Dine-in" && !searchQuery ? (
              <View>
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
                        <View className="flex-row">
                          {!(isTimerRunning || confirmedOrdersLength > 0) && (
                            <Pressable
                              onPress={onOpenScanner}
                              className="bg-white/20 px-4 py-2 rounded-xl mr-2"
                            >
                              <Text className="text-white font-bold text-xs">
                                Change Table
                              </Text>
                            </Pressable>
                          )}
                          {!isTimerRunning && (
                            <Pressable
                              onPress={onLeaveTable}
                              className="bg-white/20 px-4 py-2 rounded-xl"
                            >
                              <Text className="text-white font-bold text-xs">
                                Leave Table
                              </Text>
                            </Pressable>
                          )}
                        </View>
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
                        <ScanLine
                          size={32}
                          color={theme.primary}
                          strokeWidth={2}
                        />
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
                        <Wifi
                          size={28}
                          color={theme.primary}
                          strokeWidth={1.5}
                        />
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
                        <ShoppingBag
                          size={22}
                          color="#059669"
                          strokeWidth={2}
                        />
                      </View>
                      <View>
                        <Text
                          className="text-lg font-black"
                          style={{ color: theme.text }}
                        >
                          Track Your Order
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
              </View>
            ) : null}

        {searchQuery && (
          <Text
            className="text-xl font-black tracking-tight px-4 mb-4 mt-2"
            style={{ color: theme.text }}
          >
            Search Results
          </Text>
        )}
          </>
        )}
      </View>
    );
  },
);
HomeHeader.displayName = "HomeHeader";
