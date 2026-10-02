import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../components/ui/Card";
import {
  FINANCIAL_MOCK_STATE,
  INITIAL_FLOOR_TABLES,
  INITIAL_REVENUE_NOTIFICATIONS,
  MANAGER_MOCK_DATA,
} from "../../constants/managerMockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";

export default function AdminDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { currentManager } = useCurrentManager();

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const calculateOrderTotal = (order: any) => {
    const taxSection = MANAGER_MOCK_DATA.storeDetails?.find(
      (s: any) => s.id === "sd_tax",
    );
    const activeTaxOpt =
      taxSection?.options?.find((o: any) => o.isActive) ||
      taxSection?.options?.[0];
    const taxStr = activeTaxOpt?.value || "5%";
    const taxRate = parseFloat(taxStr.replace(/[^0-9.]/g, "")) / 100 || 0.05;

    const chargesSection = MANAGER_MOCK_DATA.storeDetails?.find(
      (s: any) => s.id === "sd_charges",
    );
    const activeChargesOpt =
      chargesSection?.options?.find((o: any) => o.isActive) ||
      chargesSection?.options?.[0];
    const chargesText =
      activeChargesOpt?.subValue || activeChargesOpt?.value || "";

    const getChargeVal = (prefix: string, defaultVal: number) => {
      const regex = new RegExp(`${prefix}[^0-9]*([0-9]+)`, "i");
      const match = chargesText.match(regex);
      return match ? parseFloat(match[1]) : defaultVal;
    };

    const packaging = getChargeVal("Packaging", 20);
    const platform = getChargeVal("Platform", 10);
    const deliveryFeeBase = getChargeVal("Delivery", 30);

    const itemSubtotal = order.items.reduce(
      (sum: number, item: any) => sum + item.price * (item.qty || 1),
      0,
    );

    const isDelivery = order.mode?.toLowerCase() === "delivery";
    const deliveryFee = isDelivery
      ? itemSubtotal > 99
        ? 0
        : deliveryFeeBase
      : 0;
    const packagingFee = packaging;
    const platformFee = isDelivery ? platform : 0;
    const gstAmount = Math.round(itemSubtotal * taxRate * 100) / 100;
    const total =
      itemSubtotal + packagingFee + platformFee + deliveryFee + gstAmount;

    return Math.round(total * 100) / 100;
  };

  const [activeManagersCount, setActiveManagersCount] = useState(0);
  const [activeWaitersCount, setActiveWaitersCount] = useState(0);
  const [todaysRevenue, setTodaysRevenue] = useState(
    FINANCIAL_MOCK_STATE.todayBaseRevenue +
      FINANCIAL_MOCK_STATE.completedTableBills,
  );
  const [monthlySales, setMonthlySales] = useState(
    FINANCIAL_MOCK_STATE.monthlySalesBase,
  );
  const [yearlyRevenue, setYearlyRevenue] = useState(
    FINANCIAL_MOCK_STATE.yearlyRevenueBase,
  );
  const [weeklyTrend, setWeeklyTrend] = useState(
    FINANCIAL_MOCK_STATE.weeklyTrend,
  );
  const [salesDist, setSalesDist] = useState(
    FINANCIAL_MOCK_STATE.salesDistribution,
  );

  const [isBranchLive, setIsBranchLive] = useState(true);

  const restNameOpt = MANAGER_MOCK_DATA.storeDetails
    ?.find((s) => s.id === "sd_rest")
    ?.options?.find((o) => o.isActive);
  const restName = restNameOpt ? restNameOpt.value : "Foodie Verse";

  const addressOpt = MANAGER_MOCK_DATA.storeDetails
    ?.find((s) => s.id === "sd_address")
    ?.options?.find((o) => o.isActive);
  const branchAddress = addressOpt
    ? addressOpt.value
    : "Hitech City, Hyderabad";

  useEffect(() => {
    if (hasUnreadNotifications) {
      Animated.loop(
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
      ).start();
    }
  }, [hasUnreadNotifications, pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      const hasUnread = INITIAL_REVENUE_NOTIFICATIONS.some((n) => !n.isRead);
      setHasUnreadNotifications(hasUnread);

      const managers = (MANAGER_MOCK_DATA.managers || []).filter(
        (m: any) =>
          m.role !== "admin" &&
          m.managerType !== "admin" &&
          m.isActive !== false,
      );
      setActiveManagersCount(managers.length);

      const waiters = (MANAGER_MOCK_DATA.waiters || []).filter(
        (w: any) => w.isActive !== false,
      );
      setActiveWaitersCount(waiters.length);

      let tableCompletedSum = 0;
      INITIAL_FLOOR_TABLES.forEach((t) => {
        if (t.status === "available" && t.currentOrder?.totalAmount) {
          tableCompletedSum += t.currentOrder.totalAmount;
        }
      });

      let completedOrdersSum = 0;
      let deliveryOrdersSum = 0;
      let deliveryOrdersCount = 0;
      let takeawayOrdersSum = 0;
      let takeawayOrdersCount = 0;

      (MANAGER_MOCK_DATA.orders || []).forEach((o: any) => {
        if (o.status === "completed") {
          const ordTotal = calculateOrderTotal(o);
          completedOrdersSum += ordTotal;
          const mode = o.mode?.trim().toLowerCase();
          if (mode === "delivery") {
            deliveryOrdersSum += ordTotal;
            deliveryOrdersCount += 1;
          } else if (mode === "takeaway") {
            takeawayOrdersSum += ordTotal;
            takeawayOrdersCount += 1;
          }
        }
      });

      const calculatedToday =
        FINANCIAL_MOCK_STATE.todayBaseRevenue +
        FINANCIAL_MOCK_STATE.completedTableBills +
        tableCompletedSum +
        completedOrdersSum;
      setTodaysRevenue(calculatedToday);

      const calculatedMonthly =
        FINANCIAL_MOCK_STATE.monthlySalesBase +
        FINANCIAL_MOCK_STATE.completedTableBills +
        completedOrdersSum;
      setMonthlySales(calculatedMonthly);

      const calculatedYearly =
        FINANCIAL_MOCK_STATE.yearlyRevenueBase +
        FINANCIAL_MOCK_STATE.completedTableBills +
        completedOrdersSum;
      setYearlyRevenue(calculatedYearly);

      setWeeklyTrend([...FINANCIAL_MOCK_STATE.weeklyTrend]);

      let completedTableCount =
        (FINANCIAL_MOCK_STATE as any).completedTableTransactions?.length || 0;
      INITIAL_FLOOR_TABLES.forEach((t) => {
        if (t.status === "available" && t.currentOrder?.totalAmount) {
          completedTableCount += 1;
        }
      });

      const dineInBaseAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.dineIn.amount +
        (FINANCIAL_MOCK_STATE.completedTableBills || 0) +
        tableCompletedSum;
      const dineInOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.dineIn.orders +
        completedTableCount;

      const deliveryBaseAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.delivery.amount +
        deliveryOrdersSum;
      const deliveryOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.delivery.orders +
        deliveryOrdersCount;

      const takeawayBaseAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.takeaway.amount +
        takeawayOrdersSum;
      const takeawayOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.takeaway.orders +
        takeawayOrdersCount;

      const totalDistAmt = dineInBaseAmt + deliveryBaseAmt + takeawayBaseAmt;

      const dineInPct =
        totalDistAmt > 0
          ? Math.round((dineInBaseAmt / totalDistAmt) * 100)
          : 60;
      const deliveryPct =
        totalDistAmt > 0
          ? Math.round((deliveryBaseAmt / totalDistAmt) * 100)
          : 25;
      const takeawayPct = Math.max(0, 100 - (dineInPct + deliveryPct));

      setSalesDist({
        dineIn: {
          percentage: dineInPct,
          amount: dineInBaseAmt,
          orders: dineInOrders,
        },
        delivery: {
          percentage: deliveryPct,
          amount: deliveryBaseAmt,
          orders: deliveryOrders,
        },
        takeaway: {
          percentage: takeawayPct,
          amount: takeawayBaseAmt,
          orders: takeawayOrders,
        },
      });
    }, []),
  );

  const handleToggleBranchLive = (newValue: boolean) => {
    if (!newValue) {
      const busyTables = INITIAL_FLOOR_TABLES.filter(
        (t) => t.status !== "available",
      );
      const activeOrders = (MANAGER_MOCK_DATA.orders || []).filter(
        (o: any) => o.status !== "completed",
      );

      if (busyTables.length > 0 || activeOrders.length > 0) {
        const tableList = busyTables
          .map((t) => `${t.tableName} (${t.status.toUpperCase()})`)
          .join(", ");
        const orderList = activeOrders
          .map(
            (o: any) =>
              `${o.customerName} [${o.mode}: ${o.status.toUpperCase()}]`,
          )
          .join(", ");

        let message =
          "Please complete all active tables and pending orders before going offline.\n";
        if (busyTables.length > 0) message += `\nTables: ${tableList}`;
        if (activeOrders.length > 0) message += `\nOrders: ${orderList}`;

        Alert.alert("⚠️ Cannot Go Offline", message, [
          { text: "OK", style: "default" },
        ]);
        return;
      }
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
          onPress: () => {
            setIsBranchLive(newValue);
            if (!newValue) {
              const tableCompletedSum = INITIAL_FLOOR_TABLES.reduce(
                (acc, t) =>
                  acc +
                  (t.status === "available" && t.currentOrder?.totalAmount
                    ? t.currentOrder.totalAmount
                    : 0),
                0,
              );
              let completedOrdersSum = 0;
              (MANAGER_MOCK_DATA.orders || []).forEach((o: any) => {
                if (o.status === "completed") {
                  completedOrdersSum += calculateOrderTotal(o);
                }
              });

              const calculatedToday =
                FINANCIAL_MOCK_STATE.todayBaseRevenue +
                FINANCIAL_MOCK_STATE.completedTableBills +
                tableCompletedSum +
                completedOrdersSum;

              INITIAL_REVENUE_NOTIFICATIONS.unshift({
                id: `n_day_${Date.now()}`,
                title: "🟢 End-of-Day Total Revenue Report",
                subtitle: "Daily Closing Summary",
                amount: `₹${calculatedToday.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                description: `Today's shift closed successfully. Total revenue of ₹${calculatedToday.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} processed across storefront, dine-in tables, delivery, and takeaway orders.`,
                timestamp: "Just now",
                type: "day",
                isRead: false,
              });

              const calculatedMonthly =
                FINANCIAL_MOCK_STATE.monthlySalesBase +
                FINANCIAL_MOCK_STATE.completedTableBills +
                completedOrdersSum;
              INITIAL_REVENUE_NOTIFICATIONS.unshift({
                id: `n_month_${Date.now()}`,
                title: "📊 Month-End Total Revenue Report",
                subtitle: "March 2026 Summary",
                amount: `₹${calculatedMonthly.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                description: `Monthly financial audit complete. Dine-In, Online Delivery, and Takeaway totals fully audited.`,
                timestamp: "Just now",
                type: "month",
                isRead: false,
              });

              const calculatedYearly =
                FINANCIAL_MOCK_STATE.yearlyRevenueBase +
                FINANCIAL_MOCK_STATE.completedTableBills +
                completedOrdersSum;
              INITIAL_REVENUE_NOTIFICATIONS.unshift({
                id: `n_year_${Date.now()}`,
                title: "📅 Year-End Total Revenue Report",
                subtitle: "Fiscal Year 2025-2026 Summary",
                amount: `₹${(calculatedYearly / 100000).toFixed(2)}L`,
                description: `Total annual revenue successfully processed across all channels. 14% growth compared to previous fiscal year.`,
                timestamp: "Just now",
                type: "year",
                isRead: false,
              });

              setHasUnreadNotifications(true);
            }
          },
        },
      ],
    );
  };

  const formatINR = (num: number) => {
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
              {restName} 👑
            </Text>
            <Text
              className="text-xs font-semibold mt-0.5"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              {branchAddress}
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
      >
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
                  TODAY'S REV
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
                  {formatINR(todaysRevenue)}
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
                  {formatINR(monthlySales)}
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
                Yearly Revenue (Fiscal 2025-2026)
              </Text>
              <Text
                className="text-2xl font-black"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {formatINR(yearlyRevenue)}{" "}
                <Text className="text-xs font-semibold text-yellow-500">
                  ("+14% YoY")
                </Text>
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
              {activeManagersCount}
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
              {activeWaitersCount}
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
                10000,
              );
              return weeklyTrend.map((bar, index) => {
                const daysMap = [
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ];
                const liveDayStr = daysMap[new Date().getDay()];
                const isToday = bar.day === liveDayStr;
                return (
                  <View
                    key={index}
                    className="items-center flex-1 mx-1 h-full justify-end"
                  >
                    <View
                      className="w-full rounded-t-xl items-center justify-center overflow-hidden py-2"
                      style={{
                        height: `${Math.min(100, Math.max(20, (bar.amount / maxAmt) * 100))}%`,
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
              const peakObj = weeklyTrend.reduce(
                (max, curr) => (curr.amount > max.amount ? curr : max),
                weeklyTrend[0] || { day: "Sat", amount: 0 },
              );
              const dayMap: Record<string, string> = {
                Mon: "Monday",
                Tue: "Tuesday",
                Wed: "Wednesday",
                Thu: "Thursday",
                Fri: "Friday",
                Sat: "Saturday",
                Sun: "Sunday",
              };
              const peakName = peakObj
                ? dayMap[peakObj.day] || peakObj.day
                : "Saturday";
              const totalAmt = weeklyTrend.reduce(
                (sum, w) => sum + w.amount,
                0,
              );
              const avgAmt =
                weeklyTrend.length > 0 ? totalAmt / weeklyTrend.length : 0;
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
                pct: `${salesDist.dineIn.percentage}%`,
                amount: `₹${salesDist.dineIn.amount.toLocaleString("en-IN")}`,
                color: theme.primary,
              },
              {
                label: "Online Delivery",
                pct: `${salesDist.delivery.percentage}%`,
                amount: `₹${salesDist.delivery.amount.toLocaleString("en-IN")}`,
                color: "#22c55e",
              },
              {
                label: "Takeaway Orders",
                pct: `${salesDist.takeaway.percentage}%`,
                amount: `₹${salesDist.takeaway.amount.toLocaleString("en-IN")}`,
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
