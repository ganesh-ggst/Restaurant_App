import { useRouter } from "expo-router";
import { useVideoPlayer } from "expo-video";
import {
  CheckCircle2,
  ChevronDown,
  Heart,
  MapPin,
  Store,
  UserRound,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { HomeHeader } from "../../components/home/HomeHeader";
import {
  EMPTY_STATE,
  FEATURED_CONTENT,
  FOOD_ITEMS,
  MOCK_ADDRESSES,
  MOCK_BRANCHES,
} from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  // Extract global states from Layout context
  const {
    mode: orderMode,
    setMode: setOrderMode,
    carts,
    activeAddress,
    setActiveAddress,
    activeBranch,
    setActiveBranch,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();

  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const activeCart = carts[orderMode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const player = useVideoPlayer(
    FEATURED_CONTENT.type === "video" ? FEATURED_CONTENT.source : null,
    (player) => {
      player.loop = true;
      player.muted = true;
      player.play();
    },
  );

  const handleVoiceSearch = () => {
    setIsListening(true);
    setSearchQuery("");
    setTimeout(() => {
      setSearchQuery("Biryani");
      setIsListening(false);
    }, 2500);
  };

  const getFilteredData = () => {
    let filtered = FOOD_ITEMS;
    if (isVegOnly) filtered = filtered.filter((item) => item.isVeg);

    const lowerQuery = searchQuery.toLowerCase().trim();
    if (lowerQuery) {
      filtered = filtered.filter((item) => {
        if (item.name.toLowerCase().includes(lowerQuery)) return true;
        const queryWords = lowerQuery.split(" ").filter((w) => w.length > 0);
        return queryWords.some((word) =>
          item.name.toLowerCase().includes(word),
        );
      });
    }
    return filtered;
  };

  const listData = getFilteredData();

  const renderEmptyState = () => {
    if (!searchQuery) return null;
    return (
      <View className="items-center justify-center py-16 px-6">
        <Text className="text-6xl mb-4">{EMPTY_STATE.emoji}</Text>
        <Text
          className="text-2xl font-black mb-2 text-center"
          style={{ color: theme.text }}
        >
          {EMPTY_STATE.title}
        </Text>
        <Text
          className="text-sm font-semibold text-center leading-5"
          style={{ color: theme.muted }}
        >
          {EMPTY_STATE.subtitle.replace("{query}", searchQuery)}
        </Text>
      </View>
    );
  };

  const renderAddressModalItem = ({ item }: any) => {
    const isDelivery = orderMode === "Delivery";
    const isActive = isDelivery
      ? activeAddress.id === item.id
      : activeBranch.id === item.id;
    const Icon = isDelivery ? MapPin : Store;

    return (
      <Pressable
        onPress={() => {
          if (isDelivery) setActiveAddress(item);
          else setActiveBranch(item);
          setShowAddressModal(false);
        }}
        className="flex-row items-center p-4 mb-3 rounded-2xl border"
        style={{
          backgroundColor: theme.card,
          borderColor: isActive ? theme.primary : theme.border,
        }}
      >
        <Icon size={24} color={isActive ? theme.primary : theme.muted} />
        <View className="ml-4 flex-1">
          <Text className="text-base font-bold" style={{ color: theme.text }}>
            {isDelivery ? item.type : item.name}
          </Text>
          <Text
            className="text-sm font-semibold mt-1"
            style={{ color: theme.muted }}
          >
            {item.address}
          </Text>
        </View>
        {isActive && <CheckCircle2 size={24} color={theme.primary} />}
      </Pressable>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center justify-between px-4 pb-2 pt-2 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <Pressable className="flex-1" onPress={() => setShowAddressModal(true)}>
          <View className="flex-row items-center">
            {orderMode === "Delivery" ? (
              <MapPin size={22} color={theme.primary} strokeWidth={2.5} />
            ) : (
              <Store size={22} color={theme.primary} strokeWidth={2.5} />
            )}
            <Text
              className="ml-1 text-xl font-black tracking-tight"
              style={{ color: theme.text }}
            >
              {orderMode === "Delivery" ? activeAddress.type : "Currently at"}
            </Text>
            <ChevronDown
              size={20}
              color={theme.text}
              strokeWidth={2.5}
              className="ml-1 mt-0.5"
            />
          </View>
          <Text
            className="ml-7 text-xs font-bold mt-0.5 tracking-wide pr-4"
            style={{ color: theme.primary }}
            numberOfLines={1}
          >
            {orderMode === "Delivery"
              ? activeAddress.address
              : activeBranch.name}
          </Text>
        </Pressable>

        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <FlatList
        key={"grid-2"}
        data={listData}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
        renderItem={({ item }) => {
          // FIX: Explicitly typed 'c' as 'any' to resolve TS(7006)
          const cartItem = activeCart.find((c: any) => c.id === item.id);
          return (
            <View style={{ width: "48%" }}>
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
        }}
        ListHeaderComponent={
          <HomeHeader
            theme={theme}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isListening={isListening}
            handleVoiceSearch={handleVoiceSearch}
            isVegOnly={isVegOnly}
            setIsVegOnly={setIsVegOnly}
            player={player}
            router={router}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showAddressModal} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowAddressModal(false)}
        >
          <Pressable
            className="rounded-t-[32px] p-6 pb-12"
            style={{ backgroundColor: theme.bg, maxHeight: "80%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                className="text-xl font-black tracking-tight"
                style={{ color: theme.text }}
              >
                {orderMode === "Delivery"
                  ? "Choose Delivery Address"
                  : "Choose Restaurant Branch"}
              </Text>
              <Pressable
                onPress={() => setShowAddressModal(false)}
                className="p-2"
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
            <FlatList
              data={
                (orderMode === "Delivery"
                  ? MOCK_ADDRESSES
                  : MOCK_BRANCHES) as any[]
              }
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={renderAddressModalItem}
              showsVerticalScrollIndicator={false}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
