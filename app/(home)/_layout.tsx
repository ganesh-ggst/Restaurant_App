import { BlurView } from "expo-blur";
import {
  Stack,
  useGlobalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
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
  useCallback,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeIn,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ViewCartButton from "../../components/home/ViewCartButton";
import { FavoritesContext, OrderContext } from "../../contexts/HomeContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { authApi } from "../../services/api/auth";
import {
  getDeliveryBranchDistanceKm,
  isDeliveryBranchEligible,
} from "../../utils/delivery-branch";
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

const { width } = Dimensions.get("window");
const MARGIN = 20;
const TAB_BAR_WIDTH = width - MARGIN * 2;
const TAB_BAR_HEIGHT = 72;
const MIN_TAB_BAR_BOTTOM = 16;
const GUEST_CART_STORAGE_KEY = "@green-spice/guest-cart:v1";
const ACTIVE_BRANCH_STORAGE_KEY = "@green-spice/active-branch:v1";

type OrderMode = "Delivery" | "Takeaway" | "Dine-in";

interface GuestCartSnapshot {
  mode: OrderMode;
  branchId: string;
  items: any[];
  branch?: CustomerBranch & { id: string; address: string };
  transferredItems?: any[];
  syncCompleted?: boolean;
}

interface GuestCartSyncResult {
  pendingItems: any[];
  transferredItems: any[];
  syncCompleted: boolean;
}

const guestCartSyncs = new Map<string, Promise<GuestCartSyncResult>>();

function isOrderMode(value: unknown): value is OrderMode {
  return value === "Delivery" || value === "Takeaway" || value === "Dine-in";
}

async function readGuestCartSnapshot(): Promise<GuestCartSnapshot | null> {
  try {
    const stored = await AsyncStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("mode" in parsed) ||
      !isOrderMode(parsed.mode) ||
      !("branchId" in parsed) ||
      typeof parsed.branchId !== "string" ||
      !("items" in parsed) ||
      !Array.isArray(parsed.items)
    ) {
      console.warn("Ignoring malformed local guest cart data.");
      await AsyncStorage.removeItem(GUEST_CART_STORAGE_KEY);
      return null;
    }

    return parsed as GuestCartSnapshot;
  } catch (error) {
    console.error("Unable to read the saved guest cart.", error);
    return null;
  }
}

async function readSavedBranchId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to read the saved restaurant branch.", error);
    return null;
  }
}

