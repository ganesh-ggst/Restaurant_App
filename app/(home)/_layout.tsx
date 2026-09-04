import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { Platform, StyleSheet } from "react-native";

export default function HomeLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Colors matching the high-contrast aesthetic
  const activeColor = isDark ? "#34D399" : "#10B981"; // Emerald
  const inactiveColor = isDark ? "#9CA3AF" : "#6B7280"; // Slate 400 / Gray 500

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The magic for the floating pill design
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 32 : 20,
          left: 20,
          right: 20,
          height: 68,
          borderRadius: 34,
          borderTopWidth: 0,
          paddingBottom: 0, // Overrides default iOS safe area padding
          // Android gets a near-solid background since BlurView doesn't work the same way
          backgroundColor:
            Platform.OS === "ios"
              ? "transparent"
              : isDark
                ? "rgba(30, 41, 59, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        // Injects the glass effect behind the absolute positioned tab bar on iOS
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              tint={isDark ? "dark" : "light"}
              intensity={85}
              style={StyleSheet.absoluteFill}
              className="overflow-hidden rounded-[34px]"
            />
          ) : undefined,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-variant"
              size={size + 2}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Menu",
          tabBarLabel: "Menu",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt-text"
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden from the tab bar, accessed via top-right profile icon on Home */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "My Profile",
        }}
      />
    </Tabs>
  );
}
