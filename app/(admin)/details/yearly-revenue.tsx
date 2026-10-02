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

export default function YearlyRevenueDetail() {
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

  const [yearlyRevenue, setYearlyRevenue] = useState(
    FINANCIAL_MOCK_STATE.yearlyRevenueBase +
      FINANCIAL_MOCK_STATE.completedTableBills,
  );
  const [quarterlyBreakdown, setQuarterlyBreakdown] = useState<any[]>(
    (FINANCIAL_MOCK_STATE as any).yearlyBreakdown || [],
  );
  const [yoyGrowth, setYoyGrowth] = useState("+14%");

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

      const calculatedYearly =
        FINANCIAL_MOCK_STATE.yearlyRevenueBase + extraRevenue;

      setYearlyRevenue(calculatedYearly);

      const prevYearBase =
        (FINANCIAL_MOCK_STATE as any).previousYearRevenueBase || 16157890;
      const growthPct =
        ((calculatedYearly - prevYearBase) / prevYearBase) * 100;
      setYoyGrowth(`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`);

      if ((FINANCIAL_MOCK_STATE as any).yearlyBreakdown) {
        const quarters = [...(FINANCIAL_MOCK_STATE as any).yearlyBreakdown];
        if (quarters.length > 0) {
          quarters[quarters.length - 1] = {
            ...quarters[quarters.length - 1],
            rev: Number(quarters[quarters.length - 1].rev) + extraRevenue,
            growth: `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%`,
          };
        }
        setQuarterlyBreakdown(quarters);
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
          Yearly Revenue Audit (2025-2026)
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
            Total Fiscal Year Revenue
          </Text>
          <Text
            className="text-3xl font-black mb-4"
            style={{ color: "#eab308" }}
          >
            ₹
            {yearlyRevenue.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text
            className="text-sm font-semibold mb-3"
            style={{ color: theme.text }}
          >
            Quarterly Performance Breakdown:
          </Text>
          {quarterlyBreakdown.map((q: any, i: number) => {
            const isCurrentQuarter = i === quarterlyBreakdown.length - 1;
            return (
              <View
                key={i}
                className="py-4 px-4 mb-3 rounded-2xl border flex-row justify-between items-center"
                style={{
                  backgroundColor: isCurrentQuarter
                    ? theme.isDark
                      ? "rgba(234, 179, 8, 0.12)"
                      : "rgba(234, 179, 8, 0.06)"
                    : theme.bg,
                  borderColor: isCurrentQuarter ? "#eab308" : theme.border,
                }}
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-bold mb-1"
                    style={{ color: theme.text }}
                  >
                    {q.quarter}
                  </Text>
                  <Text className="text-xs font-semibold text-emerald-500">
                    Growth: {isCurrentQuarter ? yoyGrowth : q.growth} YoY
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-base font-black"
                    style={{ color: theme.text }}
                  >
                    ₹
                    {Number(q.rev).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
