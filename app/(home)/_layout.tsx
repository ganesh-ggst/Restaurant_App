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
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
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
import { CATEGORIES as CATEGORY_PRESENTATION } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { authApi } from "../../services/api/auth";
import { isDeliveryBranchEligible } from "../../utils/delivery-branch";
import type {
  CustomerBranch,
  CustomerCart,
  CustomerCartContext,
  CustomerCartItem,
  CustomerCategory,
  CustomerCustomizationSelection,
  CustomerDineInSession,
  CustomerFeaturedReel,
  CustomerMenuItem,
  CustomerOffer,
  CreateCustomerOrderInput,
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

function isUnavailableRestaurantError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /selected restaurant was not found or is inactive/i.test(error.message)
  );
}

function getCartContext(
  branchId: string,
  mode: string,
  addressId?: string,
): CustomerCartContext {
  if (mode === "Delivery") {
    if (!addressId) {
      throw new Error("Choose a delivery address before updating your cart.");
    }
    return { branchId, addressId, fulfillmentType: "delivery" };
  }
  if (mode === "Takeaway") {
    return { branchId, fulfillmentType: "takeaway" };
  }
  return { branchId, fulfillmentType: "dine-in" };
}

const getNumericPrice = (price: any) => {
  if (typeof price === "number") return price;
  return parseInt(String(price).replace(/\D/g, ""), 10) || 0;
};

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

