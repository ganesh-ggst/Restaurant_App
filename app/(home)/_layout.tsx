import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";

export default function HomeLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const tabBarBgColor = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const inactiveColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const activeColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarBgColor,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: tabBarBgColor,
          borderBottomColor: borderColor,
          borderBottomWidth: 1,
        },
        headerTintColor: activeColor,
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          headerTitle: "Welcome",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="home-variant"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarLabel: "Search",
          headerTitle: "Search Restaurants",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={size} color={color} />
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
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          headerTitle: "My Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
