import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCurrentManager } from "@/hooks/useCurrentManager";
import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function ManagerNotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  // const { phone } = useLocalSearchParams<{ phone: string }>();
  // const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  const { currentManager, normalizedPhone, isOperations } = useCurrentManager();

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // const currentManager = MANAGER_MOCK_DATA.managers.find(
    //   (m) => m.phone === normalizedPhone,
    // );
    if (currentManager) {
      // Dynamically generate mock notifications ONLY for this manager's assigned tables
      const t1 = currentManager.assignedTables[0].replace("T", "");
      const t2 = currentManager.assignedTables[1].replace("T", "");

      setNotifications([
        {
          id: "n1",
          type: "table_cleared",
          tableId: currentManager.assignedTables[0],
          tableNumber: t1,
          title: `Table ${t1} is now Empty`,
          message: `All customers have left Table ${t1}. The table is now completely free and needs cleaning.`,
          time: "2 mins ago",
          read: false,
        },
        {
          id: "n3",
          type: "waiter_call",
          tableId: currentManager.assignedTables[1],
          tableNumber: t2,
          title: "Waiter Requested",
          message: `Table ${t2} is calling for their assigned waiter.`,
          time: "10 mins ago",
          read: true,
        },
      ]);
    }
  }, [normalizedPhone]);

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View
        className="flex-row items-center justify-between px-6 pt-4 pb-4 border-b"
        style={{ borderBottomColor: theme.border }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
            hitSlop={20}
          >
            <Text className="text-2xl" style={{ color: theme.text }}>
              ←
            </Text>
          </Pressable>
          <Text className="text-2xl font-bold" style={{ color: theme.text }}>
            Notifications
          </Text>
        </View>

        {unreadCount > 0 && (
          <Pressable onPress={markAllAsRead}>
            <Text
              className="text-sm font-bold"
              style={{ color: theme.primary }}
            >
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView className="flex-1 px-6 pt-4 pb-8">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            variant="default"
            className={`p-4 mb-3 border-l-4 rounded-2xl`}
            style={{
              borderLeftColor: notification.read
                ? "transparent"
                : theme.primary,
              opacity: notification.read ? 0.7 : 1,
            }}
          >
            <View className="flex-row justify-between items-start mb-1">
              <Text
                className="text-base font-bold flex-1 mr-2"
                style={{ color: theme.text }}
              >
                {notification.title}
              </Text>
              <Text className="text-xs mt-1" style={{ color: theme.muted }}>
                {notification.time}
              </Text>
            </View>

            <Text className="text-sm leading-5" style={{ color: theme.text }}>
              {notification.message}
            </Text>

            {!notification.read && notification.type === "table_cleared" && (
              <Pressable
                className="mt-3 py-2 px-4 rounded-lg self-start"
                style={{ backgroundColor: theme.primary }}
                onPress={() =>
                  router.push(
                    `/(manager)/table/${notification.tableId}?phone=${encodeURIComponent(normalizedPhone)}` as any,
                  )
                }
              >
                <Text className="text-xs font-bold text-black">
                  View Table {notification.tableNumber}
                </Text>
              </Pressable>
            )}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
