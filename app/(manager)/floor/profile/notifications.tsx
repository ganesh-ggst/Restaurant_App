import { useRouter } from "expo-router";
import { ArrowLeft, Bell, CheckCircle, Clock } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import {
  FloorNotification,
  INITIAL_FLOOR_NOTIFICATIONS,
} from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../../hooks/useCurrentManager";

export default function FloorNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();

  const getTableNumber = (str: string) => {
    const match = String(str).match(/\d+/);
    return match ? match[0] : "";
  };

  const assignedTableValues = currentManager?.assignedTables || [];
  const assignedTableNums = new Set(
    assignedTableValues.map((val: string) => getTableNumber(val)),
  );

  const managerNotifications = INITIAL_FLOOR_NOTIFICATIONS.filter((n) => {
    let tNum = "";
    if (n.tableId) {
      tNum = getTableNumber(n.tableId);
    } else if (n.message) {
      const match = n.message.match(/Table\s+(\d+)/i);
      if (match) {
        tNum = match[1];
      }
    }
    if (!tNum) return false;
    return assignedTableNums.has(tNum);
  });

  const [notifications, setNotifications] =
    useState<FloorNotification[]>(managerNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    managerNotifications.forEach((n) => {
      const target = INITIAL_FLOOR_NOTIFICATIONS.find(
        (item) => item.id === n.id,
      );
      if (target) target.isRead = true;
    });
  };

  const handleNotificationPress = (item: FloorNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
    );
    const target = INITIAL_FLOOR_NOTIFICATIONS.find((n) => n.id === item.id);
    if (target) target.isRead = true;

    if (item.tableId) {
      router.push(`/(manager)/floor/table/${item.tableId}` as any);
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center justify-between px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-4 p-1"
            hitSlop={15}
          >
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <Text className="text-xl font-black" style={{ color: theme.text }}>
            Floor Notifications ({unreadCount})
          </Text>
        </View>

        {unreadCount > 0 && (
          <Pressable onPress={markAllAsRead}>
            <Text
              className="text-xs font-bold"
              style={{ color: theme.primary }}
            >
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => {
          return (
            <Pressable onPress={() => handleNotificationPress(item)}>
              <Card
                variant="default"
                className="p-5 mb-4 rounded-3xl border-0 shadow-sm"
                style={{
                  backgroundColor: item.isRead ? theme.card : theme.card,
                  borderLeftWidth: item.isRead ? 0 : 4,
                  borderLeftColor: theme.primary,
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className="p-3 rounded-2xl mr-3.5"
                    style={{
                      backgroundColor: theme.isDark
                        ? "rgba(34, 197, 94, 0.15)"
                        : "rgba(34, 197, 94, 0.1)",
                    }}
                  >
                    <Bell size={22} color={theme.primary} />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className="text-base font-bold flex-1 mr-2"
                        style={{ color: theme.text }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Clock size={12} color={theme.muted} />
                        <Text
                          className="text-[10px] font-medium"
                          style={{ color: theme.muted }}
                        >
                          {item.timestamp}
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="text-xs font-medium mb-3 leading-5"
                      style={{ color: theme.muted }}
                    >
                      {item.message}
                    </Text>

                    <View className="flex-row justify-between items-center">
                      {!item.isRead ? (
                        <View
                          className="px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text className="text-[9px] font-bold text-white">
                            NEW
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className="text-[10px]"
                          style={{ color: theme.muted }}
                        >
                          Tap to view table
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center justify-center mt-10"
          >
            <CheckCircle size={40} color={theme.primary} className="mb-3" />
            <Text
              className="text-base font-bold mb-1"
              style={{ color: theme.text }}
            >
              All Caught Up!
            </Text>
            <Text
              className="text-xs text-center"
              style={{ color: theme.muted }}
            >
              No floor notifications right now.
            </Text>
          </Card>
        }
      />
    </View>
  );
}
