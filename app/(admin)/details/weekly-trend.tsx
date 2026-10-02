import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../components/ui/Card";
import { FINANCIAL_MOCK_STATE } from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function WeeklyTrendDetail() {
  const router = useRouter();
  const theme = useAppTheme();

  const [weeklyTrend, setWeeklyTrend] = useState<any[]>(
    FINANCIAL_MOCK_STATE.weeklyTrend || [],
  );

  useFocusEffect(
    useCallback(() => {
      const trend = (FINANCIAL_MOCK_STATE.weeklyTrend || []).map((w: any) => {
        const dineIn = w.dineIn || Math.round(w.amount * 0.6);
        const delivery = w.delivery || Math.round(w.amount * 0.25);
        const takeaway =
          w.takeaway || Math.max(0, w.amount - dineIn - delivery);
        return {
          ...w,
          dineIn,
          delivery,
          takeaway,
        };
      });
      setWeeklyTrend(trend);
    }, []),
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

  const daysList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const liveDayStr = daysList[new Date().getDay()];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        className="flex-row items-center px-4 py-4 border-b"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable onPress={() => router.back()} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Weekly Trend Deep-Dive
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card
          variant="default"
          className="p-5 rounded-3xl border-0 mb-4 shadow-lg"
          style={{ backgroundColor: theme.card }}
        >
          <Text
            className="text-base font-black mb-4"
            style={{ color: theme.text }}
          >
            Detailed Daily Breakdown
          </Text>
          {weeklyTrend.map((w: any, i: number) => {
            const isToday = w.day === liveDayStr;
            const isPeak = i === 5;
            const dayName = dayMap[w.day] || w.day;
            return (
              <View
                key={i}
                className="py-4 px-4 mb-3 rounded-2xl border flex-row justify-between items-center"
                style={{
                  backgroundColor: isToday
                    ? theme.isDark
                      ? "rgba(59, 130, 246, 0.12)"
                      : "rgba(59, 130, 246, 0.06)"
                    : theme.bg,
                  borderColor: isToday ? theme.primary : theme.border,
                }}
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <Text
                      className="text-sm font-bold"
                      style={{ color: isToday ? theme.primary : theme.text }}
                    >
                      {dayName} {isPeak && "(Peak)"}
                    </Text>
                    {isToday && (
                      <Text className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                        LIVE DAY
                      </Text>
                    )}
                  </View>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.muted }}
                  >
                    Dine-In: ₹{w.dineIn.toLocaleString("en-IN")} • Takeaway: ₹
                    {w.takeaway.toLocaleString("en-IN")} • Delivery: ₹
                    {w.delivery.toLocaleString("en-IN")}
                  </Text>
                </View>
                <Text
                  className="text-base font-black"
                  style={{ color: isToday ? theme.primary : theme.text }}
                >
                  ₹
                  {w.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
