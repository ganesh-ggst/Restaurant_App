import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../components/ui/Card";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";
import {
  adminDashboardApi,
  adminNotificationsApi,
  type AdminDashboardData,
} from "../../services/api/admin-profile";

export default function AdminDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { currentManager, loading: authLoading, isAdmin } = useCurrentManager();

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const dashboardLoaded = useRef(false);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [branchUpdating, setBranchUpdating] = useState(false);
  const isBranchLive = dashboard?.branch.isActive ?? false;
  const weeklyTrend =
    dashboard?.weeklyRevenueTrend.days.map((day) => ({
      day: day.day.slice(0, 3),
      amount: day.revenue,
    })) || [];
  const branchToday = dashboard
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: dashboard.revenueDefinition.timeZone,
      }).format(new Date())
    : "";
  const distributionItem = (type: string) =>
    dashboard?.salesDistribution.items.find(
      (item) => item.fulfillmentType === type,
    ) || { label: "", percentage: 0, revenue: 0, orderCount: 0 };

  useEffect(() => {
    if (hasUnreadNotifications) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [hasUnreadNotifications, pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      if (authLoading) return () => {
        isCurrent = false;
      };
      if (!isAdmin) {
        router.replace("/(auth)/login" as any);
        return () => {
          isCurrent = false;
        };
      }

      const showInitialLoading = !dashboardLoaded.current;
      if (showInitialLoading) {
        setDashboardLoading(true);
        setDashboardError("");
      }
      void adminDashboardApi
        .getDashboard()
        .then((result) => {
          dashboardLoaded.current = true;
          if (isCurrent) {
            setDashboard(result);
            setDashboardError("");
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            setDashboardError(
              error instanceof Error
                ? error.message
                : "Unable to load dashboard data.",
            );
          }
        })
        .finally(() => {
          if (isCurrent && showInitialLoading) setDashboardLoading(false);
        });

      void adminNotificationsApi
        .getAdminNotifications()
        .then(({ unreadCount }) => {
          if (isCurrent) {
            setHasUnreadNotifications(unreadCount > 0);
            setNotificationsError("");
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            setNotificationsError(
              error instanceof Error
                ? error.message
                : "Unable to load notification status.",
            );
          }
        });

    return () => {
      isCurrent = false;
    };
    }, [authLoading, isAdmin, router]),
  );

  const reloadDashboard = async (isPullRefresh = false) => {
    if (isPullRefresh) setRefreshing(true);
    else if (!dashboard) setDashboardLoading(true);
    setDashboardError("");
    const [dashboardResult, notificationsResult] = await Promise.allSettled([
      adminDashboardApi.getDashboard(true),
      adminNotificationsApi.getAdminNotifications(1, 20, true),
    ]);

    if (dashboardResult.status === "fulfilled") {
      dashboardLoaded.current = true;
      setDashboard(dashboardResult.value);
      setDashboardError("");
    } else {
      setDashboardError(
        dashboardResult.reason instanceof Error
          ? dashboardResult.reason.message
          : "Unable to load dashboard data.",
      );
    }

    if (notificationsResult.status === "fulfilled") {
      setHasUnreadNotifications(notificationsResult.value.unreadCount > 0);
      setNotificationsError("");
    } else {
      setNotificationsError(
        notificationsResult.reason instanceof Error
          ? notificationsResult.reason.message
          : "Unable to load notification status.",
      );
    }
    setDashboardLoading(false);
    setRefreshing(false);
  };

  const handleToggleBranchLive = (newValue: boolean) => {
    const branchId = dashboard?.branch.id || currentManager?.branchId;
    if (!branchId || branchUpdating) {
      Alert.alert("Unable to update branch", "Branch information is not available. Refresh and try again.");
      return;
    }

    Alert.alert(
      newValue ? "Go Online" : "Go Offline",
      `Are you sure you want to take this branch ${newValue ? "ONLINE" : "OFFLINE"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {},
        },
        {
          text: "Confirm",
          onPress: async () => {
            setBranchUpdating(true);
            try {
              await adminDashboardApi.setBranchOnlineStatus(
                branchId,
                newValue,
              );
              setDashboard((current) =>
                current
                  ? {
                      ...current,
                      branch: { ...current.branch, isActive: newValue },
                    }
                  : current,
              );
            } catch (error) {
              const serverMessage =
                error instanceof Error ? error.message : "";
              const blockedByActiveWork =
                !newValue &&
                /active tables|pending orders|go offline/i.test(serverMessage);
              Alert.alert(
                blockedByActiveWork
                  ? "Your branch is still serving guests"
                  : "We couldn’t update the branch",
                blockedByActiveWork
                  ? "Please complete active tables and pending orders before taking the branch offline."
                  : "Please try again in a moment.",
              );
            } finally {
              setBranchUpdating(false);
            }
          },
        },
      ],
    );
  };

  const formatINR = (num: number) => {
    if (!Number.isFinite(num)) return "₹0.00";
    if (num >= 10000000) {
      const val = Math.floor((num / 10000000) * 100) / 100;
      return `₹${val.toFixed(2)}Cr`;
    } else if (num >= 100000) {
      const val = Math.floor((num / 100000) * 100) / 100;
      return `₹${val.toFixed(2)}L`;
    } else if (num >= 1000) {
      const val = Math.floor((num / 1000) * 100) / 100;
      return `₹${val.toFixed(2)}K`;
    }
    return `₹${num.toFixed(2)}`;
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      {/* --- TOP HEADER WITH DYNAMIC STORE & BRANCH LOCATION --- */}
      <View className="px-6 mb-4 mt-2">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1 mr-2">
            <Text
              className="text-xl font-black"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              {dashboard?.branch.name || "Admin Dashboard"} 👑
            </Text>
            <Text
              className="text-xs font-semibold mt-0.5"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              {dashboard
                ? [
                    dashboard.branch.address,
                    dashboard.branch.city,
                    dashboard.branch.state,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : " "}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                router.push(`/(admin)/profile/notifications` as any);
              }}
              className="p-2.5 rounded-full relative"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="bell" size={18} color={theme.text} />
              {hasUnreadNotifications && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <View
                    className="w-2.5 h-2.5 rounded-full shadow-md"
                    style={{ backgroundColor: theme.primary }}
                  />
                </Animated.View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push(`/(admin)/profile` as any)}
              className="p-2.5 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-base">👤</Text>
            </Pressable>
          </View>
        </View>

        {/* BRANCH LIVE GO ONLINE BAR WITH CONFIRMATION POPUP */}
        <Card
          variant="default"
          className="p-3.5 rounded-2xl border-0 flex-row items-center justify-between"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: isBranchLive ? "#22c55e" : "#ef4444" }}
            />
            <View>
              <Text
                className="text-xs font-black uppercase"
                style={{ color: theme.text }}
              >
                {isBranchLive ? "BRANCH ONLINE" : "BRANCH OFFLINE"}
              </Text>
              <Text className="text-[10px]" style={{ color: theme.muted }}>
                {isBranchLive
                  ? "Storefront open & active"
                  : "Storefront closed"}
              </Text>
            </View>
          </View>

          <Switch
            value={isBranchLive}
            onValueChange={handleToggleBranchLive}
            disabled={dashboardLoading || branchUpdating || !dashboard}
            trackColor={{ false: theme.border, true: "#22c55e" }}
            thumbColor={"#ffffff"}
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </Card>
      </View>

      {/* --- DASHBOARD CONTENT SCROLL --- */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reloadDashboard(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {dashboardLoading ? (
          <ActivityIndicator
            className="mb-4"
            size="small"
            color={theme.primary}
          />
        ) : null}
        {dashboardError ? (
          <View
            className="mb-4 rounded-2xl border p-4"
            style={{ backgroundColor: theme.dangerBg, borderColor: theme.border }}
          >
            <Text className="mb-3" style={{ color: theme.danger }}>
              {dashboardError}
            </Text>
            <Pressable
              onPress={() => void reloadDashboard()}
              accessibilityRole="button"
            >
              <Text className="font-bold" style={{ color: theme.primary }}>
                Reload dashboard
              </Text>
            </Pressable>
          </View>
        ) : null}
        {notificationsError ? (
          <Text className="mb-4 text-xs" style={{ color: theme.danger }}>
            Notification status unavailable: {notificationsError}
          </Text>
        ) : null}
        {/* --- REVENUE HIGHLIGHT CARDS (TODAY & MONTHLY) --- */}
        <View className="flex-row gap-3 mb-4">
          <Pressable
            onPress={() => router.push(`/(admin)/details/today-revenue` as any)}
            className="flex-1"
          >
            <Card
              variant="default"
              className="p-4 rounded-3xl border-0 shadow-lg justify-between"
              style={{ backgroundColor: theme.card, minHeight: 112 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-[9px] font-bold uppercase tracking-tight flex-1 mr-1"
                  style={{ color: theme.muted }}
                  numberOfLines={1}
                >
                  TODAY&apos;S REV
                </Text>
                <Text className="text-xs">{isBranchLive ? "🟢" : "🔴"}</Text>
              </View>
              <View>
                <Text
                  className="text-lg font-black mb-1"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{ color: theme.text }}
                >
                  {formatINR(dashboard?.stats.todayRevenue ?? 0)}
                </Text>
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: "#22c55e" }}
                  numberOfLines={1}
                >
                  ↑ Live Channels
                </Text>
              </View>
            </Card>
          </Pressable>

          <Pressable
            onPress={() => router.push(`/(admin)/details/monthly-sales` as any)}
            className="flex-1"
          >
            <Card
              variant="default"
              className="p-4 rounded-3xl border-0 shadow-lg justify-between"
              style={{ backgroundColor: theme.card, minHeight: 112 }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-[9px] font-bold uppercase tracking-tight flex-1 mr-1"
                  style={{ color: theme.muted }}
                  numberOfLines={1}
                >
                  MONTHLY SALES
                </Text>
                <Feather name="trending-up" size={14} color={theme.primary} />
              </View>
              <View>
                <Text
                  className="text-lg font-black mb-1"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{ color: theme.text }}
                >
                  {formatINR(dashboard?.stats.monthlySales ?? 0)}
                </Text>
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: theme.primary }}
                  numberOfLines={1}
                >
                  Sum of Totals
                </Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {/* --- YEARLY REVENUE (FULL WIDTH CARD) --- */}
        <Pressable
          onPress={() => router.push(`/(admin)/details/yearly-revenue` as any)}
          className="mb-4"
        >
          <Card
            variant="default"
            className="p-4 rounded-3xl border-0 shadow-lg flex-row items-center justify-between"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-1 mr-3">
              <Text
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: theme.muted }}
                numberOfLines={1}
              >
                Yearly Revenue (Fiscal {dashboard?.stats.fiscalYear || "—"})
              </Text>
              <Text
                className="text-2xl font-black"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {formatINR(dashboard?.stats.yearlyRevenue ?? 0)}{" "}
                {dashboard?.stats.yearOverYearChangePercentage !== null &&
                dashboard?.stats.yearOverYearChangePercentage !== undefined ? (
                  <Text className="text-xs font-semibold text-yellow-500">
                    ({dashboard.stats.yearOverYearChangePercentage >= 0 ? "+" : ""}
                    {dashboard.stats.yearOverYearChangePercentage}% YoY)
                  </Text>
                ) : null}
              </Text>
            </View>
            <View className="w-11 h-11 rounded-2xl items-center justify-center bg-yellow-500/15 shrink-0">
              <Feather name="award" size={22} color="#eab308" />
            </View>
          </Card>
        </Pressable>

        {/* --- ACTIVE WORKFORCE COUNTS --- */}
        <View className="flex-row gap-3 mb-4">
          <Card
            variant="default"
            className="flex-1 p-4 rounded-3xl border-0 justify-center"
            style={{ backgroundColor: theme.card }}
          >
            <Text
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: theme.muted }}
            >
              Active Managers
            </Text>
            <Text
              className="text-2xl font-black"
              style={{ color: theme.primary }}
            >
              {dashboard?.stats.activeManagers ?? 0}
            </Text>
          </Card>

          <Card
            variant="default"
            className="flex-1 p-4 rounded-3xl border-0 justify-center"
            style={{ backgroundColor: theme.card }}
          >
            <Text
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: theme.muted }}
            >
              Active Waiters
            </Text>
            <Text className="text-2xl font-black" style={{ color: "#22c55e" }}>
              {dashboard?.stats.activeWaiters ?? 0}
            </Text>
          </Card>
        </View>

        {/* --- WEEKLY REVENUE TREND --- */}
        <Card
          variant="default"
          className="p-5 rounded-3xl border-0 mb-4 shadow-lg"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text
                className="text-base font-black"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                Weekly Revenue Trend
              </Text>
              <Text
                className="text-xs font-medium"
                style={{ color: theme.muted }}
                numberOfLines={1}
              >
                Performance across Mon - Sun
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push(`/(admin)/details/weekly-trend` as any)
              }
              className="w-10 h-10 rounded-full items-center justify-center border shrink-0"
              style={{ borderColor: theme.border, backgroundColor: theme.bg }}
              hitSlop={10}
            >
              <Feather name="bar-chart-2" size={18} color={theme.primary} />
            </Pressable>
          </View>

          <View
            className="flex-row items-end justify-between h-44 pt-6 px-1 border-b"
            style={{ borderBottomColor: theme.border }}
          >
            {(() => {
              const maxAmt = Math.max(
                ...weeklyTrend.map((w) => w.amount),
                1,
              );
              return weeklyTrend.map((bar, index) => {
                const isToday =
                  dashboard?.weeklyRevenueTrend.days[index]?.date ===
                  branchToday;
                return (
                  <View
                    key={index}
                    className="items-center flex-1 mx-1 h-full justify-end"
                  >
                    <View
                      className="w-full rounded-t-xl items-center justify-center overflow-hidden py-2"
                      style={{
                        height: `${bar.amount > 0 ? Math.max(5, (bar.amount / maxAmt) * 100) : 0}%`,
                        backgroundColor: isToday ? "#eab308" : theme.primary,
                      }}
                    >
                      <Text
                        className="text-[8px] font-black uppercase text-center"
                        style={{ color: "#000000" }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatINR(bar.amount)}
                      </Text>
                    </View>
                    <Text
                      className="text-[10px] font-black mt-2"
                      style={{ color: isToday ? theme.primary : theme.muted }}
                    >
                      {bar.day}
                    </Text>
                  </View>
                );
              });
            })()}
          </View>
          <View className="flex-row justify-between items-center mt-3 pt-1">
            {(() => {
              const peakName =
                dashboard?.weeklyRevenueTrend.peakDay.day || "—";
              const avgAmt =
                dashboard?.weeklyRevenueTrend.averageDailyRevenue ?? 0;
              return (
                <>
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.muted }}
                  >
                    Peak Day: {peakName}
                  </Text>
                  <Text
                    className="text-[11px] font-bold"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Avg: ₹{Math.round(avgAmt).toLocaleString("en-IN")} / day
                  </Text>
                </>
              );
            })()}
          </View>
        </Card>

        {/* --- SALES DISTRIBUTION --- */}
        <Card
          variant="default"
          className="p-5 rounded-3xl border-0 mb-4 shadow-lg"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 mr-3">
              <Text
                className="text-base font-black"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                Sales Distribution
              </Text>
              <Text
                className="text-xs font-medium"
                style={{ color: theme.muted }}
                numberOfLines={1}
              >
                Revenue by dining mode
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push(`/(admin)/details/sales-distribution` as any)
              }
              className="w-10 h-10 rounded-full items-center justify-center border shrink-0"
              style={{ borderColor: theme.border, backgroundColor: theme.bg }}
              hitSlop={10}
            >
              <Feather name="pie-chart" size={18} color={theme.primary} />
            </Pressable>
          </View>

          <View className="gap-3">
            {[
              {
                label: "Dine-In Tables",
                pct: `${distributionItem("dine_in").percentage}%`,
                amount: `₹${distributionItem("dine_in").revenue.toLocaleString("en-IN")}`,
                color: theme.primary,
              },
              {
                label: "Online Delivery",
                pct: `${distributionItem("delivery").percentage}%`,
                amount: `₹${distributionItem("delivery").revenue.toLocaleString("en-IN")}`,
                color: "#22c55e",
              },
              {
                label: "Takeaway Orders",
                pct: `${distributionItem("takeaway").percentage}%`,
                amount: `₹${distributionItem("takeaway").revenue.toLocaleString("en-IN")}`,
                color: "#eab308",
              },
            ].map((item, idx) => (
              <View key={idx} className="gap-1">
                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.text }}
                  >
                    {item.label} ({item.pct})
                  </Text>
                  <Text
                    className="text-sm font-black"
                    style={{ color: theme.text }}
                  >
                    {item.amount}
                  </Text>
                </View>
                <View
                  className="h-2.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: theme.bg }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: item.pct as any,
                      backgroundColor: item.color,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
