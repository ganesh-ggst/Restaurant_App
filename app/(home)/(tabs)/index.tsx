import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronDown,
  GlassWater,
  Heart,
  Keyboard as KeyboardIcon,
  MapPin,
  QrCode,
  Receipt,
  ScanLine,
  ShoppingBag,
  Store,
  UserRound,
  Wifi,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../../components/home/FoodCard";
import { HomeHeader } from "../../../components/home/HomeHeader";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import { useOrderMode } from "../_layout";

const hasImageUri = (uri: unknown): uri is string =>
  typeof uri === "string" && uri.trim().length > 0;

const getNumericPrice = (price: any) => {
  if (typeof price === "number") return price;
  return parseInt(String(price).replace(/\D/g, ""), 10) || 0;
};

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();

  const {
    mode: orderMode,
    setMode: setGlobalOrderMode,
    carts,
    menuItems,
    categories,
    offers,
    featuredReels,
    refreshHomeData,
    isRefreshingHome,
    addresses,
    branches,
    branchesLoaded,
    activeAddress,
    setActiveAddress,
    activeBranch,
    setActiveBranch,
    handleAddToCart,
    handleDecrementCartItem,
    activeTable,
    setActiveTable,
    timeLeft,
    confirmedOrders,
    setConfirmedOrders,
    dineInCartState,
    setDineInCartState,
    setPendingOrderSnapshot,
  } = useOrderMode();

  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceResultIds, setVoiceResultIds] = useState<string[] | null>(null);
  const [offersViewportWidth, setOffersViewportWidth] = useState(0);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalSelection, setAddressModalSelection] = useState<
    "address" | "branch"
  >("address");

  const [pendingModeSetup, setPendingModeSetup] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState("Delivery");

  const [showDineInCheckInModal, setShowDineInCheckInModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);

  const [activeServiceModal, setActiveServiceModal] = useState<
    "waiter" | "water" | "wifi" | "bill" | "bill_warning" | null
  >(null);

  const [tableNumber, setTableNumber] = useState("");
  const [scanned, setScanned] = useState(false);

  const activeCart = carts[orderMode] || [];
  const selectedBranchId = activeBranch?.id;
  const branchCategories = useMemo(
    () =>
      categories.filter(
        (category: any) =>
          !category.branchId || category.branchId === selectedBranchId,
      ),
    [categories, selectedBranchId],
  );
  const branchOffers = selectedBranchId
    ? offers.filter((offer: any) => {
        const offerBranchId =
          typeof offer.branchId === "string"
            ? offer.branchId
            : offer.branchId?._id;
        return offerBranchId === selectedBranchId;
      })
    : [];
  const branchFeaturedReels = featuredReels.filter((reel: any) => {
    const reelBranchId =
      typeof reel.branchId === "string" ? reel.branchId : reel.branchId?._id;
    return !reelBranchId || reelBranchId === selectedBranchId;
  });
  const restaurantName =
    activeBranch?.restaurantNames?.find(
      (restaurantName: { isActive: boolean; name: string }) =>
        restaurantName.isActive && restaurantName.name.trim().length > 0,
    )?.name ||
    activeBranch?.name ||
    undefined;
  const greetings = useMemo(
    () =>
      activeBranch?.storefrontDisplay?.greetings
        ?.filter(
          (greeting: { text: string; isActive: boolean }) =>
            greeting.isActive && greeting.text.trim().length > 0,
        )
        .map(
          (greeting: { text: string; isActive: boolean }) => greeting.text,
        ) || [],
    [activeBranch?.storefrontDisplay?.greetings],
  );
  const searchPlaceholders = useMemo(
    () =>
      activeBranch?.storefrontDisplay?.searchPlaceholders
        ?.filter(
          (placeholder: { text: string; isActive: boolean }) =>
            placeholder.isActive && placeholder.text.trim().length > 0,
        )
        .map(
          (placeholder: { text: string; isActive: boolean }) =>
            placeholder.text,
        ) || [],
    [activeBranch?.storefrontDisplay?.searchPlaceholders],
  );
  const emptyState = useMemo(
    () =>
      activeBranch?.storefrontDisplay?.emptyStates?.find(
        (state: { title: string; description: string; isActive: boolean }) =>
          state.isActive &&
          (state.title.trim().length > 0 ||
            state.description.trim().length > 0),
      ),
    [activeBranch?.storefrontDisplay?.emptyStates],
  );
  const taxPercentage =
    activeBranch?.taxDetailOptions?.find(
      (option: { gstPercentage: number; isActive: boolean }) => option.isActive,
    )?.gstPercentage ??
    activeBranch?.taxDetails?.gstPercentage ??
    0;
  const gstRate = taxPercentage / 100;
  const activeWifi = activeBranch?.wifiConnections?.find(
    (connection: { name: string; password: string; isActive: boolean }) =>
      connection.isActive,
  );
  const assignedWaiter = Array.isArray(activeBranch?.managerIds)
    ? activeBranch.managerIds.find(
        (
          manager:
            | string
            | {
                _id: string;
                firstName?: string;
                lastName?: string;
                managerType?: string;
              },
        ) =>
          typeof manager !== "string" &&
          manager.managerType?.toLowerCase().includes("waiter"),
      )
    : undefined;
  const assignedWaiterName =
    assignedWaiter && typeof assignedWaiter !== "string"
      ? [assignedWaiter.firstName, assignedWaiter.lastName]
          .filter(Boolean)
          .join(" ")
      : "";

  const isOrderLocked =
    confirmedOrders.length > 0 || dineInCartState === "waiting";

  const handleSelectMode = (selectedMode: string) => {
    if (isOrderLocked || selectedMode === orderMode) return;
    setLastMode(orderMode);

    setTimeout(() => {
      setGlobalOrderMode(selectedMode);

      if (selectedMode === "Dine-in" && !activeTable) {
        setPendingModeSetup("Dine-in");
        setShowAddressModal(true);
      } else if (selectedMode === "Takeaway") {
        setPendingModeSetup("Takeaway");
        setShowAddressModal(true);
      }
    }, 300);
  };

  const handleCancelAddressModal = () => {
    setShowAddressModal(false);
    if (pendingModeSetup) {
      setGlobalOrderMode(lastMode || "Delivery");
      setPendingModeSetup(null);
    }
  };

  const cancelCheckInModal = () => {
    setShowDineInCheckInModal(false);
    Keyboard.dismiss();
    if (!activeTable) {
      setGlobalOrderMode(lastMode || "Delivery");
    }
  };

  const handleManualTableSubmit = () => {
    if (!tableNumber.trim()) return;
    const assignedTable = tableNumber.trim();
    setActiveTable(assignedTable);
    setShowDineInCheckInModal(false);
    Keyboard.dismiss();
  };

  const handleSimulateQRScan = (detectedTable: string) => {
    setActiveTable(detectedTable);
    setShowCameraScannerModal(false);
  };

  const cancelCameraModal = () => {
    setShowCameraScannerModal(false);
    setTimeout(() => {
      if (!activeTable) {
        setShowDineInCheckInModal(true);
      }
    }, 400);
  };

  const handleServiceRequest = (
    serviceType: "waiter" | "water" | "wifi" | "bill",
  ) => {
    if (!activeTable) {
      setTableNumber("");
      setShowDineInCheckInModal(true);
      return;
    }

    if (serviceType === "bill") {
      const activeCartTotalItems = activeCart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0,
      );
      if (activeCartTotalItems > 0) {
        setActiveServiceModal("bill_warning");
        return;
      }
    }

    setActiveServiceModal(serviceType);
  };

  const handleVoiceSearch = () => {
    setIsListening(true);
    setSearchQuery("");
    setVoiceResultIds(null);
    setTimeout(() => {
      void api
        .voiceSearch("Biryani")
        .then((results) => {
          setVoiceResultIds(results.map((item) => item._id));
          setSearchQuery("Biryani");
        })
        .catch((error: unknown) => {
          Alert.alert(
            "Voice Search Failed",
            error instanceof Error ? error.message : "Please try again.",
          );
        })
        .finally(() => setIsListening(false));
    }, 2500);
  };

  const getFilteredData = () => {
    let filtered = [...menuItems];
    if (activeBranch?.id) {
      filtered = filtered.filter((item: any) => {
        const itemBranchIds = item.branchIds || [];
        return itemBranchIds.length > 0
          ? itemBranchIds.includes(activeBranch.id)
          : !item.branchId || item.branchId === activeBranch.id;
      });
    }
    if (isVegOnly) filtered = filtered.filter((item: any) => item.isVeg);
    if (voiceResultIds) {
      filtered = filtered.filter((item: any) =>
        voiceResultIds.includes(item.id),
      );
    }

    const lowerQuery = searchQuery.toLowerCase().trim();
    if (lowerQuery) {
      filtered = filtered.filter((item: any) => {
        if (item.name.toLowerCase().includes(lowerQuery)) return true;
        const queryWords = lowerQuery.split(" ").filter((w) => w.length > 0);
        return queryWords.some((word) =>
          item.name.toLowerCase().includes(word),
        );
      });
    }
    return filtered.sort(
      (first: any, second: any) =>
        Number(first.isAvailable !== true) -
        Number(second.isAvailable !== true),
    );
  };

  const listData = getFilteredData();
  const offerCardHeight = offersViewportWidth * 0.4;
  const offersCarousel =
    (orderMode === "Delivery" || orderMode === "Takeaway") && !searchQuery ? (
      <View className="w-full px-4" style={{ overflow: "hidden" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 0 }}
          style={{ width: "100%", flexGrow: 0 }}
          className="mt-2 mb-8"
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          onLayout={(event) => {
            const measuredWidth = event.nativeEvent.layout.width;
            setOffersViewportWidth((currentWidth) =>
              currentWidth === measuredWidth ? currentWidth : measuredWidth,
            );
          }}
          onMomentumScrollEnd={(event) => {
            if (offersViewportWidth <= 0) return;
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / offersViewportWidth,
            );
            setActiveOfferIndex(
              Math.max(0, Math.min(nextIndex, branchOffers.length - 1)),
            );
          }}
        >
          {branchOffers.map((offer: any) => (
            <Pressable
              key={offer.id}
              disabled={offersViewportWidth <= 0}
              onPress={() =>
                router.push({
                  pathname: "/(home)/(tabs)/offers",
                  params: { offerId: offer.id },
                })
              }
              className="relative overflow-hidden rounded-[24px]"
              style={{
                width: offersViewportWidth,
                height: offerCardHeight,
              }}
            >
              {hasImageUri(offer.image) ? (
                <Image
                  source={{ uri: offer.image }}
                  className="absolute h-full w-full"
                  resizeMode="cover"
                />
              ) : null}
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/10" />
              <View className="absolute inset-0 justify-center p-4">
                <Text
                  className="text-3xl font-black text-white tracking-tighter"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {offer.title}
                </Text>
                <Text
                  className="text-base font-bold text-gray-200 mt-1"
                  numberOfLines={2}
                >
                  {offer.subtitle}
                </Text>
                <View className="mt-3 self-start rounded-full bg-white px-5 py-2.5">
                  <Text
                    className="text-sm font-black"
                    style={{ color: theme.primary }}
                  >
                    ORDER NOW
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {branchOffers.length > 1 && (
          <View className="flex-row items-center justify-center -mt-5 mb-6">
            <View className="flex-row items-center">
              {branchOffers.map((offer: any, index: number) => (
                <View
                  key={offer.id}
                  className="mx-1 h-1.5 rounded-full"
                  style={{
                    width: activeOfferIndex === index ? 16 : 6,
                    backgroundColor:
                      activeOfferIndex === index ? theme.primary : theme.border,
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    ) : null;

  const renderEmptyState = () => {
    if (!searchQuery || !branchesLoaded || !emptyState) return null;
    return (
      <View className="items-center justify-center py-16 px-6">
        {emptyState.title.trim().length > 0 && (
          <Text
            className="text-2xl font-black mb-2 text-center"
            style={{ color: theme.text }}
          >
            {emptyState.title}
          </Text>
        )}
        {emptyState.description.trim().length > 0 && (
          <Text
            className="text-sm font-semibold text-center leading-5"
            style={{ color: theme.muted }}
          >
            {emptyState.description.replace("{query}", searchQuery)}
          </Text>
        )}
      </View>
    );
  };

  const confirmedBillSubtotal = confirmedOrders.reduce(
    (sum: number, item: any) =>
      sum + (item.total || getNumericPrice(item.price) * item.quantity),
    0,
  );
  const confirmedBillTaxes = confirmedBillSubtotal * gstRate;
  const confirmedBillTotal = confirmedBillSubtotal + confirmedBillTaxes;

  const renderAddressModalItem = ({ item }: any) => {
    const isDeliveryAddress =
      orderMode === "Delivery" && addressModalSelection === "address";
    const isActive = isDeliveryAddress
      ? activeAddress?.id === item.id
      : activeBranch?.id === item.id;
    const Icon = isDeliveryAddress ? MapPin : Store;

    return (
      <Pressable
        onPress={() => {
          if (isDeliveryAddress) setActiveAddress(item);
          else {
            setActiveBranch(item);
            setActiveOfferIndex(0);
          }

          setShowAddressModal(false);

          if (pendingModeSetup === "Dine-in") {
            setTimeout(() => {
              setTableNumber("");
              setShowDineInCheckInModal(true);
              setPendingModeSetup(null);
            }, 400);
          } else if (pendingModeSetup === "Takeaway") {
            setPendingModeSetup(null);
          }
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
            {isDeliveryAddress ? item.type : item.name}
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
        <Pressable
          className="flex-1"
          disabled={isOrderLocked}
          onPress={() => {
            setAddressModalSelection(
              orderMode === "Delivery" ? "address" : "branch",
            );
            setShowAddressModal(true);
          }}
        >
          {orderMode === "Delivery" ? (
            <View className="flex-row items-center">
              <MapPin size={22} color={theme.primary} strokeWidth={2.5} />
              <View className="ml-2 flex-1">
                <View className="flex-row items-center">
                  <Text
                    className="text-xl font-black tracking-tight"
                    style={{ color: theme.text }}
                  >
                    {activeAddress?.type || "Choose address"}
                  </Text>
                  {!isOrderLocked && (
                    <ChevronDown
                      size={20}
                      color={theme.text}
                      strokeWidth={2.5}
                      className="ml-1 mt-0.5"
                    />
                  )}
                </View>
                <Text
                  className="text-xs font-bold mt-0.5 tracking-wide"
                  style={{ color: theme.primary }}
                  numberOfLines={1}
                >
                  {activeAddress?.address || "Choose a delivery address"}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Store size={13} color={theme.primary} strokeWidth={2.5} />
                  <Text
                    className="ml-1.5 flex-1 text-xs font-bold"
                    style={{ color: theme.muted, marginRight: 8 }}
                    numberOfLines={1}
                  >
                    {activeBranch?.name || "Choose restaurant branch"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center">
                <Store size={22} color={theme.primary} strokeWidth={2.5} />
                <Text
                  className="ml-1 text-xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  {orderMode === "Takeaway"
                    ? "Pickup from"
                    : activeTable
                      ? `Table ${activeTable}`
                      : "Dining at"}
                </Text>
                {!isOrderLocked && (
                  <ChevronDown
                    size={20}
                    color={theme.text}
                    strokeWidth={2.5}
                    className="ml-1 mt-0.5"
                  />
                )}
              </View>
              <Text
                className="ml-7 text-xs font-bold mt-0.5 tracking-wide pr-4"
                style={{ color: theme.primary }}
                numberOfLines={1}
              >
                {activeBranch?.name || "Choose a branch"}
              </Text>
            </>
          )}
        </Pressable>

        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/(tabs)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/(home)/(tabs)/profile")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <UserRound size={22} color={theme.text} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <Animated.View
        key={orderMode}
        entering={FadeIn.duration(400)}
        style={{ flex: 1 }}
      >
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
            const cartQuantity = activeCart.reduce(
              (quantity: number, cartItem: any) =>
                quantity + (cartItem.id === item.id ? cartItem.quantity : 0),
              0,
            );
            return (
              <View style={{ width: "48%" }}>
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
          }}
          ListHeaderComponent={
            <HomeHeader
              theme={theme}
              orderMode={orderMode}
              onSelectOrderMode={handleSelectMode}
              isOrderLocked={isOrderLocked}
              onOpenScanner={() => {
                setTableNumber("");
                setShowDineInCheckInModal(true);
              }}
              onLeaveTable={() => {
                setActiveTable(null);
                setGlobalOrderMode(lastMode || "Delivery");
              }}
              onCallWaiter={() => handleServiceRequest("waiter")}
              onRequestWater={() => handleServiceRequest("water")}
              onRequestWifi={() => handleServiceRequest("wifi")}
              onRequestBill={() => handleServiceRequest("bill")}
              onOrderTakeaway={() => router.push("/(home)/orders" as any)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isListening={isListening}
              handleVoiceSearch={handleVoiceSearch}
              isVegOnly={isVegOnly}
              setIsVegOnly={setIsVegOnly}
              categories={branchCategories}
              offersCarousel={offersCarousel}
              featuredReel={branchFeaturedReels[0]}
              restaurantName={restaurantName}
              greetings={greetings}
              searchPlaceholders={searchPlaceholders}
              branchContentLoaded={branchesLoaded}
              router={router}
              activeTable={activeTable}
              timeLeft={timeLeft}
              confirmedOrdersLength={confirmedOrders.length}
              isTimerRunning={dineInCartState === "waiting"}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{
            paddingBottom: activeCart.length > 0 ? 180 : 120,
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
        />
      </Animated.View>

      <Modal visible={showAddressModal} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={handleCancelAddressModal}
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
                {orderMode === "Delivery" && addressModalSelection === "address"
                  ? "Choose Delivery Address"
                  : "Choose Branch"}
              </Text>
              <Pressable onPress={handleCancelAddressModal} className="p-2">
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
            {orderMode === "Delivery" && (
              <View
                className="mb-4 flex-row rounded-xl border p-1"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                }}
              >
                {(
                  [
                    { id: "address", label: "Delivery Address" },
                    { id: "branch", label: "Restaurant Branch" },
                  ] as const
                ).map((option) => {
                  const isSelected = addressModalSelection === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setAddressModalSelection(option.id)}
                      className="flex-1 items-center rounded-lg px-2 py-2"
                      style={{
                        backgroundColor: isSelected
                          ? theme.primary
                          : "transparent",
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        className="text-xs font-bold"
                        style={{ color: isSelected ? "#fff" : theme.muted }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <FlatList
              data={
                orderMode === "Delivery" && addressModalSelection === "address"
                  ? addresses
                  : branches
              }
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={renderAddressModalItem}
              showsVerticalScrollIndicator={false}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDineInCheckInModal}
        transparent
        animationType="slide"
        onRequestClose={cancelCheckInModal}
      >
        <TouchableWithoutFeedback onPress={cancelCheckInModal}>
          <View className="flex-1 justify-end bg-black/60">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View
                  className="rounded-t-[32px] p-6 pb-10"
                  style={{ backgroundColor: theme.bg }}
                >
                  <View className="flex-row items-center justify-between mb-6">
                    <Text
                      className="text-2xl font-black"
                      style={{ color: theme.text }}
                    >
                      Table Check-In
                    </Text>
                    <Pressable
                      onPress={cancelCheckInModal}
                      className="p-2 bg-gray-500/10 rounded-full"
                    >
                      <X size={20} color={theme.text} />
                    </Pressable>
                  </View>

                  <View className="items-center px-4">
                    <View
                      className="w-24 h-24 rounded-[28px] items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(234, 88, 12, 0.15)" }}
                    >
                      <QrCode size={48} color="#EA580C" strokeWidth={1.5} />
                    </View>

                    <Text
                      className="text-xl font-black text-center mb-1"
                      style={{ color: theme.text }}
                    >
                      Scan Table QR
                    </Text>

                    <Text
                      className="text-xs font-semibold text-center mb-6 px-4"
                      style={{ color: theme.muted }}
                    >
                      Scan the QR sticker on your table or type your table
                      number manually.
                    </Text>

                    <Pressable
                      onPress={async () => {
                        if (!permission?.granted) {
                          await requestPermission();
                        }
                        setShowDineInCheckInModal(false);
                        setTimeout(() => {
                          setScanned(false);
                          setShowCameraScannerModal(true);
                        }, 400);
                      }}
                      className="w-full h-13 py-3.5 rounded-2xl items-center justify-center mb-4 shadow-sm flex-row"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <ScanLine
                        size={20}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-white font-black text-base tracking-wide">
                        Open Scanner
                      </Text>
                    </Pressable>

                    <View className="flex-row items-center justify-center w-full mb-4">
                      <View
                        className="flex-1 h-[1px]"
                        style={{ backgroundColor: theme.border }}
                      />
                      <Text
                        className="px-4 font-bold text-xs"
                        style={{ color: theme.muted }}
                      >
                        OR
                      </Text>
                      <View
                        className="flex-1 h-[1px]"
                        style={{ backgroundColor: theme.border }}
                      />
                    </View>

                    <View
                      className="w-full h-14 rounded-2xl items-center flex-row border px-4"
                      style={{
                        backgroundColor: theme.card,
                        borderColor:
                          tableNumber.length > 0 ? theme.primary : theme.border,
                      }}
                    >
                      <KeyboardIcon
                        size={22}
                        color={
                          tableNumber.length > 0 ? theme.primary : theme.muted
                        }
                        style={{ marginRight: 16 }}
                      />

                      <TextInput
                        placeholder="Enter Table Number (e.g. 12)"
                        placeholderTextColor={theme.muted}
                        value={tableNumber}
                        onChangeText={setTableNumber}
                        keyboardType="number-pad"
                        className="flex-1 font-black text-base"
                        style={{ color: theme.text, height: "100%" }}
                        maxLength={4}
                        returnKeyType="done"
                        onSubmitEditing={handleManualTableSubmit}
                      />

                      {tableNumber.trim().length > 0 && (
                        <Pressable
                          onPress={handleManualTableSubmit}
                          className="px-4 py-2 rounded-xl items-center justify-center"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-wider">
                            Go
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showCameraScannerModal}
        animationType="fade"
        transparent={false}
        onRequestClose={cancelCameraModal}
      >
        <View className="flex-1 bg-black">
          {permission?.granted ? (
            <CameraView
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              facing="back"
              onBarcodeScanned={
                scanned
                  ? undefined
                  : ({ data }) => {
                      setScanned(true);
                      handleSimulateQRScan(data.substring(0, 4) || "T-10");
                    }
              }
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">
                Requesting camera permission...
              </Text>
            </View>
          )}

          <View
            className="flex-1 justify-between p-6 z-10"
            pointerEvents="box-none"
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginTop: insets.top }}
            >
              <View className="flex-row items-center">
                <Pressable
                  onPress={cancelCameraModal}
                  className="p-2 mr-2 bg-white/10 rounded-full"
                >
                  <ArrowLeft size={24} color="#fff" />
                </Pressable>
                <Text className="text-white font-black text-lg">
                  Scan Table QR
                </Text>
              </View>
            </View>

            <View className="items-center justify-center pointer-events-none">
              <View className="w-64 h-64 border-2 border-dashed border-emerald-400 rounded-3xl items-center justify-center relative overflow-hidden bg-white/5">
                <View className="w-full h-1 bg-emerald-400 absolute top-1/2" />
                <ScanLine size={72} color="#10B981" strokeWidth={1.5} />
              </View>
              <Text className="text-gray-300 text-sm font-semibold text-center mt-6">
                Align the QR code on your table within the frame
              </Text>
            </View>

            <View style={{ marginBottom: insets.bottom + 12 }}>
              <Pressable
                onPress={cancelCameraModal}
                className="w-full py-4 rounded-2xl items-center justify-center mb-3 bg-white/10"
              >
                <Text className="text-white font-black text-base">Go Back</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* IN-STORE SERVICES & PAY BILL POPUP MODALS */}
      <Modal
        visible={activeServiceModal !== null}
        transparent
        animationType="fade"
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/60 px-6"
          onPress={() => setActiveServiceModal(null)}
        >
          <Pressable
            className="w-full rounded-[32px] p-6 items-center shadow-lg"
            style={{ backgroundColor: theme.bg }}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              onPress={() => setActiveServiceModal(null)}
              className="absolute top-4 right-4 p-2 bg-gray-500/10 rounded-full z-10"
            >
              <X size={20} color={theme.text} />
            </Pressable>

            {activeServiceModal === "waiter" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(234, 88, 12, 0.15)" }}
                >
                  <BellRing size={40} color="#EA580C" />
                </View>
                <Text
                  className="text-2xl font-black mb-2"
                  style={{ color: theme.text }}
                >
                  Waiter Called
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  {assignedWaiterName ? (
                    <>
                      Your assigned waiter,{" "}
                      <Text style={{ color: theme.primary }}>
                        {assignedWaiterName}
                      </Text>
                      , has been notified and will be at Table {activeTable}{" "}
                      shortly!
                    </>
                  ) : (
                    `Your branch team has been notified and will be at Table ${activeTable} shortly!`
                  )}
                </Text>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Got it
                  </Text>
                </Pressable>
              </>
            )}

            {activeServiceModal === "water" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}
                >
                  <GlassWater size={40} color="#3B82F6" />
                </View>
                <Text
                  className="text-2xl font-black mb-2"
                  style={{ color: theme.text }}
                >
                  Water Requested
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  We are bringing fresh water to Table {activeTable} right away.
                </Text>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Got it
                  </Text>
                </Pressable>
              </>
            )}

            {activeServiceModal === "wifi" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(5, 150, 105, 0.15)" }}
                >
                  <Wifi size={40} color="#059669" />
                </View>
                <Text
                  className="text-2xl font-black mb-4"
                  style={{ color: theme.text }}
                >
                  Free Wi-Fi
                </Text>
                <View
                  className="w-full p-4 rounded-2xl mb-6 border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-bold mb-1"
                    style={{ color: theme.muted }}
                  >
                    Network Name:
                  </Text>
                  <Text
                    className="text-lg font-black mb-3"
                    style={{ color: theme.text }}
                  >
                    {activeWifi?.name || "Wi-Fi details unavailable"}
                  </Text>
                  <Text
                    className="text-sm font-bold mb-1"
                    style={{ color: theme.muted }}
                  >
                    Password:
                  </Text>
                  <Text
                    className="text-lg font-black"
                    style={{ color: theme.primary }}
                  >
                    {activeWifi?.password || "Wi-Fi details unavailable"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Close
                  </Text>
                </Pressable>
              </>
            )}

            {activeServiceModal === "bill_warning" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                >
                  <ShoppingBag size={40} color="#EF4444" />
                </View>
                <Text
                  className="text-2xl font-black mb-2 text-center"
                  style={{ color: theme.text }}
                >
                  Hold on!
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  You have unordered items in your cart. Please place your order
                  or clear your cart before paying the bill.
                </Text>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Got it
                  </Text>
                </Pressable>
              </>
            )}

            {/* DYNAMIC PAY BILL MODAL */}
            {activeServiceModal === "bill" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(5, 150, 105, 0.15)" }}
                >
                  <Receipt size={40} color="#059669" />
                </View>
                <Text
                  className="text-2xl font-black mb-2 text-center"
                  style={{ color: theme.text }}
                >
                  Table {activeTable} Bill
                </Text>

                <View className="w-full max-h-48 mt-4 mb-2">
                  <FlatList
                    data={confirmedOrders}
                    keyExtractor={(i, index) => index.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <View className="flex-row justify-between w-full mb-3">
                        <Text
                          className="text-base font-semibold"
                          style={{ color: theme.text }}
                        >
                          {item.quantity}x {item.name}
                        </Text>
                        <Text
                          className="text-base font-bold"
                          style={{ color: theme.text }}
                        >
                          ₹
                          {formatPrice(
                            item.total ||
                              getNumericPrice(item.price) * item.quantity,
                          )}
                        </Text>
                      </View>
                    )}
                    ListEmptyComponent={
                      <Text
                        className="text-center italic"
                        style={{ color: theme.muted }}
                      >
                        No items ordered yet.
                      </Text>
                    }
                  />
                </View>

                {confirmedOrders.length > 0 && (
                  <View
                    className="w-full border-t pt-4 mb-6"
                    style={{ borderColor: theme.border }}
                  >
                    <View className="flex-row justify-between w-full mb-2">
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.muted }}
                      >
                        Taxes & Fees ({taxPercentage.toFixed(0)}%)
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.muted }}
                      >
                        ₹{formatPrice(confirmedBillTaxes)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between w-full">
                      <Text
                        className="text-xl font-black"
                        style={{ color: theme.text }}
                      >
                        Grand Total
                      </Text>
                      <Text
                        className="text-xl font-black"
                        style={{ color: theme.primary }}
                      >
                        ₹{formatPrice(confirmedBillTotal)}
                      </Text>
                    </View>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    setActiveServiceModal(null);
                    setActiveTable(null);
                    setConfirmedOrders([]);
                    if (setDineInCartState) setDineInCartState("idle");
                    if (setPendingOrderSnapshot) setPendingOrderSnapshot([]);
                    setGlobalOrderMode("Delivery");
                  }}
                  className="w-full h-14 mt-4 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Pay & Leave Table
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
