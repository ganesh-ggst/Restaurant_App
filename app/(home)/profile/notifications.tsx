import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Bell, CheckCheck, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ProfileError,
  ProfileScreenHeader,
} from "../../../components/profile/ProfileUi";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import type {
  CustomerNotification,
  NotificationPage,
} from "../../../services/api/profile";

function notificationId(notification: CustomerNotification): string | undefined {
  return notification._id || notification.id;
}

function firstText(...values: (string | undefined)[]): string {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [page, setPage] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPage(await api.getNotifications());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const markAllAsRead = async () => {
    setUpdating(true);
    setError("");
    try {
      await api.markAllNotificationsRead();
      await loadNotifications();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to mark notifications as read.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const loadMore = async () => {
    if (
      !page ||
      page.pagination.page >= page.pagination.pages ||
      loadingMore
    ) {
      return;
    }

    setLoadingMore(true);
    setError("");
    try {
      const nextPage = await api.getNotifications(
        page.pagination.page + 1,
        page.pagination.limit,
      );
      setPage((current) =>
        current
          ? {
              ...nextPage,
              notifications: [
                ...current.notifications,
                ...nextPage.notifications,
              ],
            }
          : nextPage,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load more notifications.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async (id: string) => {
    setUpdating(true);
    setError("");
    try {
      await api.markNotificationRead(id);
      setPage((current) =>
        current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((item) =>
                notificationId(item) === id
                  ? { ...item, isRead: true, read: true }
                  : item,
              ),
            }
          : current,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to mark this notification as read.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const deleteNotification = async (id: string) => {
    setUpdating(true);
    setError("");
    try {
      await api.deleteNotification(id);
      setPage((current) => {
        if (!current) {
          return current;
        }
        const deletedItem = current.notifications.find(
          (item) => notificationId(item) === id,
        );
        const wasUnread =
          deletedItem &&
          !(deletedItem.isRead ?? deletedItem.read ?? false);
        return {
          ...current,
          notifications: current.notifications.filter(
            (item) => notificationId(item) !== id,
          ),
          unreadCount: Math.max(
            0,
            current.unreadCount - (wasUnread ? 1 : 0),
          ),
          pagination: {
            ...current.pagination,
            total: Math.max(0, current.pagination.total - 1),
          },
        };
      });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this notification.",
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader title="Notifications" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <ProfileError message={error} />
        {page && page.unreadCount > 0 ? (
          <Pressable
            onPress={() => void markAllAsRead()}
            disabled={updating}
            className="mb-5 flex-row items-center justify-center gap-2 rounded-2xl p-4"
            style={{ backgroundColor: theme.secondaryBg }}
          >
            {updating ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <CheckCheck size={18} color={theme.primary} />
            )}
            <Text className="font-bold" style={{ color: theme.primary }}>
              Mark all as read
            </Text>
          </Pressable>
        ) : null}
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : page && page.notifications.length === 0 ? (
          <View className="items-center py-12">
            <Bell size={34} color={theme.muted} />
            <Text className="mt-3 font-semibold" style={{ color: theme.muted }}>
              You have no notifications.
            </Text>
          </View>
        ) : page ? (
          page.notifications.map((notification, index) => {
            const id = notificationId(notification);
            const read = notification.isRead ?? notification.read ?? false;
            const title =
              firstText(notification.title, notification.subject) ||
              "Notification";
            const message =
              firstText(
                notification.message,
                notification.body,
                notification.description,
                notification.desc,
              ) || "You have a new update.";
            const date = firstText(
              notification.createdAt,
              notification.timestamp,
            );
            const parsedDate = date ? new Date(date) : null;
            const dateText =
              parsedDate && !Number.isNaN(parsedDate.valueOf())
                ? parsedDate.toLocaleString()
                : "";

            return (
              <View
                key={id || `notification-${index}`}
                className="mb-4 rounded-2xl border p-4"
                style={{ backgroundColor: theme.card, borderColor: theme.border }}
              >
                <View className="flex-row items-start">
                  {!read ? (
                    <View
                      className="mr-3 mt-2 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                  ) : null}
                  <View className="flex-1">
                    <Text
                      className="mb-1 text-base font-black"
                      style={{ color: theme.text }}
                    >
                      {title}
                    </Text>
                    <Text style={{ color: theme.muted, lineHeight: 20 }}>
                      {message}
                    </Text>
                    {dateText ? (
                      <Text
                        className="mt-3 text-xs font-semibold"
                        style={{ color: theme.primary }}
                      >
                        {dateText}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {id ? (
                  <View className="mt-4 flex-row justify-end gap-5">
                    {!read ? (
                      <Pressable
                        onPress={() => void markAsRead(id)}
                        disabled={updating}
                        className="flex-row items-center gap-1"
                      >
                        <CheckCheck size={16} color={theme.primary} />
                        <Text
                          className="font-bold"
                          style={{ color: theme.primary }}
                        >
                          Mark read
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => void deleteNotification(id)}
                      disabled={updating}
                      className="flex-row items-center gap-1"
                    >
                      <Trash2 size={16} color={theme.danger} />
                      <Text className="font-bold" style={{ color: theme.danger }}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : null}
        {page && page.pagination.page < page.pagination.pages ? (
          <Pressable
            onPress={() => void loadMore()}
            disabled={loadingMore}
            className="items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.secondaryBg }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text className="font-bold" style={{ color: theme.primary }}>
                Load More
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
