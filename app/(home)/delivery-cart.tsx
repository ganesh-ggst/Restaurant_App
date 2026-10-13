import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DeliveryCartModal } from "../../components/home/DeliveryCartModal";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useOrderMode } from "./_layout";

export default function DeliveryCartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const {
    mode,
    activeCart,
    activeAddress,
    setActiveAddress,
    activeBranch,
    setActiveBranch,
    addresses,
    branches,
    offers,
    menuItems,
    cartPricing,
    handleAddToCart,
    handleDecrementCartItem,
    applyCartCoupon,
    removeCartCoupon,
    previewCheckout,
  } = useOrderMode();

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
      crossSellItems={menuItems.filter(
        (item: any) => !activeCart.some((cartItem: any) => cartItem.id === item.id),
      )}
      cartPricing={cartPricing}
      onApplyCoupon={applyCartCoupon}
      onRemoveCoupon={removeCartCoupon}
      onCheckout={previewCheckout}
    />
  );
}
