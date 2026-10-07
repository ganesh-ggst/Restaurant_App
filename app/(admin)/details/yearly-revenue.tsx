import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminDashboardApi,
  type AdminYearlyRevenue,
} from "../../../services/api/admin-profile";

const formatINR = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function YearlyRevenueDetail() {
  const router = useRouter();
  const theme = useAppTheme();
  const [data, setData] = useState<AdminYearlyRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError("");
    try {
      setData(await adminDashboardApi.getYearlyRevenue(forceRefresh));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load yearly revenue analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      if (!data) void load();
    }, [data, load]),
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <View
        className="flex-row items-center border-b px-4 py-4"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable onPress={() => router.back()} className="mr-4 p-1" accessibilityRole="button">
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Fiscal Year Revenue Audit
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator className="mt-8" size="large" color={theme.primary} />
        ) : error ? (
          <View className="items-center py-8">
            <Text className="mb-4 text-center" style={{ color: theme.danger }}>{error}</Text>
            <Pressable onPress={() => void load(true)} accessibilityRole="button">
              <Text className="font-bold" style={{ color: theme.primary }}>Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <Card
            variant="default"
            className="mb-4 rounded-3xl border-0 p-5"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="mb-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Total Fiscal Year Revenue · {data.fiscalYear}
            </Text>
            <Text className="mb-2 text-3xl font-black" style={{ color: "#eab308" }}>
              {formatINR(data.totalFiscalYearRevenue)}
            </Text>
            <Text className="mb-4 text-sm font-semibold" style={{ color: theme.muted }}>
              {data.totalOrderCount} orders
            </Text>
            {data.quarters.map((quarter) => {
              const isLive = quarter.status.toUpperCase() === "LIVE";
              const growth =
                quarter.growthPercentage === null
                  ? "—"
                  : `${quarter.growthPercentage >= 0 ? "+" : ""}${quarter.growthPercentage}%`;
              return (
                <View
                  key={quarter.quarter}
                  className="mb-3 flex-row items-center justify-between rounded-2xl border px-4 py-4"
                  style={{
                    backgroundColor: isLive ? theme.secondaryBg : theme.bg,
                    borderColor: isLive ? "#eab308" : theme.border,
                  }}
                >
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.text }}>
                      {quarter.quarter} {quarter.label}
                    </Text>
                    <Text className="mt-1 text-xs font-semibold" style={{ color: theme.muted }}>
                      Growth: {growth} YoY · {quarter.orderCount} orders
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="mb-1 text-base font-black" style={{ color: theme.text }}>
                      {formatINR(quarter.revenue)}
                    </Text>
                    <Text className="text-[10px] font-extrabold" style={{ color: isLive ? theme.primary : theme.muted }}>
                      {quarter.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
