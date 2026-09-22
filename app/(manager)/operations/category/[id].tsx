import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function CategoryDetailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const category = MANAGER_MOCK_DATA.categories.find((c) => c.id === id) || {
    name: "Category Not Found",
    icon: "",
  };

  const [activeTab, setActiveTab] = useState<"items" | "upsells">("items");
  const [categoryItems, setCategoryItems] = useState<any[]>([]);
  const [crossSellItems, setCrossSellItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "inStock" | "outOfStock"
  >("all");

  useFocusEffect(
    useCallback(() => {
      // Load standard items for this category
      const items = MANAGER_MOCK_DATA.foodItems.filter(
        (item) => item.categoryId === id,
      );
      setCategoryItems(items);

      // Load cross-sell items associated with this category with explicit string typing
      const csList = MANAGER_MOCK_DATA.crossSellItems.find(
        (cs) => cs.triggerCategoryId === id,
      );
      if (csList && csList.items) {
        const mappedUpsells = csList.items
          .map((itemId: string) =>
            MANAGER_MOCK_DATA.foodItems.find((f) => f.id === itemId),
          )
          .filter(Boolean);
        setCrossSellItems(mappedUpsells);
      } else {
        setCrossSellItems([]);
      }
    }, [id]),
  );

  const toggleItemStock = (itemId: string) => {
    const itemIndex = MANAGER_MOCK_DATA.foodItems.findIndex(
      (i) => i.id === itemId,
    );
    if (itemIndex > -1) {
      MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable =
        !MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable;
    }
    setCategoryItems([
      ...MANAGER_MOCK_DATA.foodItems.filter((item) => item.categoryId === id),
    ]);
  };

  const handleCreateNewItem = () => {
    router.push(`/(manager)/operations/item/new?categoryId=${id}` as any);
  };

  const handleAddCrossSellItem = () => {
    router.push(
      `/(manager)/operations/item/new?categoryId=${id}&isUpsell=true` as any,
    );
  };

  const confirmDeleteItem = (
    itemId: string,
    itemName: string,
    isUpsell: boolean = false,
  ) => {
    Alert.alert(
      "Delete Menu Item",
      `Are you sure you want to delete "${itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (isUpsell) {
              const csListIndex = MANAGER_MOCK_DATA.crossSellItems.findIndex(
                (cs) => cs.triggerCategoryId === id,
              );
              if (csListIndex > -1) {
                MANAGER_MOCK_DATA.crossSellItems[csListIndex].items =
                  MANAGER_MOCK_DATA.crossSellItems[csListIndex].items.filter(
                    (i: string) => i !== itemId,
                  );
                setCrossSellItems([
                  ...MANAGER_MOCK_DATA.crossSellItems[csListIndex].items
                    .map((i: string) =>
                      MANAGER_MOCK_DATA.foodItems.find((f) => f.id === i),
                    )
                    .filter(Boolean),
                ]);
              }
            } else {
              MANAGER_MOCK_DATA.foodItems = MANAGER_MOCK_DATA.foodItems.filter(
                (item) => item.id !== itemId,
              );
              setCategoryItems([
                ...MANAGER_MOCK_DATA.foodItems.filter(
                  (item) => item.categoryId === id,
                ),
              ]);
            }
          },
        },
      ],
    );
  };

  // Filtered items based on search query and stock status
  const filteredItems = categoryItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (stockFilter === "inStock") return matchesSearch && item.isAvailable;
    if (stockFilter === "outOfStock") return matchesSearch && !item.isAvailable;
    return matchesSearch;
  });

  const filteredUpsells = crossSellItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (stockFilter === "inStock") return matchesSearch && item.isAvailable;
    if (stockFilter === "outOfStock") return matchesSearch && !item.isAvailable;
    return matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <View
        className="flex-row items-center px-6 pt-4 pb-4 border-b"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
          hitSlop={20}
        >
          <Text className="text-2xl" style={{ color: theme.text }}>
            ←
          </Text>
        </Pressable>
        {category.icon ? (
          <Text className="text-2xl mr-2">{category.icon}</Text>
        ) : null}
        <Text
          className="text-2xl font-bold flex-1"
          style={{ color: theme.text }}
          numberOfLines={1}
        >
          {category.name}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-sm mb-4 font-medium"
          style={{ color: theme.muted }}
        >
          Manage menu items and cross-sell recommendations for this category.
        </Text>

        {/* Tab Switcher */}
        <View
          className="flex-row rounded-2xl p-1 mb-4"
          style={{ backgroundColor: theme.card || theme.border }}
        >
          <Pressable
            onPress={() => {
              setActiveTab("items");
              setSearchQuery("");
            }}
            className="flex-1 py-3 rounded-xl items-center"
            style={{
              backgroundColor:
                activeTab === "items" ? theme.primary : "transparent",
            }}
          >
            <Text
              className="text-sm font-bold"
              style={{
                color: activeTab === "items" ? "#ffffff" : theme.text,
              }}
            >
              Menu Items ({categoryItems.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTab("upsells");
              setSearchQuery("");
            }}
            className="flex-1 py-3 rounded-xl items-center"
            style={{
              backgroundColor:
                activeTab === "upsells" ? theme.primary : "transparent",
            }}
          >
            <Text
              className="text-sm font-bold"
              style={{
                color: activeTab === "upsells" ? "#ffffff" : theme.text,
              }}
            >
              Cross-Sell Upsells ({crossSellItems.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <TextInput
          placeholder={
            activeTab === "items" ? "Search items..." : "Search cross-sells..."
          }
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="px-4 rounded-2xl mb-3 font-semibold"
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

        {/* Stock Filter Chips */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            onPress={() => setStockFilter("all")}
            className="px-4 py-2 rounded-xl"
            style={{
              backgroundColor:
                stockFilter === "all"
                  ? theme.primary
                  : theme.card || theme.border,
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: stockFilter === "all" ? "#ffffff" : theme.text }}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStockFilter("inStock")}
            className="px-4 py-2 rounded-xl"
            style={{
              backgroundColor:
                stockFilter === "inStock"
                  ? theme.primary
                  : theme.card || theme.border,
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{
                color: stockFilter === "inStock" ? "#ffffff" : theme.text,
              }}
            >
              In Stock
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStockFilter("outOfStock")}
            className="px-4 py-2 rounded-xl"
            style={{
              backgroundColor:
                stockFilter === "outOfStock"
                  ? theme.danger
                  : theme.card || theme.border,
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{
                color: stockFilter === "outOfStock" ? "#ffffff" : theme.text,
              }}
            >
              Out of Stock
            </Text>
          </Pressable>
        </View>

        {/* Action Button */}
        {activeTab === "items" ? (
          <Pressable
            onPress={handleCreateNewItem}
            className="mb-6 p-4 rounded-2xl items-center border-2 border-dashed"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              + Add New Menu Item
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleAddCrossSellItem}
            className="mb-6 p-4 rounded-2xl items-center border-2 border-dashed"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              + Add New Menu Item
            </Text>
          </Pressable>
        )}

        {/* Tab Content Display */}
        {activeTab === "items" ? (
          filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const hasOffer =
                item.offerPrice !== undefined && item.offerPrice < item.price;

              return (
                <Card
                  key={item.id}
                  variant="default"
                  className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
                >
                  <View className="flex-1 mr-3 justify-center py-1">
                    <Text
                      className="text-base font-bold mb-1"
                      style={{ color: theme.text }}
                    >
                      {item.name}
                    </Text>

                    <View className="flex-row items-center gap-2 mb-2">
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
                    </View>

                    <View className="flex-row items-center mt-1">
                      <Pressable
                        onPress={() =>
                          router.push(
                            `/(manager)/operations/item/${item.id}` as any,
                          )
                        }
                        className="mr-4"
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          confirmDeleteItem(item.id, item.name, false)
                        }
                      >
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.danger }}
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="items-end w-30">
                    <Switch
                      value={item.isAvailable}
                      onValueChange={() => toggleItemStock(item.id)}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      ios_backgroundColor={theme.border}
                      thumbColor={"#ffffff"}
                    />
                    <Text
                      className="text-[8px] font-bold uppercase mt-1 text-center"
                      style={{
                        color: item.isAvailable ? theme.primary : theme.danger,
                      }}
                      numberOfLines={1}
                    >
                      {item.isAvailable ? "In Stock" : "Out Of Stock"}
                    </Text>
                  </View>
                </Card>
              );
            })
          ) : (
            <View
              className="p-6 rounded-2xl border border-dashed items-center mt-4"
              style={{ borderColor: theme.border }}
            >
              <Text
                className="text-sm italic text-center"
                style={{ color: theme.muted }}
              >
                {categoryItems.length === 0
                  ? "No menu items found in this category."
                  : "No matching items found."}
              </Text>
            </View>
          )
        ) : filteredUpsells.length > 0 ? (
          filteredUpsells.map((item) => {
            const hasOffer =
              item.offerPrice !== undefined && item.offerPrice < item.price;

            return (
              <Card
                key={item.id}
                variant="default"
                className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-3 justify-center py-1">
                  <Text
                    className="text-base font-bold mb-1"
                    style={{ color: theme.text }}
                  >
                    {item.name}
                  </Text>

                  <View className="flex-row items-center gap-2 mb-2">
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
                  </View>

                  <View className="flex-row items-center mt-1">
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/(manager)/operations/item/${item.id}` as any,
                        )
                      }
                      className="mr-4"
                    >
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.primary }}
                      >
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        confirmDeleteItem(item.id, item.name, true)
                      }
                    >
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.danger }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View className="items-end w-30">
                  <Switch
                    value={item.isAvailable}
                    onValueChange={() => toggleItemStock(item.id)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    ios_backgroundColor={theme.border}
                    thumbColor={"#ffffff"}
                  />
                  <Text
                    className="text-[8px] font-bold uppercase mt-1 text-center"
                    style={{
                      color: item.isAvailable ? theme.primary : theme.danger,
                    }}
                    numberOfLines={1}
                  >
                    {item.isAvailable ? "In Stock" : "Out Of Stock"}
                  </Text>
                </View>
              </Card>
            );
          })
        ) : (
          <View
            className="p-6 rounded-2xl border border-dashed items-center mt-4"
            style={{ borderColor: theme.border }}
          >
            <Text
              className="text-sm italic text-center"
              style={{ color: theme.muted }}
            >
              {crossSellItems.length === 0
                ? "No cross-sell items configured for this category yet."
                : "No matching cross-sell items found."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
