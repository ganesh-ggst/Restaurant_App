import { ChevronRightCircle, Timer } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function ViewCartButton({
  orderMode,
  activeCartTotalItems,
  dineInCartState = "idle",
  orderCountdown = 0,
  onPress,
  theme,
}: any) {
  // Show if cart has items OR if Dine-in is actively waiting/processing
  const shouldShow =
    activeCartTotalItems > 0 ||
    (orderMode === "Dine-in" && dineInCartState !== "idle");

  if (!shouldShow) return null;

  const isWaiting = orderMode === "Dine-in" && dineInCartState === "waiting";
  const isApproved = orderMode === "Dine-in" && dineInCartState === "approved";
  const isRejected = orderMode === "Dine-in" && dineInCartState === "rejected";

  let bgColor = theme.primary;
  if (isWaiting) bgColor = "#F59E0B"; // Orange
  if (isRejected) bgColor = "#EF4444"; // Red

  return (
    <View className="absolute left-4 right-4 z-50" style={{ bottom: 110 }}>
      <Pressable
        onPress={onPress}
        className="w-full h-[55px] rounded-[20px] flex-row items-center justify-between px-6 shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        {isWaiting ? (
          <>
            <Text className="text-white font-black text-[17px]">
              Kitchen Reviewing...
            </Text>
            <View className="flex-row items-center">
              <Timer size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white font-black text-[17px]">
                00:{orderCountdown.toString().padStart(2, "0")}
              </Text>
            </View>
          </>
        ) : isApproved ? (
          <>
            <Text className="text-white font-black text-[17px]">
              Order Approved!
            </Text>
            <View className="flex-row items-center">
              <Text className="text-white font-black text-[17px] mr-2">
                View
              </Text>
              <ChevronRightCircle size={22} color="#fff" strokeWidth={2.5} />
            </View>
          </>
        ) : isRejected ? (
          <>
            <Text className="text-white font-black text-[17px]">
              Item Unavailable
            </Text>
            <View className="flex-row items-center">
              <Text className="text-white font-black text-[17px] mr-2">
                View
              </Text>
              <ChevronRightCircle size={22} color="#fff" strokeWidth={2.5} />
            </View>
          </>
        ) : (
          <>
            <Text className="text-white font-black text-[17px]">
              {activeCartTotalItems} Item{activeCartTotalItems > 1 ? "s" : ""}{" "}
              added
            </Text>
            <View className="flex-row items-center">
              <Text className="text-white font-black text-[17px] mr-2">
                View Cart
              </Text>
              <ChevronRightCircle size={22} color="#fff" strokeWidth={2.5} />
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}
