import { useRouter } from "expo-router";
import { ArrowLeft, Heart } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MenuListItem, {
  type MenuCardItem,
} from "../../components/home/MenuListItem";
import { ProfileAvatarButton } from "../../components/profile/ProfileAvatarButton";
import { useFavorites, useOrderMode } from "../../contexts/HomeContext";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const { favorites } = useFavorites();

  const {
    mode: orderMode,
    carts,
    menuItems,
    activeBranch,
    handleAddToCart,
    handleDecrementCartItem,
  } = useOrderMode();
  const activeCart = useMemo(
    () => carts[orderMode] || [],
    [carts, orderMode],
  );
  const activeBranchId = activeBranch?.id;

  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const favoriteItems = useMemo(
    () =>
      menuItems.filter((item: MenuCardItem) => {
        if (
          !favorites.includes(item.id) ||
          !item.isAvailable ||
          !activeBranchId
        ) {
          return false;
        }

        const itemBranchIds = item.branchIds || [];
        return itemBranchIds.length > 0
          ? itemBranchIds.includes(activeBranchId)
          : !item.branchId || item.branchId === activeBranchId;
      }),
    [activeBranchId, favorites, menuItems],
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
  const renderFavoriteItem = useCallback(
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
  const favoriteItemKeyExtractor = useCallback(
    (item: MenuCardItem) => item.id,
    [],
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row justify-between items-center px-4 py-3 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={28} color={theme.text} strokeWidth={2.5} />
          </Pressable>
          <Text className="text-3xl font-black" style={{ color: theme.text }}>
            Favorites
          </Text>
        </View>
        <View className="flex-row items-center">
          <ProfileAvatarButton />
        </View>
      </View>

      <FlatList
        data={favoriteItems}
        keyExtractor={favoriteItemKeyExtractor}
        renderItem={renderFavoriteItem}
        numColumns={2}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={16}
        windowSize={7}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{
          paddingBottom: activeCartTotalItems > 0 ? 180 : 120,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-6">
            <Heart
              size={64}
              color={theme.muted}
              strokeWidth={1.5}
              className="mb-4"
            />
            <Text
              className="text-xl font-black mb-2 text-center"
              style={{ color: theme.text }}
            >
              No favorites yet
            </Text>
            <Text
              className="text-sm font-semibold text-center"
              style={{ color: theme.muted }}
            >
              Tap the heart icon on any food item to save it here for later.
            </Text>
          </View>
        }
      />
    </View>
  );
}
