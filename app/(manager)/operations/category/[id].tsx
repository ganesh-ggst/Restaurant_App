import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import {
  OperationsCategory,
  OperationsMenuItem,
  operationsApi,
} from "../../../../services/api/operations";
import { operationsCache } from "../../../../services/api/operations-cache";

type ListTab = "items" | "cross-sells";

export default function CategoryDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cachedCategory = operationsCache.getCategory(id);
  const [category, setCategory] = useState<OperationsCategory | null>(
    cachedCategory?.category ?? null,
  );
  const [items, setItems] = useState<OperationsMenuItem[]>(
    cachedCategory?.items ?? [],
  );
  const [crossSells, setCrossSells] = useState<OperationsMenuItem[]>(
    cachedCategory?.crossSells ?? [],
  );
  const [activeTab, setActiveTab] = useState<ListTab>("items");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "inStock" | "outOfStock">("all");
  const [foodFilter, setFoodFilter] = useState<"all" | "veg" | "non_veg">("all");
  const [loading, setLoading] = useState(cachedCategory === null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyItemId, setBusyItemId] = useState("");

  const loadCategory = useCallback(async (isPullToRefresh = false) => {
    if (!operationsCache.getCategory(id)) setLoading(true);
    if (isPullToRefresh) setRefreshing(true);
    try {
      const [categoryResult, itemResults, crossSellResults] = await Promise.all([
        operationsApi.getCategory(id),
        operationsApi.getCategoryItems(id),
        operationsApi.getCrossSells(id),
      ]);
      setCategory(categoryResult.category);
      setItems(itemResults);
      setCrossSells(crossSellResults);
      operationsCache.setCategory(id, {
        category: categoryResult.category,
        items: itemResults,
        crossSells: crossSellResults,
      });
    } catch (error) {
      Alert.alert(
        "Unable to load category",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (operationsCache.isCategoryStale(id)) {
        void loadCategory();
      }
    }, [id, loadCategory]),
  );

  const currentItems = activeTab === "items" ? items : crossSells;
  const visibleItems = useMemo(
    () =>
      currentItems.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "inStock" ? item.isAvailable : !item.isAvailable);
        const foodType = item.foodType?.toLowerCase();
        const matchesFood =
          foodFilter === "all" ||
          (foodFilter === "non_veg"
            ? foodType === "non_veg" || foodType === "non-veg"
            : foodType === "veg");
        return matchesSearch && matchesStock && matchesFood;
      }),
    [currentItems, foodFilter, search, stockFilter],
  );

  const toggleAvailability = async (item: OperationsMenuItem) => {
    setBusyItemId(item._id);
    try {
      const isAvailable = !item.isAvailable;
      if (activeTab === "items") {
        await operationsApi.setItemAvailability(item._id, isAvailable);
        operationsCache.invalidateCategory(id);
        operationsCache.invalidateCategories();
        setItems((current) =>
          current.map((entry) =>
            entry._id === item._id ? { ...entry, isAvailable } : entry,
          ),
        );
      } else {
        await operationsApi.setCrossSellAvailability(item._id, isAvailable);
        operationsCache.invalidateCategory(id);
        operationsCache.invalidateCategories();
        setCrossSells((current) =>
          current.map((entry) =>
            entry._id === item._id ? { ...entry, isAvailable } : entry,
          ),
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to update item availability",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusyItemId("");
    }
  };

  const deleteItem = (item: OperationsMenuItem) => {
    Alert.alert("Delete item", `Remove "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyItemId(item._id);
          try {
            if (activeTab === "items") {
              await operationsApi.deleteItem(item._id);
              operationsCache.invalidateCategory(id);
              operationsCache.invalidateCategories();
              setItems((current) =>
                current.filter((entry) => entry._id !== item._id),
              );
            } else {
              await operationsApi.deleteCrossSell(item._id);
              operationsCache.invalidateCategory(id);
              operationsCache.invalidateCategories();
              setCrossSells((current) =>
                current.filter((entry) => entry._id !== item._id),
              );
            }
          } catch (error) {
            Alert.alert(
              "Unable to delete item",
              error instanceof Error ? error.message : "Please try again.",
            );
          } finally {
            setBusyItemId("");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        className="flex-row items-center border-b px-5 py-4"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-2xl" style={{ color: theme.text }}>←</Text>
        </Pressable>
        {category?.icon ? <Text className="mr-2 text-2xl">{category.icon}</Text> : null}
        <Text className="flex-1 text-xl font-bold" style={{ color: theme.text }} numberOfLines={1}>
          {category?.name || "Category"}
        </Text>
      </View>

      <View
        className="px-5 pb-2 pt-3"
        style={{ backgroundColor: theme.bg, zIndex: 2, elevation: 2 }}
      >
        <View
          className="mb-4 flex-row rounded-2xl p-1"
          style={{ backgroundColor: theme.card }}
        >
          {(["items", "cross-sells"] as const).map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setSearch("");
                }}
                className="flex-1 items-center justify-center rounded-xl px-2 py-3"
                style={{
                  backgroundColor: selected ? theme.primary : "transparent",
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: selected ? "#ffffff" : theme.text }}
                >
                  {tab === "items"
                    ? `Menu Items (${items.length})`
                    : `Cross-Sell Upsells (${crossSells.length})`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            activeTab === "items" ? "Search items..." : "Search cross-sells..."
          }
          placeholderTextColor={theme.muted}
          className="mb-3 rounded-2xl px-4"
          style={{
            backgroundColor: theme.card,
            color: theme.text,
            height: 56,
            fontSize: 16,
          }}
        />
        <View className="mb-2 flex-row gap-2">
          {(["all", "inStock", "outOfStock"] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStockFilter(filter)}
              className="rounded-xl px-3 py-3"
              style={{
                backgroundColor: stockFilter === filter ? theme.primary : theme.card,
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: stockFilter === filter ? "#fff" : theme.text }}
              >
                {filter === "all"
                  ? "All Stock"
                  : filter === "inStock"
                    ? "In Stock"
                    : "Out of Stock"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mb-3 flex-row gap-2">
          {(["all", "veg", "non_veg"] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setFoodFilter(filter)}
              className="rounded-xl px-3 py-3"
              style={{
                backgroundColor: foodFilter === filter ? theme.primary : theme.card,
              }}
            >
              <Text
                className="text-xs font-bold capitalize"
                style={{ color: foodFilter === filter ? "#fff" : theme.text }}
              >
                {filter === "all"
                  ? "All Types"
                  : filter === "non_veg"
                    ? "🔴 Non-Veg"
                    : "🟢 Veg"}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mb-3">
          <Pressable
            onPress={() =>
              router.push(
                `/(manager)/operations/${activeTab === "items" ? "item" : "upsell"}/new?${activeTab === "items" ? "categoryId" : "triggerCategoryId"}=${encodeURIComponent(id)}` as never,
              )
            }
            className="items-center rounded-2xl border-2 border-dashed py-4"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-sm font-bold" style={{ color: theme.text }}>
              {activeTab === "items"
                ? "+ Add New Menu Item"
                : "+ Add New Cross-Sell Item"}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadCategory(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {visibleItems.map((item) => (
            <Card
              key={item._id}
              variant="default"
              className="mb-3 flex-row items-center rounded-2xl border-0 p-4"
            >
              <Pressable
                className="mr-2 flex-1 justify-center"
                onPress={() =>
                  router.push(
                    `/(manager)/operations/${activeTab === "items" ? "item" : "upsell"}/${item._id}?categoryId=${encodeURIComponent(id)}&triggerCategoryId=${encodeURIComponent(id)}` as never,
                  )
                }
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                  ₹{item.price} •{" "}
                  {item.foodType?.trim().toLowerCase() === "veg" ? (
                    <Text style={{ color: "#22c55e" }}>🟢 Veg</Text>
                  ) : item.foodType?.trim().toLowerCase() === "non_veg" ||
                    item.foodType?.trim().toLowerCase() === "non-veg" ? (
                    <Text style={{ color: "#ef4444" }}>🔴 Non-Veg</Text>
                  ) : (
                    <Text>Type unknown</Text>
                  )}{" "}
                  •{" "}
                  {item.isAvailable ? "In stock" : "Out of stock"}
                </Text>
              </Pressable>
              <View className="w-32 items-end">
                <View className="flex-row items-center justify-end">
                  <Switch
                    value={item.isAvailable}
                    onValueChange={() => void toggleAvailability(item)}
                    disabled={busyItemId === item._id}
                    trackColor={{
                      false: theme.border,
                      true: theme.primary,
                    }}
                    thumbColor="#ffffff"
                    accessibilityLabel={`${
                      item.isAvailable ? "Mark" : "Make"
                    } ${item.name} ${item.isAvailable ? "out of stock" : "in stock"}`}
                    style={{ transform: [{ scale: 0.85 }], marginRight: 2 }}
                  />
                  <Pressable
                    onPress={() => deleteItem(item)}
                    disabled={busyItemId === item._id}
                    className="ml-1 rounded-lg px-2 py-2"
                    style={{
                      backgroundColor: theme.dangerBg,
                      opacity: busyItemId === item._id ? 0.5 : 1,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: theme.danger }}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
                <Text
                  className="mt-0.5 text-[10px] font-bold"
                  style={{
                    color: item.isAvailable ? theme.primary : theme.muted,
                  }}
                >
                  {item.isAvailable ? "IN STOCK" : "OUT OF STOCK"}
                </Text>
              </View>
            </Card>
          ))}
          {visibleItems.length === 0 ? (
            <Text className="py-12 text-center" style={{ color: theme.muted }}>
              No items match the selected filters.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
