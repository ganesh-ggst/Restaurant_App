import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import {
  FloorTable,
  INITIAL_FLOOR_NOTIFICATIONS,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";
import { getManagerDestination } from "../../../services/authRouting";
import {
  FloorManagerDashboard,
  FloorManagerLiveState,
  FloorManagerTable,
  floorManagerApi,
  hasRunningOrders,
} from "../../../services/api/floor-manager";

interface FloorDisplayTable extends FloorTable {
  waiterName?: string;
  isBlocked?: boolean;
}

function getTableNumber(value: string) {
  const match = String(value).match(/\d+/);
  return match ? match[0] : String(value).toUpperCase().trim();
}

function isAssignedBranchInactive(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /assigned branch is not active|branch is not active|branch is offline/i.test(
    message,
  );
}

function getFloorTables(liveState: FloorManagerLiveState): FloorDisplayTable[] {
  return liveState.tables
    .filter((table) => table.isActive !== false)
    .map((table: FloorManagerTable) => {
      if (
        table.status !== "available" &&
        table.status !== "occupied" &&
        table.status !== "active" &&
        table.status !== "reserved" &&
        table.status !== "billed"
      ) {
        throw new Error(
          `The server returned an unsupported status for Table ${table.tableNumber}.`,
        );
      }

      const assignedWaiter =
        table.assignedWaiterId &&
        typeof table.assignedWaiterId === "object"
          ? table.assignedWaiterId
          : liveState.waiters.find(
              (waiter) => waiter._id === table.assignedWaiterId,
            );

      return {
        id: table._id,
        tableName: `Table ${table.tableNumber}`,
        capacity: table.capacity,
        status: table.status === "active" ? "occupied" : table.status,
        isBlocked: table.isBlocked ?? table.status !== "available",
        waiterName: assignedWaiter?.name,
      };
    });
}

export default function FloorDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { currentManager, normalizedPhone } = useCurrentManager();
  const [dashboard, setDashboard] = useState<FloorManagerDashboard | null>(null);
  const [liveState, setLiveState] = useState<FloorManagerLiveState | null>(null);
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [tables, setTables] = useState<FloorDisplayTable[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "occupied" | "reserved" | "billed"
  >("all");

  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingCheckIn, setIsUpdatingCheckIn] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [branchIsOffline, setBranchIsOffline] = useState(false);

  const fetchFloorData = useCallback(async () => {
    const [nextDashboard, nextLiveState] = await Promise.all([
      floorManagerApi.getDashboard(),
      floorManagerApi.getLiveState(),
    ]);
    let nextSessions: Record<string, unknown>[] = [];
    let sessionsError = "";
    try {
      nextSessions = await floorManagerApi.getSessions();
    } catch (error) {
      sessionsError =
        error instanceof Error
          ? `Sessions could not be loaded: ${error.message}`
          : "Sessions could not be loaded.";
    }
    return {
      dashboard: nextDashboard,
      liveState: nextLiveState,
      sessions: nextSessions,
      tables: getFloorTables(nextLiveState),
      sessionsError,
    };
  }, []);

  const applyFloorData = useCallback(
    (data: Awaited<ReturnType<typeof fetchFloorData>>) => {
      setDashboard(data.dashboard);
      setLiveState(data.liveState);
      setSessions(data.sessions);
      setTables(data.tables);
      const branchIsOffline = data.dashboard.branch.isActive === false;
      setIsCheckedIn(
        branchIsOffline ? false : data.dashboard.checkIn.isCheckedIn,
      );
      setBranchIsOffline(branchIsOffline);
      setLoadError(data.sessionsError);
      setIsLoading(false);
    },
    [],
  );

  const refreshFloorData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      applyFloorData(await fetchFloorData());
    } catch (error) {
      if (isAssignedBranchInactive(error)) {
        setDashboard(null);
        setLiveState(null);
        setSessions([]);
        setTables([]);
        setIsCheckedIn(false);
        setBranchIsOffline(true);
        setLoadError("");
        setIsLoading(false);
        return;
      }
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load floor manager data.",
      );
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [applyFloorData, fetchFloorData]);

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
      const refreshedAssignedTables = currentManager?.assignedTables || [];
      const refreshedNums = new Set(
        refreshedAssignedTables.map((val: string) => getTableNumber(val)),
      );

      const managerUnread = INITIAL_FLOOR_NOTIFICATIONS.some((n) => {
        if (n.isRead) return false;
        let tNum = "";
        if (n.tableId) {
          tNum = getTableNumber(n.tableId);
        } else if (n.message) {
          const match = n.message.match(/Table\s+(\d+)/i);
          if (match) {
            tNum = match[1];
          }
        }
        return tNum ? refreshedNums.has(tNum) : false;
      });

      setHasUnreadNotifications(managerUnread);
    }, [currentManager]),
  );

  useFocusEffect(
    useCallback(() => {
      if (
        !currentManager ||
        getManagerDestination(currentManager.managerType) !==
          "/(manager)/floor"
      ) {
        return;
      }

      let isFocused = true;
      const refresh = async () => {
        try {
          const data = await fetchFloorData();
          if (isFocused) applyFloorData(data);
        } catch (error) {
          if (isFocused) {
            if (isAssignedBranchInactive(error)) {
              setDashboard(null);
              setLiveState(null);
              setSessions([]);
              setTables([]);
              setIsCheckedIn(false);
              setBranchIsOffline(true);
              setLoadError("");
              setIsLoading(false);
              return;
            }
            setLoadError(
              error instanceof Error
                ? error.message
                : "Unable to load floor manager data.",
            );
            setIsLoading(false);
          }
        }
      };

      void refresh();
      const interval = setInterval(() => void refresh(), 30_000);
      return () => {
        isFocused = false;
        clearInterval(interval);
      };
    }, [applyFloorData, currentManager, fetchFloorData]),
  );

  const handleToggleCheckIn = (newValue: boolean) => {
    Alert.alert(
      newValue ? "Check In" : "Check Out",
      newValue
        ? "Are you sure you want to check IN?"
        : "All running orders must be completed before checking out. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            void (async () => {
              setIsUpdatingCheckIn(true);
              try {
                if (newValue) {
                  let latestDashboard: FloorManagerDashboard;
                  try {
                    latestDashboard = await floorManagerApi.getDashboard();
                  } catch (error) {
                    if (isAssignedBranchInactive(error)) {
                      setBranchIsOffline(true);
                      setIsCheckedIn(false);
                      Alert.alert(
                        "Branch is offline",
                        "Your assigned branch is offline. Ask an admin to bring it online before checking in.",
                      );
                      return;
                    }
                    throw error;
                  }
                  if (latestDashboard.branch.isActive === false) {
                    setBranchIsOffline(true);
                    setIsCheckedIn(false);
                    Alert.alert(
                      "Branch is offline",
                      "Your assigned branch is offline. Ask an admin to bring it online before checking in.",
                    );
                    return;
                  }
                  setBranchIsOffline(false);
                } else {
                  const [latestDashboard, latestLiveState] = await Promise.all([
                    floorManagerApi.getDashboard(),
                    floorManagerApi.getLiveState(),
                  ]);
                  const latestTables = getFloorTables(latestLiveState);
                  setDashboard(latestDashboard);
                  setLiveState(latestLiveState);
                  setTables(latestTables);
                  setIsCheckedIn(latestDashboard.checkIn.isCheckedIn);
                  if (
                    hasRunningOrders(
                      latestDashboard,
                      latestLiveState.orders,
                    )
                  ) {
                    Alert.alert(
                      "Cannot Check Out",
                      "Complete all running orders before checking out.",
                    );
                    return;
                  }
                }

                await floorManagerApi.setCheckInStatus(newValue);
                setIsCheckedIn(newValue);
                void refreshFloorData();
              } catch (error) {
                if (newValue && isAssignedBranchInactive(error)) {
                  setBranchIsOffline(true);
                  setIsCheckedIn(false);
                  Alert.alert(
                    "Branch is offline",
                    "Your assigned branch is offline. Ask an admin to bring it online before checking in.",
                  );
                  return;
                }
                Alert.alert(
                  "Unable to update check-in status",
                  error instanceof Error
                    ? error.message
                    : "Please try again.",
                );
              } finally {
                setIsUpdatingCheckIn(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!currentManager) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Manager profile not found.</Text>
      </SafeAreaView>
    );
  }
  if (
    getManagerDestination(currentManager.managerType) !== "/(manager)/floor"
  ) {
    return <Redirect href="/(manager)/operations" />;
  }

  const totalTables = dashboard?.tables.total ?? tables.length;
  const availableCount =
    dashboard?.tables.available ??
    tables.filter((t) => t.status === "available").length;
  const occupiedCount =
    dashboard?.tables.occupied ??
    tables.filter((t) => t.status === "occupied").length;
  const reservedCount = tables.filter((t) => t.status === "reserved").length;
  const runningOrderCount = dashboard
    ? dashboard.orders.pending +
      dashboard.orders.accepted +
      dashboard.orders.preparing +
      dashboard.orders.ready
    : 0;

  const filteredTables = tables.filter((table) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const tableNumber = getTableNumber(table.tableName);
    const normalizedTableQuery = normalizedQuery.replace(/^table\s*/, "");
    const matchesSearch =
      !normalizedQuery ||
      table.tableName.toLowerCase().includes(normalizedQuery) ||
      `t${tableNumber}`.includes(normalizedQuery.replace(/\s+/g, "")) ||
      tableNumber.includes(normalizedTableQuery) ||
      table.status.toLowerCase().includes(normalizedQuery) ||
      String(table.capacity).includes(normalizedQuery) ||
      (table.waiterName?.toLowerCase().includes(normalizedQuery) ?? false);
    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = table.status === statusFilter;
    }
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: FloorTable["status"]) => {
    switch (status) {
      case "available":
        return "#22c55e";
      case "occupied":
        return theme.primary;
      case "reserved":
        return "#eab308";
      case "billed":
        return "#3b82f6";
      default:
        return theme.muted;
    }
  };

  const handleTablePress = (table: FloorDisplayTable) => {
    router.push(`/(manager)/floor/table/${table.id}` as never);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View className="px-6 mb-4 mt-2">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-1 mr-3">
            <Text
              className="text-2xl font-black"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              Floor Manager 🍽️
            </Text>
            <Text
              className="text-xs font-medium mt-0.5"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              {dashboard?.branch.name || "Restaurant"} • {currentManager.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                setHasUnreadNotifications(false);
                router.push(
                  `/(manager)/floor/profile/notifications?phone=${encodeURIComponent(normalizedPhone)}` as any,
                );
              }}
              className="p-3 rounded-full relative"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="bell" size={20} color={theme.text} />
              {hasUnreadNotifications && (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <View
                    className="w-3 h-3 rounded-full shadow-md"
                    style={{ backgroundColor: theme.primary }}
                  />
                </Animated.View>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                router.push(
                  `/(manager)/floor/profile?phone=${encodeURIComponent(normalizedPhone)}` as any,
                )
              }
              className="p-3 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-lg">👤</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="px-6" style={{ backgroundColor: theme.bg }}>
        <Card
          variant="default"
          className="p-3.5 mb-4 rounded-2xl border-0 flex-row items-center justify-between"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: isCheckedIn ? "#22c55e" : "#ef4444" }}
            />
            <View>
              <Text
                className="text-xs font-black uppercase"
                style={{ color: theme.text }}
              >
                {!dashboard
                  ? branchIsOffline
                    ? "CHECKED OUT"
                    : "STATUS UNAVAILABLE"
                  : isCheckedIn
                    ? "CHECKED IN"
                    : "CHECKED OUT"}
              </Text>
              <Text className="text-[10px]" style={{ color: theme.muted }}>
                {!dashboard
                  ? branchIsOffline
                    ? "Branch is offline"
                    : "Waiting for floor status"
                  : isCheckedIn
                    ? "On duty & managing floor"
                    : "Off duty"}
              </Text>
            </View>
          </View>

          <Switch
            value={isCheckedIn}
            onValueChange={handleToggleCheckIn}
            disabled={(!dashboard && !branchIsOffline) || isUpdatingCheckIn}
            trackColor={{ false: theme.border, true: "#22c55e" }}
            thumbColor={"#ffffff"}
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </Card>
      </View>

      {isLoading && !dashboard ? (
        <View className="flex-1 px-6 justify-center items-center">
          <Text className="text-sm" style={{ color: theme.muted }}>
            Loading live floor data...
          </Text>
        </View>
      ) : !dashboard && branchIsOffline ? (
        <View className="flex-1 px-6 justify-center items-center">
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center w-full shadow-lg"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-3xl mb-3">🔒</Text>
            <Text
              className="text-lg font-black mb-2 text-center"
              style={{ color: theme.text }}
            >
              You are Checked Out
            </Text>
            <Text
              className="text-sm text-center mb-5"
              style={{ color: theme.muted }}
            >
              Your assigned branch is offline. You can check in after an admin
              brings the branch online.
            </Text>
            <Pressable
              onPress={() => void refreshFloorData()}
              disabled={isRefreshing}
              accessibilityRole="button"
              className="rounded-xl px-5 py-3"
              style={{ backgroundColor: theme.primary }}
            >
              <Text className="font-bold text-white">
                {isRefreshing ? "Checking branch..." : "Check branch status"}
              </Text>
            </Pressable>
          </Card>
        </View>
      ) : !dashboard ? (
        <View className="flex-1 px-6 justify-center items-center">
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center w-full shadow-lg"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-lg font-black mb-1 text-center" style={{ color: theme.text }}>
              Floor data unavailable
            </Text>
            <Text className="text-xs font-medium text-center mb-4" style={{ color: theme.muted }}>
              {loadError || "Refresh to try loading the manager dashboard again."}
            </Text>
            <Pressable
              onPress={() => void refreshFloorData()}
              disabled={isRefreshing}
              accessibilityRole="button"
              className="rounded-xl px-5 py-3"
              style={{ backgroundColor: theme.primary }}
            >
              <Text className="font-bold text-white">
                {isRefreshing ? "Refreshing..." : "Refresh dashboard"}
              </Text>
            </Pressable>
          </Card>
        </View>
      ) : (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isCheckedIn ? [0] : []}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshFloorData()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {isCheckedIn ? (
          <View
            className="px-6 pb-2"
            style={{ backgroundColor: theme.bg }}
          >
            <TextInput
              placeholder="Search tables..."
              placeholderTextColor={theme.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="px-4 rounded-xl mb-3 font-semibold"
              style={{
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: 15,
                height: 48,
              }}
            />
            <View
              className="flex-row p-1 rounded-2xl mb-2"
              style={{ backgroundColor: theme.card }}
            >
              {[
                { id: "all", label: "All" },
                { id: "available", label: "Free" },
                { id: "occupied", label: "Active" },
                { id: "reserved", label: "Reserved" },
                { id: "billed", label: "Billed" },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setStatusFilter(tab.id as any)}
                    className="flex-1 py-2.5 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: isActive ? theme.primary : "transparent",
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: isActive ? "#ffffff" : theme.muted,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

      {!searchQuery.trim() ? (
      <View className="px-6">
        <Card
          variant="default"
          className="p-3.5 mb-4 rounded-2xl border-0"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className="text-xs font-black uppercase"
              style={{ color: theme.text }}
            >
              Live operations
            </Text>
            <Pressable
              onPress={() => void refreshFloorData()}
              disabled={isRefreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh floor data"
            >
              <Text
                className="text-xs font-bold"
                style={{ color: theme.primary }}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Text>
            </Pressable>
          </View>
          <View className="gap-1">
            <Text className="text-xs" style={{ color: theme.muted }}>
              Sessions: {dashboard?.sessions.active ?? sessions.length}
            </Text>
            <Text className="text-xs" style={{ color: theme.muted }}>
              Requests: {dashboard?.serviceRequests.pending ?? 0}
            </Text>
            <Text className="text-xs" style={{ color: theme.muted }}>
              Running orders: {runningOrderCount}
            </Text>
            <Text
              className="text-xs font-bold mt-1"
              style={{ color: theme.text }}
            >
              Waiters
            </Text>
            {liveState?.waiters.length ? (
              liveState.waiters.map((waiter) => (
                <Text
                  key={waiter._id}
                  className="text-xs"
                  style={{ color: theme.muted }}
                >
                  {waiter.name}: {waiter.status}
                </Text>
              ))
            ) : (
              <Text className="text-xs" style={{ color: theme.muted }}>
                No waiters found
              </Text>
            )}
          </View>
        </Card>

        {!!loadError && (
          <Pressable
            onPress={() => void refreshFloorData()}
            accessibilityRole="button"
            className="mb-3 rounded-xl p-3"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-xs font-semibold" style={{ color: "#ef4444" }}>
              {loadError} Tap to retry.
            </Text>
          </Pressable>
        )}

        {/* --- FORMATTED STATS CARDS --- */}
        <View className="flex-row justify-between mb-4">
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: theme.text }}
            >
              {totalTables}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Total
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: "#22c55e" }}
            >
              {availableCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Free
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: theme.primary }}
            >
              {occupiedCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Active
            </Text>
          </Card>
          <Card
            variant="default"
            className="w-[23%] py-2.5 items-center rounded-2xl border-0"
          >
            <Text
              className="text-xl font-black mb-0.5"
              style={{ color: "#eab308" }}
            >
              {reservedCount}
            </Text>
            <Text
              className="text-[10px] font-bold text-center uppercase tracking-wider"
              style={{ color: theme.muted }}
              numberOfLines={1}
            >
              Reserved
            </Text>
          </Card>
        </View>

      </View>
      ) : null}

      {isCheckedIn ? (
        <>
        <View className="px-6">
          {filteredTables.length > 0 ? (
            filteredTables.map((table) => {
              const statusColor = getStatusColor(table.status);
              const capacity = table.capacity;
              const isBlocked = table.isBlocked ?? table.status !== "available";

              return (
                <Pressable
                  key={table.id}
                  onPress={() => handleTablePress(table)}
                >
                  <Card
                    variant="default"
                    className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text
                          className="text-lg font-black"
                          style={{ color: theme.text }}
                        >
                          {table.tableName}
                        </Text>
                        <View
                          className="px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        >
                          <Text
                            className="text-[10px] font-extrabold uppercase"
                            style={{ color: "#ffffff" }}
                          >
                            {table.status}
                          </Text>
                        </View>

                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isBlocked ? "#ef4444" : "#22c55e",
                          }}
                        >
                          <Text className="text-[9px] font-bold text-white">
                            {isBlocked ? "BLOCKED 🔒" : "OPEN 🔓"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className="text-xs font-medium mb-1"
                        style={{ color: theme.muted }}
                      >
                        Capacity: {capacity} Guests Max
                      </Text>

                      {table.waiterName && (
                        <Text
                          className="text-xs font-bold mb-1"
                          style={{ color: theme.text }}
                        >
                          Waiter: {table.waiterName}
                        </Text>
                      )}

                      {table.status === "available" ||
                      table.status === "reserved" ? (
                        <Text
                          className="text-xs italic"
                          style={{ color: theme.muted }}
                        >
                          {table.status === "reserved"
                            ? "Reserved"
                            : "Ready for seating"}
                        </Text>
                      ) : (
                        <Text
                          className="text-xs font-bold"
                          style={{ color: theme.text }}
                        >
                          In service
                        </Text>
                      )}
                    </View>

                    <View className="items-end">
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.primary }}
                      >
                        Details →
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          ) : (
            <Card
              variant="default"
              className="p-8 rounded-2xl border border-dashed items-center mt-6"
              style={{ borderColor: theme.border }}
            >
              <Text
                className="text-sm italic text-center"
                style={{ color: theme.muted }}
              >
                No tables found matching your filter.
              </Text>
            </Card>
          )}
        </View>
        </>
      ) : (
        <View className="flex-1 px-6 justify-center items-center">
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center w-full shadow-lg"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="text-3xl mb-2">🔒</Text>
            <Text
              className="text-lg font-black mb-1 text-center"
              style={{ color: theme.text }}
            >
              You are Checked Out
            </Text>
            <Text
              className="text-xs font-medium text-center mb-4"
              style={{ color: theme.muted }}
            >
              Toggle &apos;Check In&apos; above to view and manage your assigned floor
              tables.
            </Text>
          </Card>
        </View>
      )}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
