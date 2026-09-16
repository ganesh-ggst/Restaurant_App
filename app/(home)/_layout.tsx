import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  CheckCircle2,
  Compass,
  Home,
  Minus,
  Plus,
  ScrollText,
  Tag,
  Timer,
  X,
  XCircle,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { createContext, useContext, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCartModal } from "../../components/home/DeliveryCartModal";
import ViewCartButton from "../../components/home/ViewCartButton";
import { MOCK_ADDRESSES, MOCK_BRANCHES } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";

// --- GLOBAL STATES ---
export const OrderContext = createContext<any>(null);
export function useOrderMode() {
  return useContext(OrderContext);
}

export const FavoritesContext = createContext<any>(null);
export function useFavorites() {
  return useContext(FavoritesContext);
}

const { width } = Dimensions.get("window");
const MARGIN = 20;
const TAB_BAR_WIDTH = width - MARGIN * 2;

const getNumericPrice = (price: any) => {
  if (typeof price === "number") return price;
  return parseInt(String(price).replace(/\D/g, ""), 10) || 0;
};

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const inactiveColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const borderColor = isDark
    ? "hsla(149, 16%, 24%, 0.6)"
    : "hsla(141, 47%, 83%, 0.8)";

  const barBg =
    Platform.OS === "android"
      ? isDark
        ? "hsla(150, 31%, 9%, 0.95)"
        : "hsla(138, 47%, 97%, 0.95)"
      : isDark
        ? "hsla(149, 27%, 12%, 0.25)"
        : "hsla(0, 0%, 100%, 0.25)";

  const pillBg = isDark
    ? "hsla(149, 24%, 19%, 0.75)"
    : "hsla(143, 61%, 91%, 0.85)";

  const visibleRoutes = state.routes.filter(
    (route: any) => route.name !== "profile" && route.name !== "favorites",
  );

  const TAB_WIDTH = TAB_BAR_WIDTH / visibleRoutes.length;

  const currentVisibleIndex = visibleRoutes.findIndex(
    (route: any) => route.key === state.routes[state.index]?.key,
  );

  const animatedStyle = useAnimatedStyle(() => {
    const targetIndex = currentVisibleIndex >= 0 ? currentVisibleIndex : 0;
    return {
      transform: [
        {
          translateX: withSpring(targetIndex * TAB_WIDTH, {
            damping: 16,
            stiffness: 150,
            mass: 0.6,
          }),
        },
      ],
      opacity: withSpring(currentVisibleIndex >= 0 ? 1 : 0),
    };
  }, [currentVisibleIndex, TAB_WIDTH]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: barBg,
            borderColor: borderColor,
            borderWidth: 1,
          },
        ]}
      >
        {Platform.OS === "ios" && (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={20}
            style={StyleSheet.absoluteFill}
          />
        )}

        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: TAB_WIDTH - 24,
              backgroundColor: pillBg,
              borderColor: isDark
                ? "hsla(149, 16%, 24%, 0.5)"
                : "hsla(141, 47%, 83%, 0.6)",
              borderWidth: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
            },
            animatedStyle,
          ]}
        />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;
            const isFocused = currentVisibleIndex === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (route.name === "search") {
                  navigation.navigate(route.name, { category: undefined });
                } else if (route.name === "offers") {
                  navigation.navigate(route.name, { offerId: undefined });
                } else {
                  navigation.navigate(route.name, route.params);
                }
              }
            };

            let IconComponent = Home;
            if (route.name === "offers") IconComponent = Tag;
            if (route.name === "search") IconComponent = Compass;
            if (route.name === "orders") IconComponent = ScrollText;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={[styles.tabItem, { width: TAB_WIDTH }]}
              >
                <IconComponent
                  size={24}
                  color={isFocused ? activeColor : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 2}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={{
                    color: isFocused ? activeColor : inactiveColor,
                    fontSize: 10,
                    fontWeight: isFocused ? "900" : "800",
                    letterSpacing: 0.3,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 20,
    left: MARGIN,
    right: MARGIN,
    height: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  tabContainer: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  slidingPill: {
    position: "absolute",
    height: 56,
    top: 7,
    left: 12,
    borderRadius: 28,
  },
  tabItem: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});

