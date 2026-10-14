import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCartModal } from "../../components/home/DeliveryCartModal";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { useOrderMode } from "./_layout";

function getEntityId(value: any): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  return value._id || value.id || null;
}

export default function DeliveryCartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const {
    mode,
    activeCart,
    reloadCart,
    activeAddress,
    setActiveAddress,
    activeBranch,
    setActiveBranch,
    addresses,
    branches,
    offers,
    menuItems,
    cartLoaded,
    cartPricing,
    handleAddToCart,
    handleDecrementCartItem,
    handleRemoveCartItems,
    applyCartCoupon,
    removeCartCoupon,
    previewCheckout,
    createCustomerOrder,
  } = useOrderMode();
  const isOrderPlaced = useRef(false);
  const [crossSellItems, setCrossSellItems] = useState<any[]>([]);
  const categoryIds = useMemo<string[]>(() => {
    const ids = activeCart.flatMap((cartItem: any) => {
      const menuItem = menuItems.find(
        (item: any) => item.id === cartItem.id,
      );
      const categoryId = getEntityId(
        menuItem?.categoryId ?? cartItem.categoryId,
      );
      return categoryId ? [categoryId] : [];
    });
    return [...new Set<string>(ids)].sort();
  }, [activeCart, menuItems]);
  const categoryKey = categoryIds.join("|");

  useEffect(() => {
    if (!isOrderPlaced.current && cartLoaded && activeCart.length === 0) {
      router.back();
    }
  }, [activeCart.length, cartLoaded, router]);

  const handleOrderPlaced = async () => {
    isOrderPlaced.current = true;
    try {
      await api.clearCart();
      await reloadCart(activeBranch?.id);
    } catch (error) {
      Alert.alert(
        "Order Placed",
        `Your order was saved, but the cart could not be refreshed. ${
          error instanceof Error ? error.message : "Please refresh the app."
        }`,
      );
    } finally {
      router.replace("/orders");
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (categoryIds.length === 0) return;

    void Promise.allSettled(
      categoryIds.map(async (categoryId) => ({
        categoryId,
        items: await api.getCategoryCrossSells(categoryId),
      })),
    ).then((results) => {
      if (cancelled) return;

      const failures = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [
              `${categoryIds[index]}: ${
                result.reason instanceof Error
                  ? result.reason.message
                  : "Unable to load cross-sell items."
              }`,
            ]
          : [],
      );
      const recommendations = new Map<string, any>();
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const entry of result.value.items) {
          const reference =
            entry.menuItem || entry.item || entry.menuItemId || entry;
          const itemId = getEntityId(reference);
          if (!itemId) continue;
          const referencedItem =
            typeof reference === "object" && "name" in reference
              ? reference
              : null;
          const menuItem =
            referencedItem ||
            menuItems.find((item: any) => item.id === itemId);
          if (!menuItem || menuItem.isAvailable === false) continue;

          const crossSellItem = {
            ...menuItem,
            id: itemId,
            price:
              typeof menuItem.price === "number"
                ? `₹${menuItem.price}`
                : menuItem.price,
            image:
              menuItem.image ||
              menuItem.imageUrl ||
              menuItem.imageUrls?.[0] ||
              "",
            isVeg:
              menuItem.isVeg ??
              menuItem.foodType?.toLowerCase() === "veg",
          };

          const current = recommendations.get(itemId) || {
            ...crossSellItem,
            sourceCategoryIds: [],
          };
          current.sourceCategoryIds = [
            ...new Set([...current.sourceCategoryIds, result.value.categoryId]),
          ];
          recommendations.set(itemId, current);
        }
      }
      setCrossSellItems([...recommendations.values()]);
      if (failures.length > 0) {
        Alert.alert("Unable to Load Some Recommendations", failures.join("\n"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [categoryKey, categoryIds, menuItems]);

  const relevantCrossSellItems = useMemo(
    () =>
      crossSellItems.filter((item) =>
        item.sourceCategoryIds.some((id: string) => categoryIds.includes(id)),
      ),
    [categoryIds, crossSellItems],
  );

  return (
    <DeliveryCartModal
      onClose={() => router.back()}
      cart={activeCart}
      onIncrement={handleAddToCart}
      onDecrement={handleDecrementCartItem}
      theme={theme}
      insets={insets}
      activeAddress={mode === "Delivery" ? activeAddress : activeBranch}
      setActiveAddress={
        mode === "Delivery" ? setActiveAddress : setActiveBranch
      }
      orderMode={mode}
      activeBranch={activeBranch}
      addresses={addresses}
      branches={branches}
      offers={offers}
      crossSellItems={relevantCrossSellItems}
      onRemoveCartItems={handleRemoveCartItems}
      cartPricing={cartPricing}
      onApplyCoupon={applyCartCoupon}
      onRemoveCoupon={removeCartCoupon}
      onCheckout={previewCheckout}
      onCreateOrder={createCustomerOrder}
      onOrderPlaced={handleOrderPlaced}
    />
  );
}
