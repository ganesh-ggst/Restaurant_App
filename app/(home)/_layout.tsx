import { BlurView } from "expo-blur";
import { Stack, usePathname, useRouter } from "expo-router";
import {
  CheckCircle2,
  Compass,
  Home,
  Minus,
  Plus,
  ScrollText,
  Tag,
  Timer,
  X,
  XCircle,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AppState,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ViewCartButton from "../../components/home/ViewCartButton";
import {
  CATEGORIES as CATEGORY_PRESENTATION,
} from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { authApi } from "../../services/api/auth";
import type {
  CustomerBranch,
  CustomerCart,
  CustomerCartItem,
  CustomerCategory,
  CustomerCustomizationSelection,
  CustomerFeaturedReel,
  CustomerMenuItem,
  CustomerOffer,
} from "../../services/api/customer";
import type { CustomerAddress } from "../../services/api/profile";

export const OrderContext = createContext<any>(null);
export function useOrderMode() {
  return useContext(OrderContext);
}

export const FavoritesContext = createContext<any>(null);
export function useFavorites() {
  return useContext(FavoritesContext);
}

const { width } = Dimensions.get("window");
const MARGIN = 20;
const TAB_BAR_WIDTH = width - MARGIN * 2;
const TAB_BAR_HEIGHT = 72;
const MIN_TAB_BAR_BOTTOM = 16;

const getNumericPrice = (price: any) => {
  if (typeof price === "number") return price;
  return parseInt(String(price).replace(/\D/g, ""), 10) || 0;
};

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

function toMenuCardItem(
  item: CustomerMenuItem,
  categories: CustomerCategory[],
) {
  const categoryId =
    typeof item.categoryId === "string" ? item.categoryId : item.categoryId._id;
  const categoryName =
    categories.find((category) => category._id === categoryId)?.name ||
    (typeof item.categoryId === "object" ? item.categoryId.name : undefined) ||
    "";
  const imageUrls = item.imageUrls?.filter(Boolean) || [];
  const marketingTag =
    item.discountLabel ||
    (item.marketingTag && item.marketingTag !== "none"
      ? item.marketingTag.toUpperCase()
      : "");

  return {
    ...item,
    id: item._id,
    price: `₹${item.price}`,
    time: `${item.prepTimeMinutes ?? 0} mins`,
    rating:
      item.ratingAverage && item.ratingAverage > 0
        ? item.ratingAverage.toFixed(1)
        : "New",
    offer: marketingTag,
    image: item.imageUrl || imageUrls[0] || "",
    gallery: imageUrls.length > 0 ? imageUrls : [item.imageUrl || ""],
    isVeg: item.foodType?.toLowerCase() === "veg",
    category: categoryName,
  };
}

function toCartCardItems(
  cart: CustomerCart,
  menuItems: ReturnType<typeof toMenuCardItem>[],
) {
  return cart.items.map((cartItem: CustomerCartItem) => {
    const menuItemId =
      typeof cartItem.menuItemId === "string"
        ? cartItem.menuItemId
        : cartItem.menuItemId._id;
    const menuItem = menuItems.find((item) => item.id === menuItemId);

    return {
      ...(menuItem || {}),
      id: menuItemId,
      cartItemId: cartItem._id,
      name: cartItem.name || menuItem?.name || "Menu item",
      image: cartItem.imageUrl || menuItem?.image || "",
      price: `₹${cartItem.unitPrice ?? menuItem?.price ?? 0}`,
      quantity: cartItem.quantity,
      total: cartItem.itemTotal,
      addons: cartItem.selectedCustomizations || [],
      isVeg: menuItem?.isVeg ?? false,
    };
  });
}

function getFavoriteIds(favorites: unknown[]): string[] {
  return favorites.flatMap((favorite) => {
    if (typeof favorite === "string") return [favorite];
    if (!favorite || typeof favorite !== "object") return [];

    const record = favorite as {
      _id?: string;
      menuItemId?: string | { _id?: string };
    };
    const id =
      typeof record.menuItemId === "string"
        ? record.menuItemId
        : record.menuItemId?._id || record._id;
    return id ? [id] : [];
  });
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
  bottomInset,
}: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const activeColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
  const inactiveColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const borderColor = isDark
    ? "hsla(149, 16%, 24%, 0.6)"
    : "hsla(141, 47%, 83%, 0.8)";

  const barBg =
    Platform.OS === "android"
      ? isDark
        ? "hsla(150, 31%, 9%, 0.95)"
        : "hsla(138, 47%, 97%, 0.95)"
      : isDark
        ? "hsla(149, 27%, 12%, 0.25)"
        : "hsla(0, 0%, 100%, 0.25)";

  const pillBg = isDark
    ? "hsla(149, 24%, 19%, 0.75)"
    : "hsla(143, 61%, 91%, 0.85)";

  const visibleRoutes = state.routes.filter(
    (route: any) =>
      route.name !== "profile" &&
      route.name !== "favorites",
  );

  const TAB_WIDTH = TAB_BAR_WIDTH / visibleRoutes.length;

  const currentVisibleIndex = visibleRoutes.findIndex(
    (route: any) => route.key === state.routes[state.index]?.key,
  );

  const animatedStyle = useAnimatedStyle(() => {
    const targetIndex = currentVisibleIndex >= 0 ? currentVisibleIndex : 0;
    return {
      transform: [
        {
          translateX: withSpring(targetIndex * TAB_WIDTH, {
            damping: 16,
            stiffness: 150,
            mass: 0.6,
          }),
        },
      ],
      opacity: withSpring(currentVisibleIndex >= 0 ? 1 : 0),
    };
  }, [currentVisibleIndex, TAB_WIDTH]);

  return (
    <View style={[styles.container, { bottom: bottomInset }]}>
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: barBg,
            borderColor: borderColor,
            borderWidth: 1,
          },
        ]}
      >
        {Platform.OS === "ios" && (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={20}
            style={StyleSheet.absoluteFill}
          />
        )}

        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: TAB_WIDTH - 24,
              backgroundColor: pillBg,
              borderColor: isDark
                ? "hsla(149, 16%, 24%, 0.5)"
                : "hsla(141, 47%, 83%, 0.6)",
              borderWidth: 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
            },
            animatedStyle,
          ]}
        />

        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;
            const isFocused = currentVisibleIndex === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (route.name === "search") {
                  navigation.navigate(route.name, { category: undefined });
                } else if (route.name === "offers") {
                  navigation.navigate(route.name, { offerId: undefined });
                } else {
                  navigation.navigate(route.name, route.params);
                }
              }
            };

            let IconComponent = Home;
            if (route.name === "offers") IconComponent = Tag;
            if (route.name === "search") IconComponent = Compass;
            if (route.name === "orders") IconComponent = ScrollText;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={[styles.tabItem, { width: TAB_WIDTH }]}
              >
                <IconComponent
                  size={24}
                  color={isFocused ? activeColor : inactiveColor}
                  strokeWidth={isFocused ? 2.5 : 2}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={{
                    color: isFocused ? activeColor : inactiveColor,
                    fontSize: 10,
                    fontWeight: isFocused ? "900" : "800",
                    letterSpacing: 0.3,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: MARGIN,
    right: MARGIN,
    height: TAB_BAR_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  tabContainer: {
    flex: 1,
    borderRadius: 36,
    overflow: "hidden",
  },
  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  slidingPill: {
    position: "absolute",
    height: 56,
    top: 7,
    left: 12,
    borderRadius: 28,
  },
  tabItem: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});

