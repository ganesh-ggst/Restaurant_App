import { ChevronRightCircle } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export default function ViewCartButton({
  orderMode,
  activeCartTotalItems,
  dineInCartState = "idle",
  submissionPhase,
  submissionCountdown,
  onPress,
  theme,
  bottomOffset,
}: any) {
  const shouldShow =
    activeCartTotalItems > 0 ||
    (orderMode === "Dine-in" && dineInCartState !== "idle");

  if (!shouldShow) return null;

  const isWaiting = orderMode === "Dine-in" && dineInCartState === "waiting";
  const isApproved = orderMode === "Dine-in" && dineInCartState === "approved";
  const isRejected = orderMode === "Dine-in" && dineInCartState === "rejected";

  let bgColor = theme.primary;
  if (isWaiting) bgColor = "#F59E0B";
  if (isRejected) bgColor = "#EF4444";

  return (
    <View
      className="absolute left-4 right-4 z-50"
      style={{ bottom: bottomOffset }}
    >
      <Pressable
        onPress={onPress}
        className="w-full h-[55px] rounded-[20px] flex-row items-center justify-between px-6 shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        {isWaiting ? (
          <>
            <Text className="text-white font-black text-[17px]">
              {submissionPhase === "submitting"
                ? "Submitting to kitchen..."
                : submissionPhase === "sending"
                  ? "Sending to kitchen..."
                  : "Preparing order..."}
            </Text>
            <Text className="text-white font-black text-[17px]">
              {submissionPhase === "submitting"
                ? "Please wait"
                : submissionCountdown || "Please wait"}
            </Text>
          </>
        ) : isApproved ? (
          <>
            <Text className="text-white font-black text-[17px]">
              Order Submitted!
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
              Order Not Submitted
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
