import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  MANAGER_MOCK_DATA,
  StoreDetailSection,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function OperationsDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const { currentManager } = useCurrentManager();

  // Unread Notification State
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const lastAlertCountRef = useRef(0);

  // Notification Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasUnreadNotifications) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [hasUnreadNotifications, pulseAnim]);

  // Data State
  const [foodItems, setFoodItems] = useState(MANAGER_MOCK_DATA.foodItems);
  const [categories, setCategories] = useState(MANAGER_MOCK_DATA.categories);
  const [storeDetails, setStoreDetails] = useState<StoreDetailSection[]>(
    MANAGER_MOCK_DATA.storeDetails,
  );

  const [coupons, setCoupons] = useState<any[]>(
    MANAGER_MOCK_DATA.availableCoupons || [],
  );

  // Quick Inventory State
  const [quickInventoryIds, setQuickInventoryIds] = useState<string[]>([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [quickStockFilter, setQuickStockFilter] = useState<
    "all" | "inStock" | "outOfStock"
  >("all");
  const [quickDietaryFilter, setQuickDietaryFilter] = useState<
    "all" | "veg" | "non-veg"
  >("all");
  const [isAddQuickModalVisible, setIsAddQuickModalVisible] = useState(false);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // === MODAL STATES ===
  const [storeModalState, setStoreModalState] = useState<
    "hub" | "sectionEditor" | "optionManager" | "optionEditor" | null
  >(null);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const [inputVal1, setInputVal1] = useState("");
  const [inputVal2, setInputVal2] = useState("");
  const [inputToggle, setInputToggle] = useState<"single" | "multiple">(
    "single",
  );

  // Category Modal States
  const [isModifyModalVisible, setIsModifyModalVisible] = useState(false);
  const [isCategoryEditorVisible, setIsCategoryEditorVisible] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"add" | "edit">(
    "add",
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");

  // Coupon Modal States
  const [isCouponHubVisible, setIsCouponHubVisible] = useState(false);
  const [isCouponEditorVisible, setIsCouponEditorVisible] = useState(false);
  const [couponModalMode, setCouponModalMode] = useState<"add" | "edit">("add");
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponEditorSource, setCouponEditorSource] = useState<
    "dashboard" | "hub"
  >("hub");

  // Coupon Form State
  const [couponTitle, setCouponTitle] = useState("");
  const [couponSubtitle, setCouponSubtitle] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplicableItems, setCouponApplicableItems] = useState<string[]>(
    [],
  );

  const activeCategories = categories.filter((c) => c.isActive);
  const activeCoupons = coupons.filter((c) => c.isActive);
  const currentActiveSection = storeDetails.find(
    (s) => s.id === selectedSectionId,
  );

  // Refresh & Prune Arrays & Smart Notification Check
  useFocusEffect(
    useCallback(() => {
      const updatedFoodItems = [...MANAGER_MOCK_DATA.foodItems];
      setFoodItems(updatedFoodItems);
      setCategories([...MANAGER_MOCK_DATA.categories]);
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
      if (MANAGER_MOCK_DATA.availableCoupons) {
        setCoupons([...MANAGER_MOCK_DATA.availableCoupons]);
      }

      // Check current active alerts (low stock < 10 or unavailable items)
      const currentAlertsCount = updatedFoodItems.filter(
        (item) =>
          (item.quantity !== undefined &&
            item.quantity !== null &&
            item.quantity < 10) ||
          !item.isAvailable,
      ).length;

      // Only trigger notification if new alerts appeared
      if (currentAlertsCount > lastAlertCountRef.current) {
        setHasUnreadNotifications(true);
      }
      lastAlertCountRef.current = currentAlertsCount;

      setQuickInventoryIds((prevIds) =>
        prevIds.filter((id) =>
          MANAGER_MOCK_DATA.foodItems.some((item) => item.id === id),
        ),
      );
    }, []),
  );

  if (!currentManager || currentManager.managerType !== "operations") {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text style={{ color: theme.text }}>Operations profile not found.</Text>
      </SafeAreaView>
    );
  }

  const activeItemsCount = foodItems.filter((item) => item.isAvailable).length;

  const toggleItemStock = (id: string) => {
    const itemIndex = MANAGER_MOCK_DATA.foodItems.findIndex((i) => i.id === id);
    if (itemIndex > -1)
      MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable =
        !MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable;
    setFoodItems([...MANAGER_MOCK_DATA.foodItems]);
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / 122);
    setActiveCategoryIndex(
      Math.min(
        Math.max(currentIndex, 0),
        activeCategories.length > 0 ? activeCategories.length - 1 : 0,
      ),
    );
  };

  // ==========================================
  // QUICK INVENTORY HELPER LOGIC
  // ==========================================
  const addToQuickInventory = (itemId: string) => {
    if (!quickInventoryIds.includes(itemId)) {
      setQuickInventoryIds([...quickInventoryIds, itemId]);
    }
  };

  const removeFromQuickInventory = (itemId: string) => {
    setQuickInventoryIds(quickInventoryIds.filter((id) => id !== itemId));
  };

  const quickInventoryItems = foodItems.filter((item) =>
    quickInventoryIds.includes(item.id),
  );

  const filteredQuickInventory = quickInventoryItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(quickSearchQuery.toLowerCase());

    let matchesStock = true;
    if (quickStockFilter === "inStock") matchesStock = item.isAvailable;
    if (quickStockFilter === "outOfStock") matchesStock = !item.isAvailable;

    let matchesDietary = true;
    if (quickDietaryFilter === "veg")
      matchesDietary = item.dietaryPreference === "veg";
    if (quickDietaryFilter === "non-veg")
      matchesDietary = item.dietaryPreference === "non-veg";

    return matchesSearch && matchesStock && matchesDietary;
  });

  // ==========================================
  // COUPONS LOGIC
  // ==========================================
  const toggleCouponVisibility = (id: string) => {
    if (!MANAGER_MOCK_DATA.availableCoupons) return;
    const index = MANAGER_MOCK_DATA.availableCoupons.findIndex(
      (c: any) => c.id === id,
    );
    if (index > -1) {
      MANAGER_MOCK_DATA.availableCoupons[index].isActive =
        !MANAGER_MOCK_DATA.availableCoupons[index].isActive;
      setCoupons([...MANAGER_MOCK_DATA.availableCoupons]);
    }
  };

  const closeCouponEditor = () => {
    setIsCouponEditorVisible(false);
    if (couponEditorSource === "hub") {
      setTimeout(() => setIsCouponHubVisible(true), 300);
    }
  };

  const openAddCouponModal = () => {
    setIsCouponHubVisible(false);
    setTimeout(() => {
      setCouponEditorSource("hub");
      setCouponModalMode("add");
      setEditingCouponId(null);
      setCouponTitle("");
      setCouponSubtitle("");
      setCouponCode("");
      setCouponApplicableItems([]);
      setIsCouponEditorVisible(true);
    }, 300);
  };

  const openEditCouponModal = (
    coupon: any,
    source: "dashboard" | "hub" = "hub",
  ) => {
    if (source === "hub") {
      setIsCouponHubVisible(false);
    }
    setTimeout(
      () => {
        setCouponEditorSource(source);
        setCouponModalMode("edit");
        setEditingCouponId(coupon.id);
        setCouponTitle(coupon.title || coupon.name || coupon.code || "");
        setCouponSubtitle(coupon.subtitle || coupon.description || "");
        setCouponCode(coupon.code || "");
        setCouponApplicableItems(coupon.applicableItems || []);
        setIsCouponEditorVisible(true);
      },
      source === "hub" ? 300 : 0,
    );
  };

  const toggleCouponItem = (itemId: string) => {
    setCouponApplicableItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleSaveCoupon = () => {
    if (!couponTitle.trim() || !couponCode.trim()) {
      Alert.alert("Missing Info", "Offer Title and Promo Code are required.");
      return;
    }

    if (!MANAGER_MOCK_DATA.availableCoupons)
      MANAGER_MOCK_DATA.availableCoupons = [];

    if (couponModalMode === "add") {
      MANAGER_MOCK_DATA.availableCoupons.unshift({
        id: `coup_${Date.now()}`,
        title: couponTitle.trim(),
        subtitle: couponSubtitle.trim(),
        code: couponCode.trim().toUpperCase(),
        isActive: true,
        applicableItems: couponApplicableItems,
      });
    } else if (couponModalMode === "edit" && editingCouponId) {
      const index = MANAGER_MOCK_DATA.availableCoupons.findIndex(
        (c: any) => c.id === editingCouponId,
      );
      if (index > -1) {
        MANAGER_MOCK_DATA.availableCoupons[index].title = couponTitle.trim();
        MANAGER_MOCK_DATA.availableCoupons[index].subtitle =
          couponSubtitle.trim();
        MANAGER_MOCK_DATA.availableCoupons[index].code = couponCode
          .trim()
          .toUpperCase();
        MANAGER_MOCK_DATA.availableCoupons[index].applicableItems =
          couponApplicableItems;
      }
    }
    setCoupons([...MANAGER_MOCK_DATA.availableCoupons]);
    closeCouponEditor();
  };

  const handleDeleteCoupon = (couponId: string, title: string) => {
    Alert.alert("Delete Coupon", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          MANAGER_MOCK_DATA.availableCoupons =
            MANAGER_MOCK_DATA.availableCoupons.filter(
              (c: any) => c.id !== couponId,
            );
          setCoupons([...MANAGER_MOCK_DATA.availableCoupons]);
        },
      },
    ]);
  };

  // ==========================================
  // CATEGORY LOGIC
  // ==========================================
  const toggleCategoryVisibility = (id: string) => {
    const index = MANAGER_MOCK_DATA.categories.findIndex((c) => c.id === id);
    if (index > -1) {
      MANAGER_MOCK_DATA.categories[index].isActive =
        !MANAGER_MOCK_DATA.categories[index].isActive;
      setCategories([...MANAGER_MOCK_DATA.categories]);
    }
  };

  const openAddCategoryModal = () => {
    setIsModifyModalVisible(false);
    setTimeout(() => {
      setCategoryModalMode("add");
      setEditingCategoryId(null);
      setCategoryName("");
      setCategoryIcon("");
      setIsCategoryEditorVisible(true);
    }, 300);
  };

  const openEditCategoryModal = (category: any) => {
    setIsModifyModalVisible(false);
    setTimeout(() => {
      setCategoryModalMode("edit");
      setEditingCategoryId(category.id);
      setCategoryName(category.name);
      setCategoryIcon(category.icon || "");
      setIsCategoryEditorVisible(true);
    }, 300);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) return;
    if (categoryModalMode === "add") {
      MANAGER_MOCK_DATA.categories.unshift({
        id: `cat_${Date.now()}`,
        name: categoryName.trim(),
        icon: categoryIcon.trim(),
        isActive: true,
      });
    } else if (categoryModalMode === "edit" && editingCategoryId) {
      const index = MANAGER_MOCK_DATA.categories.findIndex(
        (c) => c.id === editingCategoryId,
      );
      if (index > -1) {
        MANAGER_MOCK_DATA.categories[index].name = categoryName.trim();
        MANAGER_MOCK_DATA.categories[index].icon = categoryIcon.trim();
      }
    }
    setCategories([...MANAGER_MOCK_DATA.categories]);
    setIsCategoryEditorVisible(false);
    setTimeout(() => setIsModifyModalVisible(true), 300);
  };

  const handleDeleteCategory = (categoryId: string, catName: string) => {
    Alert.alert("Delete Category", `Remove "${catName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          MANAGER_MOCK_DATA.categories = MANAGER_MOCK_DATA.categories.filter(
            (c) => c.id !== categoryId,
          );
          setCategories([...MANAGER_MOCK_DATA.categories]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* --- FIXED TOP HEADER --- */}
        <View className="px-6 mb-2 mt-2">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text
                className="text-3xl font-black"
                style={{ color: theme.text }}
              >
                Operations ⚙️
              </Text>
              <Text
                className="text-sm font-medium mt-1"
                style={{ color: theme.muted }}
              >
                Manage menu & store settings
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => {
                  setHasUnreadNotifications(false);
                  lastAlertCountRef.current = foodItems.filter(
                    (item) =>
                      (item.quantity !== undefined &&
                        item.quantity !== null &&
                        item.quantity < 10) ||
                      !item.isAvailable,
                  ).length;
                  router.push(
                    "/(manager)/operations/profile/notifications" as any,
                  );
                }}
                className="p-3 rounded-full relative"
                style={{ backgroundColor: theme.card }}
              >
                <Feather name="bell" size={20} color={theme.text} />
                {hasUnreadNotifications && (
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      transform: [{ scale: pulseAnim }],
                    }}
                  >
                    <View
                      className="w-3 h-3 rounded-full shadow-md"
                      style={{ backgroundColor: theme.primary }}
                    />
                  </Animated.View>
                )}
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push("/(manager)/operations/profile" as any)
                }
                className="p-3 rounded-full"
                style={{ backgroundColor: theme.card }}
              >
                <Text className="text-lg">👤</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* --- SCROLLVIEW WITH NATIVE STICKY HEADER INDEX --- */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[1]}
        >
          {/* INDEX 0: Non-sticky top content (Stats, Categories, Offers) */}
          <View>
            <View className="flex-row justify-between mb-6">
              <Card
                variant="default"
                className="w-[31%] py-5 items-center rounded-3xl border-0"
              >
                <Text
                  className="text-3xl font-black mb-1"
                  style={{ color: theme.text }}
                >
                  {foodItems.length}
                </Text>
                <Text
                  className="text-xs font-semibold text-center"
                  style={{ color: theme.muted }}
                >
                  Total{"\n"}Items
                </Text>
              </Card>
              <Card
                variant="default"
                className="w-[31%] py-5 items-center rounded-3xl border-0"
              >
                <Text
                  className="text-3xl font-black mb-1"
                  style={{ color: theme.text }}
                >
                  {activeItemsCount}
                </Text>
                <Text
                  className="text-xs font-semibold text-center"
                  style={{ color: theme.muted }}
                >
                  In Stock{"\n"}Items
                </Text>
              </Card>
              <Card
                variant="default"
                className="w-[31%] py-5 items-center rounded-3xl border-0"
              >
                <Text
                  className="text-3xl font-black mb-1"
                  style={{ color: theme.text }}
                >
                  {activeCoupons.length}
                </Text>
                <Text
                  className="text-xs font-semibold text-center"
                  style={{ color: theme.muted }}
                >
                  Active{"\n"}Coupons
                </Text>
              </Card>
            </View>

            {/* --- LIVE ORDERS WORKFLOW SHORTCUT --- */}
            <Pressable
              onPress={() => router.push("/(manager)/operations/orders" as any)}
              className="p-4 mb-6 rounded-3xl flex-row justify-between items-center border-0 shadow-sm"
              style={{ backgroundColor: theme.card }}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">📋</Text>
                <View>
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    Live Orders Workflow
                  </Text>
                  <Text
                    className="text-xs font-medium mt-0.5"
                    style={{ color: theme.muted }}
                  >
                    Manage customer queue, dining & takeaway
                  </Text>
                </View>
              </View>
              <Text
                className="text-sm font-bold"
                style={{ color: theme.primary }}
              >
                View →
              </Text>
            </Pressable>
            {/* ------------------------------------- */}

            {/* Active Coupons Section */}
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Exclusive Offers
              </Text>
              <Pressable onPress={() => setIsCouponHubVisible(true)}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.primary }}
                >
                  Modify
                </Text>
              </Pressable>
            </View>

            {activeCoupons.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6"
              >
                {activeCoupons.map((coupon) => (
                  <Pressable
                    key={coupon.id}
                    onPress={() => openEditCouponModal(coupon, "dashboard")}
                  >
                    <Card
                      variant="default"
                      className="p-5 mr-4 rounded-[28px] border-0 justify-between w-[280px]"
                      style={{ backgroundColor: theme.card }}
                    >
                      <View>
                        <Text
                          className="text-3xl font-black mb-1"
                          style={{ color: theme.text }}
                        >
                          {coupon.title || coupon.code || "OFFER"}
                        </Text>
                        <Text
                          className="text-sm font-medium mb-5"
                          style={{ color: theme.muted }}
                        >
                          {coupon.subtitle || "Exclusive store offer"}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-end">
                        <View
                          className="px-4 py-2 rounded-xl border border-dashed"
                          style={{
                            backgroundColor: theme.isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.03)",
                            borderColor: theme.muted,
                          }}
                        >
                          <Text
                            className="text-xs font-bold uppercase tracking-widest"
                            style={{ color: theme.text }}
                          >
                            CODE: {coupon.code}
                          </Text>
                        </View>
                        <Text
                          className="text-[10px] font-bold uppercase"
                          style={{ color: theme.primary }}
                        >
                          {coupon.applicableItems?.length || 0} Items
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Card
                variant="default"
                className="p-6 mb-6 rounded-2xl border-dashed border-2 items-center justify-center"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.muted }}
                >
                  No Active Offers configured
                </Text>
              </Card>
            )}

            {/* Categories Header */}
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Categories
              </Text>
              <View className="flex-row gap-4 items-center">
                <Pressable onPress={() => setIsModifyModalVisible(true)}>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.primary }}
                  >
                    Modify
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push("/(manager)/operations/categories")
                  }
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.primary }}
                  >
                    View All
                  </Text>
                </Pressable>
              </View>
            </View>

            {activeCategories.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {activeCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() =>
                      router.push(
                        `/(manager)/operations/category/${category.id}` as any,
                      )
                    }
                  >
                    <Card
                      variant="default"
                      className="p-3 mr-3 rounded-2xl border-0 items-center justify-center w-[110px] h-[115px]"
                    >
                      <Text className="text-2xl mb-1">{category.icon}</Text>
                      <Text
                        className="text-xs font-bold text-center"
                        style={{ color: theme.text }}
                        numberOfLines={2}
                      >
                        {category.name}
                      </Text>
                      <Text
                        className="text-[10px] mt-2 uppercase font-bold"
                        style={{ color: "#22c55e" }}
                      >
                        Active
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Card
                variant="default"
                className="p-6 mb-3 rounded-2xl border-dashed border-2 items-center justify-center"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.muted }}
                >
                  No Active Categories
                </Text>
              </Card>
            )}

            {activeCategories.length > 0 && (
              <View className="flex-row justify-center items-center mb-6 mt-1">
                {activeCategories.map((_, index) => {
                  const isActive = activeCategoryIndex === index;
                  return (
                    <View
                      key={index}
                      className="h-1.5 mx-1 rounded-full"
                      style={{
                        width: isActive ? 16 : 6,
                        backgroundColor: isActive
                          ? theme.primary
                          : theme.border,
                      }}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* INDEX 1: STICKY QUICK INVENTORY HEADER & FILTERS */}
          <View
            style={{
              backgroundColor: theme.bg,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Quick Inventory
              </Text>
              <Pressable onPress={() => setIsAddQuickModalVisible(true)}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.primary }}
                >
                  + Add Item
                </Text>
              </Pressable>
            </View>

            {/* Quick Inventory Search Bar */}
            <TextInput
              placeholder="Search quick inventory..."
              placeholderTextColor={theme.muted}
              value={quickSearchQuery}
              onChangeText={setQuickSearchQuery}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({
                    y: 650,
                    animated: true,
                  });
                }, 150);
              }}
              className="px-4 rounded-xl mb-3 font-semibold"
              style={{
                backgroundColor: theme.card || theme.border,
                color: theme.text,
                fontSize: 16,
                height: 52,
                textAlignVertical: "center",
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />

            {/* Quick Inventory Stock Filter Chips */}
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={() => setQuickStockFilter("all")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickStockFilter === "all"
                      ? theme.primary
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: quickStockFilter === "all" ? "#ffffff" : theme.text,
                  }}
                >
                  All Stock
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickStockFilter("inStock")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickStockFilter === "inStock"
                      ? theme.primary
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      quickStockFilter === "inStock" ? "#ffffff" : theme.text,
                  }}
                >
                  In Stock
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickStockFilter("outOfStock")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickStockFilter === "outOfStock"
                      ? theme.danger
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      quickStockFilter === "outOfStock"
                        ? "#ffffff"
                        : theme.text,
                  }}
                >
                  Out of Stock
                </Text>
              </Pressable>
            </View>

            {/* Quick Inventory Dietary Filter Chips */}
            <View className="flex-row gap-2 mb-2">
              <Pressable
                onPress={() => setQuickDietaryFilter("all")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickDietaryFilter === "all"
                      ? theme.primary
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      quickDietaryFilter === "all" ? "#ffffff" : theme.text,
                  }}
                >
                  All Types
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDietaryFilter("veg")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickDietaryFilter === "veg"
                      ? theme.primary
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      quickDietaryFilter === "veg" ? "#ffffff" : theme.text,
                  }}
                >
                  🟢 Veg
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDietaryFilter("non-veg")}
                className="px-4 py-2 rounded-xl"
                style={{
                  backgroundColor:
                    quickDietaryFilter === "non-veg"
                      ? theme.danger
                      : theme.card || theme.border,
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      quickDietaryFilter === "non-veg" ? "#ffffff" : theme.text,
                  }}
                >
                  🔴 Non-Veg
                </Text>
              </Pressable>
            </View>
          </View>

          {/* INDEX 2: Quick Inventory Item Cards List */}
          <View className="pt-2">
            {filteredQuickInventory.length > 0 ? (
              filteredQuickInventory.map((item) => {
                const hasOffer =
                  item.offerPrice !== undefined &&
                  item.offerPrice !== null &&
                  Number(item.offerPrice) > 0 &&
                  Number(item.offerPrice) < Number(item.price);
                const parentCategory = categories.find(
                  (c) => c.id === item.categoryId,
                );

                return (
                  <Card
                    key={item.id}
                    variant="default"
                    className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
                  >
                    <Pressable
                      className="flex-1 mr-3 justify-center py-1"
                      onPress={() =>
                        router.push(
                          `/(manager)/operations/item/${item.id}` as any,
                        )
                      }
                    >
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-xs">
                          {item.dietaryPreference === "veg" ? "🟢" : "🔴"}
                        </Text>
                        <Text
                          className="text-base font-bold flex-1"
                          style={{ color: theme.text }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-3 mb-2">
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          ₹{hasOffer ? item.offerPrice : item.price}
                        </Text>
                        {hasOffer && (
                          <Text
                            className="text-xs line-through"
                            style={{ color: theme.muted }}
                          >
                            ₹{item.price}
                          </Text>
                        )}
                        {parentCategory && (
                          <Text
                            className="text-xs font-medium"
                            style={{ color: theme.muted }}
                          >
                            {parentCategory.icon} {parentCategory.name}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Pressable
                          onPress={() => removeFromQuickInventory(item.id)}
                          className="mr-3"
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.danger }}
                          >
                            Remove from Quick
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                    <View className="items-end w-30">
                      <Switch
                        value={item.isAvailable}
                        onValueChange={() => toggleItemStock(item.id)}
                        trackColor={{
                          false: theme.border,
                          true: theme.primary,
                        }}
                        thumbColor={"#ffffff"}
                      />
                      <Text
                        className="text-[8px] font-bold uppercase mt-1 text-center"
                        style={{
                          color: item.isAvailable
                            ? theme.primary
                            : theme.danger,
                        }}
                      >
                        {item.isAvailable ? "In Stock" : "Out of Stock"}
                      </Text>
                    </View>
                  </Card>
                );
              })
            ) : (
              <View
                className="p-6 rounded-2xl border border-dashed items-center mt-2 mb-4"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm italic text-center"
                  style={{ color: theme.muted }}
                >
                  No items in quick inventory matching filters. Tap "+ Add Item"
                  above.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================= */}
      {/* 0. COUPONS MODIFY HUB POP-UP */}
      {/* ========================================================= */}
      <Modal
        visible={isCouponHubVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCouponHubVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setIsCouponHubVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
              style={{ width: "100%", maxHeight: "100%" }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.text }}
                >
                  Modify Offers & Coupons
                </Text>
                <Pressable
                  onPress={() => setIsCouponHubVisible(false)}
                  className="p-2 -mr-2"
                  hitSlop={15}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: theme.muted }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={openAddCouponModal}
                className="mb-4 p-4 rounded-2xl items-center border-2 border-dashed"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  + Create New Offer
                </Text>
              </Pressable>

              <View
                className="rounded-2xl p-2"
                style={{
                  backgroundColor: theme.isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  height: 350,
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {coupons.map((coupon) => (
                    <View
                      key={coupon.id}
                      className="p-4 mb-3 rounded-2xl border border-dashed flex-row justify-between items-center"
                      style={{
                        backgroundColor: theme.card || theme.bg,
                        borderColor: theme.border,
                      }}
                    >
                      <Pressable
                        className="flex-1 pr-2"
                        onPress={() => openEditCouponModal(coupon, "hub")}
                      >
                        <Text
                          className="text-lg font-black mb-1"
                          style={{ color: theme.text }}
                        >
                          {coupon.title || coupon.code || "Offer"}
                        </Text>
                        <Text
                          className="text-xs font-bold mb-2 uppercase"
                          style={{ color: theme.primary }}
                        >
                          CODE: {coupon.code}
                        </Text>
                        <Text
                          className="text-xs font-medium"
                          style={{ color: theme.muted }}
                        >
                          {coupon.applicableItems?.length || 0} items configured
                        </Text>
                      </Pressable>

                      <View className="items-end gap-3">
                        <Switch
                          value={coupon.isActive}
                          onValueChange={() =>
                            toggleCouponVisibility(coupon.id)
                          }
                          trackColor={{
                            false: theme.border,
                            true: theme.primary,
                          }}
                          thumbColor={"#ffffff"}
                        />
                        <View className="flex-row gap-3">
                          <Pressable
                            onPress={() => openEditCouponModal(coupon, "hub")}
                            hitSlop={10}
                          >
                            <Feather
                              name="edit-2"
                              size={18}
                              color={theme.primary}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              handleDeleteCoupon(
                                coupon.id,
                                coupon.title || coupon.code,
                              )
                            }
                            hitSlop={10}
                          >
                            <Feather
                              name="trash-2"
                              size={18}
                              color={theme.danger}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                  {coupons.length === 0 && (
                    <Text
                      className="text-center py-10"
                      style={{ color: theme.muted }}
                    >
                      No offers exist yet.
                    </Text>
                  )}
                </ScrollView>
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* 0.5 ADD / EDIT COUPON MODAL (Advanced) */}
      {/* ========================================================= */}
      <Modal
        visible={isCouponEditorVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCouponEditor}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: theme.bg,
            marginTop: 50,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            overflow: "hidden",
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            className="p-6 flex-row justify-between items-center border-b"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-xl font-bold" style={{ color: theme.text }}>
              {couponModalMode === "add" ? "Create Offer" : "Edit Offer"}
            </Text>
            <Pressable
              onPress={closeCouponEditor}
              className="p-2 -mr-2"
              hitSlop={15}
            >
              <Text
                className="text-lg font-bold"
                style={{ color: theme.muted }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          >
            {/* Offer Display Preview */}
            <View className="mb-8 items-center">
              <Text
                className="text-xs font-bold mb-3 uppercase"
                style={{ color: theme.muted }}
              >
                Preview
              </Text>
              <Card
                variant="default"
                className="p-5 rounded-[28px] border-0 w-[280px]"
                style={{ backgroundColor: theme.card }}
              >
                <Text
                  className="text-3xl font-black mb-1"
                  style={{ color: theme.text }}
                >
                  {couponTitle || "Enter Offer Title"}
                </Text>
                <Text
                  className="text-sm font-medium mb-5"
                  style={{ color: theme.muted }}
                >
                  {couponSubtitle || "Enter subtitle description here"}
                </Text>
                <View className="flex-row justify-between items-end">
                  <View
                    className="px-4 py-2 rounded-xl border border-dashed"
                    style={{
                      backgroundColor: theme.isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                      borderColor: theme.muted,
                    }}
                  >
                    <Text
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: theme.text }}
                    >
                      CODE: {couponCode || "PROMOCODE"}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <Text
              className="text-sm font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Offer Title
            </Text>
            <TextInput
              placeholder="e.g. 50% OFF"
              placeholderTextColor={theme.muted}
              value={couponTitle}
              onChangeText={setCouponTitle}
              className="px-4 rounded-xl mb-4 font-bold"
              style={{
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: 18,
                height: 56,
              }}
            />

            <Text
              className="text-sm font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Subtitle Description
            </Text>
            <TextInput
              placeholder="e.g. On your first Biryani order"
              placeholderTextColor={theme.muted}
              value={couponSubtitle}
              onChangeText={setCouponSubtitle}
              className="px-4 rounded-xl mb-4 font-bold"
              style={{
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: 16,
                height: 56,
              }}
            />

            <Text
              className="text-sm font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Promo Code
            </Text>
            <TextInput
              placeholder="e.g. BIRYANI50"
              placeholderTextColor={theme.muted}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
              className="px-4 rounded-xl mb-8 font-bold"
              style={{
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: 18,
                height: 56,
              }}
            />

            <Text
              className="text-lg font-bold mb-1"
              style={{ color: theme.text }}
            >
              Applicable Items
            </Text>
            <Text
              className="text-xs font-medium mb-4"
              style={{ color: theme.muted }}
            >
              Select which items this code works for
            </Text>

            <View
              className="rounded-2xl p-2 border border-dashed"
              style={{
                backgroundColor: theme.isDark
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.03)",
                borderColor: theme.border,
                height: 250,
              }}
            >
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {foodItems.map((item) => {
                  const isSelected = couponApplicableItems.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleCouponItem(item.id)}
                      className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                      style={{ backgroundColor: theme.card }}
                    >
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        <Text className="text-xs">
                          {item.dietaryPreference === "veg" ? "🟢" : "🔴"}
                        </Text>
                        <Text
                          className="text-sm font-bold flex-1"
                          style={{ color: theme.text }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <View
                        className="w-6 h-6 rounded-md border-2 items-center justify-center"
                        style={{
                          borderColor: isSelected ? theme.primary : theme.muted,
                          backgroundColor: isSelected
                            ? theme.primary
                            : "transparent",
                        }}
                      >
                        {isSelected && (
                          <Feather name="check" size={14} color="#ffffff" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View className="flex-row justify-end mt-8 mb-6">
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeCouponEditor}
                className="mr-3 py-4 px-6"
              />
              <Button
                title="Save Offer"
                onPress={handleSaveCoupon}
                className="py-4 px-8"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* ADD ITEM TO QUICK INVENTORY MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={isAddQuickModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddQuickModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setIsAddQuickModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
              style={{ width: "100%", maxHeight: "80%" }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.text }}
                >
                  Add Item to Quick Inventory
                </Text>
                <Pressable
                  onPress={() => setIsAddQuickModalVisible(false)}
                  className="p-2 -mr-2"
                  hitSlop={15}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: theme.muted }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {foodItems
                  .filter((item) => !quickInventoryIds.includes(item.id))
                  .map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        addToQuickInventory(item.id);
                      }}
                      className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                      style={{ backgroundColor: theme.card || theme.bg }}
                    >
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        <Text className="text-xs">
                          {item.dietaryPreference === "veg" ? "🟢" : "🔴"}
                        </Text>
                        <Text
                          className="text-sm font-bold flex-1"
                          style={{ color: theme.text }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <View
                        className="px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: theme.isDark
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(34, 197, 94, 0.15)",
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: "#22c55e",
                          }}
                        >
                          + Pin
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                {foodItems.filter(
                  (item) => !quickInventoryIds.includes(item.id),
                ).length === 0 && (
                  <Text
                    className="text-sm italic text-center py-6"
                    style={{ color: theme.muted }}
                  >
                    All menu items are already pinned to Quick Inventory!
                  </Text>
                )}
              </ScrollView>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* CATEGORIES MODIFY HUB POP-UP (LIST) */}
      {/* ========================================================= */}
      <Modal
        visible={isModifyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModifyModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setIsModifyModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
              style={{ width: "100%", maxHeight: 550 }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.text }}
                >
                  Modify Categories
                </Text>
                <Pressable
                  onPress={() => setIsModifyModalVisible(false)}
                  className="p-2 -mr-2"
                  hitSlop={15}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: theme.muted }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={openAddCategoryModal}
                className="mb-4 p-4 rounded-2xl items-center border-2 border-dashed"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  + Add New Category
                </Text>
              </Pressable>

              <View
                className="rounded-2xl p-2"
                style={{
                  backgroundColor: theme.isDark
                    ? "rgba(255, 255, 255, 0.04)"
                    : "rgba(0, 0, 0, 0.03)",
                  height: 350,
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {categories.map((category) => (
                    <View
                      key={category.id}
                      className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                      style={{ backgroundColor: theme.card || theme.bg }}
                    >
                      <Pressable
                        className="flex-row items-center flex-1 mr-2"
                        onPress={() => openEditCategoryModal(category)}
                      >
                        <Text className="text-xl mr-3">{category.icon}</Text>
                        <Text
                          className="text-sm font-bold flex-1"
                          style={{
                            color: category.isActive ? theme.text : theme.muted,
                          }}
                          numberOfLines={1}
                        >
                          {category.name}
                        </Text>
                      </Pressable>
                      <View className="flex-row items-center gap-2">
                        <Switch
                          value={category.isActive}
                          onValueChange={() =>
                            toggleCategoryVisibility(category.id)
                          }
                          trackColor={{
                            false: theme.border,
                            true: theme.primary,
                          }}
                          thumbColor={"#ffffff"}
                          style={{ transform: [{ scale: 0.75 }] }}
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* ADD / EDIT SINGLE CATEGORY MODAL */}
      {/* ========================================================= */}
      <Modal
        visible={isCategoryEditorVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCategoryEditorVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => {
            setIsCategoryEditorVisible(false);
            setTimeout(() => setIsModifyModalVisible(true), 300);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Card
                variant="default"
                className="rounded-3xl border-0 shadow-lg p-0 overflow-hidden max-h-[80vh]"
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 24 }}
                >
                  <Text
                    className="text-xl font-bold mb-5"
                    style={{ color: theme.text }}
                  >
                    {categoryModalMode === "add"
                      ? "Create New Category"
                      : "Edit Category"}
                  </Text>

                  <Text
                    className="text-sm font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Category Name
                  </Text>
                  <TextInput
                    placeholder="e.g. Biryani"
                    placeholderTextColor={theme.muted}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    className="px-4 rounded-xl mb-4 font-bold"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                    }}
                    autoFocus={true}
                  />

                  <Text
                    className="text-sm font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Emoji Icon (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. 🍲"
                    placeholderTextColor={theme.muted}
                    value={categoryIcon}
                    onChangeText={setCategoryIcon}
                    className="px-4 rounded-xl mb-6 font-bold"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                    }}
                  />

                  <View className="flex-row justify-end mt-2">
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setIsCategoryEditorVisible(false);
                        setTimeout(() => setIsModifyModalVisible(true), 300);
                      }}
                      className="mr-3 py-3 px-6"
                    />
                    <Button
                      title={categoryModalMode === "add" ? "Create" : "Save"}
                      onPress={handleSaveCategory}
                      className="py-3 px-8"
                    />
                  </View>
                </ScrollView>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
