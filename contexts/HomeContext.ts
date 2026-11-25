import { createContext, useContext } from "react";

export const OrderContext = createContext<any>(null);
export const FavoritesContext = createContext<any>(null);

export function useOrderMode() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderMode must be used within the HomeLayout provider.");
  }
  return context;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within the HomeLayout provider.");
  }
  return context;
}
