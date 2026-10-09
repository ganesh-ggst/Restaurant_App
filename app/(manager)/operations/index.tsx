import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";
import {
  OperationsCategory,
  OperationsDashboard,
  OperationsMenuItem,
  OperationsOffer,
  operationsApi,
} from "../../../services/api/operations";
import { operationsCache } from "../../../services/api/operations-cache";
import { managerProfileApi } from "../../../services/api/manager-profile";
import { getManagerDestination } from "../../../services/authRouting";

const TERMINAL_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "completed",
  "delivered",
  "failed",
  "rejected",
  "refunded",
]);

function isOperationsMenuItem(value: unknown): value is OperationsMenuItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    typeof value._id === "string" &&
    value._id.length > 0 &&
    "name" in value &&
    typeof value.name === "string"
  );
}

interface ExclusiveOffersSectionProps {
  offers: OperationsOffer[];
  error: string;
  cardWidth: number;
  textColor: string;
  mutedColor: string;
  primaryColor: string;
  dangerColor: string;
  borderColor: string;
  onModify: () => void;
  onSelectOffer: (offer: OperationsOffer) => void;
}

const ExclusiveOffersSection = memo(function ExclusiveOffersSection({
  offers,
  error,
  cardWidth,
  textColor,
  mutedColor,
  primaryColor,
  dangerColor,
  borderColor,
  onModify,
  onSelectOffer,
}: ExclusiveOffersSectionProps) {
  return (
    <>
      <View className="mb-3 mt-6 flex-row items-center justify-between">
        <Text className="text-xl font-bold" style={{ color: textColor }}>
          Exclusive Offers
        </Text>
        <Pressable
          onPress={onModify}
          accessibilityRole="button"
          accessibilityLabel="Modify exclusive offers"
        >
          <Text className="text-sm font-bold" style={{ color: primaryColor }}>
            Modify
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Card variant="default" className="mb-3 rounded-2xl border-0 p-5">
          <Text className="text-center text-sm" style={{ color: dangerColor }}>
            {error}
          </Text>
        </Card>
      ) : offers.length ? (
        <>
        <ScrollView
          horizontal
          style={{ width: cardWidth }}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ width: cardWidth * offers.length }}
        >
          {offers.map((offer) => (
            <Pressable
              key={offer.id || offer._id || offer.code}
              onPress={() => onSelectOffer(offer)}
              accessibilityRole="button"
              accessibilityLabel={`View and edit ${offer.title}`}
              style={{ width: cardWidth }}
            >
              <Card
                variant="default"
                className="mb-3 h-[150px] w-full rounded-3xl border p-4"
                style={{
                  width: cardWidth,
                  height: 150,
                  borderColor,
                }}
              >
                <View className="flex-1 justify-between">
                  <View>
                    <Text
                      className="text-2xl font-black"
                      style={{ color: textColor }}
                      numberOfLines={1}
                    >
                      {offer.title}
                    </Text>
                    <Text
                      className="mt-2 text-sm"
                      style={{ color: mutedColor }}
                      numberOfLines={2}
                    >
                      {offer.description || "Exclusive store offer"}
                    </Text>
                  </View>
                  <View className="flex-row items-end justify-between gap-3">
                    <View
                      className="max-w-[75%] rounded-full border border-dashed px-4 py-2"
                      style={{ borderColor }}
                    >
                      <Text
                        className="text-xs font-black tracking-wider"
                        style={{ color: textColor }}
                        numberOfLines={1}
                      >
                        CODE: {offer.code}
                      </Text>
                    </View>
                    <Text
                      className="mb-1 text-xs font-black"
                      style={{ color: primaryColor }}
                    >
                      {offer.applicableItemCount ??
                        offer.applicableMenuItemIds?.length ??
                        0}{" "}
                      ITEMS
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
        {offers.length > 1 ? (
          <View className="mb-3 -mt-1 flex-row items-center justify-end">
            <Text className="mr-1 text-xs font-semibold" style={{ color: mutedColor }}>
              Swipe to view more offers
            </Text>
            <Feather name="arrow-right" size={14} color={primaryColor} />
          </View>
        ) : null}
        </>
      ) : (
        <Card variant="default" className="mb-3 rounded-2xl border-0 p-5">
          <Text className="text-center text-sm" style={{ color: mutedColor }}>
            There are no running offers.
          </Text>
        </Card>
      )}
    </>
  );
});

