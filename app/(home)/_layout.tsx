import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { Platform } from "react-native";

export default function HomeLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const tabBarBgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(0, 0%, 100%)";
  const inactiveColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const activeColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarBgColor,
          borderTopWidth: 0, // Removed border for a sleeker look
          elevation: 10, // Added shadow for Android
          shadowColor: "#000", // Added shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 85 : 65,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: tabBarBgColor,
          borderBottomColor: borderColor,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: activeColor,
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false, // Hiding native header so our custom layout takes over
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
          headerTitle: "Explore Menu",
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
          headerTitle: "My Orders",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="receipt-text"
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* 
        Setting href: null completely hides this from the bottom tab bar, 
        but keeps it accessible via the profile icon on the home screen! 
      */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerShown: true,
          title: "My Profile",
          headerTitle: "My Profile",
        }}
      />
    </Tabs>
  );
}
