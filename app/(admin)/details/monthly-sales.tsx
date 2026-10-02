import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../../components/ui/Card";
import {
  FINANCIAL_MOCK_STATE,
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function MonthlySalesDetail() {
  const router = useRouter();
  const theme = useAppTheme();

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

  const [monthlySales, setMonthlySales] = useState(
    FINANCIAL_MOCK_STATE.monthlySalesBase +
      FINANCIAL_MOCK_STATE.completedTableBills,
  );
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<any[]>(
    (FINANCIAL_MOCK_STATE as any).monthlyBreakdown || [],
  );

  useFocusEffect(
    useCallback(() => {
      let tableCompletedSum = 0;
      INITIAL_FLOOR_TABLES.forEach((t) => {
        if (t.status === "available" && t.currentOrder?.totalAmount) {
          tableCompletedSum += t.currentOrder.totalAmount;
        }
      });

      let completedOrdersSum = 0;
      (MANAGER_MOCK_DATA.orders || []).forEach((o: any) => {
        if (o.status === "completed") {
          completedOrdersSum += calculateOrderTotal(o);
        }
      });

      const extraRevenue =
        (FINANCIAL_MOCK_STATE.completedTableBills || 0) +
        tableCompletedSum +
        completedOrdersSum;

      const calculatedMonthly =
        FINANCIAL_MOCK_STATE.monthlySalesBase + extraRevenue;

      setMonthlySales(calculatedMonthly);

      if ((FINANCIAL_MOCK_STATE as any).monthlyBreakdown) {
        const weeks = [...(FINANCIAL_MOCK_STATE as any).monthlyBreakdown];
        if (weeks.length > 0) {
          weeks[weeks.length - 1] = {
            ...weeks[weeks.length - 1],
            amount: weeks[weeks.length - 1].amount + extraRevenue,
          };
        }
        setWeeklyBreakdown(weeks);
      }
    }, []),
  );

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
          Monthly Sales Analytics
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card
          variant="default"
          className="p-5 rounded-3xl border-0 mb-4 shadow-lg"
          style={{ backgroundColor: theme.card }}
        >
          <Text
            className="text-xs font-bold uppercase mb-1"
            style={{ color: theme.muted }}
          >
            Total Month-to-Date Revenue
          </Text>
          <Text
            className="text-3xl font-black mb-4"
            style={{ color: theme.primary }}
          >
            ₹
            {monthlySales.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          {weeklyBreakdown.map((w: any, i: number) => {
            const isCurrentWeek = i === weeklyBreakdown.length - 1;
            return (
              <View
                key={i}
                className="py-4 px-4 mb-3 rounded-2xl border flex-row justify-between items-center"
                style={{
                  backgroundColor: isCurrentWeek
                    ? theme.isDark
                      ? "rgba(59, 130, 246, 0.12)"
                      : "rgba(59, 130, 246, 0.06)"
                    : theme.bg,
                  borderColor: isCurrentWeek ? theme.primary : theme.border,
                }}
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-bold mb-1"
                    style={{ color: theme.text }}
                  >
                    {w.label}
                  </Text>
                  <Text
                    className="text-base font-black"
                    style={{ color: theme.primary }}
                  >
                    ₹
                    {w.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-xs font-extrabold uppercase px-3 py-1 rounded-full"
                    style={{
                      color: isCurrentWeek ? "#3b82f6" : "#22c55e",
                      backgroundColor: isCurrentWeek
                        ? "rgba(59, 130, 246, 0.15)"
                        : "rgba(34, 197, 94, 0.15)",
                    }}
                  >
                    {isCurrentWeek ? "LIVE" : w.status || "Verified"}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