export default function OperationsDashboardScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const offerCardWidth = Math.max(0, windowWidth - 40);
  const categoryCardWidth = Math.max(0, (windowWidth - 64) / 3);
  const categoryManagerModalHeight = Math.min(
    720,
    windowHeight - insets.top - insets.bottom - 48,
  );
  const candidateModalHeight = Math.min(
    560,
    windowHeight - insets.top - insets.bottom - 32,
  );
  const { currentManager, loading: managerLoading, error: managerError } =
    useCurrentManager();
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [categories, setCategories] = useState<OperationsCategory[]>([]);
  const [offers, setOffers] = useState<OperationsOffer[]>([]);
  const [activeOffers, setActiveOffers] = useState<OperationsOffer[]>([]);
  const [inventory, setInventory] = useState<OperationsMenuItem[]>([]);
  const [quickInventorySearch, setQuickInventorySearch] = useState("");
  const [inventoryStockFilter, setInventoryStockFilter] = useState<
    "all" | "inStock" | "outOfStock"
  >("all");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<
    "all" | "veg" | "nonVeg"
  >("all");
  const [candidates, setCandidates] = useState<OperationsMenuItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dataWarning, setDataWarning] = useState("");
  const [savingItemId, setSavingItemId] = useState("");
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryManagerView, setCategoryManagerView] = useState<
    "list" | "create"
  >("list");
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState("");
  const [isOfferManagerOpen, setIsOfferManagerOpen] = useState(false);
  const [isOfferFormOpen, setIsOfferFormOpen] = useState(false);
  const [returnToOfferManager, setReturnToOfferManager] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [offerDiscountType, setOfferDiscountType] = useState("flat");
  const [offerItemSearch, setOfferItemSearch] = useState("");
  const [offerItems, setOfferItems] = useState<OperationsMenuItem[]>([]);
  const [offerApplicableItemIds, setOfferApplicableItemIds] = useState<string[]>([]);
  const [savingOffer, setSavingOffer] = useState(false);
  const [savingOfferId, setSavingOfferId] = useState("");
  const [togglingOfferId, setTogglingOfferId] = useState("");
  const [offerError, setOfferError] = useState("");
  const [offerManagerError, setOfferManagerError] = useState("");
  const [isCheckedIn, setIsCheckedIn] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [offerKeyboardHeight, setOfferKeyboardHeight] = useState(0);
  const [pulse] = useState(() => new Animated.Value(1));
  const offerFormScrollRef = useRef<ScrollView>(null);
  const applicableItemsOffset = useRef(0);
  const shouldScrollToApplicableItems = useRef(false);
  const dashboardScrollRef = useRef<ScrollView>(null);
  const quickInventoryOffset = useRef(0);
  const shouldScrollToQuickInventory = useRef(false);

  const scrollToApplicableItems = () => {
    offerFormScrollRef.current?.scrollTo({
      y: Math.max(0, applicableItemsOffset.current - 8),
      animated: true,
    });
    shouldScrollToApplicableItems.current = false;
  };

  const scrollToQuickInventory = (preservePendingKeyboardScroll = false) => {
    dashboardScrollRef.current?.scrollTo({
      y: Math.max(0, quickInventoryOffset.current),
      animated: true,
    });
    if (!preservePendingKeyboardScroll) {
      shouldScrollToQuickInventory.current = false;
    }
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setOfferKeyboardHeight(event.endCoordinates.height);
        if (shouldScrollToApplicableItems.current) {
          setTimeout(scrollToApplicableItems, 80);
        }
        if (shouldScrollToQuickInventory.current) {
          setTimeout(scrollToQuickInventory, 100);
        }
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setOfferKeyboardHeight(0);
      shouldScrollToQuickInventory.current = false;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const loadDashboard = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);
    setError("");
    setDataWarning("");
    try {
      const dashboardData = await operationsApi.getDashboard();
      setDashboard(dashboardData);
      const dashboardCategories = Array.isArray(dashboardData.categories)
        ? dashboardData.categories
        : [];
      setCategories(dashboardCategories);
      operationsCache.setCategories(dashboardCategories);
      setActiveOffers(
        Array.isArray(dashboardData.offers)
          ? dashboardData.offers.filter((offer) => offer.isActive === true)
          : [],
      );
      setOfferError("");

      const [inventoryResult, candidateResult, notificationsResult, managerOffersResult] =
        await Promise.allSettled([
          operationsApi.getInventory(),
          operationsApi.getInventoryCandidates(),
          managerProfileApi.getNotifications(),
          operationsApi.getManagerOffers(),
        ]);
      const supportingErrors: string[] = [];

      if (inventoryResult.status === "fulfilled") {
        setInventory(inventoryResult.value.filter(isOperationsMenuItem));
      } else {
        supportingErrors.push(
          `Quick inventory: ${inventoryResult.reason instanceof Error ? inventoryResult.reason.message : "Unable to load."}`,
        );
      }
      if (candidateResult.status === "fulfilled") {
        setCandidates(candidateResult.value.filter(isOperationsMenuItem));
      } else {
        supportingErrors.push(
          `Inventory candidates: ${candidateResult.reason instanceof Error ? candidateResult.reason.message : "Unable to load."}`,
        );
      }
      const uniqueOfferItems = new Map<string, OperationsMenuItem>();
      if (inventoryResult.status === "fulfilled") {
        inventoryResult.value
          .filter(isOperationsMenuItem)
          .forEach((item) => uniqueOfferItems.set(item._id, item));
      }
      if (candidateResult.status === "fulfilled") {
        candidateResult.value
          .filter(isOperationsMenuItem)
          .forEach((item) => uniqueOfferItems.set(item._id, item));
      }
      if (
        inventoryResult.status === "fulfilled" ||
        candidateResult.status === "fulfilled"
      ) {
        setOfferItems([...uniqueOfferItems.values()]);
      }
      if (notificationsResult.status === "fulfilled") {
        setUnreadCount(notificationsResult.value.unreadCount);
      } else {
        supportingErrors.push(
          `Notifications: ${notificationsResult.reason instanceof Error ? notificationsResult.reason.message : "Unable to load."}`,
        );
      }
      if (managerOffersResult.status === "fulfilled") {
        setOffers(managerOffersResult.value);
        setOfferManagerError("");
      } else {
        const managerOffersError =
          managerOffersResult.reason instanceof Error
            ? managerOffersResult.reason.message
            : "Unable to load offers.";
        setOfferManagerError(managerOffersError);
        supportingErrors.push(`Offer manager: ${managerOffersError}`);
      }
      setDataWarning(supportingErrors.join("\n"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load operations data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useEffect(() => {
    if (unreadCount === 0) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.3,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, unreadCount]);

  const availableCandidates = useMemo(() => {
    const pinnedIds = new Set(
      inventory.filter(isOperationsMenuItem).map((item) => item._id),
    );
    const query = candidateSearch.trim().toLowerCase();
    return candidates.filter(
      (item) =>
        isOperationsMenuItem(item) &&
        !pinnedIds.has(item._id) && item.name.toLowerCase().includes(query),
    );
  }, [candidateSearch, candidates, inventory]);
  const inventoryFoodType = (
    item: OperationsMenuItem,
  ): "veg" | "nonVeg" | "unknown" => {
    const foodType = item.foodType?.trim().toLowerCase();
    if (foodType === "veg") return "veg";
    if (foodType === "non_veg" || foodType === "non-veg") return "nonVeg";
    return "unknown";
  };

  const filteredOfferItems = useMemo(() => {
    const query = offerItemSearch.trim().toLowerCase();
    if (!query) return offerItems;
    return offerItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [offerItemSearch, offerItems]);
  const filteredInventory = useMemo(() => {
    const query = quickInventorySearch.trim().toLowerCase();
    return inventory.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (inventoryStockFilter === "inStock" && !item.isAvailable) return false;
      if (inventoryStockFilter === "outOfStock" && item.isAvailable) return false;
      if (inventoryTypeFilter !== "all") {
        const foodType = item.foodType?.trim().toLowerCase() || "";
        const isVeg = foodType.startsWith("veg");
        const isNonVeg = foodType.startsWith("non");
        if (inventoryTypeFilter === "veg" && !isVeg) return false;
        if (inventoryTypeFilter === "nonVeg" && !isNonVeg) return false;
      }
      return true;
    });
  }, [inventory, inventoryStockFilter, inventoryTypeFilter, quickInventorySearch]);
  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );

  const reloadOffers = async () => {
    const branchId = currentManager?.branchId || dashboard?.branch._id;
    if (!branchId) throw new Error("Your branch could not be identified.");
    const [activeResult, managerResult] = await Promise.allSettled([
      operationsApi.getActiveOffers(branchId),
      operationsApi.getManagerOffers(),
    ]);
    if (activeResult.status === "fulfilled") {
      setActiveOffers(
        activeResult.value.filter((offer) => offer.isActive === true),
      );
      setOfferError("");
    } else {
      setOfferError(
        activeResult.reason instanceof Error
          ? activeResult.reason.message
          : "Unable to load active offers.",
      );
    }
    if (managerResult.status === "fulfilled") {
      setOffers(managerResult.value);
      setOfferManagerError("");
    } else {
      setOfferManagerError(
        managerResult.reason instanceof Error
          ? managerResult.reason.message
          : "Unable to load offers.",
      );
    }
    if (activeResult.status === "rejected") throw activeResult.reason;
    if (managerResult.status === "rejected") throw managerResult.reason;
  };

  const openNewOfferForm = () => {
    setIsOfferManagerOpen(false);
    setReturnToOfferManager(true);
    setEditingOfferId("");
    setOfferTitle("");
    setOfferDescription("");
    setOfferCode("");
    setOfferDiscountType("flat");
    setOfferItemSearch("");
    setOfferApplicableItemIds([]);
    setIsOfferFormOpen(true);
  };

  const openEditOfferForm = useCallback((
    offer: OperationsOffer,
    returnToManager = false,
  ) => {
    const id = offer.id || offer._id;
    if (!id) {
      Alert.alert("Unable to edit offer", "This offer is missing its ID.");
      return;
    }
    setEditingOfferId(id);
    setOfferTitle(offer.title);
    setOfferDescription(offer.description || "");
    setOfferCode(offer.code);
    setOfferDiscountType(offer.discountType || "flat");
    setOfferItemSearch("");
    setOfferApplicableItemIds(offer.applicableMenuItemIds || []);
    setReturnToOfferManager(returnToManager);
    setIsOfferManagerOpen(false);
    setIsOfferFormOpen(true);
  }, []);

  const handleOpenOfferManager = useCallback(() => {
    setIsOfferManagerOpen(true);
  }, []);

  const handleSelectActiveOffer = useCallback(
    (offer: OperationsOffer) => openEditOfferForm(offer),
    [openEditOfferForm],
  );

  const closeOfferForm = () => {
    setIsOfferFormOpen(false);
    setIsOfferManagerOpen(returnToOfferManager);
    setReturnToOfferManager(false);
  };

  const handleSaveOffer = async () => {
    const offerText = `${offerTitle} ${offerDescription}`;
    if (!offerTitle.trim() || !offerCode.trim()) {
      Alert.alert(
        "Offer details needed",
        "Enter an offer title and promo code.",
      );
      return;
    }
    if (
      !editingOfferId &&
      !/\d+(?:\.\d+)?\s*%|₹\s*\d|\d+(?:\.\d+)?\s*(?:rs\b|rupees?\b)/i.test(
        offerText,
      )
    ) {
      Alert.alert(
        "Add the discount to the offer",
        "Include the discount amount in the title or description, for example “50% OFF” or “FLAT ₹70 OFF”.",
      );
      return;
    }
    setSavingOffer(true);
    try {
      const body = {
        title: offerTitle.trim(),
        description: offerDescription.trim(),
        code: offerCode.trim(),
        applicableMenuItemIds: offerApplicableItemIds,
      };
      if (editingOfferId) {
        const discountType = /\d+(?:\.\d+)?\s*%/i.test(offerText)
          ? "percentage"
          : offerDiscountType;
        await operationsApi.updateOffer(editingOfferId, {
          ...body,
          discountType,
        });
      } else {
        await operationsApi.createOffer(body);
      }
      setIsOfferFormOpen(false);
      setIsOfferManagerOpen(returnToOfferManager);
      setReturnToOfferManager(false);
      void reloadOffers().catch((refreshError: unknown) => {
        Alert.alert(
          "Offer saved",
          `The offer was saved, but the list could not be refreshed. Pull down to try again.\n\n${
            refreshError instanceof Error
              ? refreshError.message
              : "Please try again."
          }`,
        );
      });
    } catch (saveError) {
      Alert.alert(
        "Unable to save offer",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSavingOffer(false);
    }
  };

  const handleToggleOffer = async (
    offer: OperationsOffer,
    nextIsActive: boolean,
  ) => {
    const id = offer.id || offer._id;
    if (!id) {
      Alert.alert("Unable to update offer", "This offer is missing its ID.");
      return;
    }
    setTogglingOfferId(id);
    setOffers((currentOffers) =>
      currentOffers.map((currentOffer) =>
        (currentOffer.id || currentOffer._id) === id
          ? { ...currentOffer, isActive: nextIsActive }
          : currentOffer,
      ),
    );
    setActiveOffers((currentOffers) => {
      const updatedOffer = offers.find(
        (currentOffer) => (currentOffer.id || currentOffer._id) === id,
      );
      if (!updatedOffer) return currentOffers;
      if (nextIsActive) {
        return [
          ...currentOffers.filter(
            (currentOffer) => (currentOffer.id || currentOffer._id) !== id,
          ),
          { ...updatedOffer, isActive: true },
        ];
      }
      return currentOffers.filter(
        (currentOffer) => (currentOffer.id || currentOffer._id) !== id,
      );
    });
    try {
      await operationsApi.setOfferActive(id, nextIsActive);
    } catch (statusError) {
      setOffers((currentOffers) =>
        currentOffers.map((currentOffer) =>
          (currentOffer.id || currentOffer._id) === id
            ? { ...currentOffer, isActive: offer.isActive }
            : currentOffer,
        ),
      );
      setActiveOffers((currentOffers) => {
        const previousOffer = offers.find(
          (currentOffer) => (currentOffer.id || currentOffer._id) === id,
        );
        if (!previousOffer?.isActive) {
          return currentOffers.filter(
            (currentOffer) => (currentOffer.id || currentOffer._id) !== id,
          );
        }
        return [
          ...currentOffers.filter(
            (currentOffer) => (currentOffer.id || currentOffer._id) !== id,
          ),
          previousOffer,
        ];
      });
      Alert.alert(
        "Unable to update offer",
        statusError instanceof Error ? statusError.message : "Please try again.",
      );
      setTogglingOfferId("");
      return;
    }
    try {
      await reloadOffers();
    } catch (refreshError) {
      Alert.alert(
        "Offer status updated",
        `The status was saved, but offers could not be refreshed. Try again shortly.\n\n${
          refreshError instanceof Error
            ? refreshError.message
            : "Please try again."
        }`,
      );
    } finally {
      setTogglingOfferId("");
    }
  };

  const handleDeleteOffer = (offer: OperationsOffer) => {
    const id = offer.id || offer._id;
    if (!id) {
      Alert.alert("Unable to delete offer", "This offer is missing its ID.");
      return;
    }
    Alert.alert("Delete offer?", `Delete "${offer.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setSavingOfferId(id);
          void operationsApi
            .deleteOffer(id)
            .then(() => {
              setOffers((currentOffers) =>
                currentOffers.filter(
                  (currentOffer) =>
                    (currentOffer.id || currentOffer._id) !== id,
                ),
              );
              setActiveOffers((currentOffers) =>
                currentOffers.filter(
                  (currentOffer) =>
                    (currentOffer.id || currentOffer._id) !== id,
                ),
              );
              void reloadOffers().catch((refreshError: unknown) => {
                Alert.alert(
                  "Offer deleted",
                  `The offer was deleted, but lists could not be refreshed.\n\n${
                    refreshError instanceof Error
                      ? refreshError.message
                      : "Please try again."
                  }`,
                );
              });
            })
            .catch((deleteError: unknown) => {
              Alert.alert(
                "Unable to delete offer",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Please try again.",
              );
            })
            .finally(() => setSavingOfferId(""));
        },
      },
    ]);
  };

  const handleToggleCheckIn = (nextValue: boolean) => {
    if (nextValue) {
      Alert.alert(
        "Check In",
        "You're about to go on duty and manage operations.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => setIsCheckedIn(true) },
        ],
      );
      return;
    }

    const branchId = currentManager?.branchId;
    if (!branchId) {
      Alert.alert(
        "Unable to check out",
        "Your account is not linked to a branch, so active branch orders cannot be verified.",
      );
      return;
    }

    Alert.alert(
      "Check Out?",
      "You'll be marked off duty. We'll first make sure there are no active orders for your branch.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          onPress: () => {
            setIsCheckingOut(true);
            void operationsApi
              .getAllOrders()
              .then((orders) => {
                const activeOrders = orders.filter((order) => {
                  const orderBranchId =
                    typeof order.branchId === "string"
                      ? order.branchId
                      : order.branchId?._id || order.branchId?.id;
                  const isSameBranch = !orderBranchId || orderBranchId === branchId;
                  return (
                    isSameBranch &&
                    !TERMINAL_ORDER_STATUSES.has(order.status.toLowerCase())
                  );
                });
                if (activeOrders.length > 0) {
                  Alert.alert(
                    "Cannot Check Out",
                    `Complete ${activeOrders.length} active order${activeOrders.length === 1 ? "" : "s"} before checking out.`,
                  );
                  return;
                }
                setIsCheckedIn(false);
              })
              .catch((orderError: unknown) => {
                Alert.alert(
                  "Unable to Check Out",
                  orderError instanceof Error
                    ? `We couldn't verify your branch's orders. Please try again.\n\n${orderError.message}`
                    : "We couldn't verify your branch's orders. Please try again.",
                );
              })
              .finally(() => setIsCheckingOut(false));
          },
        },
      ],
    );
  };

  const refreshQuickInventory = async () => {
    const [inventoryData, candidateData] = await Promise.all([
      operationsApi.getInventory(),
      operationsApi.getInventoryCandidates(),
    ]);
    setInventory(inventoryData.filter(isOperationsMenuItem));
    setCandidates(candidateData.filter(isOperationsMenuItem));
  };

  const refreshCategories = async () => {
    const data = await operationsApi.getCategories();
    operationsCache.setCategories(data);
    setCategories(data);
  };

  const handleToggleCategory = async (
    category: OperationsCategory,
    isActive: boolean,
  ) => {
    setTogglingCategoryId(category.id);
    try {
      await operationsApi.setCategoryActive(category.id, isActive);
      operationsCache.invalidateCategory(category.id);
      operationsCache.invalidateCategories();
      await refreshCategories();
    } catch (categoryError) {
      Alert.alert(
        "Unable to update category",
        categoryError instanceof Error
          ? categoryError.message
          : "Please try again.",
      );
    } finally {
      setTogglingCategoryId("");
    }
  };

  const handleCreateCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      Alert.alert("Category name required", "Enter a name for the category.");
      return;
    }

    setSavingCategory(true);
    try {
      await operationsApi.createCategory({
        name: trimmedName,
        icon: categoryIcon.trim(),
      });
      operationsCache.invalidateCategories();
      await refreshCategories();
      setCategoryName("");
      setCategoryIcon("");
      setCategoryManagerView("list");
    } catch (categoryError) {
      Alert.alert(
        "Unable to create category",
        categoryError instanceof Error
          ? categoryError.message
          : "Please try again.",
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const pinItem = async (item: OperationsMenuItem) => {
    setSavingItemId(item._id);
    try {
      await operationsApi.pinInventoryItem(item._id);
      await refreshQuickInventory();
      setQuickInventorySearch("");
      setInventoryStockFilter("all");
      setInventoryTypeFilter("all");
    } catch (saveError) {
      Alert.alert(
        "Unable to pin item",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSavingItemId("");
    }
  };

  const unpinItem = async (item: OperationsMenuItem) => {
    setSavingItemId(item._id);
    try {
      await operationsApi.removeInventoryItem(item._id);
      await refreshQuickInventory();
    } catch (saveError) {
      Alert.alert(
        "Unable to remove item",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSavingItemId("");
    }
  };

  if (managerLoading || loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (
    currentManager &&
    getManagerDestination(currentManager.managerType) !==
      "/(manager)/operations"
  ) {
    return <Redirect href="/(manager)/floor" />;
  }
  if (!currentManager) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Text className="text-base text-center" style={{ color: theme.text }}>
          {managerError || "Operations manager profile not found."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View className="px-5 pt-3 pb-2">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className="text-2xl font-black" style={{ color: theme.text }}>
              Operations
            </Text>
            <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
              {dashboard?.branch.name || "Operations"} • {currentManager.name}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() =>
                router.push("/(manager)/operations/profile/notifications" as never)
              }
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
              className="relative rounded-full p-3"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="bell" size={20} color={theme.text} />
              {unreadCount > 0 ? (
                <Animated.View
                  className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: theme.primary,
                    transform: [{ scale: pulse }],
                  }}
                />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() =>
                router.push("/(manager)/operations/profile" as never)
              }
              accessibilityRole="button"
              accessibilityLabel="Manager profile"
              className="rounded-full p-3"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="user" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        <Card
          variant="default"
          className="mb-2 flex-row items-center justify-between rounded-2xl border-0 p-4"
        >
          <View className="mr-2 flex-1 flex-row items-center gap-3">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: isCheckedIn ? "#22c55e" : "#ef4444" }}
            />
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-black" style={{ color: theme.text }}>
                {isCheckedIn ? "CHECKED IN" : "CHECKED OUT"}
              </Text>
              <Text
                className="text-[10px]"
                numberOfLines={2}
                style={{ color: theme.muted }}
              >
                {isCheckedIn
                  ? "You're on duty and managing operations"
                  : "You're off duty. Check in when you're ready to manage operations."}
              </Text>
            </View>
          </View>
          <Switch
            value={isCheckedIn}
            onValueChange={handleToggleCheckIn}
            disabled={isCheckingOut}
            trackColor={{ false: theme.border, true: "#22c55e" }}
            thumbColor="#ffffff"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </Card>
      </View>

      {!isCheckedIn ? (
        <View className="flex-1 items-center justify-center px-5">
          <Card
            variant="default"
            className="w-full items-center rounded-3xl border-0 p-8"
          >
            <Text className="mb-2 text-3xl">🔒</Text>
            <Text
              className="mb-1 text-center text-lg font-black"
              style={{ color: theme.text }}
            >
              You are Checked Out
            </Text>
            <Text
              className="text-center text-xs font-medium"
              style={{ color: theme.muted }}
            >
              Toggle &apos;Check In&apos; above to view and manage store
              inventory and operations.
            </Text>
          </Card>
        </View>
      ) : error ? (
        <View className="px-5 py-4">
          <Text className="mb-3 text-center" style={{ color: theme.danger }}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              void loadDashboard();
            }}
            className="items-center rounded-xl py-3"
            style={{ backgroundColor: theme.primary }}
          >
            <Text className="font-bold text-white">Retry loading</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          ref={dashboardScrollRef}
          className="flex-1 px-5"
          stickyHeaderIndices={[1]}
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadDashboard(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
            <View>
            {dataWarning ? (
              <Card
                variant="default"
                className="mb-4 rounded-xl border px-4 py-3"
                style={{ borderColor: theme.danger }}
              >
                <Text className="text-xs" style={{ color: theme.danger }}>
                  Some sections could not be refreshed:
                  {"\n"}
                  {dataWarning}
                </Text>
              </Card>
            ) : null}
            <View className="mb-5 flex-row justify-between gap-2">
            {[
              { label: "Items", value: dashboard?.stats.totalItems ?? 0 },
              { label: "In Stock", value: dashboard?.stats.inStockItems ?? 0 },
              { label: "Offers", value: activeOffers.length },
            ].map((stat) => (
              <Card
                key={stat.label}
                variant="default"
                className="flex-1 items-center rounded-2xl border-0 py-4"
              >
                <Text className="text-2xl font-black" style={{ color: theme.text }}>
                  {stat.value}
                </Text>
                <Text className="text-xs font-semibold" style={{ color: theme.muted }}>
                  {stat.label}
                </Text>
              </Card>
            ))}
          </View>

          <Pressable
            onPress={() =>
              router.push("/(manager)/operations/orders" as never)
            }
            className="mb-6 flex-row items-center justify-between rounded-2xl p-4"
            style={{ backgroundColor: theme.primary }}
          >
            <View>
              <Text className="text-base font-black text-white">Live Orders</Text>
              <Text className="text-xs text-white">
                {dashboard?.stats.liveOrders ?? 0} currently active
              </Text>
            </View>
            <Feather name="arrow-right" size={20} color="#ffffff" />
          </Pressable>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xl font-bold" style={{ color: theme.text }}>
              Categories
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => {
                  setCategoryManagerView("list");
                  setIsCategoryManagerOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Modify categories"
              >
                <Text className="text-sm font-bold" style={{ color: theme.primary }}>
                  Modify
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push("/(manager)/operations/categories" as never)
                }
                accessibilityRole="button"
                accessibilityLabel="View all categories"
              >
                <Text className="text-sm font-bold" style={{ color: theme.primary }}>
                  View All
                </Text>
              </Pressable>
            </View>
          </View>
          {activeCategories.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={{ width: categoryCardWidth, marginRight: 12 }}
                    onPress={() =>
                      router.push(
                        `/(manager)/operations/category/${category.id}` as never,
                      )
                    }
                  >
                    <Card
                      variant="default"
                      className="h-40 w-full items-center justify-center rounded-2xl border-0 p-3"
                    >
                      <Text className="mb-1 text-2xl">{category.icon || "🍽️"}</Text>
                      <Text
                        className="text-center text-xs font-bold"
                        style={{ color: theme.text }}
                        numberOfLines={2}
                      >
                        {category.name}
                      </Text>
                      <Text
                        className="mt-2 text-[10px] font-bold"
                        style={{ color: theme.primary }}
                      >
                        ACTIVE
                      </Text>
                    </Card>
                  </Pressable>
                  ))}
              </ScrollView>
              {activeCategories.length > 3 ? (
                <View className="mb-2 mt-2 flex-row items-center justify-end">
                  <Text className="mr-1 text-xs font-semibold" style={{ color: theme.muted }}>
                    Swipe to see more categories
                  </Text>
                  <Feather name="arrow-right" size={14} color={theme.primary} />
                </View>
              ) : null}
            </>
          ) : (
            <Text className="mb-5 py-5 text-center" style={{ color: theme.muted }}>
              No categories are available.
            </Text>
          )}

          <ExclusiveOffersSection
            offers={activeOffers}
            error={offerError}
            cardWidth={offerCardWidth}
            textColor={theme.text}
            mutedColor={theme.muted}
            primaryColor={theme.primary}
            dangerColor={theme.danger}
            borderColor={theme.border}
            onModify={handleOpenOfferManager}
            onSelectOffer={handleSelectActiveOffer}
          />
          </View>

          <View
            className="pb-1"
            style={{
              backgroundColor: theme.bg,
              zIndex: 2,
              elevation: 2,
            }}
            onLayout={(event) => {
              quickInventoryOffset.current = event.nativeEvent.layout.y;
            }}
          >
            <View className="mb-3 mt-6 flex-row items-center justify-between">
              <Text className="text-xl font-bold" style={{ color: theme.text }}>
                Quick Inventory
              </Text>
              <Pressable
                onPress={() => {
                  setCandidateSearch("");
                  setIsCandidateModalOpen(true);
                }}
              >
                <Text className="text-sm font-bold" style={{ color: theme.primary }}>
                  + Add Item
                </Text>
              </Pressable>
            </View>
            <View
              className="mb-4 flex-row items-center rounded-xl px-4"
              style={{ backgroundColor: theme.card }}
            >
              <Feather name="search" size={18} color={theme.muted} />
              <TextInput
                value={quickInventorySearch}
                onChangeText={setQuickInventorySearch}
                onFocus={() => {
                  shouldScrollToQuickInventory.current = true;
                  requestAnimationFrame(() =>
                    scrollToQuickInventory(true),
                  );
                }}
                placeholder="Search quick inventory..."
                placeholderTextColor={theme.muted}
                className="ml-3 flex-1 py-4"
                style={{ color: theme.text }}
                accessibilityLabel="Search quick inventory"
                returnKeyType="search"
              />
              {quickInventorySearch ? (
                <Pressable
                  onPress={() => setQuickInventorySearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear quick inventory search"
                  hitSlop={8}
                >
                  <Feather name="x-circle" size={18} color={theme.muted} />
                </Pressable>
              ) : null}
            </View>
            <View className="mb-2 flex-row flex-wrap justify-start gap-2">
              {([
                ["all", "All"],
                ["inStock", "In Stock"],
                ["outOfStock", "Out of Stock"],
              ] as const).map(([filter, label]) => {
                const selected = inventoryStockFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setInventoryStockFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: selected ? "#ffffff" : theme.text }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mb-4 flex-row flex-wrap justify-start gap-2">
              {([
                ["all", "All Types"],
                ["veg", "🟢 Veg"],
                ["nonVeg", "🔴 Non-Veg"],
              ] as const).map(([filter, label]) => {
                const selected = inventoryTypeFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setInventoryTypeFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: selected ? "#ffffff" : theme.text }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
          {inventory.length ? (
            filteredInventory.length ? filteredInventory.map((item) => (
              <Card
                key={item._id}
                variant="default"
                className="mb-3 flex-row items-center justify-start rounded-2xl border-0 p-4"
              >
                <Pressable
                  className="mr-10 flex-1 items-start"
                  onPress={() => {
                    const categoryId =
                      typeof item.categoryId === "string"
                        ? item.categoryId
                        : item.categoryId._id;
                    const route = item.isCrossSellOnly ? "upsell" : "item";
                    const categoryParam = item.isCrossSellOnly
                      ? "triggerCategoryId"
                      : "categoryId";
                    router.push(
                      `/(manager)/operations/${route}/${item._id}?${categoryParam}=${encodeURIComponent(categoryId)}` as never,
                    );
                  }}
                >
                  <Text className="text-left text-sm font-bold" style={{ color: theme.text }}>
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-left text-xs" style={{ color: theme.muted }}>
                    ₹{item.price} •{" "}
                    {inventoryFoodType(item) === "veg" ? (
                      <Text style={{ color: "#22c55e" }}>🟢 Veg</Text>
                    ) : inventoryFoodType(item) === "nonVeg" ? (
                      <Text style={{ color: "#ef4444" }}>🔴 Non-Veg</Text>
                    ) : (
                      <Text>Type unknown</Text>
                    )}{" "}
                    • {item.isAvailable ? "In stock" : "Out of stock"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void unpinItem(item)}
                  disabled={savingItemId !== ""}
                  className="absolute right-3 p-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Unpin ${item.name}`}
                >
                  {savingItemId === item._id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Feather name="x" size={18} color={theme.danger} />
                  )}
                </Pressable>
              </Card>
            )) : (
              <Card variant="default" className="rounded-2xl border-0 p-6">
                <Text className="text-center text-sm" style={{ color: theme.muted }}>
                  No items in quick inventory match filters. Tap “+ Add Item” above.
                </Text>
              </Card>
            )
          ) : (
            <Card variant="default" className="rounded-2xl border-0 p-6">
              <Text className="text-center text-sm" style={{ color: theme.muted }}>
                No items are pinned to quick inventory.
              </Text>
            </Card>
          )}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={isCategoryManagerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsCategoryManagerOpen(false);
          setCategoryManagerView("list");
        }}
      >
        <View
          className="flex-1 justify-center px-5"
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="w-full"
          >
            <View
              className="rounded-3xl border p-5"
              style={{
                height:
                  categoryManagerView === "list"
                    ? categoryManagerModalHeight
                    : undefined,
                maxHeight: categoryManagerModalHeight,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <View className="mb-5 flex-row items-center justify-between">
                <Text
                  className="mr-3 flex-1 text-xl font-black"
                  style={{ color: theme.text }}
                >
                  {categoryManagerView === "list"
                    ? "Modify Categories"
                    : "Create New Category"}
                </Text>
                <Pressable
                  onPress={() => {
                    setIsCategoryManagerOpen(false);
                    setCategoryManagerView("list");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close categories"
                  hitSlop={10}
                >
                  <Feather name="x" size={24} color={theme.muted} />
                </Pressable>
              </View>

              {categoryManagerView === "list" ? (
                <>
                  <Pressable
                    onPress={() => {
                      setCategoryName("");
                      setCategoryIcon("");
                      setCategoryManagerView("create");
                    }}
                    className="mb-4 items-center justify-center rounded-2xl border-2 border-dashed py-5"
                    style={{ borderColor: theme.border }}
                    accessibilityRole="button"
                    accessibilityLabel="Add new category"
                  >
                    <Text
                      className="text-base font-black"
                      style={{ color: theme.text }}
                    >
                      + Add New
                    </Text>
                  </Pressable>
                  <ScrollView
                    className="flex-1 rounded-2xl p-3"
                    style={{ backgroundColor: theme.bg }}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {categories.map((category) => (
                      <View
                        key={category.id}
                        className="mb-3 flex-row items-center rounded-2xl p-4"
                        style={{ backgroundColor: theme.card }}
                      >
                        <Text className="mr-3 text-2xl">
                          {category.icon || "🍽️"}
                        </Text>
                        <Text
                          className="mr-3 flex-1 text-base font-bold"
                          style={{
                            color: category.isActive ? theme.text : theme.muted,
                          }}
                          numberOfLines={2}
                        >
                          {category.name}
                        </Text>
                        <Switch
                          value={category.isActive}
                          onValueChange={(isActive) =>
                            void handleToggleCategory(category, isActive)
                          }
                          disabled={togglingCategoryId === category.id}
                          trackColor={{
                            false: theme.border,
                            true: theme.primary,
                          }}
                          thumbColor="#ffffff"
                          ios_backgroundColor={theme.border}
                          accessibilityLabel={`${
                            category.isActive ? "Deactivate" : "Activate"
                          } ${category.name}`}
                        />
                      </View>
                    ))}
                    {categories.length === 0 ? (
                      <Text
                        className="py-8 text-center"
                        style={{ color: theme.muted }}
                      >
                        No categories yet. Add your first category above.
                      </Text>
                    ) : null}
                  </ScrollView>
                </>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 4 }}
                >
                  <Text
                    className="mb-2 text-sm font-bold uppercase"
                    style={{ color: theme.muted }}
                  >
                    Category Name
                  </Text>
                  <TextInput
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholder="e.g. Biryani"
                    placeholderTextColor={theme.muted}
                    className="mb-4 rounded-xl px-4"
                    style={{
                      height: 56,
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 17,
                    }}
                    autoFocus
                    returnKeyType="next"
                  />
                  <Text
                    className="mb-2 text-sm font-bold uppercase"
                    style={{ color: theme.muted }}
                  >
                    Emoji Icon (Optional)
                  </Text>
                  <TextInput
                    value={categoryIcon}
                    onChangeText={setCategoryIcon}
                    placeholder="e.g. 🍲"
                    placeholderTextColor={theme.muted}
                    className="mb-6 rounded-xl px-4"
                    style={{
                      height: 56,
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 17,
                    }}
                  />
                  <View className="flex-row justify-end gap-3">
                    <Pressable
                      onPress={() => setCategoryManagerView("list")}
                      disabled={savingCategory}
                      className="rounded-xl border px-5 py-3"
                      style={{ borderColor: theme.border }}
                    >
                      <Text
                        className="font-bold"
                        style={{ color: theme.text }}
                      >
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleCreateCategory()}
                      disabled={savingCategory}
                      className="min-w-24 items-center rounded-xl px-5 py-3"
                      style={{ backgroundColor: theme.primary }}
                    >
                      {savingCategory ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="font-bold text-white">Create</Text>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={isOfferManagerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOfferManagerOpen(false)}
      >
        <View
          className="flex-1 justify-center px-5"
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
        >
          <View
            className="flex-1 justify-center rounded-3xl border p-5"
            style={{
              maxHeight: "82%",
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="mr-3 flex-1 text-xl font-black" style={{ color: theme.text }}>
                Modify Offers &amp; Coupons
              </Text>
              <Pressable
                onPress={() => setIsOfferManagerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close offers"
                hitSlop={10}
              >
                <Feather name="x" size={24} color={theme.muted} />
              </Pressable>
            </View>
            <Pressable
              onPress={openNewOfferForm}
              className="mb-4 items-center justify-center rounded-2xl border-2 border-dashed py-5"
              style={{ borderColor: theme.border }}
            >
              <Text className="text-base font-black" style={{ color: theme.text }}>
                + Create New Offer
              </Text>
            </Pressable>
            <ScrollView
              className="flex-1 rounded-2xl p-3"
              style={{ backgroundColor: theme.bg }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {offerManagerError ? (
                <Text
                  className="py-4 text-center text-sm"
                  style={{ color: theme.danger }}
                >
                  {offerManagerError}
                </Text>
              ) : null}
              {offers.map((offer) => {
                const id = offer.id || offer._id || offer.code;
                return (
                  <View
                    key={id}
                    className="mb-3 rounded-2xl border-2 border-dashed p-4"
                    style={{ borderColor: theme.border }}
                  >
                    <View className="flex-row items-center">
                      <View className="mr-3 flex-1">
                        <Text
                          className="text-base font-black"
                          style={{ color: theme.text }}
                          numberOfLines={1}
                        >
                          {offer.title}
                        </Text>
                        <Text
                          className="mt-1 text-xs font-bold"
                          style={{ color: theme.primary }}
                          numberOfLines={1}
                        >
                          CODE: {offer.code}
                        </Text>
                        <Text
                          className="mt-1 text-xs"
                          style={{ color: theme.muted }}
                        >
                          {offer.applicableItemCount ??
                            offer.applicableMenuItemIds?.length ??
                            0}{" "}
                          items configured
                        </Text>
                      </View>
                      <Switch
                        value={offer.isActive}
                        onValueChange={(nextValue) =>
                          void handleToggleOffer(offer, nextValue)
                        }
                        disabled={togglingOfferId === id || savingOfferId === id}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor="#ffffff"
                        ios_backgroundColor={theme.border}
                        accessibilityLabel={`${
                          offer.isActive ? "Deactivate" : "Activate"
                        } ${offer.title}`}
                      />
                    </View>
                    <View className="mt-2 flex-row justify-end gap-4">
                      <Pressable
                        onPress={() => openEditOfferForm(offer, true)}
                        disabled={togglingOfferId === id || savingOfferId === id}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${offer.title}`}
                        hitSlop={8}
                      >
                        <Feather name="edit-2" size={21} color={theme.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteOffer(offer)}
                        disabled={togglingOfferId === id || savingOfferId === id}
                        className="p-1"
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${offer.title}`}
                        hitSlop={8}
                      >
                        {savingOfferId === id ? (
                          <ActivityIndicator size="small" color={theme.danger} />
                        ) : (
                          <Feather name="trash-2" size={21} color={theme.danger} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {offers.length === 0 && !offerManagerError ? (
                <Text className="py-8 text-center" style={{ color: theme.muted }}>
                  No offers yet. Create your first offer above.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isOfferFormOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeOfferForm}
      >
        <SafeAreaView
          className="flex-1"
          edges={[]}
          style={{ backgroundColor: theme.bg }}
        >
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              className="flex-row items-center justify-between border-b px-5 pb-4"
              style={{
                borderBottomColor: theme.border,
                paddingTop:
                  Math.max(
                    insets.top,
                    Platform.OS === "ios" ? 44 : 24,
                  ) + 12,
              }}
            >
              <Text className="text-2xl font-black" style={{ color: theme.text }}>
                {editingOfferId ? "Edit Offer" : "Create Offer"}
              </Text>
              <Pressable
                onPress={closeOfferForm}
                accessibilityRole="button"
                accessibilityLabel="Close offer form"
                hitSlop={10}
              >
                <Feather name="x" size={26} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView
              ref={offerFormScrollRef}
              className="flex-1"
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 120,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text
              className="mb-3 mt-2 text-center text-sm font-bold"
              style={{ color: theme.muted }}
            >
              PREVIEW
            </Text>
            <Card
              variant="default"
              className="mb-8 rounded-3xl border p-5"
              style={{ borderColor: theme.border }}
            >
              <Text className="text-3xl font-black" style={{ color: theme.text }}>
                {offerTitle.trim() || "Enter Offer Title"}
              </Text>
              <Text className="mt-2 text-base" style={{ color: theme.muted }}>
                {offerDescription.trim() || "Enter subtitle description here"}
              </Text>
              <View
                className="mt-5 self-start rounded-full border border-dashed px-4 py-2"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-xs font-black tracking-wider"
                  style={{ color: theme.text }}
                >
                  CODE: {offerCode.trim() || "PROMOCODE"}
                </Text>
              </View>
            </Card>

            {[
              {
                label: "OFFER TITLE",
                value: offerTitle,
                onChangeText: setOfferTitle,
                placeholder: "e.g. FLAT ₹70 OFF or 50% OFF",
                autoCapitalize: "words" as const,
              },
              {
                label: "SUBTITLE DESCRIPTION",
                value: offerDescription,
                onChangeText: setOfferDescription,
                placeholder: "e.g. Weekend Special Festival · 20% OFF",
                autoCapitalize: "sentences" as const,
              },
              {
                label: "PROMO CODE",
                value: offerCode,
                onChangeText: setOfferCode,
                placeholder: "e.g. BIRYANI50",
                autoCapitalize: "characters" as const,
              },
            ].map((field) => (
              <View key={field.label} className="mb-5">
                <Text
                  className="mb-2 text-sm font-black"
                  style={{ color: theme.muted }}
                >
                  {field.label}
                </Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChangeText}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.muted}
                  autoCapitalize={field.autoCapitalize}
                  className="rounded-2xl px-4 py-4 text-base font-bold"
                  style={{ backgroundColor: theme.card, color: theme.text }}
                />
              </View>
            ))}

            <View
              onLayout={(event) => {
                applicableItemsOffset.current = event.nativeEvent.layout.y;
              }}
            >
              <Text className="mt-2 text-xl font-black" style={{ color: theme.text }}>
                Applicable Items
              </Text>
              <Text className="mb-4 mt-1 text-sm" style={{ color: theme.muted }}>
                Select which items this code works for
              </Text>
              <View
                className="mb-3 flex-row items-center rounded-xl px-4"
                style={{ backgroundColor: theme.card }}
              >
                <Feather name="search" size={18} color={theme.muted} />
                <TextInput
                  value={offerItemSearch}
                  onChangeText={setOfferItemSearch}
                  onFocus={() => {
                    shouldScrollToApplicableItems.current = true;
                    if (offerKeyboardHeight > 0) {
                      requestAnimationFrame(scrollToApplicableItems);
                    }
                  }}
                  placeholder="Search menu items"
                  placeholderTextColor={theme.muted}
                  className="ml-3 flex-1 py-3"
                  style={{ color: theme.text }}
                  accessibilityLabel="Search applicable menu items"
                />
                {offerItemSearch ? (
                  <Pressable
                    onPress={() => setOfferItemSearch("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear item search"
                    hitSlop={8}
                  >
                    <Feather name="x-circle" size={18} color={theme.muted} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View
              className="rounded-2xl border-2 border-dashed p-3"
              style={{ borderColor: theme.border }}
            >
              {filteredOfferItems.length ? (
                filteredOfferItems.map((item) => {
                  const selected = offerApplicableItemIds.includes(item._id);
                  const isVeg = item.foodType?.toLowerCase().startsWith("veg");
                  return (
                    <Pressable
                      key={item._id}
                      onPress={() =>
                        setOfferApplicableItemIds((selectedIds) =>
                          selected
                            ? selectedIds.filter((id) => id !== item._id)
                            : [...selectedIds, item._id],
                        )
                      }
                      className="min-h-14 flex-row items-center justify-between px-2 py-3"
                    >
                      <View className="mr-3 flex-1 flex-row items-center">
                        <View
                          className="mr-3 h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: isVeg ? "#84cc16" : "#ef4444",
                          }}
                        />
                        <Text
                          className="flex-1 text-sm font-bold"
                          style={{ color: theme.text }}
                        >
                          {item.name}
                        </Text>
                      </View>
                      <Feather
                        name={selected ? "check-square" : "square"}
                        size={24}
                        color={selected ? theme.primary : theme.muted}
                      />
                    </Pressable>
                  );
                })
              ) : (
                <Text className="py-6 text-center" style={{ color: theme.muted }}>
                  {offerItems.length
                    ? "No menu items match your search."
                    : "No menu items are available to select."}
                </Text>
              )}
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
          <View
            className="flex-row gap-3 border-t px-5 pt-3"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom:
                Platform.OS === "android" && offerKeyboardHeight > 0
                  ? -offerKeyboardHeight
                  : 0,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: theme.bg,
            }}
          >
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                closeOfferForm();
              }}
              className="flex-1 items-center justify-center rounded-2xl border-2 py-4"
              style={{ borderColor: theme.primary }}
            >
              <Text className="text-base font-black" style={{ color: theme.primary }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                void handleSaveOffer();
              }}
              disabled={savingOffer}
              className="flex-1 items-center justify-center rounded-2xl py-4"
              style={{ backgroundColor: theme.primary }}
            >
              {savingOffer ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-black text-white">
                  Save Offer
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isCandidateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCandidateModalOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-5"
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
          onPress={() => setIsCandidateModalOpen(false)}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ height: candidateModalHeight }}
          >
            <View
              className="flex-1 rounded-3xl border-0 p-5"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold" style={{ color: theme.text }}>
                  Pin inventory item
                </Text>
                <Pressable
                  onPress={() => setIsCandidateModalOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Feather name="x" size={22} color={theme.muted} />
                </Pressable>
              </View>
              <View
                className="mb-3 flex-row items-center rounded-xl px-3"
                style={{ backgroundColor: theme.bg }}
              >
                <Feather name="search" size={18} color={theme.muted} />
                <TextInput
                  value={candidateSearch}
                  onChangeText={setCandidateSearch}
                  placeholder="Search menu items"
                  placeholderTextColor={theme.muted}
                  className="ml-3 flex-1 py-3"
                  style={{ color: theme.text }}
                  accessibilityLabel="Search menu items to pin"
                  returnKeyType="search"
                />
                {candidateSearch ? (
                  <Pressable
                    onPress={() => setCandidateSearch("")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear menu item search"
                    hitSlop={8}
                  >
                    <Feather name="x-circle" size={18} color={theme.muted} />
                  </Pressable>
                ) : null}
              </View>
              <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator
              >
                {availableCandidates.map((item) => (
                  <Pressable
                    key={item._id}
                    onPress={() => void pinItem(item)}
                    disabled={savingItemId !== ""}
                    className="mb-2 flex-row items-center justify-between rounded-xl p-3"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <View className="mr-3 flex-1 items-start">
                      <View className="flex-row items-center">
                        <View
                          className="mr-2 h-3 w-3 rounded-sm border"
                          style={{
                            borderColor:
                              inventoryFoodType(item) === "veg"
                                ? "#22c55e"
                                : inventoryFoodType(item) === "nonVeg"
                                  ? "#ef4444"
                                  : theme.muted,
                          }}
                          accessibilityLabel={
                            inventoryFoodType(item) === "veg"
                              ? "Vegetarian"
                              : inventoryFoodType(item) === "nonVeg"
                                ? "Non-vegetarian"
                                : "Food type unavailable"
                          }
                        >
                          {inventoryFoodType(item) !== "unknown" ? (
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  inventoryFoodType(item) === "veg"
                                    ? "#22c55e"
                                    : "#ef4444",
                              }}
                            />
                          ) : null}
                        </View>
                        <Text className="text-sm font-bold" style={{ color: theme.text }}>
                          {item.name}
                        </Text>
                      </View>
                      <Text className="text-left text-xs" style={{ color: theme.muted }}>
                        ₹{item.price}
                      </Text>
                    </View>
                    {savingItemId === item._id ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Feather name="plus-circle" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                ))}
                {availableCandidates.length === 0 ? (
                  <Text className="py-6 text-center" style={{ color: theme.muted }}>
                    No matching inventory candidates.
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
