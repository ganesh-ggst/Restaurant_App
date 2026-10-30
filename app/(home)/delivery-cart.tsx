import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCartModal } from "../../components/home/DeliveryCartModal";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import type { DeliverySpeed } from "../../services/api/customer";
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
    deliveryOptionByBranch,
    handleAddToCart,
    handleDecrementCartItem,
    handleRemoveCartItems,
    applyCartCoupon,
    removeCartCoupon,
    previewCheckout,
    createCustomerOrder,
  } = useOrderMode();
  const isOrderPlaced = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [crossSellItems, setCrossSellItems] = useState<any[]>([]);
  const [knownCrossSellItems, setKnownCrossSellItems] = useState<any[]>([]);
  const categoryIds = useMemo<string[]>(() => {
    const crossSellIds = new Set(knownCrossSellItems.map((item) => item.id));
    const ids = activeCart.flatMap((cartItem: any) => {
      if (crossSellIds.has(cartItem.id)) return [];
      const menuItem = menuItems.find((item: any) => item.id === cartItem.id);
      const categoryId = getEntityId(
        menuItem?.categoryId ?? cartItem.categoryId,
      );
      return categoryId ? [categoryId] : [];
    });
    return [...new Set<string>(ids)].sort();
  }, [activeCart, knownCrossSellItems, menuItems]);
  const categoryKey = categoryIds.join("|");

  useEffect(() => {
    if (!isOrderPlaced.current && cartLoaded && activeCart.length === 0) {
      router.back();
    }
  }, [activeCart.length, cartLoaded, router]);

  const handleOrderPlaced = async (paymentResult?: "success" | "rejected") => {
    isOrderPlaced.current = true;
    try {
      if (!activeBranch?.id) {
        throw new Error("Choose a restaurant branch before clearing your cart.");
      }
      if (!activeAddress?.id) {
        throw new Error("Choose a delivery address before clearing your cart.");
      }
      await api.clearCart({
        branchId: activeBranch.id,
        addressId: activeAddress.id,
        fulfillmentType: "delivery",
      });
      await reloadCart(activeBranch?.id);
    } catch (error) {
      Alert.alert(
        "Order Placed",
        `Your order was saved, but the cart could not be refreshed. ${
          error instanceof Error ? error.message : "Please refresh the app."
        }`,
      );
    } finally {
      router.replace(
        paymentResult === "rejected" ? "/orders?tab=past" : "/orders",
      );
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await reloadCart(activeBranch?.id);
    } catch (error) {
      Alert.alert(
        "Unable to Refresh Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCart = async () => {
    if (!activeBranch?.id) {
      throw new Error("Choose a restaurant branch before clearing your cart.");
    }
    if (!activeAddress?.id) {
      throw new Error("Choose a delivery address before clearing your cart.");
    }
    await api.clearCart({
      branchId: activeBranch.id,
      addressId: activeAddress.id,
      fulfillmentType: "delivery",
    });
    await reloadCart(activeBranch.id);
  };

  const handleSelectDeliveryOption = async (
    deliverySpeed: DeliverySpeed | null,
  ) => {
    if (!activeBranch?.id) return;
    if (!deliverySpeed) {
      Alert.alert(
        "Unable to Update Delivery Option",
        "This delivery option is not mapped to a supported speed. Choose Eco Saver, Standard, or Express.",
      );
      return;
    }
    try {
      await api.updateCartDeliveryOption(deliverySpeed, activeBranch.id);
      await reloadCart(activeBranch.id);
    } catch (error) {
      Alert.alert(
        "Unable to Update Delivery Option",
        error instanceof Error ? error.message : "Please try again.",
      );
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
            referencedItem || menuItems.find((item: any) => item.id === itemId);
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
            isVeg: menuItem.isVeg ?? menuItem.foodType?.toLowerCase() === "veg",
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
      const loadedRecommendations = [...recommendations.values()];
      setCrossSellItems(loadedRecommendations);
      setKnownCrossSellItems((previous) => {
        const itemsById = new Map(previous.map((item) => [item.id, item]));
        for (const item of loadedRecommendations) {
          itemsById.set(item.id, item);
        }
        return [...itemsById.values()];
      });
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
  const restaurantName =
    activeBranch?.restaurantNames?.find(
      (restaurant: { name: string; isActive: boolean }) =>
        restaurant.isActive && restaurant.name.trim().length > 0,
    )?.name ||
    activeBranch?.name ||
    "Restaurant";
  const displayCart = useMemo(
    () =>
      activeCart.map((cartItem: any) => {
        const recommendation = knownCrossSellItems.find(
          (item) => item.id === cartItem.id,
        );
        if (!recommendation || cartItem.name !== "Menu item") return cartItem;

        const recommendationPrice =
          typeof recommendation.price === "number"
            ? recommendation.price
            : Number(String(recommendation.price).replace(/[^\d.]/g, "")) || 0;
        const cartPrice =
          typeof cartItem.price === "number"
            ? cartItem.price
            : Number(String(cartItem.price).replace(/[^\d.]/g, "")) || 0;

        return {
          ...recommendation,
          ...cartItem,
          name: recommendation.name,
          image: cartItem.image || recommendation.image,
          price: cartPrice > 0 ? cartItem.price : recommendation.price,
          total:
            cartItem.total > 0
              ? cartItem.total
              : recommendationPrice * cartItem.quantity,
          isVeg: recommendation.isVeg,
        };
      }),
    [activeCart, knownCrossSellItems],
  );

  return (
    <DeliveryCartModal
      onClose={() => router.back()}
      cart={displayCart}
      restaurantName={restaurantName}
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
      selectedDeliveryOptionId={
        activeBranch?.id ? deliveryOptionByBranch[activeBranch.id] : undefined
      }
      onSelectDeliveryOption={handleSelectDeliveryOption}
      crossSellItems={relevantCrossSellItems}
      onRemoveCartItems={handleRemoveCartItems}
      onClearCart={handleClearCart}
      cartPricing={cartPricing}
      onApplyCoupon={applyCartCoupon}
      onRemoveCoupon={removeCartCoupon}
      onCheckout={previewCheckout}
      onCreateOrder={createCustomerOrder}
      onOrderPlaced={handleOrderPlaced}
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
    />
  );
}
