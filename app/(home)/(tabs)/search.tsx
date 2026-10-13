import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  Heart,
  Search,
  UserRound,
  UtensilsCrossed,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../../components/home/FoodCard";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useOrderMode } from "../_layout";

export default function SearchScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const routeCategory =
    typeof params.category === "string"
      ? params.category
      : params.category?.[0] || null;
  const [selectedCategory, setSelectedCategory] = useState<{
    routeCategory: string | null;
    name: string;
  } | null>(null);
  const selectedCategoryName =
    selectedCategory?.routeCategory === routeCategory
      ? selectedCategory.name
      : routeCategory || "All";
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [isVegOnly, setIsVegOnly] = useState(false);

  const {
    mode: orderMode,
    carts,
    menuItems,
    categories,
    activeBranch,
    refreshHomeData,
    isRefreshingHome,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = carts[orderMode] || [];
  const activeBranchId = activeBranch?.id;
  const previousBranchId = useRef(activeBranchId);

  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );
  const branchCategories = useMemo(
    () =>
      categories.filter(
        (category: any) =>
          !category.branchId || category.branchId === activeBranchId,
      ),
    [activeBranchId, categories],
  );
  const allCategoryOption = {
    id: "all",
    name: "All",
    displayIcon: UtensilsCrossed,
  };
  const activeCategory =
    selectedCategoryName === "All" ||
    branchCategories.some(
      (category: any) => category.name === selectedCategoryName,
    )
      ? selectedCategoryName
      : "All";

  useEffect(() => {
    if (previousBranchId.current === activeBranchId) return;

    previousBranchId.current = activeBranchId;
    setSelectedCategory(null);
    setCategorySearchQuery("");
    setShowCategoryList(false);
    router.setParams({ category: undefined });
  }, [activeBranchId, router]);

  const branchMenuItems = useMemo(
    () =>
      menuItems.filter((item: any) => {
        const itemBranchIds = item.branchIds || [];
        const isAvailableAtBranch =
          !activeBranchId ||
          (itemBranchIds.length > 0
            ? itemBranchIds.includes(activeBranchId)
            : !item.branchId || item.branchId === activeBranchId);
        return isAvailableAtBranch;
      }),
    [activeBranchId, menuItems],
  );

  const getCategoryItemCount = (category: any) =>
    branchMenuItems.filter((item: any) => {
      const itemCategoryId =
        typeof item.categoryId === "string"
          ? item.categoryId
          : item.categoryId?._id;
      return (
        itemCategoryId === category.id ||
        (!itemCategoryId && item.category === category.name)
      );
    }).length;
  const activeCategoryData = branchCategories.find(
    (category: any) => category.name === activeCategory,
  );
  const activeCategoryItemCount =
    activeCategory === "All"
      ? branchMenuItems.length
      : activeCategoryData
        ? getCategoryItemCount(activeCategoryData)
        : 0;

  const matchesFlexibleQuery = (query: string, value: string) => {
    const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, "");
    const normalizedValue = value.toLowerCase();
    if (!normalizedQuery) return true;
    if (normalizedValue.includes(normalizedQuery)) return true;

    let queryIndex = 0;
    for (const character of normalizedValue) {
      if (character === normalizedQuery[queryIndex]) queryIndex += 1;
      if (queryIndex === normalizedQuery.length) return true;
    }
    return false;
  };

  const matchesSearch = (item: any) => {
    const query = searchQuery.trim().toLowerCase();
    const itemName = item.name.toLowerCase();
    if (!query || itemName.includes(query)) return true;

    const initials = itemName
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((word: string) => word[0])
      .join("");

    return query.length > 1 && initials.startsWith(query.replace(/\s+/g, ""));
  };

  const filteredItems = branchMenuItems
    .filter((item: any) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      return (
        matchesCategory && (!isVegOnly || item.isVeg) && matchesSearch(item)
      );
    })
    .sort(
      (first: any, second: any) =>
        Number(first.isAvailable !== true) -
        Number(second.isAvailable !== true),
    );
  const displayedCategories = [allCategoryOption, ...branchCategories];
  const matchingCategories = displayedCategories.filter(
    (category: any) =>
      category.name === "All" ||
      matchesFlexibleQuery(categorySearchQuery, category.name),
  );

  const selectCategory = (categoryName: string) => {
    setSelectedCategory({ routeCategory, name: categoryName });
    setCategorySearchQuery("");
    setShowCategoryList(false);
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* UNIVERSAL HEADER & SEARCH */}
      <View className="px-4 py-3 z-10" style={{ backgroundColor: theme.bg }}>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-3xl font-black" style={{ color: theme.text }}>
            Full Menu
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

        <View className="flex-row gap-3">
          {/* Search Input */}
          <View
            className="flex-1 flex-row items-center rounded-2xl px-4 h-12 border"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Search size={20} color={theme.muted} strokeWidth={2.5} />
            <TextInput
              placeholder="Search dishes..."
              placeholderTextColor={theme.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-base font-medium"
              style={{
                color: theme.text,
                includeFontPadding: false,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Veg Toggle */}
          <Pressable
            onPress={() => setIsVegOnly(!isVegOnly)}
            className="flex-row items-center justify-center rounded-2xl px-4 border"
            style={{
              flexShrink: 0,
              backgroundColor: isVegOnly ? theme.primary : theme.card,
              borderColor: isVegOnly ? theme.primary : theme.border,
            }}
          >
            <View
              className="w-3 h-3 border justify-center items-center rounded-[2px] mr-1.5"
              style={{ borderColor: isVegOnly ? "#fff" : theme.muted }}
            >
              {isVegOnly && (
                <View className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </View>
            <Text
              numberOfLines={1}
              className="text-xs font-black tracking-wider"
              style={{ color: isVegOnly ? "#fff" : theme.muted }}
            >
              VEG
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="px-4 py-2 pb-4" style={{ backgroundColor: theme.bg }}>
        {showCategoryList ? (
          <View
            className="rounded-2xl border p-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <View
              className="flex-row items-center rounded-xl border px-3 h-11 mb-2"
              style={{ backgroundColor: theme.bg, borderColor: theme.border }}
            >
              <Search size={18} color={theme.muted} />
              <TextInput
                autoFocus
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                placeholder="Filter categories..."
                placeholderTextColor={theme.muted}
                className="flex-1 ml-2 text-sm font-medium"
                style={{ color: theme.text, paddingVertical: 0 }}
              />
              <Pressable
                onPress={() => setShowCategoryList(false)}
                hitSlop={10}
              >
                <ChevronDown size={19} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={{ maxHeight: 280 }}
            >
              {matchingCategories.map((category: any) => {
                const isSelected = activeCategory === category.name;
                const CategoryIcon = category.displayIcon;
                const categoryItemCount =
                  category.name === "All"
                    ? branchMenuItems.length
                    : getCategoryItemCount(category);
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => selectCategory(category.name)}
                    className="flex-row items-center rounded-xl border px-3 py-2.5 mb-2"
                    style={{
                      backgroundColor: isSelected
                        ? theme.secondaryBg
                        : theme.bg,
                      borderColor: isSelected ? theme.primary : theme.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    }}
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-lg mr-3"
                      style={{
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.card,
                      }}
                    >
                      {isSelected ? (
                        <Check size={18} color={theme.primaryForeground} />
                      ) : CategoryIcon ? (
                        <CategoryIcon size={18} color={theme.primary} />
                      ) : (
                        <UtensilsCrossed size={18} color={theme.primary} />
                      )}
                    </View>
                    <Text
                      className="flex-1 text-sm font-bold"
                      numberOfLines={1}
                      style={{
                        color: isSelected ? theme.secondaryText : theme.text,
                      }}
                    >
                      {category.name}
                    </Text>
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: isSelected ? theme.secondaryText : theme.muted,
                      }}
                    >
                      {categoryItemCount} items
                    </Text>
                  </Pressable>
                );
              })}
              {matchingCategories.length === 0 && (
                <Text
                  className="py-6 text-center text-sm font-semibold"
                  style={{ color: theme.muted }}
                >
                  No categories match your search.
                </Text>
              )}
            </ScrollView>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowCategoryList(true)}
            className="flex-row items-center rounded-2xl border px-4 py-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-xl mr-3"
              style={{ backgroundColor: theme.bg }}
            >
              {activeCategory === "All" ? (
                <Check size={19} color={theme.primary} />
              ) : (
                <UtensilsCrossed size={19} color={theme.primary} />
              )}
            </View>
            <View className="flex-1">
              <Text
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: theme.muted }}
              >
                Browse category
              </Text>
              <Text
                className="text-base font-black mt-0.5"
                numberOfLines={1}
                style={{ color: theme.text }}
              >
                {activeCategory}
              </Text>
            </View>
            <View
              className="rounded-full px-2.5 py-1 mr-2"
              style={{ backgroundColor: theme.bg }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: theme.muted }}
              >
                {activeCategoryItemCount} items
              </Text>
            </View>
            <ChevronDown size={19} color={theme.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
        {/* UNIFIED FOOD CARDS GRID */}
        <View className="flex-row flex-wrap justify-between px-4">
          {filteredItems.map((item: any) => {
            const cartQuantity = activeCart.reduce(
              (quantity: number, cartItem: any) =>
                quantity +
                (cartItem.id === item.id ? cartItem.quantity : 0),
              0,
            );
            return (
              <View key={item.id} style={{ width: "48%" }} className="mb-4">
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
      </ScrollView>
    </View>
  );
}