async function writeGuestCartSnapshot(
  snapshot: GuestCartSnapshot | null,
): Promise<void> {
  try {
    if (
      !snapshot ||
      (snapshot.items.length === 0 &&
        !snapshot.transferredItems?.length &&
        !snapshot.syncCompleted)
    ) {
      await AsyncStorage.removeItem(GUEST_CART_STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(
      GUEST_CART_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch (error) {
    console.error("Unable to save the guest cart.", error);
  }
}

function syncGuestCartSnapshot(
  snapshot: GuestCartSnapshot,
  context: CustomerCartContext,
): Promise<GuestCartSyncResult> {
  const syncKey = [
    context.branchId,
    context.fulfillmentType,
    context.addressId || "",
  ].join(":");
  const inFlightSync = guestCartSyncs.get(syncKey);
  if (inFlightSync) return inFlightSync;

  const syncPromise = (async (): Promise<GuestCartSyncResult> => {
    let pendingItems = [...snapshot.items];
    let transferredItems = [...(snapshot.transferredItems || [])];
    if (snapshot.syncCompleted) {
      return { pendingItems: [], transferredItems, syncCompleted: true };
    }

    try {
      for (const item of [...pendingItems]) {
        await api.addCartItem({
          menuItemId: String(item.id),
          quantity: item.quantity,
          selectedCustomizations: item.addons || [],
          ...context,
        });
        transferredItems.push(item);
        pendingItems = pendingItems.filter(
          (pendingItem) => pendingItem.cartItemId !== item.cartItemId,
        );
        await writeGuestCartSnapshot({
          ...snapshot,
          items: pendingItems,
          transferredItems,
        });
      }

      await writeGuestCartSnapshot({
        ...snapshot,
        items: [],
        transferredItems,
        syncCompleted: true,
      });
      return { pendingItems, transferredItems, syncCompleted: true };
    } catch (error) {
      await writeGuestCartSnapshot({
        ...snapshot,
        items: pendingItems,
        transferredItems,
        syncCompleted: false,
      });
      if (__DEV__) {
        console.warn("Unable to transfer the saved guest cart.", error);
      }
      return { pendingItems, transferredItems, syncCompleted: false };
    }
  })();

  guestCartSyncs.set(syncKey, syncPromise);
  return syncPromise.finally(() => {
    if (guestCartSyncs.get(syncKey) === syncPromise) {
      guestCartSyncs.delete(syncKey);
    }
  });
}

function isUnavailableRestaurantError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /selected restaurant was not found or is inactive/i.test(error.message)
  );
}

function isOnlineBranch(branch: CustomerBranch): boolean {
  return branch.isActive && branch.isOnline !== false;
}

function chooseNearestOnlineBranch<T extends CustomerBranch & { id?: string }>(
  branches: T[],
  address: Parameters<typeof getDeliveryBranchDistanceKm>[1],
  preferredBranchId?: string | null,
): T | null {
  const onlineBranches = branches.filter(isOnlineBranch);
  const preferredBranch = onlineBranches.find(
    (branch) => (branch.id || branch._id) === preferredBranchId,
  );
  if (preferredBranch) return preferredBranch;

  const activeBranches = branches.filter((branch) => branch.isActive);
  const candidates =
    onlineBranches.length > 0
      ? onlineBranches
      : activeBranches.length > 0
        ? activeBranches
        : branches;
  return (
    [...candidates].sort((first, second) => {
      const firstDistance = getDeliveryBranchDistanceKm(first, address);
      const secondDistance = getDeliveryBranchDistanceKm(second, address);
      if (firstDistance === null && secondDistance !== null) return 1;
      if (firstDistance !== null && secondDistance === null) return -1;
      if (
        firstDistance !== null &&
        secondDistance !== null &&
        firstDistance !== secondDistance
      ) {
        return firstDistance - secondDistance;
      }
      return 0;
    })[0] || null
  );
}

async function measureHomeRequest<T>(
  label: string,
  request: Promise<T>,
): Promise<T> {
  if (!__DEV__) return request;

  const startedAt = Date.now();
  try {
    return await request;
  } finally {
    console.info(`[Home data] ${label}: ${Date.now() - startedAt}ms`);
  }
}

function getCouponReference(coupon: unknown): string | null {
  if (typeof coupon === "string") return coupon.trim() || null;
  if (!coupon || typeof coupon !== "object") return null;

  const couponData = coupon as Record<string, unknown>;
  for (const key of ["code", "couponCode", "offerCode", "offerId", "id", "_id"]) {
    const value = couponData[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return getCouponReference(couponData.offer);
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
  const deliveryEstimateMinutes = item.deliveryEstimateMinutes;
  const ratingAverage =
    typeof item.ratingAverage === "number" &&
    Number.isFinite(item.ratingAverage)
      ? item.ratingAverage
      : 0;
  const ratingCount =
    typeof item.ratingCount === "number" && Number.isFinite(item.ratingCount)
      ? item.ratingCount
      : 0;

  return {
    ...item,
    id: item._id,
    price: `₹${item.price}`,
    time: Number.isFinite(deliveryEstimateMinutes)
      ? `${deliveryEstimateMinutes} min`
      : item.estimatedDeliveryRange ||
        `${item.prepTimeMinutes ?? 0} mins`,
    rating: `${ratingAverage.toFixed(1)}(${ratingCount})`,
    offer: marketingTag,
    image: item.imageUrl || imageUrls[0] || "",
    gallery: imageUrls.length > 0 ? imageUrls : [item.imageUrl || ""],
    isVeg: item.foodType?.toLowerCase() === "veg",
    category: categoryName,
  };
}

type CachedMenuCardItem = {
  signature: string;
  item: ReturnType<typeof toMenuCardItem>;
};

function mapMenuCardItems(
  items: CustomerMenuItem[],
  categories: CustomerCategory[],
  cache: Map<string, CachedMenuCardItem>,
) {
  const nextCache = new Map<string, CachedMenuCardItem>();
  const mappedItems = items.map((item) => {
    const mappedItem = toMenuCardItem(item, categories);
    const signature = JSON.stringify(mappedItem) ?? "";
    const cached = cache.get(item._id);
    const stableItem =
      cached?.signature === signature ? cached.item : mappedItem;
    nextCache.set(item._id, { signature, item: stableItem });
    return stableItem;
  });

  return { items: mappedItems, cache: nextCache };
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
      transform: [{ translateX: targetIndex * TAB_WIDTH }],
      opacity: currentVisibleIndex >= 0 ? 1 : 0,
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
                navigateToTab(route.key);
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
  const { isGuest: guestParam, cartMode: cartModeParam } =
    useGlobalSearchParams<{
    isGuest?: string;
    cartMode?: string;
  }>();
  const pathname = usePathname();
  const isDeliveryCartScreen = pathname.endsWith("/delivery-cart");
  const isProfileScreen = pathname.includes("/profile");
  const tabBarBottom = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  const [mode, setMode] = useState(
    isOrderMode(cartModeParam) ? cartModeParam : "Delivery",
  );
  const modeRef = useRef(mode);
  const [isGuest, setIsGuest] = useState(guestParam === "true");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<
    ReturnType<typeof toMenuCardItem>[]
  >([]);
  const menuItemsRef = useRef(menuItems);
  const menuCardItemsCache = useRef(
    new Map<string, CachedMenuCardItem>(),
  );
  const [menuItemsLoadedForBranchId, setMenuItemsLoadedForBranchId] =
    useState<string | null>(null);
  const deliveryMenuRequestId = useRef(0);
  const featuredReelsRequestId = useRef(0);
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const [menuRefreshVersion, setMenuRefreshVersion] = useState(0);
  const lastMenuRefreshVersion = useRef(0);
  const [featuredRefreshVersion, setFeaturedRefreshVersion] = useState(0);
  const lastFeaturedRefreshVersion = useRef(0);
  const homeDataLoadId = useRef(0);
  const previousBootstrapMode = useRef(mode);
  const previousCartMode = useRef(mode);
  const modeCartRequestId = useRef(0);
  const forceCartRefreshOnResume = useRef(false);
  const [categories, setCategories] = useState<
    (CustomerCategory & { id: string })[]
  >([]);
  const categoriesRef = useRef(categories);
  const rawMenuItemsRef = useRef<CustomerMenuItem[]>([]);
  const rawMenuBranchIdRef = useRef<string | null>(null);
  const [offers, setOffers] = useState<
    (CustomerOffer & {
      id: string;
      subtitle: string;
      image: string;
    })[]
  >([]);
  const [offersLoaded, setOffersLoaded] = useState(false);
  const [featuredReels, setFeaturedReels] = useState<CustomerFeaturedReel[]>(
    [],
  );
  const [featuredReelsLoadedForBranchId, setFeaturedReelsLoadedForBranchId] =
    useState<string | null>(null);
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
  const pendingCartMutations = useRef(0);

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
  const activeAddressRef = useRef(activeAddress);
  const [activeBranch, setActiveBranch] = useState<
    (CustomerBranch & { id: string; address: string }) | null
  >(null);
  const activeBranchRef = useRef(activeBranch);
  const branchSelectionVersion = useRef(0);
  const skipAddressBootstrapLoad = useRef<string | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [dineInSession, setDineInSession] =
    useState<CustomerDineInSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);

  useEffect(() => {
    menuItemsRef.current = menuItems;
    categoriesRef.current = categories;
    activeAddressRef.current = activeAddress;
    activeBranchRef.current = activeBranch;
  }, [activeAddress, activeBranch, categories, menuItems]);

  useEffect(() => {
    if (!activeBranch?.id) return;
    void AsyncStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, activeBranch.id).catch(
      (error: unknown) => {
        console.warn("Unable to save the selected restaurant branch.", error);
      },
    );
  }, [activeBranch?.id]);

  const [dineInCartState, setDineInCartState] = useState<
    "idle" | "waiting" | "approved" | "rejected"
  >("idle");
  const [pendingOrderSnapshot, setPendingOrderSnapshot] = useState<any[]>([]);
  const [dineInSubmissionPhase, setDineInSubmissionPhase] = useState<
    "preparing" | "submitting" | null
  >(null);
  const [dineInSubmissionSecondsLeft, setDineInSubmissionSecondsLeft] =
    useState<number | null>(null);
  const isDineInSubmissionInProgress = useRef(false);
  const dineInSubmissionId = useRef(0);
  const dineInSubmissionPhaseRef = useRef<
    "preparing" | "submitting" | null
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

  const updateActiveCart = useCallback(
    (items: any[]) => {
      if (mode === "Delivery" && activeBranch?.id) {
        setDeliveryCartsByBranch((previous) => ({
          ...previous,
          [activeBranch.id]: items,
        }));
        setCarts((previous) => ({ ...previous, Delivery: items }));
        setCartBranchId(activeBranch.id);
      } else {
        setCarts((previous) => ({ ...previous, [mode]: items }));
      }

      if (!activeBranch?.id || !isOrderMode(mode)) return;
      const localItems = items.filter((item) => item.localOnly === true);
      void writeGuestCartSnapshot(
        localItems.length > 0
          ? {
              mode,
              branchId: activeBranch.id,
              items: localItems,
              branch: activeBranch,
            }
          : null,
      );
    },
    [activeBranch, mode],
  );

  const clearLocalGuestCart = useCallback(
    () => updateActiveCart([]),
    [updateActiveCart],
  );

  const promptGuestSignUp = () => {
    router.push({
      pathname: "/(auth)/login",
      params: {
        ...(activeBranch?.id ? { branchId: activeBranch.id } : {}),
      },
    });
  };

  const closeDineInCartModalIfEmpty = (remainingItemCount: number) => {
    if (
      mode === "Dine-in" &&
      showDineInCartModal &&
      dineInCartState === "idle" &&
      remainingItemCount === 0
    ) {
      setShowDineInCartModal(false);
    }
  };

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

  const loadUserData = useCallback(async (forceRefresh = false) => {
    const currentMode = modeRef.current;
    const shouldForceCartRefresh = forceCartRefreshOnResume.current;
    forceCartRefreshOnResume.current = false;
    const startedAt = Date.now();
    const loadId = ++homeDataLoadId.current;
    const branchSelectionVersionAtLoad = branchSelectionVersion.current;
    let cartBranchId = activeBranchRef.current?.id;
    const guestCartPromise = readGuestCartSnapshot();
    const savedBranchPromise = readSavedBranchId();
    const normalizeAddresses = (loadedAddresses: CustomerAddress[]) =>
      loadedAddresses.map((address: any) => ({
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
    const normalizeBranches = (
      loadedBranches: CustomerBranch[],
      branchMode: string,
      addressId?: string | null,
    ) =>
      loadedBranches.map((branch: any) => {
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
            branchMode === "Delivery" ? addressId || undefined : undefined,
          name: activeName || branch.name,
          address: activeAddress || branch.address || branch.city || "",
        };
      });
    const applyFreshAddresses = (loadedAddresses: CustomerAddress[]) => {
      if (loadId !== homeDataLoadId.current) return;
      const options = normalizeAddresses(loadedAddresses);
      setAddresses(options);
      const currentAddress = activeAddressRef.current;
      if (
        !currentAddress ||
        (currentAddress.id &&
          !options.some((address: any) => address.id === currentAddress.id))
      ) {
        const selectedAddress =
          options.find((address: any) => address.isDefault) ||
          options[0] ||
          null;
        if (!activeAddressId && selectedAddress?.id) {
          skipAddressBootstrapLoad.current = selectedAddress.id;
        }
        setActiveAddress(selectedAddress);
      }
    };
    const applyFreshBranches = (loadedBranches: CustomerBranch[]) => {
      if (loadId !== homeDataLoadId.current) return [];
      const options = normalizeBranches(
        loadedBranches,
        currentMode,
        activeAddressId,
      );
      setBranches(options);
      setBranchesLoaded(true);
      const isEligible = (branch: CustomerBranch) =>
        isGuest
          ? isOnlineBranch(branch)
          : currentMode === "Delivery"
            ? isDeliveryBranchEligible(branch, activeAddressLocation)
            : isOnlineBranch(branch);
      const chooseAvailableBranch = (preferredBranchId?: string | null) => {
        const eligibleBranches = options.filter(isEligible);
        return (
          chooseNearestOnlineBranch(
            eligibleBranches,
            activeAddressLocation,
            preferredBranchId,
          ) || chooseNearestOnlineBranch(options, activeAddressLocation)
        );
      };
      const currentBranch = activeBranchRef.current;
      if (
        !currentBranch ||
        !options.some((branch: any) => branch.id === currentBranch.id && isEligible(branch))
      ) {
        void savedBranchPromise.then((savedBranchId) => {
          if (
            loadId !== homeDataLoadId.current ||
            branchSelectionVersion.current !== branchSelectionVersionAtLoad
          ) {
            return;
          }
          const latestBranch = activeBranchRef.current;
          if (
            latestBranch &&
            options.some(
              (branch: any) =>
                branch.id === latestBranch.id && isEligible(branch),
            )
          ) {
            return;
          }
          setActiveBranch(
            chooseAvailableBranch(
              latestBranch?.id || savedBranchId,
            ),
          );
        });
      }
      return options;
    };
    const applyCategories = (loadedCategories: CustomerCategory[]) => {
      if (loadId !== homeDataLoadId.current) return;
      setCategories(
        loadedCategories
          .filter((category: any) => category.isActive)
          .sort(
            (first: any, second: any) =>
              (first.sortOrder || 0) - (second.sortOrder || 0),
          )
          .map((category: any) => ({
            ...category,
            id: category._id,
          })),
      );
    };
    const applyOffers = (loadedOffers: CustomerOffer[]) => {
      if (loadId !== homeDataLoadId.current) return;
      setOffersLoaded(true);
      setOffers(
        loadedOffers
          .filter((offer: any) => offer.isActive)
          .map((offer: any) => ({
            ...offer,
            id: offer.id || offer._id || "",
            subtitle: offer.description || "",
            image: offer.imageUrl || "",
          })),
      );
    };
    const accountDataPromise = (async () => {
      const token = await authApi.getAccessToken();
      if (!token) {
        return {
          token: null,
          favoriteResult: null,
          addressResult: null,
        };
      }

      void api.getMyProfile().catch((error: unknown) => {
        console.warn("Unable to prefetch the customer profile.", error);
      });
      void api.getOrders().catch((error: unknown) => {
        console.warn("Unable to prefetch customer orders.", error);
      });
      void api.getNotifications().catch((error: unknown) => {
        console.warn("Unable to prefetch customer notifications.", error);
      });

      const [favoriteResult, addressResult] = await Promise.allSettled([
        measureHomeRequest(
          "favorites",
          api.getFavorites(forceRefresh, (favorites) =>
            loadId === homeDataLoadId.current &&
            setFavorites(getFavoriteIds(favorites)),
          ),
        ),
        measureHomeRequest(
          "addresses",
          api.getAddresses(forceRefresh, applyFreshAddresses),
        ),
      ]);
      return { token, favoriteResult, addressResult };
    })().then(
      (data) => ({ status: "fulfilled" as const, data }),
      (error: unknown) => ({ status: "rejected" as const, error }),
    );

    const categoryDataPromise = measureHomeRequest(
      "categories",
      api.getCategories(forceRefresh, applyCategories),
    ).then(
      applyCategories,
      (error: unknown) => {
        console.warn("Unable to load home categories.", error);
      },
    );
    const branchDataPromise = measureHomeRequest(
      "branches",
      currentMode === "Delivery" && activeAddressId
        ? api.getNearbyBranches(
            activeAddressId,
            forceRefresh,
            applyFreshBranches,
          )
        : api.getBranches(forceRefresh, applyFreshBranches),
    ).then(
      (loadedBranches) => {
        const options = applyFreshBranches(loadedBranches);
        return { ok: true as const, options };
      },
      (error: unknown) => {
        setBranchesLoaded(true);
        console.warn("Unable to load restaurant branches.", error);
        return { ok: false as const, options: [] };
      },
    );
    const offerDataPromise = measureHomeRequest(
      "offers",
      api.getOffers(forceRefresh, applyOffers),
    ).then(
      applyOffers,
      (error: unknown) => {
        setOffersLoaded(true);
        console.warn("Unable to load home offers.", error);
      },
    );

    try {
      const [
        branchData,
        accountData,
        guestCartSnapshot,
        savedBranchId,
      ] = await Promise.all([
        branchDataPromise,
        accountDataPromise,
        guestCartPromise,
        savedBranchPromise,
      ]);
      if (loadId !== homeDataLoadId.current) return;
      if (accountData.status === "rejected") throw accountData.error;

      const {
        token,
        favoriteResult,
        addressResult,
      } = accountData.data;
      if (guestParam === "true" && !isGuest) setIsGuest(true);
      if (guestParam === "false" && token && isGuest) setIsGuest(false);
      const restorePendingGuestCart = () => {
        if (
          !guestCartSnapshot ||
          guestCartSnapshot.mode !== currentMode
        ) {
          return;
        }

        if (
          !activeBranchRef.current &&
          guestCartSnapshot.branch?.id === guestCartSnapshot.branchId
        ) {
          setActiveBranch(guestCartSnapshot.branch);
        }
        const localItems = [
          ...(guestCartSnapshot.transferredItems || []),
          ...guestCartSnapshot.items,
        ].map((item) => ({
          ...item,
          localOnly: true,
        }));
        if (currentMode === "Delivery") {
          setDeliveryCartsByBranch((previous) => ({
            ...previous,
            [guestCartSnapshot.branchId]: localItems,
          }));
          setCarts((previous) => ({ ...previous, Delivery: localItems }));
        } else {
          setCarts((previous) => ({
            ...previous,
            [currentMode]: localItems,
          }));
        }
        setCartBranchId(guestCartSnapshot.branchId);
      };
      if (favoriteResult?.status === "fulfilled") {
        setFavorites(getFavoriteIds(favoriteResult.value));
      } else if (favoriteResult?.status === "rejected") {
        console.warn("Unable to load customer favorites.", favoriteResult.reason);
      }

      let resolvedAddress = activeAddressRef.current;
      if (addressResult?.status === "fulfilled") {
        const addressOptions = normalizeAddresses(addressResult.value);
        const selectedAddress =
          addressOptions.find(
            (address: any) => address.id === activeAddressRef.current?.id,
          ) ||
          addressOptions.find((address: any) => address.isDefault) ||
          addressOptions[0] ||
          null;
        resolvedAddress = selectedAddress;
        setAddresses(addressOptions);
        if (selectedAddress?.id !== activeAddressRef.current?.id) {
          if (!activeAddressId && selectedAddress?.id) {
            skipAddressBootstrapLoad.current = selectedAddress.id;
          }
          setActiveAddress(selectedAddress);
        }
      } else if (addressResult?.status === "rejected") {
        console.warn("Unable to load customer addresses.", addressResult.reason);
      }

      const resolvedAddressId = resolvedAddress?.id;
      const resolvedAddressLocation =
        resolvedAddressId ||
        resolvedAddress?._id ||
        resolvedAddress?.lat !== undefined ||
        resolvedAddress?.lng !== undefined
          ? {
              id: resolvedAddressId,
              _id: resolvedAddress?._id,
              lat: resolvedAddress?.lat,
              lng: resolvedAddress?.lng,
            }
          : activeAddressLocation;

      if (branchData.ok) {
        let branchOptions = branchData.options;
        const isBranchEligible = (branch: CustomerBranch) =>
          isGuest
            ? isOnlineBranch(branch)
            : currentMode === "Delivery"
              ? isDeliveryBranchEligible(branch, resolvedAddressLocation)
              : isOnlineBranch(branch);
        const currentBranch = activeBranchRef.current;
        const eligibleBranches = branchOptions.filter(isBranchEligible);
        let selectedBranch =
          branchOptions.find(
            (branch) =>
              branch.id === currentBranch?.id &&
              ((isGuest && branchSelectionVersionAtLoad > 0) ||
                isBranchEligible(branch)),
          ) ||
          branchOptions.find(
            (branch) =>
              branch.id === savedBranchId && isBranchEligible(branch),
          ) ||
          chooseNearestOnlineBranch(
            eligibleBranches,
            resolvedAddressLocation,
            savedBranchId,
          ) ||
          branchOptions.find(
            (branch) =>
              guestCartSnapshot?.mode === currentMode &&
              branch.id === guestCartSnapshot.branchId,
          ) ||
          (guestCartSnapshot?.mode === currentMode &&
          guestCartSnapshot.branch?.id === guestCartSnapshot.branchId
            ? guestCartSnapshot.branch
            : null) ||
          chooseNearestOnlineBranch(branchOptions, resolvedAddressLocation);

        if (
          !selectedBranch &&
          currentMode === "Delivery" &&
          !activeAddressId &&
          resolvedAddressId
        ) {
          try {
            const nearbyBranches = await measureHomeRequest(
              "nearby branches",
              api.getNearbyBranches(resolvedAddressId, forceRefresh),
            );
            branchOptions = nearbyBranches.map((branch: any) => ({
              ...branch,
              id: branch._id,
              distanceAddressId: resolvedAddressId,
              name:
                branch.restaurantNames?.find(
                  (option: any) => option.isActive,
                )?.name || branch.name,
              address:
                branch.storeAddresses?.find(
                  (option: any) => option.isActive,
                )?.address ||
                branch.address ||
                branch.city ||
                "",
            }));
            setBranches(branchOptions);
            selectedBranch =
              branchOptions.find(isBranchEligible) || null;
          } catch (error) {
            console.warn("Unable to load nearby restaurant branches.", error);
          }
        }

        if (branchSelectionVersion.current === branchSelectionVersionAtLoad) {
          setActiveBranch(selectedBranch);
        } else {
          selectedBranch = activeBranchRef.current;
        }
        cartBranchId = selectedBranch?.id;
        setBranchesLoaded(true);
      }

      if (!token) {
        await Promise.all([categoryDataPromise, offerDataPromise]);
        restorePendingGuestCart();
        setCartLoaded(true);
        return;
      }

      if (!cartBranchId || (currentMode === "Delivery" && !resolvedAddressId)) {
        restorePendingGuestCart();
        setCartLoaded(true);
        return;
      }

      const selectedCartBranchId = cartBranchId;
      const cartContext = getCartContext(
        selectedCartBranchId,
        currentMode,
        resolvedAddressId,
      );
      const applyServerCart = (
        cart: CustomerCart,
        fallbackBranchId: string,
        pendingItems: any[] = [],
      ) => {
        const cartItems = [
          ...toCartCardItems(cart, menuItemsRef.current),
          ...pendingItems.map((item) => ({ ...item, localOnly: true })),
        ];
        setCarts({
          Delivery: cartItems,
          "Dine-in": cartItems,
          Takeaway: cartItems,
        });
        const resolvedBranchId = cart.branchId || fallbackBranchId;
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
      };
      const matchingGuestCart =
        guestCartSnapshot?.mode === currentMode &&
        guestCartSnapshot.branchId === selectedCartBranchId &&
        (guestCartSnapshot.syncCompleted ||
          guestCartSnapshot.items.length > 0 ||
          Boolean(guestCartSnapshot.transferredItems?.length));
      const cartRequestStartedAt = Date.now();
      const cartResult = await Promise.allSettled([
        measureHomeRequest(
          "cart cache-first",
          matchingGuestCart
            ? api.getCart(cartContext)
            : api.getCachedCart(
                cartContext,
                  forceRefresh || shouldForceCartRefresh,
                (updatedCart) => {
                    if (__DEV__) {
                      console.info(
                        `[Home data] cart background refresh: ${Date.now() - cartRequestStartedAt}ms`,
                      );
                    }
                  if (
                    loadId === homeDataLoadId.current &&
                    pendingCartMutations.current === 0
                  ) {
                    applyServerCart(updatedCart, selectedCartBranchId);
                  }
                },
              ),
        ),
      ]);
      if (cartResult[0].status === "fulfilled") {
        let cart = cartResult[0].value;
        let pendingItems: any[] = [];
        let guestCartSyncSucceeded = false;
        if (
          guestCartSnapshot?.mode === currentMode &&
          guestCartSnapshot.branchId === selectedCartBranchId
        ) {
          const syncResult = await syncGuestCartSnapshot(
            guestCartSnapshot,
            cartContext,
          );
          if (syncResult.syncCompleted) {
            cart = await api.getCachedCart(cartContext, true);
            await writeGuestCartSnapshot(null);
            guestCartSyncSucceeded = true;
          } else {
            pendingItems = [
              ...syncResult.transferredItems,
              ...syncResult.pendingItems,
            ];
          }
        }

        applyServerCart(
          cart,
          selectedCartBranchId,
          guestCartSyncSucceeded ? [] : pendingItems,
        );
      } else {
        console.warn("Unable to load the customer cart.", cartResult[0].reason);
        restorePendingGuestCart();
      }
      await Promise.all([categoryDataPromise, offerDataPromise]);
    } catch (error) {
      console.warn("Unable to load customer account data.", error);
    } finally {
      if (__DEV__) {
        console.info(
          `[Home data] bootstrap total: ${Date.now() - startedAt}ms`,
        );
      }
      setCartLoaded(true);
      setBranchesLoaded(true);
    }
  }, [activeAddressId, activeAddressLocation, guestParam, isGuest]);

  const refreshHomeData = useCallback(async () => {
    setIsRefreshingHome(true);
    setMenuRefreshVersion((version) => version + 1);
    setFeaturedRefreshVersion((version) => version + 1);
    try {
      await loadUserData(true);
    } finally {
      setIsRefreshingHome(false);
    }
  }, [loadUserData]);

  useEffect(() => {
    modeRef.current = mode;
    if (previousBootstrapMode.current === mode) return;
    previousBootstrapMode.current = mode;
    homeDataLoadId.current += 1;
  }, [mode]);

  useEffect(() => {
    const modeChanged = previousCartMode.current !== mode;
    previousCartMode.current = mode;
    const requestId = ++modeCartRequestId.current;
    const branchId = activeBranch?.id;
    const addressId = activeAddress?.id;
    if (
      !modeChanged ||
      isGuest ||
      !branchId ||
      (mode === "Delivery" && !addressId)
    ) {
      return;
    }

    const context = getCartContext(branchId, mode, addressId);
    const applyModeCart = (cart: CustomerCart) => {
      if (
        requestId !== modeCartRequestId.current ||
        modeRef.current !== mode ||
        pendingCartMutations.current > 0
      ) {
        return;
      }
      const cartItems = toCartCardItems(cart, menuItemsRef.current);
      const resolvedBranchId = cart.branchId || branchId;
      setCarts((previous) => ({ ...previous, [mode]: cartItems }));
      if (mode === "Delivery") {
        setDeliveryCartsByBranch((previous) => ({
          ...previous,
          [resolvedBranchId]: cartItems,
        }));
        setDeliveryOptionByBranch((previous) => ({
          ...previous,
          [resolvedBranchId]: cart.deliveryOptionId || undefined,
        }));
      }
      setCartBranchId(resolvedBranchId);
      setCartPricing(cart.pricing);
      setCartLoaded(true);
    };

    void authApi
      .getAccessToken()
      .then((accessToken) => {
        if (!accessToken || requestId !== modeCartRequestId.current) return;
        return api
          .getCachedCart(context, false, applyModeCart)
          .then(applyModeCart);
      })
      .catch((error: unknown) => {
        if (requestId === modeCartRequestId.current) {
          console.warn("Unable to load the selected mode cart.", error);
        }
      });

    return () => {
      if (requestId === modeCartRequestId.current) {
        modeCartRequestId.current += 1;
      }
    };
  }, [activeAddress?.id, activeBranch?.id, isGuest, mode]);

  useEffect(() => {
    if (skipAddressBootstrapLoad.current === activeAddressId) {
      skipAddressBootstrapLoad.current = null;
      return;
    }
    void loadUserData();
  }, [activeAddressId, loadUserData]);

  useEffect(() => {
    let shouldRefreshOnResume = false;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        shouldRefreshOnResume = true;
      } else if (shouldRefreshOnResume) {
        shouldRefreshOnResume = false;
        forceCartRefreshOnResume.current = true;
        void loadUserData();
      }
    });
    return () => subscription.remove();
  }, [loadUserData]);

  useEffect(() => {
    const requestId = ++deliveryMenuRequestId.current;
    if (
      !activeBranch?.id ||
      !activeBranch.isActive ||
      activeBranch.isOnline === false
    ) {
      return;
    }
    const forceRefreshMenu =
      menuRefreshVersion !== lastMenuRefreshVersion.current;
    lastMenuRefreshVersion.current = menuRefreshVersion;

    const fulfillmentType =
      mode === "Delivery"
        ? "delivery"
        : mode === "Takeaway"
          ? "takeaway"
          : "dine-in";
    const address =
      mode === "Delivery" ? activeAddress?.id : undefined;
    if (mode === "Delivery" && !address && !isGuest) return;
    const applyMenuItems = (items: CustomerMenuItem[]) => {
      if (requestId !== deliveryMenuRequestId.current) return;
      rawMenuItemsRef.current = items;
      rawMenuBranchIdRef.current = activeBranch.id;
      const mapped = mapMenuCardItems(
        items,
        categoriesRef.current,
        menuCardItemsCache.current,
      );
      menuCardItemsCache.current = mapped.cache;
      setMenuItems(mapped.items);
      setMenuItemsLoadedForBranchId(activeBranch.id);
    };

    const menuRequestStartedAt = Date.now();
    void measureHomeRequest(
      "branch menu",
      api.getMenuItems({
        branchId: activeBranch.id,
        address,
        fulfillmentType,
        stock: "all",
      }, forceRefreshMenu, (items) => {
        if (__DEV__) {
          console.info(
            `[Home data] branch menu background refresh: ${Date.now() - menuRequestStartedAt}ms`,
          );
        }
        applyMenuItems(items);
      }),
    )
      .then(applyMenuItems)
      .catch((error: unknown) => {
        if (requestId !== deliveryMenuRequestId.current) return;
        setMenuItems([]);
        rawMenuItemsRef.current = [];
        rawMenuBranchIdRef.current = null;
        setMenuItemsLoadedForBranchId(activeBranch.id);
        if (!isUnavailableRestaurantError(error)) {
          console.warn("Unable to load the branch menu.", error);
        }
      });

    return () => {
      if (requestId === deliveryMenuRequestId.current) {
        deliveryMenuRequestId.current += 1;
      }
    };
  }, [
    activeAddress?.id,
    activeBranch?.id,
    activeBranch?.isActive,
    activeBranch?.isOnline,
    isGuest,
    menuRefreshVersion,
    mode,
  ]);

  useEffect(() => {
    if (rawMenuBranchIdRef.current !== activeBranch?.id) return;
    const mapped = mapMenuCardItems(
      rawMenuItemsRef.current,
      categories,
      menuCardItemsCache.current,
    );
    menuCardItemsCache.current = mapped.cache;
    setMenuItems(mapped.items);
  }, [activeBranch?.id, categories]);

  useEffect(() => {
    const requestId = ++featuredReelsRequestId.current;
    const branchId = activeBranch?.id;
    if (!branchId) return;
    const forceRefreshFeatured =
      featuredRefreshVersion !== lastFeaturedRefreshVersion.current;
    lastFeaturedRefreshVersion.current = featuredRefreshVersion;

    const applyFeaturedReels = (reels: CustomerFeaturedReel[]) => {
      if (requestId !== featuredReelsRequestId.current) return;
      setFeaturedReels(
        reels
          .filter((reel) => reel.isActive !== false)
          .sort(
            (first, second) =>
              (first.displayOrder || 0) - (second.displayOrder || 0),
          ),
      );
      setFeaturedReelsLoadedForBranchId(branchId);
    };

    void api
      .getFeaturedReels(branchId, forceRefreshFeatured, applyFeaturedReels)
      .then(applyFeaturedReels)
      .catch((error: unknown) => {
        if (requestId !== featuredReelsRequestId.current) return;
        setFeaturedReels([]);
        setFeaturedReelsLoadedForBranchId(branchId);
        console.warn("Unable to load featured content.", error);
      });

    return () => {
      if (requestId === featuredReelsRequestId.current) {
        featuredReelsRequestId.current += 1;
      }
    };
  }, [activeBranch?.id, featuredRefreshVersion]);

  const reloadCart = useCallback(
    async (expectedBranchId?: string) => {
      const branchId = expectedBranchId || activeBranch?.id;
      if (!branchId) {
        throw new Error("Choose a restaurant branch before loading your cart.");
      }

      const cart = await api.getCachedCart(
        getCartContext(branchId, mode, activeAddress?.id),
        true,
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
    if (isGuest) {
      branchSelectionVersion.current += 1;
      setActiveBranch(branch);
      if (mode === "Delivery") {
        setCartBranchId(branch.id);
        setCarts((previous) => ({
          ...previous,
          Delivery: deliveryCartsByBranch[branch.id] || [],
        }));
      }
      return;
    }
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
    branchSelectionVersion.current += 1;
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
    if (isGuest) {
      promptGuestSignUp();
      return null;
    }
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
    if (isGuest) {
      promptGuestSignUp();
      return null;
    }
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
    if (isGuest) {
      router.push({
        pathname: "/(auth)/login",
        params: {
          favoriteItemId: id,
          ...(activeBranch?.id ? { branchId: activeBranch.id } : {}),
        },
      });
      return;
    }

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

  const finishCartMutation = (branchId: string) => {
    pendingCartMutations.current = Math.max(
      pendingCartMutations.current - 1,
      0,
    );
    if (pendingCartMutations.current === 0) {
      void measureHomeRequest(
        "cart refresh after update",
        reloadCart(branchId),
      ).catch((error: unknown) => {
        console.warn("Unable to refresh the cart after an update.", error);
      });
    }
  };

  const handleAddToCart = async (
    item: any,
    quantity: number,
    addons: CustomerCustomizationSelection[],
    totalAmount: number,
  ): Promise<boolean> => {
    if (isGuest) {
      if (mode === "Dine-in" && dineInCartState === "waiting") {
        Alert.alert("Order Being Submitted", "Please wait for the order to finish.");
        return false;
      }

      const menuItemId = item?._id || item?.id;
      if (!menuItemId || !activeBranch?.id) {
        Alert.alert(
          "Unable to Update Cart",
          "Choose a restaurant branch before adding items.",
        );
        return false;
      }
      if (quantity > 0 && item?.isAvailable !== true) {
        Alert.alert("Unable to Add Item", "This item is out of stock.");
        return false;
      }

      const normalizedId = String(menuItemId);
      const customizationKey = getCartCustomizationKey(addons);
      const existing = activeCart.find(
        (cartItem) =>
          cartItem.id === normalizedId &&
          getCartCustomizationKey(cartItem.addons) === customizationKey,
      );

      if (quantity < 0) {
        if (!existing) return false;
        const updatedQuantity = existing.quantity + quantity;
        const unitTotal =
          Number(existing.total || 0) / Math.max(existing.quantity, 1);
        const nextCart =
          updatedQuantity <= 0
            ? activeCart.filter(
                (cartItem) => cartItem.cartItemId !== existing.cartItemId,
              )
            : activeCart.map((cartItem) =>
                cartItem.cartItemId === existing.cartItemId
                  ? {
                      ...cartItem,
                      quantity: updatedQuantity,
                      total: unitTotal * updatedQuantity,
                    }
                  : cartItem,
              );
        updateActiveCart(nextCart);
        return true;
      }

      if (quantity <= 0) return false;
      const unitPrice = totalAmount / quantity;
      const nextItem = {
        ...item,
        id: normalizedId,
        cartItemId:
          existing?.cartItemId ||
          `guest:${normalizedId}:${encodeURIComponent(customizationKey)}`,
        name: item.name || "Menu item",
        image: item.image || item.imageUrl || "",
        price: `₹${formatPrice(unitPrice)}`,
        quantity: (existing?.quantity || 0) + quantity,
        total: Number(existing?.total || 0) + totalAmount,
        addons,
        customizationDetails: getCartCustomizationDetails(
          addons,
          item.customizationGroups,
        ),
        localOnly: true,
      };
      updateActiveCart(
        existing
          ? activeCart.map((cartItem) =>
              cartItem.cartItemId === existing.cartItemId
                ? nextItem
                : cartItem,
            )
          : [...activeCart, nextItem],
      );
      return true;
    }
    if (mode === "Dine-in" && dineInCartState === "waiting") {
      Alert.alert("Order Being Submitted", "Please wait for the order to finish.");
      return false;
    }
    const menuItemId = item?._id || item?.id;
    const normalizedId =
      menuItemId === undefined || menuItemId === null
        ? ""
        : String(menuItemId);
    const branchId = activeBranch?.id;
    const customizationKey = getCartCustomizationKey(addons);
    const existing = activeCart.find(
      (cartItem) =>
        cartItem.id === normalizedId &&
        getCartCustomizationKey(cartItem.addons) === customizationKey,
    );
    const cartItemId = existing?.cartItemId;
    const isAdding = quantity > 0;
    let cartContext: CustomerCartContext | null = null;

    if (isAdding) {
      if (!normalizedId) {
        Alert.alert("Unable to Add Item", "This menu item is unavailable.");
        return false;
      }
      if (item?.isAvailable !== true) {
        Alert.alert("Unable to Add Item", "This item is out of stock.");
        return false;
      }
      if (!branchId) {
        Alert.alert(
          "Unable to Update Cart",
          "Choose a restaurant branch before adding items.",
        );
        return false;
      }
      try {
        cartContext = getCartContext(branchId, mode, activeAddress?.id);
      } catch (error) {
        Alert.alert(
          "Unable to Update Cart",
          error instanceof Error ? error.message : "Please try again.",
        );
        return false;
      }

      const unitPrice = totalAmount / quantity;
      const optimisticItem = {
        ...item,
        id: normalizedId,
        cartItemId:
          existing?.cartItemId ||
          `pending:${normalizedId}:${encodeURIComponent(customizationKey)}`,
        name: item.name || "Menu item",
        image: item.image || item.imageUrl || "",
        price: `₹${formatPrice(unitPrice)}`,
        quantity: (existing?.quantity || 0) + quantity,
        total: Number(existing?.total || 0) + totalAmount,
        addons,
        customizationDetails: getCartCustomizationDetails(
          addons,
          item.customizationGroups,
        ),
        pendingSync: true,
      };
      updateActiveCart(
        existing
          ? activeCart.map((cartItem) =>
              cartItem.cartItemId === existing.cartItemId
                ? optimisticItem
                : cartItem,
            )
          : [...activeCart, optimisticItem],
      );
      pendingCartMutations.current += 1;
    }

    let remainingCartTotalItems: number | null = null;
    try {
      if (!cartContext && branchId) {
        cartContext = getCartContext(branchId, mode, activeAddress?.id);
      }
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
        remainingCartTotalItems =
          activeCartTotalItems -
          existing.quantity +
          Math.max(updatedQuantity, 0);
        if (updatedQuantity <= 0) {
          await api.removeCartItem(cartItemId, cartContext);
        } else {
          await api.updateCartItem(cartItemId, updatedQuantity, cartContext);
        }
      } else {
        if (!branchId || !cartContext) {
          throw new Error("Choose a restaurant branch before adding items.");
        }
        await measureHomeRequest(
          "add cart item",
          api.addCartItem({
            menuItemId: String(menuItemId),
            quantity,
            selectedCustomizations: addons,
            ...cartContext,
          }),
        );
      }
      if (isAdding) {
        return true;
      }
      await reloadCart(branchId);
      if (remainingCartTotalItems !== null) {
        closeDineInCartModalIfEmpty(remainingCartTotalItems);
      }
      return true;
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
      return false;
    } finally {
      if (isAdding) {
        if (branchId) finishCartMutation(branchId);
        else {
          pendingCartMutations.current = Math.max(
            pendingCartMutations.current - 1,
            0,
          );
        }
      }
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
    if (existing.pendingSync) return;
    if (isGuest || existing.localOnly) {
        const updatedQuantity = existing.quantity - 1;
        const unitTotal =
          Number(existing.total || 0) / Math.max(existing.quantity, 1);
        const nextCart =
          updatedQuantity <= 0
            ? activeCart.filter(
                (cartItem) => cartItem.cartItemId !== existing.cartItemId,
              )
            : activeCart.map((cartItem) =>
                cartItem.cartItemId === existing.cartItemId
                  ? {
                      ...cartItem,
                      quantity: updatedQuantity,
                      total: unitTotal * updatedQuantity,
                    }
                  : cartItem,
              );
        updateActiveCart(nextCart);
        closeDineInCartModalIfEmpty(activeCartTotalItems - 1);
        return;
    }
    const branchId = activeBranch?.id;
    if (!branchId || (mode === "Delivery" && !activeAddress?.id)) {
      Alert.alert(
        "Unable to Update Cart",
        "Choose a restaurant branch and delivery address before updating your cart.",
      );
      return;
    }
    const cartContext = getCartContext(branchId, mode, activeAddress?.id);
    const updatedQuantity = existing.quantity - 1;
    const nextCart =
      updatedQuantity <= 0
        ? activeCart.filter(
            (cartItem) => cartItem.cartItemId !== existing.cartItemId,
          )
        : activeCart.map((cartItem) =>
            cartItem.cartItemId === existing.cartItemId
              ? {
                  ...cartItem,
                  quantity: updatedQuantity,
                  total:
                    (Number(existing.total || 0) /
                      Math.max(existing.quantity, 1)) *
                    updatedQuantity,
                  pendingSync: true,
                }
              : cartItem,
          );
    updateActiveCart(nextCart);
    closeDineInCartModalIfEmpty(activeCartTotalItems - 1);
    pendingCartMutations.current += 1;
    try {
      if (updatedQuantity > 0) {
        await measureHomeRequest(
          "update cart quantity",
          api.updateCartItem(
            existing.cartItemId,
            updatedQuantity,
            cartContext,
          ),
        );
      } else {
        await measureHomeRequest(
          "remove cart item",
          api.removeCartItem(existing.cartItemId, cartContext),
        );
        await removeCouponIfNoEligibleItems(nextCart, cartContext);
      }
    } catch (error) {
      Alert.alert(
        "Unable to Update Cart",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      finishCartMutation(branchId);
    }
  };

  const removeCouponIfNoEligibleItems = async (
    remainingCart: any[],
    cartContext: CustomerCartContext,
  ) => {
    const couponReference = getCouponReference(cartPricing?.coupon);
    if (!couponReference) return;

    const normalizedReference = couponReference.toUpperCase();
    const appliedOffer = offers.find((offer) =>
      [offer.code, offer.id, offer._id].some(
        (value) =>
          typeof value === "string" &&
          value.toUpperCase() === normalizedReference,
      ),
    );
    if (!appliedOffer) return;

    const hasEligibleItem = remainingCart.some(
      (item) =>
        appliedOffer.appliesToAllItems === true ||
        (appliedOffer.applicableMenuItemIds || []).includes(item.id),
    );
    if (!hasEligibleItem) await api.removeCartCoupon(cartContext);
  };

  const handleRemoveCartItems = async (
    itemsToRemove: { menuItemId: string; cartItemId?: string }[],
  ) => {
    if (isGuest) {
      updateActiveCart(
        activeCart.filter(
          (item) =>
            !itemsToRemove.some(
              ({ menuItemId, cartItemId }) =>
                item.id === menuItemId &&
                (!cartItemId || item.cartItemId === cartItemId),
            ),
        ),
      );
      return;
    }

    const localItemsToRemove = activeCart.filter(
      (item) =>
        item.localOnly &&
        itemsToRemove.some(
          ({ menuItemId, cartItemId }) =>
            item.id === menuItemId &&
            (!cartItemId || item.cartItemId === cartItemId),
        ),
    );
    const serverItemsToRemove = itemsToRemove.filter(({ menuItemId, cartItemId }) =>
      activeCart.some(
        (item) =>
          !item.localOnly &&
          !item.pendingSync &&
          item.id === menuItemId &&
          (!cartItemId || item.cartItemId === cartItemId),
      ),
    );
    if (serverItemsToRemove.length === 0) {
      if (localItemsToRemove.length > 0) {
        const localIds = new Set(
          localItemsToRemove.map((item) => item.cartItemId),
        );
        updateActiveCart(
          activeCart.filter((item) => !localIds.has(item.cartItemId)),
        );
      }
      return;
    }

    const branchId = activeBranch?.id;
    const cartContext = branchId
      ? getCartContext(branchId, mode, activeAddress?.id)
      : null;
    if (!branchId || !cartContext) {
      throw new Error("Choose a restaurant branch before updating your cart.");
    }

    const uniqueItems = [
      ...new Map(
        serverItemsToRemove.map((item) => [
          item.cartItemId || item.menuItemId,
          item,
        ]),
      ).values(),
    ];
    const cartItemRemovals = uniqueItems.flatMap(
      ({ menuItemId, cartItemId }) => {
        const matchingItems = activeCart.filter(
          (item) =>
            !item.localOnly &&
            !item.pendingSync &&
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

    const removedCartItemIds = new Set(
      cartItemRemovals.map((item) => item.cartItemId),
    );
    const localCartItemIds = new Set(
      localItemsToRemove.map((item) => item.cartItemId),
    );
    const optimisticCart = activeCart.filter(
      (item) =>
        !removedCartItemIds.has(item.cartItemId) &&
        !localCartItemIds.has(item.cartItemId),
    );
    updateActiveCart(optimisticCart);
    pendingCartMutations.current += 1;
    try {
      const results = await Promise.all(
        cartItemRemovals.map(({ cartItemId }) =>
          measureHomeRequest(
            "remove cart item",
            api.removeCartItem(cartItemId, cartContext),
          ).then(
            () => ({ status: "fulfilled", value: undefined }) as const,
            (reason: unknown) => ({ status: "rejected", reason }) as const,
          ),
        ),
      );
      const successfullyRemovedIds = new Set(
        results.flatMap((result, index) =>
          result.status === "fulfilled"
            ? [cartItemRemovals[index].cartItemId]
            : [],
        ),
      );
      const remainingCart = activeCart.filter(
        (item) => !successfullyRemovedIds.has(item.cartItemId),
      );
      let couponRemovalError: unknown;
      try {
        await removeCouponIfNoEligibleItems(remainingCart, cartContext);
      } catch (error) {
        couponRemovalError = error;
      }

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
      if (failures.length > 0 || couponRemovalError) {
        const couponFailure = couponRemovalError
          ? `Coupon: ${
              couponRemovalError instanceof Error
                ? couponRemovalError.message
                : "Unable to remove the coupon."
            }`
          : null;
        throw new Error(
          [
            failures.length > 0
              ? `Some items could not be removed:\n${failures.join("\n")}`
              : null,
            couponFailure,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
    } finally {
      finishCartMutation(branchId);
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
      const waitForMinute = async (): Promise<boolean> => {
        const deadline = Date.now() + 60_000;
        dineInSubmissionPhaseRef.current = "preparing";
        setDineInSubmissionPhase("preparing");
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

      if (!(await waitForMinute())) return;
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
      if (dineInSubmissionId.current !== submissionId) return;
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
    setShowDineInCartModal(false);
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
          isGuest,
          promptGuestSignUp,
          clearLocalGuestCart,
          setMode,
          carts,
          setCarts,
          menuItems,
          menuItemsLoadedForBranchId,
          categories,
          offers,
          offersLoaded,
          featuredReels,
          featuredReelsLoaded: Boolean(
            activeBranch?.id &&
              featuredReelsLoadedForBranchId === activeBranch.id,
          ),
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
                onPress={async () => {
                  if (isGuest) {
                    if (activeBranch?.id && isOrderMode(mode)) {
                      await writeGuestCartSnapshot({
                        mode,
                        branchId: activeBranch.id,
                        items: activeCart.filter(
                          (item) => item.localOnly === true,
                        ),
                        branch: activeBranch,
                      });
                    }
                    router.push({
                      pathname: "/(auth)/login",
                      params: {
                        continueToCart: "true",
                        cartMode: mode,
                        ...(activeBranch?.id
                          ? { branchId: activeBranch.id }
                          : {}),
                      },
                    });
                    return;
                  }
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
                            ? dineInSubmissionPhase === "submitting"
                              ? "Submitting your order to the kitchen..."
                              : `Your order will be sent to the kitchen in ${formatCountdown(dineInSubmissionSecondsLeft)}.`
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
