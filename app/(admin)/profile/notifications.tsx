import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import {
  INITIAL_REVENUE_NOTIFICATIONS,
  RevenueNotification,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const [notifications, setNotifications] = useState<RevenueNotification[]>([]);
  const [, forceUpdate] = useState({});

  useFocusEffect(
    useCallback(() => {
      setNotifications([...INITIAL_REVENUE_NOTIFICATIONS]);
    }, []),
  );

  const markAsRead = (id: string) => {
    const item = INITIAL_REVENUE_NOTIFICATIONS.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
    }
    setNotifications([...INITIAL_REVENUE_NOTIFICATIONS]);
    forceUpdate({});
  };

  const markAllAsRead = () => {
    INITIAL_REVENUE_NOTIFICATIONS.forEach((n) => {
      n.isRead = true;
    });
    setNotifications([...INITIAL_REVENUE_NOTIFICATIONS]);
    forceUpdate({});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text
          className="text-xl font-black flex-1"
          style={{ color: theme.text }}
        >
          Financial & Revenue Notifications
        </Text>
        <Pressable
          onPress={markAllAsRead}
          className="px-3 py-1.5 rounded-xl border"
          style={{ borderColor: theme.border, backgroundColor: theme.bg }}
        >
          <Text className="text-xs font-bold" style={{ color: theme.primary }}>
            Mark All Read
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Automated Periodic Revenue Audits
        </Text>

        {notifications.map((item) => (
          <Pressable key={item.id} onPress={() => markAsRead(item.id)}>
            <Card
              variant="default"
              className="p-5 mb-4 rounded-3xl border-0 shadow-lg"
              style={{
                backgroundColor: theme.card,
                borderLeftWidth: 4,
                borderLeftColor: item.isRead ? theme.border : theme.primary,
              }}
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text
                    className="text-base font-black mb-0.5"
                    style={{ color: theme.text }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.muted }}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                {!item.isRead && (
                  <View
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </View>

              <View
                className="py-3 my-2 px-4 rounded-2xl flex-row items-center justify-between"
                style={{ backgroundColor: theme.bg }}
              >
                <Text
                  className="text-xs font-bold uppercase"
                  style={{ color: theme.muted }}
                >
                  Total Revenue:
                </Text>
                <Text
                  className="text-lg font-black"
                  style={{ color: theme.primary }}
                >
                  {item.amount}
                </Text>
              </View>

              <Text
                className="text-xs font-medium leading-relaxed mb-3"
                style={{ color: theme.text }}
              >
                {item.description}
              </Text>

              <View
                className="flex-row items-center justify-between pt-2 border-t"
                style={{ borderTopColor: theme.border }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: theme.muted }}
                >
                  {item.timestamp}
                </Text>
                <Text
                  className="text-[10px] font-bold uppercase"
                  style={{ color: item.isRead ? theme.muted : theme.primary }}
                >
                  {item.isRead ? "Read" : "Tap to mark read"}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
