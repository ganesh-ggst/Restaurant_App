import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { 
  Home, Store, 
  Search, QrCode, 
  ShoppingBag, ReceiptText 
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { createContext, useContext, useState } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

// --- GLOBAL STATE: Shares the Delivery/Dine-In mode with the whole app ---
export const OrderContext = createContext<any>(null);
export function useOrderMode() {
  return useContext(OrderContext);
}

const { width } = Dimensions.get("window");
const MARGIN = 20;
const TAB_BAR_WIDTH = width - MARGIN * 2;

function CustomTabBar({ state, descriptors, navigation, mode }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const inactiveColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const borderColor = isDark ? "hsla(149, 16%, 24%, 0.6)" : "hsla(141, 47%, 83%, 0.8)";
  
  const barBg = Platform.OS === "android"
    ? (isDark ? "hsla(150, 31%, 9%, 0.95)" : "hsla(138, 47%, 97%, 0.95)")
    : (isDark ? "hsla(149, 27%, 12%, 0.4)" : "hsla(0, 0%, 100%, 0.4)");

  const pillBg = isDark ? "hsla(149, 24%, 19%, 0.85)" : "hsla(143, 61%, 91%, 0.95)";

  const visibleRoutes = state.routes.filter((route: any) => route.name !== "profile");
  const TAB_WIDTH = TAB_BAR_WIDTH / visibleRoutes.length;
  const currentVisibleIndex = visibleRoutes.findIndex((route: any) => route.key === state.routes[state.index]?.key);

  const animatedStyle = useAnimatedStyle(() => {
    const targetIndex = currentVisibleIndex >= 0 ? currentVisibleIndex : 0;
    return {
      transform: [{ translateX: withSpring(targetIndex * TAB_WIDTH, { damping: 16, stiffness: 150, mass: 0.6 }) }],
      opacity: withSpring(currentVisibleIndex >= 0 ? 1 : 0),
    };
  }, [currentVisibleIndex, TAB_WIDTH]);

  return (
    <View style={styles.container}>
      <View style={[styles.tabContainer, { backgroundColor: barBg, borderColor, borderWidth: 1 }]}>
        {Platform.OS === "ios" && <BlurView tint={isDark ? "dark" : "light"} intensity={25} style={StyleSheet.absoluteFill} />}

        <Animated.View
          style={[
            styles.slidingPill,
            { width: TAB_WIDTH - 24, backgroundColor: pillBg, borderColor: isDark ? "hsla(149, 16%, 24%, 0.5)" : "hsla(141, 47%, 83%, 0.6)", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
            animatedStyle,
          ]}
        />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const isFocused = currentVisibleIndex === index;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };

            // --- DYNAMIC NAV MORPHING BASED ON CONTEXT ---
            let IconComponent = Home;
            let dynamicLabel = "";

            if (route.name === "index") {
              IconComponent = mode === "Delivery" ? Home : Store;
              dynamicLabel = mode === "Delivery" ? "Home" : "Dashboard";
            } else if (route.name === "search") {
              IconComponent = mode === "Delivery" ? Search : QrCode;
              dynamicLabel = mode === "Delivery" ? "Menu" : "Scan/Menu";
            } else if (route.name === "orders") {
              IconComponent = mode === "Delivery" ? ShoppingBag : ReceiptText;
              dynamicLabel = mode === "Delivery" ? "Orders" : "My Table";
            }

            return (
              <Pressable key={route.key} onPress={onPress} style={[styles.tabItem, { width: TAB_WIDTH }]}>
                <IconComponent size={24} color={isFocused ? activeColor : inactiveColor} strokeWidth={isFocused ? 2.5 : 2} style={{ marginBottom: 4 }} />
                <Text style={{ color: isFocused ? activeColor : inactiveColor, fontSize: 10, fontWeight: isFocused ? "900" : "800", letterSpacing: 0.3 }}>
                  {dynamicLabel}
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
  container: { position: "absolute", bottom: Platform.OS === "ios" ? 34 : 20, left: MARGIN, right: MARGIN, height: 72, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  tabContainer: { flex: 1, borderRadius: 36, overflow: "hidden" },
  tabsRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  slidingPill: { position: "absolute", height: 56, top: 7, left: 12, borderRadius: 28 },
  tabItem: { height: "100%", justifyContent: "center", alignItems: "center", zIndex: 1 },
});

export default function HomeLayout() {
  const [mode, setMode] = useState("Delivery");

  return (
    <OrderContext.Provider value={{ mode, setMode }}>
      <Tabs tabBar={(props) => <CustomTabBar {...props} mode={mode} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="search" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
    </OrderContext.Provider>
  );
}