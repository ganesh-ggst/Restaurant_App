import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomTabBar } from "../_layout";

const MIN_TAB_BAR_BOTTOM = 16;

export default function HomeTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} bottomInset={bottomInset} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="offers" options={{ title: "Offers" }} />
      <Tabs.Screen name="search" options={{ title: "Menu" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="profile" options={{ href: null, title: "My Profile" }} />
      <Tabs.Screen name="favorites" options={{ href: null, title: "Favorites" }} />
    </Tabs>
  );
}
