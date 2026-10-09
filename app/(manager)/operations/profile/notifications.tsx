import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft, Bell, Check, Trash2 } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import {
  ManagerNotification,
  managerProfileApi,
} from "../../../../services/api/manager-profile";

function notificationId(notification: ManagerNotification): string | undefined {
  return notification.id || notification._id;
}

export default function OperationsNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [notifications, setNotifications] = useState<ManagerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const hasLoaded = useRef(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasLoaded.current) setLoading(true);
    try {
      const page = await managerProfileApi.getNotifications();
      setNotifications(page.notifications);
      setUnreadCount(page.unreadCount);
      hasLoaded.current = true;
    } catch (error) {
      Alert.alert(
        "Unable to load notifications",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await managerProfileApi.markNotificationRead(id);
      await loadNotifications();
    } catch (error) {
      Alert.alert(
        "Unable to mark notification as read",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyId("");
    }
  };

  const markAllRead = async () => {
    setBusyId("all");
    try {
      await managerProfileApi.markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      Alert.alert(
        "Unable to mark notifications as read",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyId("");
    }
  };

  const deleteNotification = async (id: string) => {
    setBusyId(id);
    try {
      await managerProfileApi.deleteNotification(id);
      await loadNotifications();
    } catch (error) {
      Alert.alert(
        "Unable to delete notification",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center justify-between border-b px-4 py-4"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-4 p-1"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <Text className="text-xl font-black" style={{ color: theme.text }}>
            Notifications
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => void markAllRead()}
            disabled={busyId !== ""}
            className="flex-row items-center gap-1"
          >
            {busyId === "all" ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Check size={16} color={theme.primary} />
            )}
            <Text className="text-xs font-bold" style={{ color: theme.primary }}>
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadNotifications(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {notifications.map((notification, index) => {
            const id = notificationId(notification);
            const isRead = notification.isRead ?? notification.read ?? false;
            const title =
              notification.title || notification.subject || "Notification";
            const body =
              notification.message ||
              notification.body ||
              notification.description ||
              "";
            return (
              <Card
                key={id || `${title}-${notification.createdAt || index}`}
                variant="default"
                className="mb-3 flex-row items-start rounded-2xl border-0 p-4"
              >
                <Bell
                  size={18}
                  color={isRead ? theme.muted : theme.primary}
                  style={{ marginTop: 2, marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.text }}>
                    {title}
                  </Text>
                  {body ? (
                    <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                      {body}
                    </Text>
                  ) : null}
                  {notification.createdAt || notification.timestamp ? (
                    <Text className="mt-2 text-[10px]" style={{ color: theme.muted }}>
                      {new Date(
                        notification.createdAt || notification.timestamp || "",
                      ).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
                {id ? (
                  <View className="ml-2 flex-row gap-3">
                    {!isRead ? (
                      <Pressable
                        onPress={() => void markRead(id)}
                        disabled={busyId === id}
                        accessibilityRole="button"
                        accessibilityLabel="Mark as read"
                      >
                        <Check size={17} color={theme.primary} />
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => void deleteNotification(id)}
                      disabled={busyId === id}
                      accessibilityRole="button"
                      accessibilityLabel="Delete notification"
                    >
                      <Trash2 size={17} color={theme.danger} />
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })}
          {notifications.length === 0 ? (
            <View className="items-center py-16">
              <Bell size={36} color={theme.muted} />
              <Text className="mt-3 text-center" style={{ color: theme.muted }}>
                No notifications.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
