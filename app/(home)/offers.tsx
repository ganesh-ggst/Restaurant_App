import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle2,
  Copy,
  Heart,
  Tag,
  UserRound,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

// EVERYTHING IS NOW IMPORTED FROM YOUR GLOBAL MOCK DATA!
import { ALL_OFFERS, FOOD_ITEMS } from "../../constants/mockData";

export default function OffersScreen() {
  const router = useRouter();

  // USING YOUR GLOBAL THEME HOOK!
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const {
    mode: orderMode,
    carts,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = carts[orderMode] || [];

  // Calculate total items to adjust bottom padding dynamically
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const params = useLocalSearchParams();
  const targetOfferId = params.offerId
    ? parseInt(params.offerId as string)
    : null;

  const displayedOffers = targetOfferId
    ? ALL_OFFERS.filter((o) => o.id === targetOfferId)
    : ALL_OFFERS;

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row justify-between items-center px-4 py-3 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <Text className="text-3xl font-black" style={{ color: theme.text }}>
          Exclusive Offers
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        // Dynamically adjust padding based on cart items just like index.tsx
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {targetOfferId && (
          <Pressable
            onPress={() => router.setParams({ offerId: undefined })}
            className="self-start flex-row items-center px-4 py-2 rounded-full border mb-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Tag
              size={16}
              color={theme.primary}
              strokeWidth={2}
              className="mr-1.5"
            />
            <Text
              className="text-sm font-extrabold"
              style={{ color: theme.primary }}
            >
              View All Offers
            </Text>
            <X size={16} color={theme.muted} className="ml-1.5" />
          </Pressable>
        )}

        {displayedOffers.map((offer) => (
          <View key={offer.id} className={targetOfferId ? "mb-0" : "mb-3"}>
            <Pressable
              onPress={() => router.setParams({ offerId: offer.id.toString() })}
              className="h-48 w-full overflow-hidden rounded-[24px] border"
              style={{ borderColor: theme.border }}
            >
              <Image
                source={{ uri: offer.image }}
                className="absolute h-full w-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/60" />

              <View className="flex-1 p-5 justify-center">
                <Text className="text-white text-4xl font-black tracking-tight">
                  {offer.title}
                </Text>
                <Text className="text-white/80 text-base font-bold mt-1">
                  {offer.subtitle}
                </Text>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    copyToClipboard(offer.code);
                  }}
                  className="mt-4 self-start bg-white/15 px-4 py-2.5 rounded-xl border border-white/30 border-dashed flex-row items-center"
                >
                  <Text
                    className="text-sm font-black tracking-widest mr-2"
                    style={{
                      color: copiedCode === offer.code ? "#4ade80" : "white",
                    }}
                  >
                    {copiedCode === offer.code
                      ? "COPIED!"
                      : `CODE: ${offer.code}`}
                  </Text>
                  {copiedCode === offer.code ? (
                    <CheckCircle2 size={16} color="#4ade80" />
                  ) : (
                    <Copy size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
            </Pressable>

            {targetOfferId === offer.id && (
              <View className="mt-6">
                <Text
                  className="text-xl font-black mb-4"
                  style={{ color: theme.text }}
                >
                  Applicable Items
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {FOOD_ITEMS.map((item: any) => {
                    const cartItem = activeCart.find(
                      (c: any) => c.id === item.id,
                    );
                    return (
                      <View
                        key={item.id}
                        style={{ width: "48%" }}
                        className="mb-4"
                      >
                        <FoodCard
                          item={item}
                          cartQuantity={cartItem?.quantity || 0}
                          onAddToCart={(qty, addons, total) =>
                            handleAddToCart(item, qty, addons, total)
                          }
                          onDecrement={() => handleDecrementCartItem(item.id)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