export default function HomeLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState("Delivery");
  const [favorites, setFavorites] = useState<number[]>([]);

  // CART & CORE STATES
  const [carts, setCarts] = useState<{ [key: string]: any[] }>({
    Delivery: [],
    "Dine-in/Takeaway": [],
  });
  const [activeAddress, setActiveAddress] = useState(MOCK_ADDRESSES[0]);
  const [activeBranch, setActiveBranch] = useState(MOCK_BRANCHES[0]);
  const [showCartModal, setShowCartModal] = useState(false);

  // GLOBALLY MANAGED DINE-IN STATES
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);

  const [dineInCartState, setDineInCartState] = useState<
    "idle" | "waiting" | "approved" | "rejected"
  >("idle");
  const [orderCountdown, setOrderCountdown] = useState(60);
  const [pendingOrderSnapshot, setPendingOrderSnapshot] = useState<any[]>([]);
  const [showDineInCartModal, setShowDineInCartModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const activeCart = carts[mode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const activeCartSubtotal = activeCart.reduce(
    (sum: number, item: any) =>
      sum + (item.total || getNumericPrice(item.price) * item.quantity),
    0,
  );

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAddToCart = (
    item: any,
    quantity: number,
    addons: string[],
    totalAmount: number,
  ) => {
    setCarts((prev) => {
      const currentCart = prev[mode] || [];
      const existing = currentCart.find((c) => c.id === item.id);

      let newModeCart;
      if (existing) {
        newModeCart = currentCart.map((c) =>
          c.id === item.id
            ? {
                ...c,
                quantity: c.quantity + quantity,
                addons,
                total: c.total + totalAmount,
              }
            : c,
        );
      } else {
        newModeCart = [
          ...currentCart,
          { ...item, quantity, addons, total: totalAmount },
        ];
      }
      return { ...prev, [mode]: newModeCart };
    });
  };

  const handleDecrementCartItem = (itemId: number) => {
    setCarts((prev) => {
      const currentCart = prev[mode] || [];
      const existing = currentCart.find((c) => c.id === itemId);

      let newModeCart;
      if (existing && existing.quantity > 1) {
        const unitPrice = existing.total
          ? existing.total / existing.quantity
          : getNumericPrice(existing.price);
        newModeCart = currentCart.map((c) =>
          c.id === itemId
            ? {
                ...c,
                quantity: c.quantity - 1,
                total: existing.total ? existing.total - unitPrice : undefined,
              }
            : c,
        );
      } else {
        newModeCart = currentCart.filter((c) => c.id !== itemId);
        if (newModeCart.length === 0) setShowCartModal(false);
      }
      return { ...prev, [mode]: newModeCart };
    });
  };

  // BACKGROUND TIMERS
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (
      activeTable &&
      activeCartTotalItems === 0 &&
      confirmedOrders.length === 0
    ) {
      if (timeLeft === null) setTimeLeft(15 * 60);

      interval = setInterval(() => {
        // FIX: Added explicit Type to prev to prevent TS Error
        setTimeLeft((prev: number | null) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            setActiveTable(null);
            setMode("Delivery");
            setShowTimeoutModal(true);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(interval);
  }, [activeTable, activeCartTotalItems, confirmedOrders]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (dineInCartState === "waiting" && orderCountdown > 0) {
      timer = setInterval(() => {
        // FIX: Added explicit Type to prev to prevent TS Error
        setOrderCountdown((prev: number) => prev - 1);
      }, 1000);
    } else if (dineInCartState === "waiting" && orderCountdown === 0) {
      const isAvailable = Math.random() > 0.1;

      if (isAvailable) {
        setDineInCartState("approved");
        setConfirmedOrders((prev) => [...prev, ...pendingOrderSnapshot]);
      } else {
        setDineInCartState("rejected");
      }
    }
    return () => clearInterval(timer);
  }, [dineInCartState, orderCountdown, pendingOrderSnapshot]);

  // ACTIONS
  const handleConfirmOrder = () => {
    setPendingOrderSnapshot((prev) => [...prev, ...activeCart]);
    setDineInCartState("waiting");
    setOrderCountdown(60);
    setCarts((prev) => ({ ...prev, [mode]: [] }));
  };

  const handleCancelOrder = () => {
    setCarts((prev) => {
      const currentCart = prev[mode] || [];
      const restoredCart = [...currentCart];
      pendingOrderSnapshot.forEach((snapItem) => {
        const existing = restoredCart.find((c) => c.id === snapItem.id);
        if (existing) {
          existing.quantity += snapItem.quantity;
          existing.total += snapItem.total;
        } else {
          restoredCart.push(snapItem);
        }
      });
      return { ...prev, [mode]: restoredCart };
    });
    setDineInCartState("idle");
    setOrderCountdown(60);
    setPendingOrderSnapshot([]);
  };

  const shouldShowGlobalCartButton =
    activeCartTotalItems > 0 ||
    (mode === "Dine-in" && dineInCartState !== "idle");

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
      <OrderContext.Provider
        value={{
          mode,
          setMode,
          carts,
          setCarts,
          activeAddress,
          setActiveAddress,
          activeBranch,
          setActiveBranch,
          handleAddToCart,
          handleDecrementCartItem,
          activeTable,
          setActiveTable,
          timeLeft,
          confirmedOrders,
          setConfirmedOrders,
          dineInCartState, // Exposed to index.tsx so header knows when to lock!
        }}
      >
        <View className="flex-1" style={{ backgroundColor: theme.bg }}>
          <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="offers" options={{ title: "Offers" }} />
            <Tabs.Screen name="search" options={{ title: "Menu" }} />
            <Tabs.Screen name="orders" options={{ title: "Orders" }} />
            <Tabs.Screen
              name="profile"
              options={{ href: null, title: "My Profile" }}
            />
            <Tabs.Screen
              name="favorites"
              options={{ href: null, title: "Favorites" }}
            />
          </Tabs>

          {/* GLOBAL VIEW CART BAR (Handles all modes reliably across all tabs) */}
          {shouldShowGlobalCartButton &&
            !showCartModal &&
            !showDineInCartModal && (
              <ViewCartButton
                orderMode={mode}
                activeCartTotalItems={activeCartTotalItems}
                dineInCartState={dineInCartState}
                orderCountdown={orderCountdown}
                theme={theme}
                onPress={() => {
                  if (mode === "Dine-in") {
                    setShowDineInCartModal(true);
                  } else {
                    setShowCartModal(true);
                  }
                }}
              />
            )}

          {/* DELIVERY & TAKEAWAY MODAL */}
          <DeliveryCartModal
            visible={showCartModal}
            onClose={() => setShowCartModal(false)}
            cart={activeCart}
            onIncrement={handleAddToCart}
            onDecrement={handleDecrementCartItem}
            theme={theme}
            insets={insets}
            activeAddress={mode === "Delivery" ? activeAddress : activeBranch}
            setActiveAddress={
              mode === "Delivery" ? setActiveAddress : setActiveBranch
            }
            orderMode={mode}
          />

          {/* DINE-IN MODAL (Now Global, supports minus/plus functionality) */}
          <Modal
            visible={showDineInCartModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDineInCartModal(false)}
          >
            <Pressable
              className="flex-1 justify-end bg-black/60"
              onPress={() => setShowDineInCartModal(false)}
            >
              <Pressable
                className="rounded-t-[32px] p-6 pb-12"
                style={{
                  backgroundColor: theme.bg,
                  minHeight: "50%",
                  maxHeight: "85%",
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    className="text-2xl font-black"
                    style={{ color: theme.text }}
                  >
                    Table {activeTable}
                  </Text>
                  <Pressable
                    onPress={() => setShowDineInCartModal(false)}
                    className="p-2 bg-gray-500/10 rounded-full"
                  >
                    <X size={20} color={theme.text} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* --- 1. KITCHEN TRACKING STATUS CARD --- */}
                  {dineInCartState !== "idle" && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      className="rounded-[24px] p-5 mb-6 shadow-sm border"
                      style={{
                        backgroundColor:
                          dineInCartState === "waiting"
                            ? "#FFFBEB"
                            : dineInCartState === "approved"
                              ? "#ECFDF5"
                              : "#FEF2F2",
                        borderColor:
                          dineInCartState === "waiting"
                            ? "#FDE68A"
                            : dineInCartState === "approved"
                              ? "#A7F3D0"
                              : "#FECACA",
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                          {dineInCartState === "waiting" && (
                            <Timer size={24} color="#F59E0B" />
                          )}
                          {dineInCartState === "approved" && (
                            <CheckCircle2 size={24} color="#10B981" />
                          )}
                          {dineInCartState === "rejected" && (
                            <XCircle size={24} color="#EF4444" />
                          )}
                          <Text
                            className="text-lg font-black ml-2 tracking-tight"
                            style={{
                              color:
                                dineInCartState === "waiting"
                                  ? "#D97706"
                                  : dineInCartState === "approved"
                                    ? "#059669"
                                    : "#DC2626",
                            }}
                          >
                            {dineInCartState === "waiting"
                              ? "Kitchen Reviewing..."
                              : dineInCartState === "approved"
                                ? "Order Approved!"
                                : "Items Unavailable"}
                          </Text>
                        </View>
                        {dineInCartState === "waiting" && (
                          <View className="bg-orange-200 px-3 py-1 rounded-full">
                            <Text className="font-black text-orange-700">
                              00:{orderCountdown.toString().padStart(2, "0")}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="mb-4">
                        {pendingOrderSnapshot.map((item: any, idx: number) => (
                          <View
                            key={idx}
                            className="flex-row justify-between items-center mb-1.5"
                          >
                            <Text className="text-sm font-bold text-gray-700">
                              {item.quantity}x {item.name}
                            </Text>
                            <Text className="text-sm font-bold text-gray-700">
                              ₹
                              {formatPrice(
                                item.total ||
                                  getNumericPrice(item.price) * item.quantity,
                              )}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {dineInCartState === "waiting" ? (
                        <Pressable
                          onPress={handleCancelOrder}
                          className="w-full py-3 rounded-xl items-center justify-center shadow-sm"
                          style={{ backgroundColor: "#EF4444" }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-wider">
                            Cancel this Request
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setDineInCartState("idle");
                            setPendingOrderSnapshot([]);
                          }}
                          className="w-full py-3 rounded-xl items-center justify-center shadow-sm"
                          style={{ backgroundColor: "#1F2937" }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-wider">
                            Dismiss
                          </Text>
                        </Pressable>
                      )}
                    </Animated.View>
                  )}

                  {/* --- 2. FRESH UNCONFIRMED ITEMS (WITH EDIT CONTROLS) --- */}
                  {activeCartTotalItems > 0 && (
                    <View>
                      {dineInCartState !== "idle" && (
                        <Text
                          className="text-lg font-black mb-3"
                          style={{ color: theme.text }}
                        >
                          Unconfirmed Items
                        </Text>
                      )}

                      <View className="mb-2">
                        {activeCart.map((item: any) => {
                          const itemPriceNumber = getNumericPrice(item.price);
                          const itemTotal =
                            item.total || itemPriceNumber * item.quantity;

                          return (
                            <View
                              key={item.id}
                              className="flex-row justify-between items-center mb-4"
                            >
                              <View className="flex-1 mr-4">
                                <Text
                                  className="text-base font-bold"
                                  style={{ color: theme.text }}
                                >
                                  {item.name}
                                </Text>
                                <Text
                                  className="text-sm font-semibold mt-1"
                                  style={{ color: theme.muted }}
                                >
                                  ₹{formatPrice(itemPriceNumber)}
                                </Text>
                              </View>

                              <View className="items-end">
                                <View
                                  className="flex-row items-center rounded-lg border"
                                  style={{
                                    backgroundColor: theme.isDark
                                      ? "rgba(255,255,255,0.05)"
                                      : "#f3f4f6",
                                    borderColor: theme.border,
                                  }}
                                >
                                  <Pressable
                                    onPress={() => {
                                      if (item.quantity > 1) {
                                        const unitPrice =
                                          itemTotal / item.quantity;
                                        handleAddToCart(
                                          item,
                                          -1,
                                          item.addons || [],
                                          -unitPrice,
                                        );
                                      } else {
                                        handleDecrementCartItem(item.id);
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
                                    onPress={() => {
                                      const unitPrice =
                                        itemTotal / item.quantity;
                                      handleAddToCart(
                                        item,
                                        1,
                                        item.addons || [],
                                        unitPrice,
                                      );
                                    }}
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
                                  className="text-sm font-black mt-2"
                                  style={{ color: theme.text }}
                                >
                                  ₹{formatPrice(itemTotal)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      <View
                        className="border-t pt-4 mt-2 mb-6"
                        style={{ borderColor: theme.border }}
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text
                            className="text-sm font-bold"
                            style={{ color: theme.muted }}
                          >
                            Item Total
                          </Text>
                          <Text
                            className="text-sm font-bold"
                            style={{ color: theme.text }}
                          >
                            ₹{formatPrice(activeCartSubtotal)}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-semibold mb-3"
                          style={{ color: theme.muted }}
                        >
                          Taxes will be added to your final table bill.
                        </Text>
                        <View className="flex-row justify-between items-center">
                          <Text
                            className="text-xl font-black"
                            style={{ color: theme.text }}
                          >
                            Total
                          </Text>
                          <Text
                            className="text-xl font-black"
                            style={{ color: theme.primary }}
                          >
                            ₹{formatPrice(activeCartSubtotal)}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={handleConfirmOrder}
                        className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Text className="text-white font-black text-lg tracking-wide">
                          Confirm & Send to Kitchen
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* --- 3. EMPTY STATE HELPERS --- */}
                  {activeCartTotalItems === 0 && dineInCartState !== "idle" && (
                    <Pressable
                      onPress={() => setShowDineInCartModal(false)}
                      className="mt-2 py-4 items-center"
                    >
                      <Text
                        className="font-black text-base"
                        style={{ color: theme.primary }}
                      >
                        Continue Browsing Menu
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {/* GLOBAL TIMEOUT MODAL */}
          <Modal
            visible={showTimeoutModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimeoutModal(false)}
          >
            <Pressable
              className="flex-1 justify-center items-center bg-black/60 px-6"
              onPress={() => setShowTimeoutModal(false)}
            >
              <Pressable
                className="w-full rounded-[32px] p-6 items-center shadow-lg"
                style={{ backgroundColor: theme.bg }}
                onPress={(e) => e.stopPropagation()}
              >
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                >
                  <Timer size={40} color="#EF4444" />
                </View>
                <Text
                  className="text-2xl font-black mb-2"
                  style={{ color: theme.text }}
                >
                  Session Expired
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  Your table was released due to 15 minutes of inactivity.
                  Please scan a table again when you are ready to order.
                </Text>
                <Pressable
                  onPress={() => setShowTimeoutModal(false)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Understood
                  </Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </OrderContext.Provider>
    </FavoritesContext.Provider>
  );
}
