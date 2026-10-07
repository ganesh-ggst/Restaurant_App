import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  adminDashboardApi,
  type AdminTodayLiveRevenue,
} from "../../../services/api/admin-profile";

const formatINR = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TodayRevenueDetail() {
  const router = useRouter();
  const theme = useAppTheme();
  const [data, setData] = useState<AdminTodayLiveRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const hasLoaded = useRef(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh && hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await adminDashboardApi.getTodayLiveRevenue(forceRefresh));
      hasLoaded.current = true;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load today's live revenue.",
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
          Today&apos;s Live Revenue
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
            <Text className="mb-4 text-center" style={{ color: theme.danger }}>
              {error}
            </Text>
            <Pressable onPress={() => void load(true)} accessibilityRole="button">
              <Text className="font-bold" style={{ color: theme.primary }}>Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            {error ? (
              <Text className="mb-4 text-sm" style={{ color: theme.danger }}>
                Could not refresh the latest revenue: {error}
              </Text>
            ) : null}
            <Card
              variant="default"
              className="mb-4 rounded-3xl border-0 p-5"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="mb-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
                Total Collected Today
              </Text>
              <Text className="mb-4 text-3xl font-black" style={{ color: theme.primary }}>
                {formatINR(data.totalCollectedToday)}
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  Realized orders: {data.realizedOrderCount}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: theme.text }}>
                  Live orders: {data.liveOrderCount}
                </Text>
              </View>
              <Text className="mt-3 text-xs" style={{ color: theme.muted }}>
                Base storefront revenue: {formatINR(data.baseStorefrontRevenue)}
              </Text>
            </Card>

            <Card
              variant="default"
              className="rounded-3xl border-0 p-5"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="mb-4 text-base font-black" style={{ color: theme.text }}>
                Live Transactions
              </Text>
              {data.transactions.map((transaction) => (
                <View
                  key={transaction.id}
                  className="flex-row items-center justify-between border-b py-4"
                  style={{ borderBottomColor: theme.border }}
                >
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-bold" style={{ color: theme.text }}>
                      {transaction.label}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                      {[transaction.orderNumber, transaction.paymentStatus]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    <Text className="mt-1 text-xs font-bold" style={{ color: theme.primary }}>
                      {transaction.status}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-black" style={{ color: theme.text }}>
                      {formatINR(transaction.amount)}
                    </Text>
                    <Text
                      className="mt-1 text-[10px] font-extrabold"
                      style={{
                        color: transaction.badge === "SUCCESS" ? theme.primary : theme.muted,
                      }}
                    >
                      {transaction.badge}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
