import { Drumstick, Heart, Leaf, Star } from "lucide-react-native";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../constants/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.43;

interface FoodCardProps {
  item: any;
  widthOverride?: number;
}

export default function FoodCard({ item, widthOverride }: FoodCardProps) {
  const theme = useAppTheme();

  return (
    <View
      className="mb-4 overflow-hidden rounded-[24px] shadow-sm"
      style={{
        width: widthOverride || CARD_WIDTH,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
      }}
    >
      <View className="relative h-36 w-full">
        <Image
          source={{ uri: item.image }}
          className="h-full w-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <View className="absolute top-3 left-3 flex-row items-center rounded-lg bg-white/95 px-1.5 py-1 backdrop-blur-md">
          {item.isVeg ? (
            <Leaf size={14} color="hsl(146, 80%, 40%)" strokeWidth={3} />
          ) : (
            <Drumstick size={14} color="hsl(8, 100%, 65%)" strokeWidth={3} />
          )}
        </View>
        <Pressable className="absolute top-3 right-3 rounded-full bg-black/40 p-2 backdrop-blur-md">
          <Heart size={16} color="white" strokeWidth={2.5} />
        </Pressable>
        <Text className="absolute bottom-3 left-3 text-lg font-black text-white tracking-tight">
          {item.offer}
        </Text>
      </View>
      <View className="p-3.5">
        <Text
          className="text-[15px] font-extrabold"
          style={{ color: theme.text }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View className="mt-1.5 flex-row items-center">
          <Star size={14} color={theme.primary} fill={theme.primary} />
          <Text
            className="ml-1 text-xs font-bold"
            style={{ color: theme.muted }}
          >
            {item.rating}
          </Text>
          <Text className="mx-1.5 text-xs" style={{ color: theme.muted }}>
            •
          </Text>
          <Text
            className="text-xs font-semibold"
            style={{ color: theme.muted }}
          >
            {item.time}
          </Text>
        </View>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-lg font-black" style={{ color: theme.text }}>
            {item.price}
          </Text>
          <Pressable
            className="rounded-xl px-5 py-2.5 border"
            style={{
              backgroundColor: theme.isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.03)",
              borderColor: theme.border,
            }}
          >
            <Text
              className="text-sm font-black uppercase"
              style={{ color: theme.primary }}
            >
              ADD
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
