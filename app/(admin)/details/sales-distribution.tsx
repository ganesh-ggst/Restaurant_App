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

export default function SalesDistributionDetail() {
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

  const [channels, setChannels] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let tableCompletedSum = FINANCIAL_MOCK_STATE.completedTableBills || 0;
      let completedTableCount =
        (FINANCIAL_MOCK_STATE as any).completedTableTransactions?.length || 0;

      INITIAL_FLOOR_TABLES.forEach((t) => {
        if (t.status === "available" && t.currentOrder?.totalAmount) {
          tableCompletedSum += t.currentOrder.totalAmount;
          completedTableCount += 1;
        }
      });

      const baseDineInAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.dineIn.amount +
        tableCompletedSum;
      const baseDineInOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.dineIn.orders +
        completedTableCount;

      let deliveryOrdersSum = 0;
      let deliveryOrdersCount = 0;
      let takeawayOrdersSum = 0;
      let takeawayOrdersCount = 0;

      (MANAGER_MOCK_DATA.orders || []).forEach((o: any) => {
        if (o.status === "completed") {
          const ordTotal = calculateOrderTotal(o);
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

      const deliveryAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.delivery.amount +
        deliveryOrdersSum;
      const deliveryOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.delivery.orders +
        deliveryOrdersCount;

      const takeawayAmt =
        FINANCIAL_MOCK_STATE.salesDistribution.takeaway.amount +
        takeawayOrdersSum;
      const takeawayOrders =
        FINANCIAL_MOCK_STATE.salesDistribution.takeaway.orders +
        takeawayOrdersCount;

      const totalRevenue = baseDineInAmt + deliveryAmt + takeawayAmt;

      const dineInPct =
        totalRevenue > 0
          ? Math.round((baseDineInAmt / totalRevenue) * 100)
          : 60;
      const deliveryPct =
        totalRevenue > 0 ? Math.round((deliveryAmt / totalRevenue) * 100) : 25;
      const takeawayPct = Math.max(0, 100 - dineInPct - deliveryPct);

      setChannels([
        {
          channel: "Dine-In Tables",
          share: `${dineInPct}%`,
          rev: `₹${baseDineInAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          orders: `${baseDineInOrders} Orders`,
          color: theme.primary,
        },
        {
          channel: "Online Delivery",
          share: `${deliveryPct}%`,
          rev: `₹${deliveryAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          orders: `${deliveryOrders} Orders`,
          color: "#22c55e",
        },
        {
          channel: "Takeaway Orders",
          share: `${takeawayPct}%`,
          rev: `₹${takeawayAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          orders: `${takeawayOrders} Orders`,
          color: "#eab308",
        },
      ]);
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
          Sales Distribution Breakdown
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
            Channel-wise Contribution (Live)
          </Text>
          {channels.map((c, i) => (
            <View
              key={i}
              className="py-4 border-b"
              style={{ borderBottomColor: theme.border }}
            >
              <View className="flex-row justify-between mb-1 items-center">
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  {c.channel} ({c.share})
                </Text>
                <Text className="text-sm font-black" style={{ color: c.color }}>
                  {c.rev}
                </Text>
              </View>
              <Text
                className="text-xs font-semibold mb-2"
                style={{ color: theme.muted }}
              >
                Volume: {c.orders}
              </Text>
              <View
                className="h-2.5 rounded-full overflow-hidden"
                style={{ backgroundColor: theme.bg }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: c.share as any,
                    backgroundColor: c.color,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
