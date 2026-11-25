import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  Check,
  ChevronDown,
  Heart,
  Search,
  UtensilsCrossed,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MenuListItem, {
  type MenuCardItem,
} from "../../../components/home/MenuListItem";
import { ProfileAvatarButton } from "../../../components/profile/ProfileAvatarButton";
import { useOrderMode } from "../../../contexts/HomeContext";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";

export default function SearchScreen() {
  const router = useRouter();
  const navigation = useNavigation();
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
    menuItemsLoadedForBranchId,
    categories,
    activeBranch,
    activeAddress,
    refreshHomeData,
    isRefreshingHome,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = useMemo(
    () => carts[orderMode] || [],
    [carts, orderMode],
  );
  const activeBranchId = activeBranch?.id;
  const previousBranchId = useRef(activeBranchId);

  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );
  const cartQuantityByMenuItemId = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const item of activeCart) {
      const itemId = String(item.id);
      quantities.set(
        itemId,
        (quantities.get(itemId) || 0) + item.quantity,
      );
    }
    return quantities;
  }, [activeCart]);
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
    setSelectedCategory({ routeCategory, name: "All" });
    setCategorySearchQuery("");
    setShowCategoryList(false);
    if (navigation.isFocused()) {
      router.setParams({ category: undefined });
    }
  }, [activeBranchId, navigation, routeCategory, router]);

  const branchMenuItems = useMemo(
    () => {
      const branchItems = menuItems.filter((item: any) => {
        const itemBranchIds = item.branchIds || [];
        const isAvailableAtBranch =
          !activeBranchId ||
          (itemBranchIds.length > 0
            ? itemBranchIds.includes(activeBranchId)
            : !item.branchId || item.branchId === activeBranchId);
        return isAvailableAtBranch;
      });

      return branchItems.sort(
        (first: any, second: any) =>
          Number(first.isAvailable !== true) -
          Number(second.isAvailable !== true),
      );
    },
    [activeBranchId, menuItems],
  );

  const categoryItemCounts = useMemo(() => {
    const countsById = new Map<string, number>();
    const countsByName = new Map<string, number>();

    for (const item of branchMenuItems) {
      const itemCategoryId =
        typeof item.categoryId === "string"
          ? item.categoryId
          : item.categoryId?._id;
      if (itemCategoryId) {
        countsById.set(
          itemCategoryId,
          (countsById.get(itemCategoryId) || 0) + 1,
        );
      } else if (item.category) {
        countsByName.set(
          item.category,
          (countsByName.get(item.category) || 0) + 1,
        );
      }
    }

    return { countsById, countsByName };
  }, [branchMenuItems]);
  const getCategoryItemCount = (category: any) =>
    categoryItemCounts.countsById.get(category.id) ??
    categoryItemCounts.countsByName.get(category.name) ??
    0;
  const activeCategoryData = branchCategories.find(
    (category: any) => category.name === activeCategory,
  );
  const menuFilterKey = JSON.stringify({
    branchId: activeBranchId,
    address: orderMode === "Delivery" ? activeAddress?.id : undefined,
    fulfillmentType:
      orderMode === "Delivery"
        ? "delivery"
        : orderMode === "Takeaway"
          ? "takeaway"
          : "dine-in",
    search: searchQuery.trim(),
  });
  const [serverMenuResults, setServerMenuResults] = useState<{
    key: string;
    ids: string[];
  } | null>(null);
  const menuSearchRequestId = useRef(0);
  const hasServerMenuSearch = Boolean(searchQuery.trim());

  useEffect(() => {
    const requestId = ++menuSearchRequestId.current;
    if (
      !activeBranchId ||
      !hasServerMenuSearch ||
      (orderMode === "Delivery" && !activeAddress?.id)
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void api
        .getMenuItems({
          branchId: activeBranchId,
          address: orderMode === "Delivery" ? activeAddress?.id : undefined,
          fulfillmentType:
            orderMode === "Delivery"
              ? "delivery"
              : orderMode === "Takeaway"
                ? "takeaway"
                : "dine-in",
          search: searchQuery.trim(),
        })
        .then((items) => {
          if (requestId !== menuSearchRequestId.current) return;
          setServerMenuResults({
            key: menuFilterKey,
            ids: items.map((item) => item._id),
          });
        })
        .catch((error: unknown) => {
          if (requestId !== menuSearchRequestId.current) return;
          setServerMenuResults({ key: menuFilterKey, ids: [] });
          Alert.alert(
            "Unable to Search Menu",
            error instanceof Error ? error.message : "Please try again.",
          );
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      if (menuSearchRequestId.current === requestId) {
        menuSearchRequestId.current += 1;
      }
    };
  }, [
    activeAddress?.id,
    activeBranchId,
    hasServerMenuSearch,
    menuFilterKey,
    orderMode,
    searchQuery,
  ]);
  const matchingServerResults = useMemo(
    () =>
      serverMenuResults?.key === menuFilterKey
        ? new Set(serverMenuResults.ids)
        : null,
    [menuFilterKey, serverMenuResults],
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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return branchMenuItems.filter((item: any) => {
      if (matchingServerResults && !matchingServerResults.has(item.id)) {
        return false;
      }

      const itemCategoryId =
        typeof item.categoryId === "string"
          ? item.categoryId
          : item.categoryId?._id;
      const matchesCategory =
        activeCategory === "All" ||
        itemCategoryId === activeCategoryData?.id ||
        item.category === activeCategory;
      if (!matchesCategory || (isVegOnly && !item.isVeg)) return false;
      if (matchingServerResults !== null || !query) return true;
      if (item.name.toLowerCase().includes(query)) return true;

      const initials = item.name
        .toLowerCase()
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((word: string) => word[0])
        .join("");
      return query.length > 1 && initials.startsWith(query.replace(/\s+/g, ""));
    });
  }, [
    activeCategory,
    activeCategoryData?.id,
    branchMenuItems,
    isVegOnly,
    matchingServerResults,
    searchQuery,
  ]);
  const displayedCategories = [allCategoryOption, ...branchCategories];
  const matchingCategories = displayedCategories.filter(
    (category: any) =>
      category.name === "All" ||
      matchesFlexibleQuery(categorySearchQuery, category.name),
  );
  const renderMenuItem = useCallback(
    ({ item }: { item: MenuCardItem }) => (
      <View style={{ width: "48%" }} className="mb-4">
        <MenuListItem
          item={item}
          cartQuantity={cartQuantityByMenuItemId.get(item.id) || 0}
          onAddToCart={handleAddToCart}
          onDecrement={handleDecrementCartItem}
        />
      </View>
    ),
    [cartQuantityByMenuItemId, handleAddToCart, handleDecrementCartItem],
  );
  const menuItemKeyExtractor = useCallback(
    (item: MenuCardItem) => item.id,
    [],
  );
  const menuGridColumnStyle = useMemo(
    () => ({ justifyContent: "space-between" as const, paddingHorizontal: 16 }),
    [],
  );
  const menuGridContentStyle = useMemo(
    () => ({ paddingBottom: activeCartTotalItems > 0 ? 180 : 120 }),
    [activeCartTotalItems],
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
              onPress={() => router.push("/(home)/favorites")}
              className="h-11 w-11 items-center justify-center rounded-full border mr-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <Heart size={20} color={theme.text} strokeWidth={2.5} />
            </Pressable>

            <ProfileAvatarButton />
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

      <FlatList
        className="flex-1"
        data={filteredItems}
        keyExtractor={menuItemKeyExtractor}
        numColumns={2}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={16}
        windowSize={7}
        columnWrapperStyle={menuGridColumnStyle}
        contentContainerStyle={menuGridContentStyle}
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
        renderItem={renderMenuItem}
        ListEmptyComponent={
          activeBranchId &&
          menuItemsLoadedForBranchId === activeBranchId ? (
            <View className="items-center justify-center px-6 py-16">
              {searchQuery.trim() ? (
                <Search size={32} color={theme.muted} strokeWidth={2} />
              ) : (
                <UtensilsCrossed
                  size={32}
                  color={theme.muted}
                  strokeWidth={2}
                />
              )}
              <Text
                className="mt-4 text-lg font-black text-center"
                style={{ color: theme.text }}
              >
                {searchQuery.trim()
                  ? "No dishes found"
                  : activeCategory !== "All"
                    ? `No items in ${activeCategory}`
                    : isVegOnly
                      ? "No vegetarian items available"
                      : "No menu items available"}
              </Text>
              <Text
                className="mt-2 text-sm font-semibold text-center leading-5"
                style={{ color: theme.muted }}
              >
                {searchQuery.trim()
                  ? `We couldn't find any dishes matching "${searchQuery.trim()}". Try another search.`
                  : activeCategory !== "All"
                    ? `This branch has no items in the ${activeCategory} category right now.`
                    : isVegOnly
                      ? "This branch has no vegetarian items available right now."
                      : "This branch has no menu items available right now. Please check back later."}
              </Text>
            </View>
          ) : undefined
        }
      />
    </View>
  );
}
