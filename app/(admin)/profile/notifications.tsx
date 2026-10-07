import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminNotificationsApi,
  type AdminNotificationPage,
  type AdminRevenueNotification,
} from "../../../services/api/admin-profile";

function getNotificationIcon(type: string): keyof typeof Feather.glyphMap {
  switch (type) {
    case "day_end":
      return "sun";
    case "week_end":
      return "bar-chart-2";
    case "month_end":
      return "bar-chart";
    case "quarter_end":
      return "pie-chart";
    case "year_end":
      return "calendar";
    default:
      return "bell";
  }
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [page, setPage] = useState<AdminNotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingNotification, setUpdatingNotification] = useState<{
    id: string;
    action: "read" | "delete";
  } | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!page) setLoading(true);
    setError("");
    try {
      setPage(
        await adminNotificationsApi.getAdminNotifications(1, 20, isRefresh),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load admin notifications.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const markAsRead = async (item: AdminRevenueNotification) => {
    if (item.isRead || updatingNotification || updatingAll) return;
    setUpdatingNotification({ id: item.id, action: "read" });
    setError("");
    try {
      await adminNotificationsApi.markAdminNotificationRead(item.id);
      setPage((current) =>
        current
          ? {
              ...current,
              unreadCount: Math.max(0, current.unreadCount - 1),
              notifications: current.notifications.map((notification) =>
                notification.id === item.id
                  ? { ...notification, isRead: true, readAt: new Date().toISOString() }
                  : notification,
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
      setUpdatingNotification(null);
    }
  };

  const markAllAsRead = async () => {
    if (!page?.unreadCount || updatingNotification || updatingAll) return;
    setUpdatingAll(true);
    setError("");
    try {
      await adminNotificationsApi.markAllAdminNotificationsRead();
      const readAt = new Date().toISOString();
      setPage((current) =>
        current
          ? {
              ...current,
              unreadCount: 0,
              notifications: current.notifications.map((notification) => ({
                ...notification,
                isRead: true,
                readAt: notification.readAt || readAt,
              })),
            }
          : current,
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setUpdatingAll(false);
    }
  };

  const deleteNotification = async (item: AdminRevenueNotification) => {
    if (updatingNotification || updatingAll) return;
    setUpdatingNotification({ id: item.id, action: "delete" });
    setError("");
    try {
      await adminNotificationsApi.deleteAdminNotification(item.id);
      setPage((current) =>
        current
          ? {
              ...current,
              notifications: current.notifications.filter(
                (notification) => notification.id !== item.id,
              ),
              unreadCount: Math.max(
                0,
                current.unreadCount - (item.isRead ? 0 : 1),
              ),
              pagination: {
                ...current.pagination,
                total: Math.max(0, current.pagination.total - 1),
              },
            }
          : current,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this notification.",
      );
    } finally {
      setUpdatingNotification(null);
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
      const nextPage = await adminNotificationsApi.getAdminNotifications(
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

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        className="flex-row items-center border-b px-4 py-4"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text
          className="mr-3 flex-1 text-xl font-black"
          style={{ color: theme.text }}
        >
          Financial &amp; Revenue Notifications
        </Text>
        <Pressable
          onPress={() => void markAllAsRead()}
          disabled={
            !page?.unreadCount || updatingAll || Boolean(updatingNotification)
          }
          className="rounded-xl border px-3 py-2"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.bg,
            opacity:
              !page?.unreadCount || updatingAll || updatingNotification
                ? 0.55
                : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
        >
          {updatingAll ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text className="text-xs font-bold" style={{ color: theme.primary }}>
              Mark All Read
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifications(true)}
            tintColor={theme.primary}
          />
        }
      >
        <Text
          className="mb-4 text-xs font-bold uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Automated Periodic Revenue Audits
        </Text>

        {error ? (
          <View
            className="mb-4 rounded-2xl border p-4"
            style={{ backgroundColor: theme.dangerBg, borderColor: theme.border }}
          >
            <Text className="mb-3" style={{ color: theme.danger }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadNotifications()}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text className="font-bold" style={{ color: theme.primary }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator className="mt-8" size="large" color={theme.primary} />
        ) : page && page.notifications.length === 0 ? (
          <View className="items-center py-12">
            <Feather name="bell" size={36} color={theme.muted} />
            <Text className="mt-3 text-base font-bold" style={{ color: theme.text }}>
              No revenue notifications
            </Text>
            <Text className="mt-1 text-center" style={{ color: theme.muted }}>
              Periodic revenue audit reports will appear here.
            </Text>
          </View>
        ) : (
          page?.notifications.map((item) => {
            const isMarkingRead =
              updatingNotification?.id === item.id &&
              updatingNotification.action === "read";
            const isDeleting =
              updatingNotification?.id === item.id &&
              updatingNotification.action === "delete";
            return (
              <View
                key={item.id}
                className="mb-4 rounded-[28px] border p-5"
                style={{
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: theme.isDark ? 1 : 0,
                }}
              >
                <View className="mb-3 flex-row items-start">
                  <View
                    className="mr-3 mt-0.5 h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: theme.secondaryBg }}
                  >
                    <Feather
                      name={getNotificationIcon(item.type)}
                      size={19}
                      color={theme.primary}
                    />
                  </View>
                  <View className="mr-2 flex-1">
                    <Text
                      className="text-base font-black"
                      style={{ color: theme.text }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="mt-1 text-sm font-semibold"
                      style={{ color: theme.muted }}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                  <View className="items-center gap-3">
                    {!item.isRead ? (
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: theme.primary }}
                      />
                    ) : null}
                    <Pressable
                      onPress={() => void deleteNotification(item)}
                      disabled={Boolean(updatingNotification) || updatingAll}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={theme.muted} />
                      ) : (
                        <Feather name="trash-2" size={16} color={theme.muted} />
                      )}
                    </Pressable>
                  </View>
                </View>

                <View
                  className="my-2 flex-row items-center justify-between rounded-2xl px-4 py-4"
                  style={{ backgroundColor: theme.bg }}
                >
                  <Text
                    className="text-xs font-bold uppercase"
                    style={{ color: theme.muted }}
                  >
                    {item.heading || "Total Revenue"}
                  </Text>
                  <Text
                    className="ml-2 text-xl font-black"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {item.amountFormatted ||
                      new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: item.currency || "INR",
                        maximumFractionDigits: 2,
                      }).format(item.amount)}
                  </Text>
                </View>

                <Text
                  className="mb-4 mt-2 text-sm leading-6"
                  style={{ color: theme.text }}
                >
                  {item.description}
                </Text>

                <View
                  className="flex-row items-center justify-between border-t pt-3"
                  style={{ borderTopColor: theme.border }}
                >
                  <Text
                    className="mr-3 flex-1 text-xs font-bold"
                    style={{ color: theme.muted }}
                  >
                    {item.displayTime}
                  </Text>
                  {item.isRead ? (
                    <Text
                      className="text-xs font-bold uppercase"
                      style={{ color: theme.muted }}
                    >
                      Read
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => void markAsRead(item)}
                      disabled={Boolean(updatingNotification) || updatingAll}
                      accessibilityRole="button"
                    >
                      {isMarkingRead ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Text
                          className="text-xs font-bold uppercase"
                          style={{ color: theme.primary }}
                        >
                          {item.action?.label || "Tap to mark read"}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        {page && page.pagination.page < page.pagination.pages ? (
          <Pressable
            onPress={() => void loadMore()}
            disabled={loadingMore}
            className="items-center rounded-2xl p-4"
            style={{ backgroundColor: theme.secondaryBg }}
            accessibilityRole="button"
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
