import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
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
  StoreDetailOption,
  StoreDetailSection,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function OperationsDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const { currentManager } = useCurrentManager();

  // Data State
  const [foodItems, setFoodItems] = useState(MANAGER_MOCK_DATA.foodItems);
  const [categories, setCategories] = useState(MANAGER_MOCK_DATA.categories);
  const [storeDetails, setStoreDetails] = useState<StoreDetailSection[]>(
    MANAGER_MOCK_DATA.storeDetails,
  );

  // Quick Inventory Pinned IDs & Filters State (Starts empty by default)
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

  // === UNIFIED STORE DETAILS MODAL STATE MACHINE ===
  const [storeModalState, setStoreModalState] = useState<
    "hub" | "sectionEditor" | "optionManager" | "optionEditor" | null
  >(null);

  // Tracking which section/option is being viewed or edited
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  // Form Inputs (Reusable for both Sections and Options)
  const [inputVal1, setInputVal1] = useState(""); // Title or Value
  const [inputVal2, setInputVal2] = useState(""); // SubValue
  const [inputToggle, setInputToggle] = useState<"single" | "multiple">(
    "single",
  );

  // Category Modal States (Kept isolated to preserve stability)
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

  const activeCategories = categories.filter((c) => c.isActive);
  const activeStoreSections = storeDetails.filter((s) => s.isSectionActive);
  const currentActiveSection = storeDetails.find(
    (s) => s.id === selectedSectionId,
  );

  // Refresh & Prune Quick Inventory IDs
  useFocusEffect(
    useCallback(() => {
      setFoodItems([...MANAGER_MOCK_DATA.foodItems]);
      setCategories([...MANAGER_MOCK_DATA.categories]);
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
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

  const { availableCoupons } = MANAGER_MOCK_DATA;
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
  // STORE DETAILS DYNAMIC LOGIC
  // ==========================================

  const toggleStoreSectionVisibility = (sectionId: string) => {
    const idx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === sectionId,
    );
    if (idx > -1) {
      MANAGER_MOCK_DATA.storeDetails[idx].isSectionActive =
        !MANAGER_MOCK_DATA.storeDetails[idx].isSectionActive;
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    }
  };

  const toggleStoreOptionVisibility = (sectionId: string, optionId: string) => {
    const sIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === sectionId,
    );
    if (sIdx === -1) return;
    const section = MANAGER_MOCK_DATA.storeDetails[sIdx];

    if (section.selectionType === "single") {
      section.options.forEach((opt) => (opt.isActive = opt.id === optionId));
    } else {
      const oIdx = section.options.findIndex((o) => o.id === optionId);
      if (oIdx > -1)
        section.options[oIdx].isActive = !section.options[oIdx].isActive;
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
  };

  // Flow: Add/Edit Section
  const openSectionEditor = (section?: StoreDetailSection) => {
    setStoreModalState(null);
    setTimeout(() => {
      setEditingSectionId(section ? section.id : null);
      setInputVal1(section ? section.title : "");
      setInputToggle(section ? section.selectionType : "single");
      setStoreModalState("sectionEditor");
    }, 300);
  };

  const handleSaveSection = () => {
    if (!inputVal1.trim()) return;
    if (editingSectionId) {
      const idx = MANAGER_MOCK_DATA.storeDetails.findIndex(
        (s) => s.id === editingSectionId,
      );
      if (idx > -1) {
        MANAGER_MOCK_DATA.storeDetails[idx].title = inputVal1.trim();
        MANAGER_MOCK_DATA.storeDetails[idx].selectionType = inputToggle;
      }
    } else {
      MANAGER_MOCK_DATA.storeDetails.unshift({
        id: `sd_${Date.now()}`,
        title: inputVal1.trim(),
        selectionType: "single",
        isSectionActive: true,
        options: [],
      });
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    setStoreModalState(null);
    setTimeout(() => setStoreModalState("hub"), 300);
  };

  const handleDeleteSection = (sectionId: string, title: string) => {
    Alert.alert("Delete Category", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          MANAGER_MOCK_DATA.storeDetails =
            MANAGER_MOCK_DATA.storeDetails.filter((s) => s.id !== sectionId);
          setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
        },
      },
    ]);
  };

  // Flow: Enter Option Manager
  const openOptionManager = (sectionId: string) => {
    setStoreModalState(null);
    setTimeout(() => {
      setSelectedSectionId(sectionId);
      setStoreModalState("optionManager");
    }, 300);
  };

  // Flow: Add/Edit Option
  const openOptionEditor = (option?: StoreDetailOption) => {
    setStoreModalState(null);
    setTimeout(() => {
      setEditingOptionId(option ? option.id : null);
      setInputVal1(option ? option.value : "");
      setInputVal2(option && option.subValue ? option.subValue : "");
      setStoreModalState("optionEditor");
    }, 300);
  };

  const handleSaveOption = () => {
    if (!inputVal1.trim() || !selectedSectionId) return;
    const secIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === selectedSectionId,
    );
    if (secIdx === -1) return;

    if (editingOptionId) {
      const optIdx = MANAGER_MOCK_DATA.storeDetails[secIdx].options.findIndex(
        (o) => o.id === editingOptionId,
      );
      if (optIdx > -1) {
        MANAGER_MOCK_DATA.storeDetails[secIdx].options[optIdx].value =
          inputVal1.trim();
        MANAGER_MOCK_DATA.storeDetails[secIdx].options[optIdx].subValue =
          inputVal2.trim();
      }
    } else {
      MANAGER_MOCK_DATA.storeDetails[secIdx].options.unshift({
        id: `opt_${Date.now()}`,
        value: inputVal1.trim(),
        subValue: inputVal2.trim(),
        isActive:
          MANAGER_MOCK_DATA.storeDetails[secIdx].selectionType === "multiple",
      });
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    setStoreModalState(null);
    setTimeout(() => setStoreModalState("optionManager"), 300);
  };

  const handleDeleteOption = (optionId: string, value: string) => {
    Alert.alert("Delete Item", `Remove "${value}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const secIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
            (s) => s.id === selectedSectionId,
          );
          if (secIdx > -1) {
            MANAGER_MOCK_DATA.storeDetails[secIdx].options =
              MANAGER_MOCK_DATA.storeDetails[secIdx].options.filter(
                (o) => o.id !== optionId,
              );
            setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
          }
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
            <Pressable
              onPress={() => alert("Profile & Sign Out coming soon!")}
              className="p-3 rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="text-lg">👤</Text>
            </Pressable>
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
          {/* INDEX 0: Non-sticky top content (Stats, Store Details, Categories) */}
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
                  {availableCoupons.length}
                </Text>
                <Text
                  className="text-xs font-semibold text-center"
                  style={{ color: theme.muted }}
                >
                  Active{"\n"}Coupons
                </Text>
              </Card>
            </View>

            {/* Dynamic Store Details Dashboard Render */}
            <View className="flex-row justify-between items-end mb-3">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Store Details
              </Text>
              <Pressable onPress={() => setStoreModalState("hub")}>
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.primary }}
                >
                  Modify
                </Text>
              </Pressable>
            </View>
            <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
              {activeStoreSections.length > 0 ? (
                activeStoreSections.map((section, index) => {
                  const activeOptions = section.options.filter(
                    (o) => o.isActive,
                  );
                  let displayValue = "None Active";
                  if (activeOptions.length > 0) {
                    displayValue =
                      section.selectionType === "single"
                        ? activeOptions[0].value
                        : `${activeOptions.length} Active`;
                  }
                  return (
                    <View
                      key={section.id}
                      className={`flex-row justify-between items-center ${index < activeStoreSections.length - 1 ? "mb-3 border-b pb-3" : ""}`}
                      style={{ borderBottomColor: theme.border }}
                    >
                      <Text
                        className="text-base font-bold"
                        style={{ color: theme.text }}
                      >
                        {section.title}
                      </Text>
                      <Text
                        className="text-base font-medium"
                        style={{ color: theme.primary }}
                        numberOfLines={1}
                      >
                        {displayValue}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text
                  style={{
                    color: theme.muted,
                    textAlign: "center",
                    paddingVertical: 10,
                  }}
                >
                  No Active Store Details
                </Text>
              )}
            </Card>

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

            {/* Quick Inventory Search Bar with Buttery Smooth Auto-Scroll on Focus */}
            <TextInput
              placeholder="Search quick inventory..."
              placeholderTextColor={theme.muted}
              value={quickSearchQuery}
              onChangeText={setQuickSearchQuery}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollTo({
                    y: 520, // Exact offset to pin right under the main header
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
                            color: "#22c55e", // Explicit bright green text color
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
      {/* 1st POP-UP: STORE DETAILS MODIFY HUB */}
      {/* ========================================================= */}
      <Modal
        visible={storeModalState === "hub"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState(null)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setStoreModalState(null)}
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
                  Modify Store Details
                </Text>
                <Pressable
                  onPress={() => setStoreModalState(null)}
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
                onPress={() => openSectionEditor()}
                className="mb-4 p-4 rounded-2xl items-center border-2 border-dashed"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  + Add New Detail Category
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
                >
                  {storeDetails.map((section) => {
                    const activeOptions = section.options.filter(
                      (o) => o.isActive,
                    );
                    let displayValue = "None Active";
                    if (activeOptions.length > 0) {
                      displayValue =
                        section.selectionType === "single"
                          ? activeOptions[0].value
                          : `${activeOptions.length} Active`;
                    }
                    return (
                      <Pressable
                        key={section.id}
                        onPress={() => openOptionManager(section.id)}
                        className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                        style={{ backgroundColor: theme.card || theme.bg }}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="flex-1">
                            <Text
                              className="text-sm font-bold"
                              style={{
                                color: section.isSectionActive
                                  ? theme.text
                                  : theme.muted,
                              }}
                              numberOfLines={1}
                            >
                              {section.title}
                            </Text>
                            <Text
                              className="text-[10px]"
                              style={{ color: theme.muted }}
                              numberOfLines={1}
                            >
                              {displayValue}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Switch
                            value={section.isSectionActive}
                            onValueChange={() =>
                              toggleStoreSectionVisibility(section.id)
                            }
                            trackColor={{
                              false: theme.border,
                              true: theme.primary,
                            }}
                            thumbColor={"#ffffff"}
                            style={{ transform: [{ scale: 0.75 }] }}
                          />
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              openSectionEditor(section);
                            }}
                            hitSlop={10}
                            className="p-2"
                          >
                            <Feather
                              name="edit-2"
                              size={16}
                              color={theme.primary}
                            />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteSection(section.id, section.title);
                            }}
                            hitSlop={10}
                            className="p-2"
                          >
                            <Feather
                              name="trash-2"
                              size={16}
                              color={theme.danger}
                            />
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* 2nd POP-UP: STORE SECTION EDITOR (Add/Edit Category) */}
      {/* ========================================================= */}
      <Modal
        visible={storeModalState === "sectionEditor"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState(null)}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => {
            setStoreModalState(null);
            setTimeout(() => setStoreModalState("hub"), 300);
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
                    {editingSectionId ? "Edit Category" : "Add New Category"}
                  </Text>

                  <Text
                    className="text-sm font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Category Title
                  </Text>
                  <TextInput
                    placeholder="e.g. FSSAI License"
                    placeholderTextColor={theme.muted}
                    value={inputVal1}
                    onChangeText={setInputVal1}
                    className="px-4 rounded-xl mb-6 font-bold"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                    }}
                    autoFocus={true}
                  />

                  <View className="flex-row justify-end mt-2">
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setStoreModalState(null);
                        setTimeout(() => setStoreModalState("hub"), 300);
                      }}
                      className="mr-3 py-3 px-6"
                    />
                    <Button
                      title="Save"
                      onPress={handleSaveSection}
                      className="py-3 px-8"
                    />
                  </View>
                </ScrollView>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* 3rd POP-UP: OPTION MANAGER (List inside a specific Category) */}
      {/* ========================================================= */}
      <Modal
        visible={storeModalState === "optionManager"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState(null)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => {
            setStoreModalState(null);
            setTimeout(() => setStoreModalState("hub"), 300);
          }}
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
                  Modify {currentActiveSection?.title}
                </Text>
                <Pressable
                  onPress={() => {
                    setStoreModalState(null);
                    setTimeout(() => setStoreModalState("hub"), 300);
                  }}
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
                onPress={() => openOptionEditor()}
                className="mb-4 p-4 rounded-2xl items-center border-2 border-dashed"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  + Add New {currentActiveSection?.title}
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
                >
                  {currentActiveSection?.options.map((opt) => (
                    <View
                      key={opt.id}
                      className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                      style={{ backgroundColor: theme.card || theme.bg }}
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="flex-1">
                          <Text
                            className="text-sm font-bold flex-1"
                            style={{
                              color: opt.isActive ? theme.text : theme.muted,
                            }}
                            numberOfLines={1}
                          >
                            {opt.value}
                          </Text>
                          {opt.subValue ? (
                            <Text
                              className="text-[10px]"
                              style={{ color: theme.muted }}
                              numberOfLines={1}
                            >
                              {opt.subValue}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {currentActiveSection.selectionType === "single" ? (
                          <Pressable
                            onPress={() =>
                              toggleStoreOptionVisibility(
                                currentActiveSection.id,
                                opt.id,
                              )
                            }
                            hitSlop={10}
                            className="p-1"
                          >
                            <View
                              className="w-5 h-5 rounded-full border-2 items-center justify-center"
                              style={{
                                borderColor: opt.isActive
                                  ? theme.primary
                                  : theme.muted,
                              }}
                            >
                              {opt.isActive && (
                                <View
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: theme.primary }}
                                />
                              )}
                            </View>
                          </Pressable>
                        ) : (
                          <Switch
                            value={opt.isActive}
                            onValueChange={() =>
                              toggleStoreOptionVisibility(
                                currentActiveSection.id,
                                opt.id,
                              )
                            }
                            trackColor={{
                              false: theme.border,
                              true: theme.primary,
                            }}
                            thumbColor={"#ffffff"}
                            style={{ transform: [{ scale: 0.75 }] }}
                          />
                        )}
                        <Pressable
                          onPress={() => openOptionEditor(opt)}
                          hitSlop={10}
                          className="p-1 ml-1"
                        >
                          <Feather
                            name="edit-2"
                            size={16}
                            color={theme.primary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteOption(opt.id, opt.value)}
                          hitSlop={10}
                          className="p-1"
                        >
                          <Feather
                            name="trash-2"
                            size={16}
                            color={theme.danger}
                          />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View className="flex-row justify-end mt-4">
                <Button
                  title="Back to Hub"
                  variant="outline"
                  onPress={() => {
                    setStoreModalState(null);
                    setTimeout(() => setStoreModalState("hub"), 300);
                  }}
                  className="py-3 px-6"
                />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ========================================================= */}
      {/* 4th POP-UP: STORE SINGLE ITEM EDITOR */}
      {/* ========================================================= */}
      <Modal
        visible={storeModalState === "optionEditor"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState(null)}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => {
            setStoreModalState(null);
            setTimeout(() => setStoreModalState("optionManager"), 300);
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
                    {editingOptionId
                      ? `Edit ${currentActiveSection?.title || "Item"}`
                      : `Add New ${currentActiveSection?.title || "Item"}`}
                  </Text>

                  {(() => {
                    let label1 = "Value";
                    let placeholder1 = `Enter ${currentActiveSection?.title?.toLowerCase() || "value"}`;
                    let showInput2 = false;
                    let label2 = "";
                    let placeholder2 = "";
                    let kbdType: any = "default";

                    if (currentActiveSection?.id === "sd_rest") {
                      label1 = "Restaurant Name";
                      placeholder1 = "e.g. Foodie Verse";
                    } else if (currentActiveSection?.id === "sd_tax") {
                      label1 = "Tax Percentage (%)";
                      placeholder1 = "e.g. 5";
                      kbdType = "numeric";
                    } else if (currentActiveSection?.id === "sd_wifi") {
                      label1 = "Network SSID (Name)";
                      placeholder1 = "e.g. FoodieVerse_Guest";
                      showInput2 = true;
                      label2 = "Password";
                      placeholder2 = "e.g. SpicyBiryani!";
                    } else if (currentActiveSection?.id === "sd_phrases") {
                      label1 = "Greeting Phrase";
                      placeholder1 = "e.g. Welcome back!";
                    } else if (currentActiveSection?.id === "sd_search") {
                      label1 = "Search Placeholder";
                      placeholder1 = "e.g. Search for 'Biryani'";
                    } else if (currentActiveSection?.id === "sd_branches") {
                      label1 = "Branch Location";
                      placeholder1 = "e.g. Banjara Hills, Hyderabad";
                    } else {
                      label1 = `${currentActiveSection?.title || "Item"} Name`;
                    }

                    return (
                      <>
                        <Text
                          className="text-sm font-bold mb-2 uppercase"
                          style={{ color: theme.muted }}
                        >
                          {label1}
                        </Text>

                        {currentActiveSection?.id === "sd_branches" && (
                          <View className="flex-row gap-2 mb-3">
                            <Pressable
                              onPress={() => {
                                Alert.alert(
                                  "Location Access",
                                  "Simulating fetching GPS coordinates...",
                                );
                                setInputVal1("Madhapur, Hyderabad, Telangana");
                              }}
                              className="flex-1 p-3 rounded-xl items-center justify-center border border-dashed"
                              style={{
                                borderColor: theme.primary,
                                backgroundColor: theme.card,
                              }}
                            >
                              <Text
                                className="text-xs font-bold"
                                style={{ color: theme.primary }}
                              >
                                📍 Current Location
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                Alert.alert(
                                  "Map Preview",
                                  "Map view will open here. (Backend required)",
                                );
                                setInputVal1(
                                  "Banjara Hills, Hyderabad, Telangana",
                                );
                              }}
                              className="flex-1 p-3 rounded-xl items-center justify-center border border-dashed"
                              style={{
                                borderColor: theme.primary,
                                backgroundColor: theme.card,
                              }}
                            >
                              <Text
                                className="text-xs font-bold"
                                style={{ color: theme.primary }}
                              >
                                🗺️ Open Map
                              </Text>
                            </Pressable>
                          </View>
                        )}

                        <TextInput
                          placeholder={placeholder1}
                          placeholderTextColor={theme.muted}
                          value={inputVal1}
                          onChangeText={setInputVal1}
                          keyboardType={kbdType}
                          className="px-4 rounded-xl mb-4 font-bold"
                          style={{
                            backgroundColor: theme.bg,
                            color: theme.text,
                            fontSize: 18,
                            height: 56,
                            textAlignVertical: "center",
                          }}
                          autoFocus={currentActiveSection?.id !== "sd_branches"}
                        />

                        {showInput2 && (
                          <>
                            <Text
                              className="text-sm font-bold mb-2 mt-2 uppercase"
                              style={{ color: theme.muted }}
                            >
                              {label2}
                            </Text>
                            <TextInput
                              placeholder={placeholder2}
                              placeholderTextColor={theme.muted}
                              value={inputVal2}
                              onChangeText={setInputVal2}
                              className="px-4 rounded-xl mb-6 font-bold"
                              style={{
                                backgroundColor: theme.bg,
                                color: theme.text,
                                fontSize: 18,
                                height: 56,
                                textAlignVertical: "center",
                              }}
                            />
                          </>
                        )}
                      </>
                    );
                  })()}

                  <View className="flex-row justify-end mt-2">
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setStoreModalState(null);
                        setTimeout(
                          () => setStoreModalState("optionManager"),
                          300,
                        );
                      }}
                      className="mr-3 py-3 px-6"
                    />
                    <Button
                      title="Save"
                      onPress={handleSaveOption}
                      className="py-3 px-8"
                    />
                  </View>
                </ScrollView>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
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
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setIsModifyModalVisible(false)}
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
                >
                  {categories.map((category) => (
                    <View
                      key={category.id}
                      className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                      style={{ backgroundColor: theme.card || theme.bg }}
                    >
                      <View className="flex-row items-center flex-1 mr-2">
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
                      </View>
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
                        <Pressable
                          onPress={() => openEditCategoryModal(category)}
                          hitSlop={10}
                          className="p-1"
                        >
                          <Feather
                            name="edit-2"
                            size={16}
                            color={theme.primary}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            handleDeleteCategory(category.id, category.name)
                          }
                          hitSlop={10}
                          className="p-1"
                        >
                          <Feather
                            name="trash-2"
                            size={16}
                            color={theme.danger}
                          />
                        </Pressable>
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
