import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminDashboardApi,
  type AdminWeeklyTrend,
} from "../../../services/api/admin-profile";

const formatINR = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function WeeklyTrendDetail() {
  const router = useRouter();
  const theme = useAppTheme();
  const [data, setData] = useState<AdminWeeklyTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const hasLoaded = useRef(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await adminDashboardApi.getWeeklyTrend(forceRefresh));
      hasLoaded.current = true;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load weekly revenue analytics.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(true);
    }, [load]),
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
          Weekly Revenue Deep-Dive
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
        ) : error && !data ? (
          <View className="items-center py-8">
            <Text className="mb-4 text-center" style={{ color: theme.danger }}>{error}</Text>
            <Pressable onPress={() => void load(true)} accessibilityRole="button">
              <Text className="font-bold" style={{ color: theme.primary }}>Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            {error ? (
              <Text className="mb-4 text-sm" style={{ color: theme.danger }}>
                Could not refresh the latest trend: {error}
              </Text>
            ) : null}
            <Card
              variant="default"
              className="mb-4 rounded-3xl border-0 p-5"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="mb-4 text-base font-black" style={{ color: theme.text }}>
                Daily Breakdown · Week starts {data.weekStartsOn}
              </Text>
              {data.days.map((day) => (
                <View
                  key={day.date}
                  className="mb-3 rounded-2xl border px-4 py-4"
                  style={{
                    backgroundColor: day.isLiveDay ? theme.secondaryBg : theme.bg,
                    borderColor: day.isLiveDay ? theme.primary : theme.border,
                  }}
                >
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-bold" style={{ color: theme.text }}>
                      {day.day} · {day.date}
                      {day.isLiveDay ? "  LIVE" : ""}
                    </Text>
                    <Text className="text-sm font-black" style={{ color: theme.primary }}>
                      {formatINR(day.totalRevenue)}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold" style={{ color: theme.muted }}>
                    Dine-in {formatINR(day.dineInRevenue)} · Takeaway {formatINR(day.takeawayRevenue)} · Delivery {formatINR(day.deliveryRevenue)}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                    {day.orderCount} orders
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
