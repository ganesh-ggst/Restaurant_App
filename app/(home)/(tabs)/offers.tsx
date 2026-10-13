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
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../../components/home/FoodCard";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useOrderMode } from "../_layout";

import { api } from "../../../services/api";

export default function OffersScreen() {
  const router = useRouter();

  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const {
    mode: orderMode,
    carts,
    menuItems,
    offers,
    activeBranch,
    refreshHomeData,
    isRefreshingHome,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = carts[orderMode] || [];

  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const params = useLocalSearchParams();
  const targetOfferId = Array.isArray(params.offerId)
    ? params.offerId[0]
    : params.offerId || null;

  const selectedBranchId = activeBranch?.id;
  const branchOffers = selectedBranchId
    ? offers.filter((offer: any) => {
        const offerBranchId =
          typeof offer.branchId === "string"
            ? offer.branchId
            : offer.branchId?._id;
        return offerBranchId === selectedBranchId;
      })
    : [];
  const displayedOffers = targetOfferId
    ? branchOffers.filter((offer: any) => offer.id === targetOfferId)
    : branchOffers;

  const selectedOffer = displayedOffers[0];
  const applicableItems = selectedOffer
    ? selectedOffer.appliesToAllItems
      ? menuItems
      : selectedOffer.applicableMenuItemIds?.length
        ? menuItems.filter((item: any) =>
            selectedOffer.applicableMenuItemIds.includes(item.id),
          )
        : menuItems
    : [];

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
            onPress={() => router.push("/(home)/(tabs)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/(tabs)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingHome}
            onRefresh={() => void refreshHomeData()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
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

        {displayedOffers.map((offer: any) => (
          <View key={offer.id} className={targetOfferId ? "mb-0" : "mb-3"}>
            <Pressable
              onPress={() => {
                router.setParams({ offerId: offer.id });
                void api.getOffer(offer.id).catch((error: unknown) => {
                  Alert.alert(
                    "Unable to Load Offer",
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  );
                });
              }}
              className="w-full overflow-hidden rounded-[24px] border"
              style={{ borderColor: theme.border, minHeight: 180 }}
            >
              {offer.image?.trim() ? (
                <Image
                  source={{ uri: offer.image }}
                  className="absolute h-full w-full"
                  resizeMode="cover"
                />
              ) : null}
              <View className="absolute inset-0 bg-black/60" />

              <View className="flex-1 p-4 justify-center">
                <Text
                  className="text-white text-2xl font-black tracking-tight"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {offer.title}
                </Text>
                <Text
                  className="text-white/80 text-sm font-bold mt-1"
                  numberOfLines={2}
                >
                  {offer.subtitle}
                </Text>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    copyToClipboard(offer.code);
                  }}
                  className="mt-2 self-start max-w-full bg-white/15 px-3 py-1.5 rounded-xl border border-white/30 border-dashed flex-row items-center"
                >
                  <Text
                    className="text-xs font-black tracking-widest mr-2"
                    numberOfLines={1}
                    ellipsizeMode="middle"
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
                  {applicableItems.map((item: any) => {
                    const cartQuantity = activeCart.reduce(
                      (quantity: number, cartItem: any) =>
                        quantity +
                        (cartItem.id === item.id ? cartItem.quantity : 0),
                      0,
                    );
                    return (
                      <View
                        key={item.id}
                        style={{ width: "48%" }}
                        className="mb-4"
                      >
                        <FoodCard
                          item={item}
                          cartQuantity={cartQuantity}
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
