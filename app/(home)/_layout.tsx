import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  ChevronRightCircle,
  Compass,
  Home,
  ScrollText,
  Tag,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { createContext, useContext, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCartModal } from "../../components/home/DeliveryCartModal";
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

  // GLOBAL CART & ORDER STATES
  const [carts, setCarts] = useState<{ [key: string]: any[] }>({
    Delivery: [],
    "Dine-in/Takeaway": [],
  });
  const [activeAddress, setActiveAddress] = useState(MOCK_ADDRESSES[0]);
  const [activeBranch, setActiveBranch] = useState(MOCK_BRANCHES[0]);
  const [showCartModal, setShowCartModal] = useState(false);

  const activeCart = carts[mode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
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
        newModeCart = currentCart.map((c) =>
          c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c,
        );
      } else {
        newModeCart = currentCart.filter((c) => c.id !== itemId);
        if (newModeCart.length === 0) setShowCartModal(false);
      }
      return { ...prev, [mode]: newModeCart };
    });
  };

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

          {/* GLOBAL VIEW CART BAR */}
          {activeCartTotalItems > 0 && mode === "Delivery" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              className="absolute bottom-[110px] left-4 right-4 z-50"
            >
              <Pressable
                onPress={() => setShowCartModal(true)}
                className="flex-row items-center justify-between rounded-[20px] px-5 py-4 shadow-lg"
                style={{ backgroundColor: theme.primary }}
              >
                <Text className="text-white font-black text-lg tracking-tight">
                  {activeCartTotalItems} Item
                  {activeCartTotalItems > 1 ? "s" : ""} added
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-white font-black text-lg tracking-tight mr-1.5">
                    View Cart
                  </Text>
                  <ChevronRightCircle
                    size={22}
                    color="#fff"
                    strokeWidth={2.5}
                  />
                </View>
              </Pressable>
            </Animated.View>
          )}

          {/* GLOBAL CART MODAL */}
          <DeliveryCartModal
            visible={showCartModal}
            onClose={() => setShowCartModal(false)}
            cart={activeCart}
            onIncrement={handleAddToCart}
            onDecrement={handleDecrementCartItem}
            theme={theme}
            insets={insets}
            activeAddress={activeAddress}
          />
        </View>
      </OrderContext.Provider>
    </FavoritesContext.Provider>
  );
}
