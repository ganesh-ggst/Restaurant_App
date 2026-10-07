import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminDashboardApi,
  type AdminSalesDistribution,
} from "../../../services/api/admin-profile";

const formatINR = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SalesDistributionDetail() {
  const router = useRouter();
  const theme = useAppTheme();
  const [data, setData] = useState<AdminSalesDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError("");
    try {
      setData(await adminDashboardApi.getSalesDistribution(forceRefresh));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load sales distribution.",
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

  const colors = [theme.primary, "#22c55e", "#eab308"];

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
          Sales Distribution
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
              {data.period.replace(/_/g, " ")} · Total revenue
            </Text>
            <Text className="mb-1 text-3xl font-black" style={{ color: theme.primary }}>
              {formatINR(data.totalRevenue)}
            </Text>
            <Text className="mb-4 text-sm font-semibold" style={{ color: theme.muted }}>
              {data.totalOrderCount} orders
            </Text>
            {data.items.map((item, index) => (
              <View
                key={item.fulfillmentType}
                className="border-b py-4"
                style={{ borderBottomColor: theme.border }}
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="mr-3 flex-1 text-sm font-bold" style={{ color: theme.text }}>
                    {item.label} ({item.percentage}%)
                  </Text>
                  <Text className="text-sm font-black" style={{ color: colors[index % colors.length] }}>
                    {formatINR(item.revenue)}
                  </Text>
                </View>
                <Text className="mb-2 text-xs font-semibold" style={{ color: theme.muted }}>
                  {item.orderCount} orders{item.volume === undefined ? "" : ` · Volume ${item.volume}`}
                </Text>
                <View className="h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.bg }}>
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, item.percentage))}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
