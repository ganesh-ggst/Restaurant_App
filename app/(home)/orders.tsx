import { useRouter } from "expo-router";
import { ScrollText, UserRound } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- MOCK ORDERS DATA ---
const MOCK_ORDERS = [
  {
    id: "ORD-9823",
    date: "Today, 1:45 PM",
    status: "Preparing",
    items: "1x Special Chicken Dum Biryani, 2x Garlic Naan",
    total: "₹429",
    isActive: true,
  },
  {
    id: "ORD-9710",
    date: "Aug 12, 8:30 PM",
    status: "Delivered",
    items: "2x Paneer Butter Masala, 1x Tandoori Platter",
    total: "₹1,127",
    isActive: false,
  },
  {
    id: "ORD-9654",
    date: "Aug 02, 1:15 PM",
    status: "Delivered",
    items: "1x Hyderabadi Mutton Biryani, 1x Gulab Jamun",
    total: "₹548",
    isActive: false,
  },
];

export default function OrdersScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("Active");

  // --- YOUR EXACT GLOBAL.CSS COLORS ---
  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const cardBg = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const mutedText = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";

  const displayOrders = MOCK_ORDERS.filter((o) =>
    activeTab === "Active" ? o.isActive : !o.isActive,
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: insets.top }}>
      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: textColor, fontSize: 28, fontWeight: "900" }}>
          Your Orders
        </Text>
        <Pressable
          onPress={() => router.push("/(home)/profile")}
          style={{
            height: 44,
            width: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor,
          }}
        >
          <UserRound size={22} color={textColor} strokeWidth={2} />
        </Pressable>
      </View>

      {/* CUSTOM 2-WAY TAB SWITCH */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 4,
            borderWidth: 1,
            borderColor: borderColor,
          }}
        >
          {["Active", "Past Orders"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor:
                  activeTab === tab ? primaryColor : "transparent",
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? "#fff" : mutedText,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {displayOrders.length === 0 ? (
          /* EMPTY STATE */
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
              backgroundColor: cardBg,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: borderColor,
            }}
          >
            <ScrollText
              size={64}
              color={mutedText}
              strokeWidth={1.5}
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <Text style={{ color: textColor, fontSize: 18, fontWeight: "800" }}>
              No {activeTab} Orders
            </Text>
            <Text style={{ color: mutedText, fontSize: 14, marginTop: 4 }}>
              Craving something delicious?
            </Text>
          </View>
        ) : (
          /* ORDER CARDS */
          displayOrders.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: cardBg,
                borderRadius: 24,
                padding: 16,
                borderWidth: 1,
                borderColor: borderColor,
              }}
            >
              {/* Order Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor,
                  paddingBottom: 12,
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: textColor,
                      fontSize: 16,
                      fontWeight: "800",
                    }}
                  >
                    {order.id}
                  </Text>
                  <Text
                    style={{ color: mutedText, fontSize: 12, marginTop: 2 }}
                  >
                    {order.date}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: order.isActive
                      ? primaryColor
                      : isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: order.isActive ? primaryColor : borderColor,
                  }}
                >
                  <Text
                    style={{
                      color: order.isActive ? "#fff" : textColor,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>

              {/* Order Details */}
              <Text
                style={{
                  color: mutedText,
                  fontSize: 14,
                  lineHeight: 22,
                  marginBottom: 12,
                }}
              >
                {order.items}
              </Text>

              {/* Order Footer */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <Text
                  style={{ color: textColor, fontSize: 18, fontWeight: "900" }}
                >
                  {order.total}
                </Text>
                <Pressable
                  style={{
                    backgroundColor: bgColor,
                    borderWidth: 1,
                    borderColor: primaryColor,
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: primaryColor,
                      fontSize: 14,
                      fontWeight: "800",
                    }}
                  >
                    {order.isActive ? "Track Order" : "Reorder"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
