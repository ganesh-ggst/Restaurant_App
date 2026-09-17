import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useVideoPlayer } from "expo-video";
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
import { useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../components/home/FoodCard";
import { HomeHeader } from "../../components/home/HomeHeader";
import {
  EMPTY_STATE,
  FEATURED_CONTENT,
  FOOD_ITEMS,
  MOCK_ADDRESSES,
  MOCK_BRANCHES,
  ORDER_MODES,
  STORE_DETAILS,
  TAX_DETAILS,
} from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

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
  const [showAddressModal, setShowAddressModal] = useState(false);

  const [pendingModeSetup, setPendingModeSetup] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState("Delivery");

  const [showDineInTakeawayModal, setShowDineInTakeawayModal] = useState(false);
  const [showDineInCheckInModal, setShowDineInCheckInModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);

  const [activeServiceModal, setActiveServiceModal] = useState<
    "waiter" | "water" | "wifi" | "bill" | "bill_warning" | null
  >(null);

  const [tableNumber, setTableNumber] = useState("");
  const [scanned, setScanned] = useState(false);

  const activeCart = carts[orderMode] || [];

  const availableModes = ORDER_MODES.filter((m) => m.id !== orderMode);

  const isOrderLocked =
    confirmedOrders.length > 0 || dineInCartState === "waiting";

  const handleModeChange = () => {
    setShowDineInTakeawayModal(true);
  };

  const handleSelectMode = (selectedMode: string) => {
    setShowDineInTakeawayModal(false);
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

  const player = useVideoPlayer(
    FEATURED_CONTENT.type === "video" ? FEATURED_CONTENT.source : null,
    (playerInstance) => {
      playerInstance.loop = true;
      playerInstance.muted = true;
      playerInstance.play();
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

  const confirmedBillSubtotal = confirmedOrders.reduce(
    (sum: number, item: any) =>
      sum + (item.total || getNumericPrice(item.price) * item.quantity),
    0,
  );
  const confirmedBillTaxes = confirmedBillSubtotal * TAX_DETAILS.gstRate;
  const confirmedBillTotal = confirmedBillSubtotal + confirmedBillTaxes;

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
        <Pressable
          className="flex-1"
          onPress={() => {
            if (isOrderLocked) return;
            setShowAddressModal(true);
          }}
        >
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
              {orderMode === "Delivery"
                ? activeAddress.type
                : orderMode === "Takeaway"
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
              setOrderMode={handleModeChange}
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
              player={player}
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
                {orderMode === "Delivery"
                  ? "Choose Delivery Address"
                  : "Choose Branch"}
              </Text>
              <Pressable onPress={handleCancelAddressModal} className="p-2">
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

      <Modal visible={showDineInTakeawayModal} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setShowDineInTakeawayModal(false)}
        >
          <Pressable
            className="rounded-t-[32px] p-5 pb-12"
            style={{ backgroundColor: theme.bg }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text
                  className="text-2xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  Change Order Mode
                </Text>
                <Text
                  className="text-sm font-semibold mt-1"
                  style={{ color: theme.muted }}
                >
                  How would you like your order?
                </Text>
              </View>
              <Pressable
                onPress={() => setShowDineInTakeawayModal(false)}
                className="p-2 bg-gray-500/10 rounded-full"
              >
                <X size={20} color={theme.text} />
              </Pressable>
            </View>

            <View className="flex-row justify-between" style={{ gap: 8 }}>
              {availableModes.map((mode) => {
                const isActive = orderMode === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => handleSelectMode(mode.id)}
                    className="flex-1 items-center justify-center p-3 rounded-2xl border"
                    style={{
                      backgroundColor: isActive ? mode.bg : theme.card,
                      borderColor: isActive ? mode.color : theme.border,
                    }}
                  >
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center mb-3"
                      style={{ backgroundColor: mode.bg }}
                    >
                      <mode.icon size={24} color={mode.color} />
                    </View>
                    <Text
                      className="text-sm font-black text-center"
                      style={{ color: theme.text }}
                    >
                      {mode.title}
                    </Text>
                    <Text
                      className="text-[10px] font-semibold text-center mt-1"
                      style={{ color: theme.muted }}
                      numberOfLines={2}
                    >
                      {mode.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
                  Your assigned waiter,{" "}
                  <Text style={{ color: theme.primary }}>
                    {STORE_DETAILS?.waiter?.name || "Rahul"}
                  </Text>
                  , has been notified and will be at Table {activeTable}{" "}
                  shortly!
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
                    {STORE_DETAILS?.wifi?.network || "FoodieVerse_5G"}
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
                    {STORE_DETAILS?.wifi?.password || "foodie@dine"}
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
                        Taxes & Fees ({(TAX_DETAILS.gstRate * 100).toFixed(0)}%)
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