const formatCountdown = (seconds: number | null) => {
  if (seconds === null) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
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
  const customTag = item.customTag?.trim();
  const normalizedMarketingTag = item.marketingTag
    ?.trim()
    .toLowerCase()
    .replace(/[⭐🔥]/g, "")
    .replace(/[_\s-]+/g, "");
  const selectedTag = item.customTagEnabled && customTag
    ? customTag
    : item.marketingBadgeLabel?.trim() ||
      (normalizedMarketingTag === "autodiscount"
        ? item.discountLabel
        : normalizedMarketingTag === "bestseller"
          ? "⭐ Bestseller"
          : normalizedMarketingTag === "hot"
            ? "🔥 Hot"
            : item.marketingTag);
  const marketingTag =
    typeof selectedTag === "string" && selectedTag.trim().toLowerCase() !== "none"
      ? selectedTag.trim().toUpperCase()
      : "";

  return {
    ...item,
    id: item._id,
    price: `₹${item.price}`,
    time:
      item.estimatedDeliveryRange ||
      `${item.deliveryEstimateMinutes ?? item.prepTimeMinutes ?? 0} mins`,
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

function getCartCustomizationDetails(
  selections: unknown[],
  customizationGroups: CustomerMenuItem["customizationGroups"],
) {
  const groups = customizationGroups || [];

  return selections.flatMap((selection) => {
    if (!selection || typeof selection !== "object") return [];

    const record = selection as {
      groupId?: unknown;
      groupName?: unknown;
      optionIds?: unknown;
      name?: unknown;
      price?: unknown;
    };
    const groupId =
      typeof record.groupId === "string"
        ? record.groupId
        : record.groupId &&
            typeof record.groupId === "object" &&
            "_id" in record.groupId &&
            typeof record.groupId._id === "string"
          ? record.groupId._id
          : undefined;
    const group = groups.find(
      (candidate) => candidate._id === groupId,
    );
    const optionIds = Array.isArray(record.optionIds)
      ? record.optionIds.flatMap((optionId) =>
          typeof optionId === "string" ? [optionId] : [],
        )
      : [];

    const matchedOptions = optionIds.flatMap((optionId) => {
      if (!group) return [];
      const option = group.options.find(
        (candidate) => candidate._id === optionId,
      );
      return option
        ? [
            {
              groupName: group.name,
              name: option.name,
              price: option.price,
            },
          ]
        : [];
    });

    if (matchedOptions.length > 0) return matchedOptions;
    if (typeof record.name !== "string") return [];

    return [
      {
        groupName:
          typeof record.groupName === "string" ? record.groupName : undefined,
        name: record.name,
        price:
          typeof record.price === "number" && Number.isFinite(record.price)
            ? record.price
            : 0,
      },
    ];
  });
}

function getCartCustomizationKey(selections: unknown): string {
  if (!Array.isArray(selections)) return "[]";

  const normalizedSelections = selections.flatMap((selection) => {
    if (!selection || typeof selection !== "object") return [];

    const record = selection as {
      groupId?: unknown;
      optionIds?: unknown;
    };
    const groupId =
      typeof record.groupId === "string"
        ? record.groupId
        : record.groupId &&
            typeof record.groupId === "object" &&
            "_id" in record.groupId &&
            typeof record.groupId._id === "string"
          ? record.groupId._id
          : "";
    const optionIds = Array.isArray(record.optionIds)
      ? record.optionIds.filter(
          (optionId): optionId is string => typeof optionId === "string",
        )
      : [];

    return [{ groupId, optionIds: optionIds.sort() }];
  });

  return JSON.stringify(
    normalizedSelections.sort((first, second) =>
      first.groupId.localeCompare(second.groupId),
    ),
  );
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
    const menuItem =
      menuItems.find((item) => item.id === menuItemId) ||
      (typeof cartItem.menuItemId === "object"
        ? toMenuCardItem(cartItem.menuItemId, [])
        : undefined);
    const addons = cartItem.selectedCustomizations || [];

    return {
      ...(menuItem || {}),
      id: menuItemId,
      cartItemId: cartItem._id,
      name: cartItem.name || menuItem?.name || "Menu item",
      image: cartItem.imageUrl || menuItem?.image || "",
      price: `₹${cartItem.unitPrice ?? menuItem?.price ?? 0}`,
      quantity: cartItem.quantity,
      total: cartItem.itemTotal,
      addons,
      customizationDetails: getCartCustomizationDetails(
        addons,
        menuItem?.customizationGroups,
      ),
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
  emitter,
  navigateToTab,
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
    (route: any) => route.name !== "profile" && route.name !== "favorites",
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
  }, Platform.OS === "web" ? [currentVisibleIndex, TAB_WIDTH] : undefined);

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
              const event = emitter.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                if (route.name === "search") {
                  descriptors[route.key].navigation.navigate(route.name, {
                    category: undefined,
                  });
                } else if (route.name === "offers") {
                  descriptors[route.key].navigation.navigate(route.name, {
                    offerId: undefined,
                  });
                } else {
                  navigateToTab(route.key);
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
  const isProfileScreen = pathname.includes("/profile");
  const tabBarBottom = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  const [mode, setMode] = useState("Delivery");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<
    ReturnType<typeof toMenuCardItem>[]
  >([]);
  const deliveryMenuRequestId = useRef(0);
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const [categories, setCategories] = useState<
    (CustomerCategory & {
      id: string;
      displayIcon: (typeof CATEGORY_PRESENTATION)[number]["icon"];
    })[]
  >([]);
  const [offers, setOffers] = useState<
    (CustomerOffer & {
      id: string;
      subtitle: string;
      image: string;
    })[]
  >([]);
  const [featuredReels, setFeaturedReels] = useState<CustomerFeaturedReel[]>(
    [],
  );
  const [branches, setBranches] = useState<
    (CustomerBranch & { id: string; address: string })[]
  >([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [addresses, setAddresses] = useState<
    (CustomerAddress & { id: string; type: string; address: string })[]
  >([]);
  const [cartPricing, setCartPricing] = useState<CustomerCart["pricing"]>();
  const [cartBranchId, setCartBranchId] = useState<string | null>(null);
  const [deliveryOptionByBranch, setDeliveryOptionByBranch] = useState<
    Record<string, string | undefined>
  >({});
  const [cartLoaded, setCartLoaded] = useState(false);

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
  const [dineInSession, setDineInSession] =
    useState<CustomerDineInSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);

  const [dineInCartState, setDineInCartState] = useState<
    "idle" | "waiting" | "approved" | "rejected"
  >("idle");
  const [pendingOrderSnapshot, setPendingOrderSnapshot] = useState<any[]>([]);
  const [dineInSubmissionPhase, setDineInSubmissionPhase] = useState<
    "preparing" | "sending" | "submitting" | null
  >(null);
  const [dineInSubmissionSecondsLeft, setDineInSubmissionSecondsLeft] =
    useState<number | null>(null);
  const isDineInSubmissionInProgress = useRef(false);
  const dineInSubmissionId = useRef(0);
  const dineInSubmissionPhaseRef = useRef<
    "preparing" | "sending" | "submitting" | null
  >(null);
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
  const activeAddressId = activeAddress?.id;
  const activeAddressDatabaseId = activeAddress?._id;
  const activeAddressLatitude = activeAddress?.lat;
  const activeAddressLongitude = activeAddress?.lng;
  const activeAddressLocation = useMemo(
    () =>
      activeAddressId ||
      activeAddressDatabaseId ||
      activeAddressLatitude !== undefined ||
      activeAddressLongitude !== undefined
        ? {
            id: activeAddressId,
            _id: activeAddressDatabaseId,
            lat: activeAddressLatitude,
            lng: activeAddressLongitude,
          }
        : null,
    [
      activeAddressId,
      activeAddressDatabaseId,
      activeAddressLatitude,
      activeAddressLongitude,
    ],
  );

  const loadUserData = useCallback(async () => {
    const menuRequestId = ++deliveryMenuRequestId.current;
    let cartBranchId = activeBranch?.id;
    const fulfillmentType =
      mode === "Delivery"
        ? "delivery"
        : mode === "Takeaway"
          ? "takeaway"
          : "dine-in";
    const [menuResult, categoryResult, branchResult, offerResult, reelResult] =
      await Promise.allSettled([
        api.getMenuItems({
          stock: "all",
          branchId: activeBranch?.id,
          address: mode === "Delivery" ? activeAddressId : undefined,
          fulfillmentType,
        }),
        api.getCategories(),
        mode === "Delivery" && activeAddressId
          ? api.getNearbyBranches(activeAddressId)
          : api.getBranches(),
        api.getOffers(),
        api.getFeaturedReels(),
      ]);

    const menuCardItems =
      menuResult.status === "fulfilled"
        ? menuResult.value.map((item: any) =>
            toMenuCardItem(
              item,
              categoryResult.status === "fulfilled" ? categoryResult.value : [],
            ),
          )
        : [];

    if (
      menuResult.status === "fulfilled" &&
      menuRequestId === deliveryMenuRequestId.current
    ) {
      setMenuItems(menuCardItems);
    } else if (
      menuResult.status === "rejected" &&
      menuRequestId === deliveryMenuRequestId.current
    ) {
      setMenuItems([]);
      if (!isUnavailableRestaurantError(menuResult.reason)) {
        Alert.alert(
          "Unable to Load Menu",
          menuResult.reason instanceof Error
            ? menuResult.reason.message
            : "Please try again.",
        );
      }
    }

    if (categoryResult.status === "fulfilled") {
      const iconForCategory = (name: string) =>
        CATEGORY_PRESENTATION.find(
          (category) => category.name.toLowerCase() === name.toLowerCase(),
        )?.icon || CATEGORY_PRESENTATION[0].icon;
      setCategories(
        categoryResult.value
          .filter((category: any) => category.isActive)
          .sort(
            (first: any, second: any) =>
              (first.sortOrder || 0) - (second.sortOrder || 0),
          )
          .map((category: any) => ({
            ...category,
            id: category._id,
            displayIcon: iconForCategory(category.name),
          })),
      );
    } else {
      Alert.alert("Unable to Load Categories", categoryResult.reason.message);
    }

    if (branchResult.status === "fulfilled") {
      const branchOptions = branchResult.value.map((branch: any) => {
        const activeName = branch.restaurantNames?.find(
          (option: any) => option.isActive,
        )?.name;
        const activeAddress = branch.storeAddresses?.find(
          (option: any) => option.isActive,
        )?.address;
        return {
          ...branch,
          id: branch._id,
          distanceAddressId:
            mode === "Delivery" ? activeAddressId : undefined,
          name: activeName || branch.name,
          address: activeAddress || branch.address || branch.city || "",
        };
      });
      const menuBranchIds = new Set(
        menuCardItems
          .filter((item: any) => item.isAvailable === true)
          .flatMap((item: any) => [
            ...(item.branchIds || []),
            ...(item.branchId ? [item.branchId] : []),
          ]),
      );
      const defaultBranch =
        branchOptions.find(
          (branch: any) =>
            (mode === "Delivery"
            ? isDeliveryBranchEligible(branch, activeAddressLocation)
              : branch.isActive && branch.isOnline !== false) &&
            menuBranchIds.has(branch.id),
        ) ||
        branchOptions.find(
          (branch: any) =>
            mode === "Delivery"
            ? isDeliveryBranchEligible(branch, activeAddressLocation)
              : branch.isActive && branch.isOnline !== false,
        ) ||
        null;
      const selectedBranch =
        branchOptions.find(
          (branch: any) =>
            branch.id === activeBranch?.id &&
            (mode === "Delivery"
              ? isDeliveryBranchEligible(branch, activeAddressLocation)
              : branch.isActive && branch.isOnline !== false),
        ) ||
        defaultBranch;
      cartBranchId = selectedBranch?.id;
      setBranches(branchOptions);
      setActiveBranch(selectedBranch);
      setBranchesLoaded(true);
    } else {
      Alert.alert("Unable to Load Branches", branchResult.reason.message);
    }

    if (offerResult.status === "fulfilled") {
      setOffers(
        offerResult.value
          .filter((offer: any) => offer.isActive)
          .map((offer: any) => ({
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
          .filter((reel: any) => reel.isActive !== false)
          .sort(
            (first: any, second: any) =>
              (first.displayOrder || 0) - (second.displayOrder || 0),
          ),
      );
    } else {
      Alert.alert("Unable to Load Featured Content", reelResult.reason.message);
    }

    try {
      const token = await authApi.getAccessToken();
      if (!token) {
        setCartLoaded(true);
        return;
      }

      const [favoriteResult, addressResult] =
        await Promise.allSettled([
          api.getFavorites(),
          api.getAddresses(),
        ]);

      if (favoriteResult.status === "fulfilled") {
        setFavorites(getFavoriteIds(favoriteResult.value));
      } else {
        Alert.alert("Unable to Load Favorites", favoriteResult.reason.message);
      }

      let resolvedAddressId = activeAddressId;
      if (addressResult.status === "fulfilled") {
        const addressOptions = addressResult.value.map((address: any) => ({
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
        const selectedAddress =
          addressOptions.find(
            (address: any) => address.id === activeAddressId,
          ) ||
          addressOptions.find((address: any) => address.isDefault) ||
          addressOptions[0] ||
          null;
        resolvedAddressId = selectedAddress?.id;
        setAddresses(addressOptions);
        setActiveAddress(selectedAddress);
      } else {
        Alert.alert("Unable to Load Addresses", addressResult.reason.message);
      }

      if (!cartBranchId) {
        setCartLoaded(true);
        return;
      }

      const cartResult = await Promise.allSettled([
        api.getCart(getCartContext(cartBranchId, mode, resolvedAddressId)),
      ]);
      if (cartResult[0].status === "fulfilled") {
        const cart = cartResult[0].value;
        const cartItems = toCartCardItems(cart, menuCardItems);
        setCarts({
          Delivery: cartItems,
          "Dine-in": cartItems,
          Takeaway: cartItems,
        });
        const resolvedBranchId = cart.branchId || cartBranchId;
        setDeliveryCartsByBranch((previous) => ({
          ...previous,
          [resolvedBranchId]: cartItems,
        }));
        setDeliveryOptionByBranch((previous) => ({
          ...previous,
          [resolvedBranchId]: cart.deliveryOptionId || undefined,
        }));
        setCartBranchId(resolvedBranchId);
        setCartPricing(cart.pricing);
        setCartLoaded(true);
      } else {
        Alert.alert("Unable to Load Cart", cartResult[0].reason.message);
      }
    } catch (error) {
      Alert.alert(
        "Unable to Load Account Data",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setCartLoaded(true);
    }
  }, [
    activeAddressId,
    activeAddressLocation,
    activeBranch?.id,
    mode,
  ]);

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

  useEffect(() => {
    const requestId = ++deliveryMenuRequestId.current;
    if (!activeBranch?.id) return;

    const fulfillmentType =
      mode === "Delivery"
        ? "delivery"
        : mode === "Takeaway"
          ? "takeaway"
          : "dine-in";
    const address =
      mode === "Delivery" ? activeAddress?.id : undefined;
    if (mode === "Delivery" && !address) return;

    void api
      .getMenuItems({
        branchId: activeBranch.id,
        address,
        fulfillmentType,
        stock: "all",
      })
      .then((items) => {
        if (requestId !== deliveryMenuRequestId.current) return;
        setMenuItems(
          items.map((item) => toMenuCardItem(item, categories)),
        );
      })
      .catch((error: unknown) => {
        if (requestId !== deliveryMenuRequestId.current) return;
        setMenuItems([]);
        if (!isUnavailableRestaurantError(error)) {
          Alert.alert(
            "Unable to Load Delivery Estimates",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      });

    return () => {
      if (requestId === deliveryMenuRequestId.current) {
        deliveryMenuRequestId.current += 1;
      }
    };
  }, [activeAddress?.id, activeBranch?.id, categories, mode]);

  const reloadCart = useCallback(
    async (expectedBranchId?: string) => {
      const branchId = expectedBranchId || activeBranch?.id;
      if (!branchId) {
        throw new Error("Choose a restaurant branch before loading your cart.");
      }

      const cart = await api.getCart(
        getCartContext(branchId, mode, activeAddress?.id),
      );
      const cartItems = toCartCardItems(cart, menuItems);
      const cartBranchId = cart.branchId || branchId;
      setCarts({
        Delivery: cartItems,
        "Dine-in": cartItems,
        Takeaway: cartItems,
      });
      setDeliveryCartsByBranch((previous) => ({
        ...previous,
        [cartBranchId]: cartItems,
      }));
      setDeliveryOptionByBranch((previous) => ({
        ...previous,
        [cartBranchId]: cart.deliveryOptionId || undefined,
      }));
      setCartBranchId(cart.branchId || branchId);
      setCartPricing(cart.pricing);
      setCartLoaded(true);
    },
    [activeAddress?.id, activeBranch?.id, menuItems, mode],
  );

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
        if (token && isMounted && activeBranch?.id) {
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
    const context = getCartContext(branchId, mode, activeAddress?.id);
    await api.clearCart(context);
    for (const item of items) {
      await api.addCartItem({
        menuItemId: String(item.id),
        quantity: item.quantity,
        selectedCustomizations: item.addons || [],
        ...context,
      });
    }
  };

  const selectActiveBranch = async (
    branch: CustomerBranch & { id: string; address: string },
  ) => {
    if (
      mode === "Delivery" &&
      !isDeliveryBranchEligible(branch, activeAddressLocation)
    ) {
      Alert.alert(
        "Branch Unavailable for Delivery",
        "Choose an active branch within 5 km of your delivery address.",
      );
      return;
    }
    if (!branch.isActive || branch.isOnline === false) {
      setActiveBranch(branch);
      return;
    }
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
    const branchId = activeBranch?.id;
    if (!branchId) {
      throw new Error("Choose a restaurant branch before applying a coupon.");
    }
    await api.applyCartCoupon(
      code,
      getCartContext(branchId, mode, activeAddress?.id),
    );
    await reloadCart(branchId);
  };

  const removeCartCoupon = async () => {
    const branchId = activeBranch?.id;
    if (!branchId) {
      throw new Error("Choose a restaurant branch before removing a coupon.");
    }
    await api.removeCartCoupon(
      getCartContext(branchId, mode, activeAddress?.id),
    );
    await reloadCart(branchId);
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
        mode === "Dine-in"
          ? "dine-in"
          : (mode.toLowerCase() as "delivery" | "takeaway"),
      ...(addressId ? { addressId } : {}),
      ...(offerCode ? { offerCode } : {}),
    });
  };

  const createCustomerOrder = async (
    paymentResult: "success" | "rejected" | "pending",
    tipAmount: number,
    specialInstructions: string,
    taxableAmount?: number,
    tax?: number,
    total?: number,
  ) => {
    if (!activeBranch?.id) {
      throw new Error("Choose a restaurant branch before checkout.");
    }
    const addressId = mode === "Delivery" ? activeAddress?.id : undefined;
    if (mode === "Delivery" && !addressId) {
      throw new Error("Choose a delivery address before checkout.");
    }

    const orderInput: CreateCustomerOrderInput =
      mode === "Dine-in"
        ? {
            branchId: activeBranch.id,
            fulfillmentType: "dine_in" as const,
          }
        : {
            branchId: activeBranch.id,
            fulfillmentType: mode.toLowerCase() as "delivery" | "takeaway",
            ...(addressId ? { addressId } : {}),
            ...(taxableAmount !== undefined ? { taxableAmount } : {}),
            ...(tax !== undefined ? { tax } : {}),
            ...(total !== undefined ? { total } : {}),
            tipAmount,
            specialInstructions,
            paymentMethod: "online" as const,
            status: paymentResult === "rejected" ? "rejected" : "pending",
            paymentStatus:
              paymentResult === "success"
                ? "paid"
                : paymentResult === "rejected"
                  ? "rejected"
                  : "pending",
          };
    const order = await api.createOrder(orderInput);
    return order;
  };

  const toggleFavorite = async (id: string) => {
    try {
      if (favorites.includes(id)) {
        await api.removeFavorite(id);
        setFavorites((previous) =>
          previous.filter((favorite) => favorite !== id),
        );
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
    if (mode === "Dine-in" && dineInCartState === "waiting") {
      Alert.alert("Order Being Submitted", "Please wait for the order to finish.");
      return;
    }
    const menuItemId = item?._id || item?.id;
    const branchId = activeBranch?.id;
    const existing =
      quantity < 0
        ? activeCart.find(
            (cartItem) =>
              cartItem.id === menuItemId &&
              getCartCustomizationKey(cartItem.addons) ===
                getCartCustomizationKey(addons),
          )
        : activeCart.find((cartItem) => cartItem.id === menuItemId);
    const cartItemId = existing?.cartItemId;

    try {
      const cartContext = branchId
        ? getCartContext(branchId, mode, activeAddress?.id)
        : null;
      if (quantity < 0) {
        if (!branchId || !cartContext) {
          throw new Error("Choose a restaurant branch before updating your cart.");
        }
        if (!existing || !cartItemId) {
          throw new Error(
            "This cart item is no longer available. Refresh the cart.",
          );
        }
        const updatedQuantity = existing.quantity + quantity;
        if (updatedQuantity <= 0) {
          await api.removeCartItem(cartItemId, cartContext);
        } else {
          await api.updateCartItem(cartItemId, updatedQuantity, cartContext);
        }
      } else {
        if (item?.isAvailable !== true) {
          throw new Error("This item is out of stock.");
        }
        if (!branchId || !cartContext) {
          throw new Error("Choose a restaurant branch before adding items.");
        }
        await api.addCartItem({
          menuItemId: String(menuItemId),
          quantity,
          selectedCustomizations: addons,
          ...cartContext,
        });
      }
      await reloadCart(branchId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again.";
      const quantityLimitReached =
        quantity > 0 &&
        /maximum available quantity|maximum quantity|quantity limit|limit reached/i.test(
          message,
        );
      Alert.alert(
        quantityLimitReached
          ? "Cart Quantity Limit Reached"
          : "Unable to Update Cart",
        message,
      );
    }
  };

  const handleDecrementCartItem = async (
    itemId: string,
    targetCartItemId?: string,
  ) => {
    if (mode === "Dine-in" && dineInCartState === "waiting") {
      Alert.alert("Order Being Submitted", "Please wait for the order to finish.");
      return;
    }
    const matchingItems = activeCart.filter(
      (cartItem) => cartItem.id === itemId,
    );
    const existing = targetCartItemId
      ? matchingItems.find(
          (cartItem) => cartItem.cartItemId === targetCartItemId,
        )
      : matchingItems.find(
          (cartItem) =>
            !Array.isArray(cartItem.addons) || cartItem.addons.length === 0,
        ) || matchingItems[0];
    if (!existing?.cartItemId) return;
    const branchId = activeBranch?.id;
    if (!branchId || (mode === "Delivery" && !activeAddress?.id)) {
      Alert.alert(
        "Unable to Update Cart",
        "Choose a restaurant branch and delivery address before updating your cart.",
      );
      return;
    }
    try {
      const cartContext = getCartContext(branchId, mode, activeAddress?.id);
      if (existing.quantity > 1) {
        await api.updateCartItem(
          existing.cartItemId,
          existing.quantity - 1,
          cartContext,
        );
      } else {
        await api.removeCartItem(existing.cartItemId, cartContext);
      }
      await reloadCart(branchId);
    } catch (error) {
      Alert.alert(
        "Unable to Update Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleRemoveCartItems = async (
    itemsToRemove: { menuItemId: string; cartItemId?: string }[],
  ) => {
    const branchId = activeBranch?.id;
    const cartContext = branchId
      ? getCartContext(branchId, mode, activeAddress?.id)
      : null;
    if (!branchId || !cartContext) {
      throw new Error("Choose a restaurant branch before updating your cart.");
    }

    const uniqueItems = [
      ...new Map(
        itemsToRemove.map((item) => [
          item.cartItemId || item.menuItemId,
          item,
        ]),
      ).values(),
    ];
    const cartItemRemovals = uniqueItems.flatMap(
      ({ menuItemId, cartItemId }) => {
        const matchingItems = activeCart.filter(
          (item) =>
            item.id === menuItemId &&
            (!cartItemId || item.cartItemId === cartItemId),
        );
        const removals = matchingItems.flatMap((item) =>
          item.cartItemId
            ? [{ menuItemId, cartItemId: item.cartItemId }]
            : [],
        );
        if (
          matchingItems.length === 0 ||
          removals.length !== matchingItems.length
        ) {
          throw new Error(
            "A selected cart item is no longer available. Refresh the cart.",
          );
        }
        return removals;
      },
    );

    const results: PromiseSettledResult<void>[] = [];
    for (const { cartItemId } of cartItemRemovals) {
      try {
        await api.removeCartItem(cartItemId, cartContext);
        results.push({ status: "fulfilled", value: undefined });
      } catch (reason) {
        results.push({ status: "rejected", reason });
      }
    }
    await reloadCart(branchId);

    const failures = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            `${cartItemRemovals[index].menuItemId}: ${
              result.reason instanceof Error
                ? result.reason.message
                : "Unable to remove item."
            }`,
          ]
        : [],
    );
    if (failures.length > 0) {
      throw new Error(
        `Some items could not be removed:\n${failures.join("\n")}`,
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
            return 0;
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
    if (timeLeft !== 0 || !activeTable) return;
    let isCurrent = true;

    const closeExpiredSession = async () => {
      try {
        if (dineInSession?._id) {
          await api.closeDineInSession(dineInSession._id);
        }
        if (!isCurrent) return;
        setDineInSession(null);
        setActiveTable(null);
        setMode("Delivery");
        setDineInCartState("idle");
        setPendingOrderSnapshot([]);
      } catch (error) {
        if (!isCurrent) return;
        Alert.alert(
          "Unable to Close Dine-in Session",
          error instanceof Error ? error.message : "Please try again.",
        );
        setTimeLeft(null);
      }
    };

    void closeExpiredSession();
    return () => {
      isCurrent = false;
    };
  }, [activeTable, dineInSession, timeLeft]);

  const handleConfirmOrder = async () => {
    if (isDineInSubmissionInProgress.current) return;
    if (!dineInSession?._id || !activeBranch?.id || activeCart.length === 0) {
      Alert.alert(
        "Unable to Submit Order",
        "Check in to a table and add items before submitting your order.",
      );
      return;
    }

    isDineInSubmissionInProgress.current = true;
    const submissionId = ++dineInSubmissionId.current;
    const orderSnapshot = [...activeCart];
    const branchId = activeBranch.id;
    const orderPricing = cartPricing;
    setPendingOrderSnapshot(orderSnapshot);
    setDineInCartState("waiting");
    setCarts((prev) => ({ ...prev, [mode]: [] }));

    try {
      const waitForMinute = async (
        phase: "preparing" | "sending",
      ): Promise<boolean> => {
        const deadline = Date.now() + 60_000;
        dineInSubmissionPhaseRef.current = phase;
        setDineInSubmissionPhase(phase);
        setDineInSubmissionSecondsLeft(60);

        while (Date.now() < deadline) {
          if (dineInSubmissionId.current !== submissionId) return false;
          const remainingSeconds = Math.max(
            1,
            Math.ceil((deadline - Date.now()) / 1000),
          );
          setDineInSubmissionSecondsLeft((current) =>
            current === remainingSeconds ? current : remainingSeconds,
          );
          await new Promise<void>((resolve) => {
            setTimeout(
              resolve,
              Math.min(1000, Math.max(1, deadline - Date.now())),
            );
          });
        }

        if (dineInSubmissionId.current !== submissionId) return false;
        setDineInSubmissionSecondsLeft(0);
        return true;
      };

      if (!(await waitForMinute("preparing"))) return;
      if (!(await waitForMinute("sending"))) return;
      dineInSubmissionPhaseRef.current = "submitting";
      setDineInSubmissionPhase("submitting");
      setDineInSubmissionSecondsLeft(null);

      await createCustomerOrder(
        "pending",
        0,
        "",
        orderPricing?.taxableAmount,
        orderPricing?.tax,
        orderPricing?.total,
      );
      dineInSubmissionPhaseRef.current = null;
      setDineInSubmissionPhase(null);
      setDineInCartState("approved");
      setConfirmedOrders((prev) => [...prev, ...orderSnapshot]);
      try {
        await reloadCart(branchId);
      } catch (error) {
        Alert.alert(
          "Order Submitted",
          `Your order was sent, but the cart could not be refreshed. ${error instanceof Error ? error.message : "Please refresh and try again."}`,
        );
      }
      isDineInSubmissionInProgress.current = false;
    } catch (error) {
      if (dineInSubmissionId.current !== submissionId) return;
      dineInSubmissionPhaseRef.current = null;
      setDineInSubmissionPhase(null);
      setDineInSubmissionSecondsLeft(null);
      setCarts((prev) => {
        const restoredCart = [...(prev[mode] || [])];
        orderSnapshot.forEach((snapshotItem) => {
          const existing = restoredCart.find(
            (cartItem) => cartItem.id === snapshotItem.id,
          );
          if (existing) {
            existing.quantity += snapshotItem.quantity;
            existing.total += snapshotItem.total;
          } else {
            restoredCart.push(snapshotItem);
          }
        });
        return { ...prev, [mode]: restoredCart };
      });
      setDineInCartState("rejected");
      Alert.alert(
        "Unable to Submit Order",
        error instanceof Error ? error.message : "Please try again.",
      );
      isDineInSubmissionInProgress.current = false;
    }
  };

  const handleCancelDineInSubmission = () => {
    if (
      !isDineInSubmissionInProgress.current ||
      dineInSubmissionPhaseRef.current !== "preparing"
    ) {
      return;
    }

    dineInSubmissionId.current += 1;
    dineInSubmissionPhaseRef.current = null;
    isDineInSubmissionInProgress.current = false;
    setCarts((prev) => ({
      ...prev,
      [mode]: [...(prev[mode] || []), ...pendingOrderSnapshot],
    }));
    setPendingOrderSnapshot([]);
    setDineInCartState("idle");
    setDineInSubmissionPhase(null);
    setDineInSubmissionSecondsLeft(null);
  };

  const shouldShowGlobalCartButton =
    (mode !== "Delivery" || activeBranch?.id === cartBranchId) &&
    (activeCartTotalItems > 0 ||
      (mode === "Dine-in" && dineInCartState !== "idle"));
  const isDineInCartPending =
    mode === "Dine-in" &&
    activeCartTotalItems > 0 &&
    dineInCartState !== "waiting" &&
    dineInCartState !== "rejected";
  const isDineInCartAccepted =
    dineInCartState === "approved" && !isDineInCartPending;

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
          deliveryOptionByBranch,
          cartLoaded,
          activeCart,
          reloadCart,
          applyCartCoupon,
          removeCartCoupon,
          previewCheckout,
          createCustomerOrder,
          activeAddress,
          setActiveAddress,
          activeBranch,
          setActiveBranch: selectActiveBranch,
          setActiveBranchForDineInSession: setActiveBranch,
          handleAddToCart,
          handleDecrementCartItem,
          handleRemoveCartItems,
          activeTable,
          setActiveTable,
          dineInSession,
          setDineInSession,
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
              name="favorites"
              options={{
                gestureEnabled: true,
                animation: "slide_from_right",
              }}
            />
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
            !isProfileScreen &&
            !showDineInCartModal && (
              <ViewCartButton
                orderMode={mode}
                activeCartTotalItems={activeCartTotalItems}
                dineInCartState={dineInCartState}
                submissionPhase={dineInSubmissionPhase}
                submissionCountdown={formatCountdown(
                  dineInSubmissionSecondsLeft,
                )}
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
            transparent={Platform.OS !== "android"}
            animationType={Platform.OS === "android" ? "slide" : "fade"}
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => setShowDineInCartModal(false)}
          >
            <View
              className="flex-1"
              style={{
                backgroundColor:
                  Platform.OS === "android" ? theme.bg : "transparent",
              }}
            >
              {Platform.OS !== "android" && (
                <Pressable
                  className="absolute inset-0 bg-black/60"
                  onPress={() => setShowDineInCartModal(false)}
                />
              )}
              <View
                className="absolute inset-0 p-6"
                style={{
                  backgroundColor: theme.bg,
                  paddingTop: insets.top + 24,
                  paddingBottom: insets.bottom + 12,
                }}
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
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {/* --- 1. KITCHEN TRACKING STATUS CARD --- */}
                  {(dineInCartState !== "idle" || isDineInCartPending) && (
                    <Animated.View
                      entering={FadeIn.duration(300)}
                      className="rounded-[24px] p-5 mb-6 shadow-sm border"
                      style={{
                        backgroundColor:
                          dineInCartState === "rejected"
                            ? "#FEF2F2"
                            : isDineInCartAccepted
                              ? "#ECFDF5"
                              : "#FFFBEB",
                        borderColor:
                          dineInCartState === "rejected"
                            ? "#FECACA"
                            : isDineInCartAccepted
                              ? "#A7F3D0"
                              : "#FDE68A",
                      }}
                    >
                      <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                          {(dineInCartState === "waiting" ||
                            isDineInCartPending) && (
                            <Timer size={24} color="#F59E0B" />
                          )}
                          {isDineInCartAccepted && (
                            <CheckCircle2 size={24} color="#10B981" />
                          )}
                          {dineInCartState === "rejected" && (
                            <XCircle size={24} color="#EF4444" />
                          )}
                          <Text
                            className="text-lg font-black ml-2 tracking-tight"
                            style={{
                              color:
                                dineInCartState === "rejected"
                                  ? "#DC2626"
                                  : isDineInCartAccepted
                                    ? "#059669"
                                    : "#D97706",
                            }}
                          >
                            {dineInCartState === "rejected"
                              ? "Order Not Submitted"
                              : isDineInCartAccepted
                                ? "Accepted"
                                : "Pending"}
                          </Text>
                        </View>
                        {dineInCartState === "waiting" && (
                          <View className="bg-orange-200 px-3 py-1 rounded-full">
                            <Text className="font-black text-orange-700">
                              {dineInSubmissionPhase === "preparing"
                                ? "Cancel available"
                                : "Please wait"}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="text-sm font-semibold text-gray-700 mb-3">
                        {isDineInCartAccepted
                          ? "Order submitted to the kitchen."
                          : dineInCartState === "waiting"
                            ? dineInSubmissionPhase === "sending"
                              ? `Your order will be sent to the kitchen in ${formatCountdown(dineInSubmissionSecondsLeft)}.`
                              : dineInSubmissionPhase === "submitting"
                                ? "Submitting your order to the kitchen..."
                              : `Preparing your order. Sending starts in ${formatCountdown(dineInSubmissionSecondsLeft)}.`
                            : "Items added to your cart. Submit the order to send them to the kitchen."}
                      </Text>

                      <View className="mb-4">
                        {(isDineInCartPending
                          ? activeCart
                          : pendingOrderSnapshot
                        ).map((item: any, idx: number) => (
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

                      {dineInCartState === "waiting" &&
                        dineInSubmissionPhase === "preparing" && (
                          <Pressable
                            onPress={handleCancelDineInSubmission}
                            className="w-full py-3 rounded-xl items-center justify-center mb-3 border"
                            style={{
                              borderColor: theme.border,
                              backgroundColor: theme.card,
                            }}
                          >
                            <Text
                              className="font-black text-xs uppercase tracking-wider"
                              style={{ color: theme.danger }}
                            >
                              Cancel Order
                            </Text>
                          </Pressable>
                        )}

                      {(dineInCartState === "rejected" ||
                        (dineInCartState === "approved" &&
                          !isDineInCartPending)) && (
                        <Pressable
                          onPress={() => setShowDineInCartModal(false)}
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
                {activeCartTotalItems > 0 && (
                  <>
                    <View
                      className="border-t pt-4 mt-2 mb-4"
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
                  </>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </OrderContext.Provider>
    </FavoritesContext.Provider>
  );
}