export default function HomeLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const isDeliveryCartScreen = pathname.endsWith("/delivery-cart");
  const tabBarBottom = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  const [mode, setMode] = useState("Delivery");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<ReturnType<typeof toMenuCardItem>[]>(
    [],
  );
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const [categories, setCategories] = useState<
    (CustomerCategory & {
      id: string;
      displayIcon: (typeof CATEGORY_PRESENTATION)[number]["icon"];
    })[]
  >([]);
  const [offers, setOffers] = useState<(CustomerOffer & {
    id: string;
    subtitle: string;
    image: string;
  })[]>([]);
  const [featuredReels, setFeaturedReels] = useState<CustomerFeaturedReel[]>([]);
  const [branches, setBranches] = useState<
    (CustomerBranch & { id: string; address: string })[]
  >([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [addresses, setAddresses] = useState<
    (CustomerAddress & { id: string; type: string; address: string })[]
  >([]);
  const [cartPricing, setCartPricing] = useState<CustomerCart["pricing"]>();
  const [cartBranchId, setCartBranchId] = useState<string | null>(null);

  const [carts, setCarts] = useState<{ [key: string]: any[] }>({
    Delivery: [],
    "Dine-in": [],
    Takeaway: [],
  });
  const [deliveryCartsByBranch, setDeliveryCartsByBranch] = useState<
    Record<string, any[]>
  >({});
  const [activeAddress, setActiveAddress] = useState<
    (CustomerAddress & { id: string; type: string; address: string }) | null
  >(null);
  const [activeBranch, setActiveBranch] = useState<
    (CustomerBranch & { id: string; address: string }) | null
  >(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);

  const [dineInCartState, setDineInCartState] = useState<
    "idle" | "waiting" | "approved" | "rejected"
  >("idle");
  const [orderCountdown, setOrderCountdown] = useState(60);
  const [pendingOrderSnapshot, setPendingOrderSnapshot] = useState<any[]>([]);
  const [showDineInCartModal, setShowDineInCartModal] = useState(false);

  const activeCart =
    mode === "Delivery" && activeBranch
      ? deliveryCartsByBranch[activeBranch.id] || []
      : carts[mode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const activeCartSubtotal = activeCart.reduce(
    (sum: number, item: any) =>
      sum + (item.total || getNumericPrice(item.price) * item.quantity),
    0,
  );

  const loadUserData = useCallback(async () => {
    const [
      menuResult,
      categoryResult,
      branchResult,
      offerResult,
      reelResult,
    ] = await Promise.allSettled([
      api.getMenuItems("all", activeBranch?.id),
      api.getCategories(),
      api.getBranches(),
      api.getOffers(),
      api.getFeaturedReels(),
    ]);

    const menuCardItems =
      menuResult.status === "fulfilled"
        ? menuResult.value.map((item) =>
            toMenuCardItem(
              item,
              categoryResult.status === "fulfilled" ? categoryResult.value : [],
            ),
          )
        : [];

    if (menuResult.status === "fulfilled") {
      setMenuItems(menuCardItems);
    } else {
      Alert.alert("Unable to Load Menu", menuResult.reason.message);
    }

    if (categoryResult.status === "fulfilled") {
      const iconForCategory = (name: string) =>
        CATEGORY_PRESENTATION.find(
          (category) => category.name.toLowerCase() === name.toLowerCase(),
        )?.icon || CATEGORY_PRESENTATION[0].icon;
      setCategories(
        categoryResult.value
          .filter((category) => category.isActive)
          .sort((first, second) => (first.sortOrder || 0) - (second.sortOrder || 0))
          .map((category) => ({
            ...category,
            id: category._id,
            displayIcon: iconForCategory(category.name),
          })),
      );
    } else {
      Alert.alert("Unable to Load Categories", categoryResult.reason.message);
    }

    if (branchResult.status === "fulfilled") {
      const activeBranches = branchResult.value.filter((branch) => branch.isActive);
      const branchOptions = activeBranches.map((branch) => {
        const activeName = branch.restaurantNames?.find(
          (option) => option.isActive,
        )?.name;
        const activeAddress = branch.storeAddresses?.find(
          (option) => option.isActive,
        )?.address;
        return {
          ...branch,
          id: branch._id,
          name: activeName || branch.name,
          address: activeAddress || branch.address || branch.city || "",
        };
      });
      const menuBranchIds = new Set(
        menuCardItems
          .filter((item) => item.isAvailable === true)
          .flatMap((item) => [
            ...(item.branchIds || []),
            ...(item.branchId ? [item.branchId] : []),
          ]),
      );
      const defaultBranch =
        branchOptions.find((branch) => menuBranchIds.has(branch.id)) ||
        branchOptions[0] ||
        null;
      setBranches(branchOptions);
      setActiveBranch(
        (current) =>
          branchOptions.find((branch) => branch.id === current?.id) ||
          defaultBranch,
      );
      setBranchesLoaded(true);
    } else {
      Alert.alert("Unable to Load Branches", branchResult.reason.message);
    }

    if (offerResult.status === "fulfilled") {
      setOffers(
        offerResult.value
          .filter((offer) => offer.isActive)
          .map((offer) => ({
            ...offer,
            id: offer.id || offer._id || "",
            subtitle: offer.description || "",
            image: offer.imageUrl || "",
          })),
      );
    } else {
      Alert.alert("Unable to Load Offers", offerResult.reason.message);
    }

    if (reelResult.status === "fulfilled") {
      setFeaturedReels(
        reelResult.value
          .filter((reel) => reel.isActive)
          .sort(
            (first, second) =>
              (first.displayOrder || 0) - (second.displayOrder || 0),
          ),
      );
    } else {
      Alert.alert("Unable to Load Featured Content", reelResult.reason.message);
    }

    try {
      const token = await authApi.getAccessToken();
      if (!token) return;

      const [favoriteResult, cartResult, addressResult] =
        await Promise.allSettled([
          api.getFavorites(),
          api.getCart(),
          api.getAddresses(),
        ]);

      if (favoriteResult.status === "fulfilled") {
        setFavorites(getFavoriteIds(favoriteResult.value));
      } else {
        Alert.alert("Unable to Load Favorites", favoriteResult.reason.message);
      }

      if (cartResult.status === "fulfilled") {
        const cartItems = toCartCardItems(cartResult.value, menuCardItems);
        setCarts({
          Delivery: cartItems,
          "Dine-in": cartItems,
          Takeaway: cartItems,
        });
        if (cartResult.value.branchId) {
          setDeliveryCartsByBranch((previous) => ({
            ...previous,
            [cartResult.value.branchId!]: cartItems,
          }));
        }
        setCartBranchId(cartResult.value.branchId || null);
        setCartPricing(cartResult.value.pricing);
      } else {
        Alert.alert("Unable to Load Cart", cartResult.reason.message);
      }

      if (addressResult.status === "fulfilled") {
        const addressOptions = addressResult.value.map((address) => ({
          ...address,
          id: address._id,
          type: address.label,
          address: [
            address.line1,
            address.line2,
            address.landmark,
            address.city,
            address.state,
            address.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        }));
        setAddresses(addressOptions);
        setActiveAddress(
          addressOptions.find((address) => address.isDefault) ||
            addressOptions[0] ||
            null,
        );
      } else {
        Alert.alert("Unable to Load Addresses", addressResult.reason.message);
      }
    } catch (error) {
      Alert.alert(
        "Unable to Load Account Data",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [activeBranch?.id]);

  const refreshHomeData = useCallback(async () => {
    setIsRefreshingHome(true);
    try {
      await loadUserData();
    } finally {
      setIsRefreshingHome(false);
    }
  }, [loadUserData]);

  useEffect(() => {
    void loadUserData();
  }, [loadUserData]);

  const reloadCart = useCallback(async (expectedBranchId?: string) => {
    const cart = await api.getCart();
    const cartItems = toCartCardItems(cart, menuItems);
    const branchId = cart.branchId || expectedBranchId;
    setCarts({
      Delivery: cartItems,
      "Dine-in": cartItems,
      Takeaway: cartItems,
    });
    if (branchId) {
      setDeliveryCartsByBranch((previous) => ({
        ...previous,
        [branchId]: cartItems,
      }));
    }
    setCartBranchId(cart.branchId || null);
    setCartPricing(cart.pricing);
  }, [menuItems]);

  useEffect(() => {
    let isMounted = true;
    let isRefreshing = false;

    const refreshCart = async () => {
      if (!isMounted || AppState.currentState !== "active" || isRefreshing) {
        return;
      }

      isRefreshing = true;
      try {
        const token = await authApi.getAccessToken();
        if (token && isMounted) {
          await reloadCart(activeBranch?.id);
        }
      } catch (error) {
        console.error(
          "Unable to refresh cart",
          error instanceof Error ? error.message : error,
        );
      } finally {
        isRefreshing = false;
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") void refreshCart();
      },
    );
    const interval = setInterval(() => void refreshCart(), 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [activeBranch?.id, reloadCart]);

  const replaceServerCart = async (branchId: string, items: any[]) => {
    await api.clearCart();
    for (const item of items) {
      await api.addCartItem({
        menuItemId: String(item.id),
        quantity: item.quantity,
        selectedCustomizations: item.addons || [],
        branchId,
      });
    }
  };

  const selectActiveBranch = async (
    branch: CustomerBranch & { id: string; address: string },
  ) => {
    if (mode !== "Delivery" || !cartBranchId || cartBranchId === branch.id) {
      setActiveBranch(branch);
      return;
    }

    const targetCart = deliveryCartsByBranch[branch.id] || [];
    try {
      await replaceServerCart(branch.id, targetCart);
      await reloadCart(branch.id);
      setActiveBranch(branch);
    } catch (error) {
      try {
        const previousCart = deliveryCartsByBranch[cartBranchId] || [];
        await replaceServerCart(cartBranchId, previousCart);
        await reloadCart(cartBranchId);
        setDeliveryCartsByBranch((previous) => ({
          ...previous,
          [branch.id]: targetCart,
        }));
      } catch (restoreError) {
        Alert.alert(
          "Unable to Switch Branch Cart",
          `${error instanceof Error ? error.message : "Please try again."}\n\nThe previous cart could not be restored: ${restoreError instanceof Error ? restoreError.message : "Please try again."}`,
        );
        return;
      }
      Alert.alert(
        "Unable to Switch Branch Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const applyCartCoupon = async (code: string) => {
    await api.applyCartCoupon(code);
    await reloadCart(activeBranch?.id);
  };

  const removeCartCoupon = async () => {
    await api.removeCartCoupon();
    await reloadCart(activeBranch?.id);
  };

  const previewCheckout = async (offerCode?: string) => {
    const addressId = mode === "Delivery" ? activeAddress?.id : undefined;
    if (!activeBranch?.id) {
      throw new Error("Choose a restaurant branch before checkout.");
    }
    if (mode === "Delivery" && !addressId) {
      throw new Error("Choose a delivery address before checkout.");
    }
    return api.previewCheckout({
      branchId: activeBranch.id,
      fulfillmentType:
        mode === "Dine-in" ? "dine-in" : mode.toLowerCase() as "delivery" | "takeaway",
      ...(addressId ? { addressId } : {}),
      ...(offerCode ? { offerCode } : {}),
    });
  };

  const toggleFavorite = async (id: string) => {
    try {
      if (favorites.includes(id)) {
        await api.removeFavorite(id);
        setFavorites((previous) => previous.filter((favorite) => favorite !== id));
      } else {
        await api.addFavorite(id);
        setFavorites((previous) =>
          previous.includes(id) ? previous : [...previous, id],
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to Update Favorites",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleAddToCart = async (
    item: any,
    quantity: number,
    addons: CustomerCustomizationSelection[],
    totalAmount: number,
  ) => {
    const menuItemId = item?._id || item?.id;
    const branchId = activeBranch?.id;
    const existing = activeCart.find((cartItem) => cartItem.id === menuItemId);
    const cartItemId = existing?.cartItemId;

    try {
      if (quantity < 0) {
        if (!existing || !cartItemId) {
          throw new Error("This cart item is no longer available. Refresh the cart.");
        }
        const updatedQuantity = existing.quantity + quantity;
        if (updatedQuantity <= 0) {
          await api.removeCartItem(cartItemId);
        } else {
          await api.updateCartItem(cartItemId, updatedQuantity);
        }
      } else {
        if (item?.isAvailable !== true) {
          throw new Error("This item is out of stock.");
        }
        if (!branchId) {
          throw new Error("Choose a restaurant branch before adding items.");
        }
        await api.addCartItem({
          menuItemId: String(menuItemId),
          quantity,
          selectedCustomizations: addons,
          branchId,
        });
      }
      await reloadCart(branchId);
    } catch (error) {
      Alert.alert(
        "Unable to Update Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleDecrementCartItem = async (itemId: string) => {
    const existing = activeCart.find((cartItem) => cartItem.id === itemId);
    if (!existing?.cartItemId) return;
    try {
      if (existing.quantity > 1) {
        await api.updateCartItem(existing.cartItemId, existing.quantity - 1);
      } else {
        await api.removeCartItem(existing.cartItemId);
      }
      await reloadCart(activeBranch?.id);
    } catch (error) {
      Alert.alert(
        "Unable to Update Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (
      activeTable &&
      activeCartTotalItems === 0 &&
      confirmedOrders.length === 0
    ) {
      if (timeLeft === null) setTimeLeft(15 * 60);

      interval = setInterval(() => {
        setTimeLeft((prev: number | null) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            setActiveTable(null);
            setMode("Delivery");
            setDineInCartState("idle");
            setPendingOrderSnapshot([]);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(interval);
  }, [activeTable, activeCartTotalItems, confirmedOrders]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (dineInCartState === "waiting" && orderCountdown > 0) {
      timer = setInterval(() => {
        setOrderCountdown((prev: number) => prev - 1);
      }, 1000);
    } else if (dineInCartState === "waiting" && orderCountdown === 0) {
      const isAvailable = Math.random() > 0.1;

      if (isAvailable) {
        setDineInCartState("approved");
        setConfirmedOrders((prev) => [...prev, ...pendingOrderSnapshot]);
      } else {
        setDineInCartState("rejected");
      }
    }
    return () => clearInterval(timer);
  }, [dineInCartState, orderCountdown, pendingOrderSnapshot]);

  const handleConfirmOrder = () => {
    setPendingOrderSnapshot((prev) => [...prev, ...activeCart]);
    setDineInCartState("waiting");
    setOrderCountdown(60);
    setCarts((prev) => ({ ...prev, [mode]: [] }));
  };

  const handleCancelOrder = () => {
    setCarts((prev) => {
      const currentCart = prev[mode] || [];
      const restoredCart = [...currentCart];
      pendingOrderSnapshot.forEach((snapItem) => {
        const existing = restoredCart.find((c) => c.id === snapItem.id);
        if (existing) {
          existing.quantity += snapItem.quantity;
          existing.total += snapItem.total;
        } else {
          restoredCart.push(snapItem);
        }
      });
      return { ...prev, [mode]: restoredCart };
    });
    setDineInCartState("idle");
    setOrderCountdown(60);
    setPendingOrderSnapshot([]);
  };

  const shouldShowGlobalCartButton =
    (mode !== "Delivery" || activeBranch?.id === cartBranchId) &&
    (activeCartTotalItems > 0 ||
      (mode === "Dine-in" && dineInCartState !== "idle"));

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite }}>
      <OrderContext.Provider
        value={{
          mode,
          setMode,
          carts,
          setCarts,
          menuItems,
          categories,
          offers,
          featuredReels,
          refreshHomeData,
          isRefreshingHome,
          branches,
          branchesLoaded,
          addresses,
          cartPricing,
          activeCart,
          reloadCart,
          applyCartCoupon,
          removeCartCoupon,
          previewCheckout,
          activeAddress,
          setActiveAddress,
          activeBranch,
          setActiveBranch: selectActiveBranch,
          handleAddToCart,
          handleDecrementCartItem,
          activeTable,
          setActiveTable,
          timeLeft,
          confirmedOrders,
          setConfirmedOrders,
          dineInCartState,
          setDineInCartState,
          setPendingOrderSnapshot,
        }}
      >
        <View className="flex-1" style={{ backgroundColor: theme.bg }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="delivery-cart"
              options={{
                gestureEnabled: true,
                animation: "slide_from_right",
              }}
            />
          </Stack>

          {/* GLOBAL VIEW CART BAR (Handles all modes reliably across all tabs) */}
          {shouldShowGlobalCartButton &&
            !isDeliveryCartScreen &&
            !showDineInCartModal && (
              <ViewCartButton
                orderMode={mode}
                activeCartTotalItems={activeCartTotalItems}
                dineInCartState={dineInCartState}
                orderCountdown={orderCountdown}
                theme={theme}
                bottomOffset={tabBarBottom + TAB_BAR_HEIGHT}
                onPress={() => {
                  if (mode === "Dine-in") {
                    setShowDineInCartModal(true);
                  } else {
                    router.push("/(home)/delivery-cart");
                  }
                }}
              />
            )}

          {/* DINE-IN MODAL (Now Global, supports minus/plus functionality) */}
          <Modal
            visible={showDineInCartModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDineInCartModal(false)}
          >
            <Pressable
              className="flex-1 justify-end bg-black/60"
              onPress={() => setShowDineInCartModal(false)}
            >
              <Pressable
                className="rounded-t-[32px] p-6 pb-12"
                style={{
                  backgroundColor: theme.bg,
                  minHeight: "50%",
                  maxHeight: "85%",
                }}
                onPress={(e) => e.stopPropagation()}
              >
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    className="text-2xl font-black"
                    style={{ color: theme.text }}
                  >
                    Table {activeTable}
                  </Text>
                  <Pressable
                    onPress={() => setShowDineInCartModal(false)}
                    className="p-2 bg-gray-500/10 rounded-full"
                  >
                    <X size={20} color={theme.text} />
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* --- 1. KITCHEN TRACKING STATUS CARD --- */}
                  {dineInCartState !== "idle" && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      className="rounded-[24px] p-5 mb-6 shadow-sm border"
                      style={{
                        backgroundColor:
                          dineInCartState === "waiting"
                            ? "#FFFBEB"
                            : dineInCartState === "approved"
                              ? "#ECFDF5"
                              : "#FEF2F2",
                        borderColor:
                          dineInCartState === "waiting"
                            ? "#FDE68A"
                            : dineInCartState === "approved"
                              ? "#A7F3D0"
                              : "#FECACA",
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                          {dineInCartState === "waiting" && (
                            <Timer size={24} color="#F59E0B" />
                          )}
                          {dineInCartState === "approved" && (
                            <CheckCircle2 size={24} color="#10B981" />
                          )}
                          {dineInCartState === "rejected" && (
                            <XCircle size={24} color="#EF4444" />
                          )}
                          <Text
                            className="text-lg font-black ml-2 tracking-tight"
                            style={{
                              color:
                                dineInCartState === "waiting"
                                  ? "#D97706"
                                  : dineInCartState === "approved"
                                    ? "#059669"
                                    : "#DC2626",
                            }}
                          >
                            {dineInCartState === "waiting"
                              ? "Kitchen Reviewing..."
                              : dineInCartState === "approved"
                                ? "Order Approved!"
                                : "Items Unavailable"}
                          </Text>
                        </View>
                        {dineInCartState === "waiting" && (
                          <View className="bg-orange-200 px-3 py-1 rounded-full">
                            <Text className="font-black text-orange-700">
                              00:{orderCountdown.toString().padStart(2, "0")}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="mb-4">
                        {pendingOrderSnapshot.map((item: any, idx: number) => (
                          <View
                            key={idx}
                            className="flex-row justify-between items-center mb-1.5"
                          >
                            <Text className="text-sm font-bold text-gray-700">
                              {item.quantity}x {item.name}
                            </Text>
                            <Text className="text-sm font-bold text-gray-700">
                              ₹
                              {formatPrice(
                                item.total ||
                                  getNumericPrice(item.price) * item.quantity,
                              )}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {dineInCartState === "waiting" ? (
                        <Pressable
                          onPress={handleCancelOrder}
                          className="w-full py-3 rounded-xl items-center justify-center shadow-sm"
                          style={{ backgroundColor: "#EF4444" }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-wider">
                            Cancel this Request
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setDineInCartState("idle");
                            setPendingOrderSnapshot([]);
                          }}
                          className="w-full py-3 rounded-xl items-center justify-center shadow-sm"
                          style={{ backgroundColor: "#1F2937" }}
                        >
                          <Text className="text-white font-black text-xs uppercase tracking-wider">
                            Dismiss
                          </Text>
                        </Pressable>
                      )}
                    </Animated.View>
                  )}

                  {/* --- 2. FRESH UNCONFIRMED ITEMS (WITH EDIT CONTROLS) --- */}
                  {activeCartTotalItems > 0 && (
                    <View>
                      {dineInCartState !== "idle" && (
                        <Text
                          className="text-lg font-black mb-3"
                          style={{ color: theme.text }}
                        >
                          Unconfirmed Items
                        </Text>
                      )}

                      <View className="mb-2">
                        {activeCart.map((item: any) => {
                          const itemPriceNumber = getNumericPrice(item.price);
                          const itemTotal =
                            item.total || itemPriceNumber * item.quantity;

                          return (
                            <View
                              key={item.id}
                              className="flex-row justify-between items-center mb-4"
                            >
                              <View className="flex-1 mr-4">
                                <Text
                                  className="text-base font-bold"
                                  style={{ color: theme.text }}
                                >
                                  {item.name}
                                </Text>
                                <Text
                                  className="text-sm font-semibold mt-1"
                                  style={{ color: theme.muted }}
                                >
                                  ₹{formatPrice(itemPriceNumber)}
                                </Text>
                              </View>

                              <View className="items-end">
                                <View
                                  className="flex-row items-center rounded-lg border"
                                  style={{
                                    backgroundColor: theme.isDark
                                      ? "rgba(255,255,255,0.05)"
                                      : "#f3f4f6",
                                    borderColor: theme.border,
                                  }}
                                >
                                  <Pressable
                                    onPress={() => {
                                      if (item.quantity > 1) {
                                        const unitPrice =
                                          itemTotal / item.quantity;
                                        handleAddToCart(
                                          item,
                                          -1,
                                          item.addons || [],
                                          -unitPrice,
                                        );
                                      } else {
                                        handleDecrementCartItem(item.id);
                                      }
                                    }}
                                    className="p-2"
                                  >
                                    <Minus
                                      size={16}
                                      color={theme.primary}
                                      strokeWidth={3}
                                    />
                                  </Pressable>
                                  <Text
                                    style={{ color: theme.text }}
                                    className="font-black px-2"
                                  >
                                    {item.quantity}
                                  </Text>
                                  <Pressable
                                    onPress={() => {
                                      const unitPrice =
                                        itemTotal / item.quantity;
                                      handleAddToCart(
                                        item,
                                        1,
                                        item.addons || [],
                                        unitPrice,
                                      );
                                    }}
                                    className="p-2"
                                  >
                                    <Plus
                                      size={16}
                                      color={theme.primary}
                                      strokeWidth={3}
                                    />
                                  </Pressable>
                                </View>
                                <Text
                                  className="text-sm font-black mt-2"
                                  style={{ color: theme.text }}
                                >
                                  ₹{formatPrice(itemTotal)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      <View
                        className="border-t pt-4 mt-2 mb-6"
                        style={{ borderColor: theme.border }}
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text
                            className="text-sm font-bold"
                            style={{ color: theme.muted }}
                          >
                            Item Total
                          </Text>
                          <Text
                            className="text-sm font-bold"
                            style={{ color: theme.text }}
                          >
                            ₹{formatPrice(activeCartSubtotal)}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-semibold mb-3"
                          style={{ color: theme.muted }}
                        >
                          Taxes will be added to your final table bill.
                        </Text>
                        <View className="flex-row justify-between items-center">
                          <Text
                            className="text-xl font-black"
                            style={{ color: theme.text }}
                          >
                            Total
                          </Text>
                          <Text
                            className="text-xl font-black"
                            style={{ color: theme.primary }}
                          >
                            ₹{formatPrice(activeCartSubtotal)}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={handleConfirmOrder}
                        className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Text className="text-white font-black text-lg tracking-wide">
                          Confirm & Send to Kitchen
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* --- 3. EMPTY STATE HELPERS --- */}
                  {activeCartTotalItems === 0 && dineInCartState !== "idle" && (
                    <Pressable
                      onPress={() => setShowDineInCartModal(false)}
                      className="mt-2 py-4 items-center"
                    >
                      <Text
                        className="font-black text-base"
                        style={{ color: theme.primary }}
                      >
                        Continue Browsing Menu
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </OrderContext.Provider>
    </FavoritesContext.Provider>
  );
}
