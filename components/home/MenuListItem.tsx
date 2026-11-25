import { memo, useCallback } from "react";

import type {
  CustomerCustomizationSelection,
  CustomerMenuItem,
} from "../../services/api/customer";
import FoodCard from "./FoodCard";

export type MenuCardItem = Omit<CustomerMenuItem, "price"> & {
  id: string;
  price: string;
  time: string;
  rating: string;
  offer: string;
  image: string;
  gallery: string[];
  isVeg: boolean;
  category: string;
};

interface MenuListItemProps {
  item: MenuCardItem;
  cartQuantity: number;
  onAddToCart: (
    item: MenuCardItem,
    quantity: number,
    addons: CustomerCustomizationSelection[],
    total: number,
  ) => unknown;
  onDecrement: (itemId: string) => unknown;
}

function MenuListItem({
  item,
  cartQuantity,
  onAddToCart,
  onDecrement,
}: MenuListItemProps) {
  const handleAddToCart = useCallback(
    (
      quantity: number,
      addons: CustomerCustomizationSelection[],
      total: number,
    ) => {
      void onAddToCart(item, quantity, addons, total);
    },
    [item, onAddToCart],
  );
  const handleDecrement = useCallback(() => {
    void onDecrement(item.id);
  }, [item.id, onDecrement]);

  return (
    <FoodCard
      item={item}
      cartQuantity={cartQuantity}
      onAddToCart={handleAddToCart}
      onDecrement={handleDecrement}
    />
  );
}

export default memo(MenuListItem);
