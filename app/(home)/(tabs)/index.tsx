import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation, useRouter } from "expo-router";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronDown,
  GlassWater,
  Heart,
  Keyboard as KeyboardIcon,
  MapPin,
  QrCode,
  Receipt,
  ScanLine,
  Store,
  Wifi,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FoodCard from "../../../components/home/FoodCard";
import { HomeHeader } from "../../../components/home/HomeHeader";
import { ProfileAvatarButton } from "../../../components/profile/ProfileAvatarButton";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import { authApi } from "../../../services/api/auth";
import type {
  CustomerBranch,
  CustomerDineInBill,
  CustomerDineInTable,
  CustomerDineInWaiter,
  CustomerDineInWifiConnection,
} from "../../../services/api/customer";
import { useOrderMode } from "../_layout";

const hasImageUri = (uri: unknown): uri is string =>
  typeof uri === "string" && uri.trim().length > 0;

function matchesSearchText(query: string, value: string): boolean {
  const queryWords = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const valueWords = value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (queryWords.length === 0) return true;

  const matchesWord = (searchWord: string, valueWord: string): boolean => {
    if (searchWord.length === 1) return valueWord.startsWith(searchWord);
    if (valueWord.includes(searchWord)) return true;

    let queryIndex = 0;
    for (const character of valueWord) {
      if (character === searchWord[queryIndex]) queryIndex += 1;
      if (queryIndex === searchWord.length) return true;
    }

    return false;
  };

  const orderedQueryWords = [...queryWords].sort(
    (first, second) =>
      valueWords.filter((word) => matchesWord(first, word)).length -
      valueWords.filter((word) => matchesWord(second, word)).length,
  );
  const matchNextWord = (
    queryIndex: number,
    usedValueWords: Set<number>,
  ): boolean => {
    if (queryIndex === orderedQueryWords.length) return true;

    return valueWords.some(
      (word, wordIndex) =>
        !usedValueWords.has(wordIndex) &&
        matchesWord(orderedQueryWords[queryIndex], word) &&
        matchNextWord(
          queryIndex + 1,
          new Set([...usedValueWords, wordIndex]),
        ),
    );
  };

  return matchNextWord(0, new Set());
}

const formatPrice = (price: number) => {
  return Number.isInteger(price) ? price : price.toFixed(2);
};

interface ScannedTablePayload {
  branchId?: string;
  tableId?: string;
  tableNumber?: number;
}

function parseScannedTablePayload(value: string): ScannedTablePayload | null {
  const source = value.trim();
  if (!source) return null;

  try {
    const parsed = JSON.parse(source) as {
      branchId?: unknown;
      tableId?: unknown;
      tableNumber?: unknown;
    };
    if (parsed && typeof parsed === "object") {
      const branchId =
        typeof parsed.branchId === "string" ? parsed.branchId.trim() : undefined;
      const tableId =
        typeof parsed.tableId === "string" ? parsed.tableId.trim() : undefined;
      const tableNumber = Number(parsed.tableNumber);
      if (tableId) return { branchId, tableId };
      if (Number.isInteger(tableNumber) && tableNumber > 0) {
        return { branchId, tableNumber };
      }
    }
  } catch {
    // QR values may be plain text or URLs rather than JSON.
  }

  try {
    const url = new URL(source);
    const branchId = url.searchParams.get("branchId")?.trim();
    const tableId = url.searchParams.get("tableId")?.trim();
    if (tableId) return { branchId: branchId || undefined, tableId };
    const tableNumber = Number(
      url.searchParams.get("tableNumber") || url.searchParams.get("table"),
    );
    if (Number.isInteger(tableNumber) && tableNumber > 0) {
      return { branchId: branchId || undefined, tableNumber };
    }
  } catch {
    // Continue with the supported plain-text QR formats.
  }

  const match = source.match(/^\s*table(?:\s*number)?\s*#?\s*(\d+)\s*$/i);
  const tableNumber = Number(
    match?.[1] || (/^\d+$/.test(source) ? source : ""),
  );
  return Number.isInteger(tableNumber) && tableNumber > 0
    ? { tableNumber }
    : null;
}

function isDineInSessionClosed(status: string | undefined): boolean {
  return ["cancelled", "closed", "completed", "ended", "expired"].includes(
    status?.trim().toLowerCase() || "",
  );
}

function isBranchOnline(
  branch: Pick<CustomerBranch, "isActive" | "isOnline"> | null | undefined,
): boolean {
  return Boolean(branch?.isActive && branch.isOnline !== false);
}

type SpeechRecognitionPackage = typeof import("expo-speech-recognition");

let speechRecognitionLoadError: unknown;
const speechRecognition: SpeechRecognitionPackage | null = (() => {
  try {
    // Expo Go does not include this native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition") as SpeechRecognitionPackage;
  } catch (error) {
    speechRecognitionLoadError = error;
    return null;
  }
})();
const useSpeechRecognitionEvent =
  speechRecognition?.useSpeechRecognitionEvent ?? (() => {});

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();

  const {
    mode: orderMode,
    setMode: setGlobalOrderMode,
    carts,
    menuItems,
    categories,
    offers,
    featuredReels,
    refreshHomeData,
    isRefreshingHome,
    addresses,
    branches,
    branchesLoaded,
    activeAddress,
    setActiveAddress,
    activeBranch,
    setActiveBranch,
    setActiveBranchForDineInSession,
    handleAddToCart,
    handleDecrementCartItem,
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
  } = useOrderMode();

  const [isVegOnly, setIsVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [voiceResultIds, setVoiceResultIds] = useState<string[] | null>(null);
  const voiceSearchInFlight = useRef(false);
  const voiceSearchGeneration = useRef(0);
  const voiceResultHandled = useRef(false);
  const [offersViewportWidth, setOffersViewportWidth] = useState(0);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalSelection, setAddressModalSelection] = useState<
    "address" | "branch"
  >("address");

  const [pendingModeSetup, setPendingModeSetup] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState("Delivery");

  const [showDineInCheckInModal, setShowDineInCheckInModal] = useState(false);
  const [isChangingDineInTable, setIsChangingDineInTable] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [isCheckingDineInSession, setIsCheckingDineInSession] = useState(false);
  const [availableDineInTables, setAvailableDineInTables] = useState<
    CustomerDineInTable[]
  >([]);
  const [tablesLoadedForBranchId, setTablesLoadedForBranchId] = useState<
    string | null
  >(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [checkingInTableNumber, setCheckingInTableNumber] = useState<
    number | null
  >(null);
  const dineInTablesRequestId = useRef(0);

  const [activeServiceModal, setActiveServiceModal] = useState<
    "waiter" | "water" | "wifi" | "bill" | null
  >(null);

  const [tableNumber, setTableNumber] = useState("");
  const [scanned, setScanned] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceRequestSent, setServiceRequestSent] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<unknown[]>([]);
  const [dineInWaiter, setDineInWaiter] = useState<CustomerDineInWaiter | null>(
    null,
  );
  const [wifiConnections, setWifiConnections] = useState<
    CustomerDineInWifiConnection[]
  >([]);
  const [dineInBill, setDineInBill] = useState<CustomerDineInBill | null>(null);
  const didRestoreDineInSession = useRef(false);
  const sessionCheckErrorShown = useRef(false);

  const activeCart = carts[orderMode] || [];
  const selectedBranchId = activeBranch?.id;
  const isSelectedBranchOnline = branchesLoaded && isBranchOnline(activeBranch);

  const loadAvailableDineInTables = useCallback(async (branchId = selectedBranchId) => {
    const requestId = ++dineInTablesRequestId.current;
    if (!branchId) {
      setAvailableDineInTables([]);
      setTablesLoadedForBranchId(null);
      setTablesError("Choose a restaurant branch to see its tables.");
      setTablesLoading(false);
      return;
    }

    setTablesLoading(true);
    setTablesError(null);
    setTablesLoadedForBranchId(null);
    try {
      const tables = await api.getAvailableDineInTables(branchId);
      if (requestId !== dineInTablesRequestId.current) return;
      setAvailableDineInTables(tables);
      setTablesLoadedForBranchId(branchId);
    } catch (error) {
      if (requestId !== dineInTablesRequestId.current) return;
      setAvailableDineInTables([]);
      setTablesError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (requestId === dineInTablesRequestId.current) {
        setTablesLoading(false);
      }
    }
  }, [selectedBranchId]);
  const branchCategories = useMemo(
    () =>
      categories.filter(
        (category: any) =>
          !category.branchId || category.branchId === selectedBranchId,
      ),
    [categories, selectedBranchId],
  );
  const branchOffers = selectedBranchId
    ? offers.filter((offer: any) => {
        const offerBranchId =
          typeof offer.branchId === "string"
            ? offer.branchId
            : offer.branchId?._id;
        return offerBranchId === selectedBranchId;
      })
    : [];
  const branchFeaturedReels = featuredReels.filter((reel: any) => {
    const reelBranchId =
      typeof reel.branchId === "string"
        ? reel.branchId
        : reel.branchId?._id || reel.branchId?.id;
    return !reelBranchId || reelBranchId === selectedBranchId;
  });

  useEffect(() => {
    if (!branchesLoaded || didRestoreDineInSession.current) return;
    didRestoreDineInSession.current = true;

    void authApi
      .getAccessToken()
      .then((token) => {
        if (!token) return null;
        return api.getDineInSession();
      })
      .then((session) => {
        if (!session) return;
        setDineInSession(session);
        setActiveTable(String(session.tableNumber));
        setGlobalOrderMode("Dine-in");

        const sessionBranch = branches.find(
          (branch: { id: string; _id?: string }) =>
            branch.id === session.branchId || branch._id === session.branchId,
        );
        if (sessionBranch) {
          setActiveBranchForDineInSession(sessionBranch);
        }
      })
      .catch((error) => {
        Alert.alert(
          "Unable to Restore Dine-in Session",
          error instanceof Error ? error.message : "Please try again.",
        );
      });
  }, [
    branches,
    branchesLoaded,
    setActiveBranchForDineInSession,
    setActiveTable,
    setDineInSession,
    setGlobalOrderMode,
  ]);

  const finishDineInSession = useCallback(() => {
    setDineInSession(null);
    setActiveTable(null);
    setConfirmedOrders([]);
    setDineInCartState("idle");
    setPendingOrderSnapshot([]);
    setGlobalOrderMode("Delivery");
    setLastMode("Delivery");
    setActiveServiceModal(null);
    setDineInBill(null);
  }, [
    setActiveTable,
    setConfirmedOrders,
    setDineInCartState,
    setDineInSession,
    setGlobalOrderMode,
    setPendingOrderSnapshot,
  ]);

  useEffect(() => {
    const sessionId = dineInSession?._id;
    if (orderMode !== "Dine-in" || !sessionId) return;

    let isCurrent = true;
    let requestInProgress = false;

    const checkSession = async () => {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const session = await api.getDineInSession();
        if (!isCurrent) return;

        sessionCheckErrorShown.current = false;
        if (
          !session ||
          session._id !== sessionId ||
          isDineInSessionClosed(session.status)
        ) {
          finishDineInSession();
        }
      } catch (error) {
        if (!isCurrent || sessionCheckErrorShown.current) return;
        sessionCheckErrorShown.current = true;
        Alert.alert(
          "Unable to Check Dine-in Session",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        requestInProgress = false;
      }
    };

    void checkSession();
    const interval = setInterval(() => void checkSession(), 10_000);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void checkSession();
      },
    );

    return () => {
      isCurrent = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [dineInSession?._id, finishDineInSession, orderMode]);

  const restaurantName =
    activeBranch?.restaurantNames?.find(
      (restaurantName: { isActive: boolean; name: string }) =>
        restaurantName.isActive && restaurantName.name.trim().length > 0,
    )?.name ||
    activeBranch?.name ||
    undefined;
  const greetings = useMemo(
    () =>
      activeBranch?.storefrontDisplay?.greetings
        ?.filter(
          (greeting: { text: string; isActive: boolean }) =>
            greeting.isActive && greeting.text.trim().length > 0,
        )
        .map(
          (greeting: { text: string; isActive: boolean }) => greeting.text,
        ) || [],
    [activeBranch?.storefrontDisplay?.greetings],
  );
  const searchPlaceholders = useMemo(
    () =>
      activeBranch?.storefrontDisplay?.searchPlaceholders
        ?.filter(
          (placeholder: { text: string; isActive: boolean }) =>
            placeholder.isActive && placeholder.text.trim().length > 0,
        )
        .map(
          (placeholder: { text: string; isActive: boolean }) =>
            placeholder.text,
        ) || [],
    [activeBranch?.storefrontDisplay?.searchPlaceholders],
  );
  const isOrderLocked =
    confirmedOrders.length > 0 || dineInCartState === "waiting";

  const handleSelectMode = (selectedMode: string) => {
    if (isOrderLocked || selectedMode === orderMode) return;
    setLastMode(orderMode);

    setTimeout(() => {
      setGlobalOrderMode(selectedMode);

      if (selectedMode === "Dine-in" && !activeTable) {
        setPendingModeSetup("Dine-in");
        setShowAddressModal(true);
      } else if (selectedMode === "Takeaway") {
        setPendingModeSetup("Takeaway");
        setShowAddressModal(true);
      }
    }, 300);
  };

  const handleCancelAddressModal = useCallback(() => {
    setShowAddressModal(false);
    if (pendingModeSetup) {
      setGlobalOrderMode(lastMode || "Delivery");
      setPendingModeSetup(null);
    }
  }, [lastMode, pendingModeSetup, setGlobalOrderMode]);

  const selectDineInBranch = async (branch: (typeof branches)[number]) => {
    if (!isBranchOnline(branch)) {
      Alert.alert(
        "Restaurant is closed",
        "This restaurant is currently offline. Please choose an online branch.",
      );
      return;
    }
    setIsCheckingDineInSession(true);
    try {
      const session = await api.getDineInSession();

      if (session) {
        const sessionBranch = branches.find(
          (candidate: { id: string; _id?: string }) =>
            candidate.id === session.branchId ||
            candidate._id === session.branchId,
        );
        if (!sessionBranch) {
          throw new Error(
            "The active table session belongs to a branch that is unavailable.",
          );
        }
        setActiveBranchForDineInSession(sessionBranch);
        setDineInSession(session);
        setActiveTable(String(session.tableNumber));
        setGlobalOrderMode("Dine-in");
        setActiveOfferIndex(0);
        setShowAddressModal(false);
        setPendingModeSetup(null);
        return;
      }

      setActiveBranchForDineInSession(branch);
      setActiveOfferIndex(0);
      setShowAddressModal(false);
      setPendingModeSetup(null);
      setDineInSession(null);
      setActiveTable(null);
      setTableNumber("");
      void loadAvailableDineInTables(branch.id);
      setShowDineInCheckInModal(true);
    } catch (error) {
      Alert.alert(
        "Unable to Check Dine-in Session",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsCheckingDineInSession(false);
    }
  };

  useEffect(() => {
    return navigation.addListener("blur", () => {
      if (showAddressModal) handleCancelAddressModal();
    });
  }, [navigation, showAddressModal, handleCancelAddressModal]);

  const cancelCheckInModal = () => {
    setShowDineInCheckInModal(false);
    setIsChangingDineInTable(false);
    Keyboard.dismiss();
    if (!activeTable) {
      setGlobalOrderMode(lastMode || "Delivery");
    }
  };

  const checkInAtTable = async (enteredTableNumber: string | number) => {
    if (isChangingDineInTable && !dineInSession?._id) {
      Alert.alert(
        "Unable to Change Table",
        "Your active dine-in session could not be found. Please refresh and try again.",
      );
      return;
    }

    if (!activeBranch?.id) {
      Alert.alert("Choose a Restaurant", "Select a branch before checking in.");
      return;
    }

    const parsedTableNumber = Number(enteredTableNumber);
    if (!Number.isInteger(parsedTableNumber) || parsedTableNumber < 1) {
      Alert.alert("Invalid Table Number", "Enter a valid table number.");
      return;
    }
    if (tablesLoadedForBranchId === activeBranch.id) {
      const table = availableDineInTables.find(
        (availableTable) =>
          availableTable.tableNumber === parsedTableNumber,
      );
      if (!table?.isAvailable) {
        Alert.alert(
          "Table Not Available",
          availableDineInTables.length === 0
            ? "There are no available tables at this restaurant right now."
            : `Table ${parsedTableNumber} is not available at this restaurant. Choose one of the listed tables.`,
        );
        setTableNumber(String(parsedTableNumber));
        if (showCameraScannerModal) {
          setShowCameraScannerModal(false);
          setShowDineInCheckInModal(true);
          setScanned(false);
        }
        return;
      }
    }
    setCheckingInTableNumber(parsedTableNumber);
    try {
      const session = isChangingDineInTable
        ? await api.changeDineInTable(activeBranch.id, parsedTableNumber)
        : await api.takeDineInTable(activeBranch.id, parsedTableNumber);
      setDineInSession(session);
      setActiveTable(String(session.tableNumber));
      setShowDineInCheckInModal(false);
      setShowCameraScannerModal(false);
      setIsChangingDineInTable(false);
      Keyboard.dismiss();

      try {
        const refreshedSession = await api.getDineInSession();
        if (refreshedSession) {
          setDineInSession(refreshedSession);
          setActiveTable(String(refreshedSession.tableNumber));
        }
      } catch (error) {
        Alert.alert(
          "Table Connected",
          `Your table is active, but the latest session details could not be refreshed. ${error instanceof Error ? error.message : "Please try again."}`,
        );
      }
    } catch (error) {
      setScanned(false);
      Alert.alert(
        isChangingDineInTable ? "Unable to Change Table" : "Unable to Check In",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setCheckingInTableNumber(null);
    }
  };

  const handleManualTableSubmit = () => {
    if (tableNumber.trim()) void checkInAtTable(tableNumber.trim());
  };

  const handleQRScan = async (scannedValue: string) => {
    const payload = parseScannedTablePayload(scannedValue);
    if (!payload) {
      setScanned(false);
      Alert.alert(
        "Invalid Table QR",
        "This QR code does not contain a valid table ID or table number.",
      );
      return;
    }

    if (payload.branchId && payload.branchId !== activeBranch?.id) {
      setScanned(false);
      Alert.alert(
        "Different Restaurant",
        "This QR code belongs to a different restaurant branch. Select that branch and scan again.",
      );
      return;
    }

    if (!payload.tableId) {
      if (payload.tableNumber) void checkInAtTable(payload.tableNumber);
      return;
    }

    if (!activeBranch?.id) {
      setScanned(false);
      Alert.alert("Choose a Restaurant", "Select a branch before scanning a table QR code.");
      return;
    }

    try {
      const tables = await api.getAvailableDineInTables(activeBranch.id);
      const table = tables.find((entry) => entry.id === payload.tableId);
      if (!table || !table.isAvailable) {
        setScanned(false);
        Alert.alert(
          "Table Not Available",
          "This table is not currently available at the selected restaurant.",
        );
        return;
      }

      setAvailableDineInTables(tables);
      setTablesLoadedForBranchId(activeBranch.id);
      void checkInAtTable(table.tableNumber);
    } catch (error) {
      setScanned(false);
      Alert.alert(
        "Unable to Verify Table QR",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const cancelCameraModal = () => {
    setShowCameraScannerModal(false);
    setTimeout(() => {
      if (!activeTable) {
        setShowDineInCheckInModal(true);
      }
    }, 400);
  };

  const handleLeaveTable = async () => {
    try {
      const session = await api.getDineInSession();
      if (
        !session ||
        (dineInSession?._id && session._id !== dineInSession._id) ||
        isDineInSessionClosed(session.status)
      ) {
        finishDineInSession();
        return;
      }

      await api.closeDineInSession(session._id);
      finishDineInSession();
    } catch (error) {
      try {
        const session = await api.getDineInSession();
        if (
          !session ||
          (dineInSession?._id && session._id !== dineInSession._id) ||
          isDineInSessionClosed(session.status)
        ) {
          finishDineInSession();
          return;
        }
      } catch {
        // Keep the original leave-table error visible below.
      }
      Alert.alert(
        "Unable to Leave Table",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleServiceRequest = async (
    serviceType: "waiter" | "water" | "wifi" | "bill",
  ) => {
    if (!activeTable || !dineInSession?._id) {
      setTableNumber("");
      void loadAvailableDineInTables();
      setShowDineInCheckInModal(true);
      return;
    }

    setActiveServiceModal(serviceType);
    setServiceLoading(true);
    setServiceError(null);
    setServiceRequestSent(false);
    setDineInWaiter(null);

    try {
      if (serviceType === "wifi") {
        setWifiConnections([]);
        setWifiConnections(await api.getDineInWifi());
      } else if (serviceType === "bill") {
        setDineInBill(null);
        const bill = await api.getDineInBill();
        const session = await api.getDineInSession();
        if (
          !session ||
          session._id !== dineInSession._id ||
          isDineInSessionClosed(session.status)
        ) {
          finishDineInSession();
          return;
        }
        setDineInBill(bill);
      } else {
        await api.createDineInServiceRequest(dineInSession._id, serviceType);
        setServiceRequestSent(true);

        const results = await Promise.allSettled([
          api.getDineInServiceRequests(),
          ...(serviceType === "waiter" ? [api.getDineInWaiter()] : []),
        ]);
        const requestResult = results[0];
        if (requestResult.status === "fulfilled") {
          setServiceRequests(requestResult.value);
        } else {
          setServiceError(
            `Your request was sent, but its status could not be refreshed. ${requestResult.reason instanceof Error ? requestResult.reason.message : "Please try again."}`,
          );
        }

        if (serviceType === "waiter") {
          const waiterResult = results[1];
          if (waiterResult?.status === "fulfilled") {
            setDineInWaiter(waiterResult.value as CustomerDineInWaiter);
          } else if (waiterResult?.status === "rejected") {
            setServiceError(
              `Your request was sent, but waiter details could not be loaded. ${waiterResult.reason instanceof Error ? waiterResult.reason.message : "Please try again."}`,
            );
          }
        }
      }
    } catch (error) {
      if (serviceType === "bill") {
        try {
          const session = await api.getDineInSession();
          if (
            !session ||
            session._id !== dineInSession._id ||
            isDineInSessionClosed(session.status)
          ) {
            finishDineInSession();
            return;
          }
        } catch {
          // Preserve the bill request error below.
        }
      }
      setServiceError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setServiceLoading(false);
    }
  };

  const searchRecognizedSpeech = useCallback(async (transcript: string) => {
    const query = transcript.trim();
    if (!query) {
      setIsListening(false);
      Alert.alert("No Speech Detected", "Please try speaking again.");
      return;
    }

    const branchId = activeBranch?.id;
    const address = activeAddress?.id;
    if (!branchId || !address) {
      setIsListening(false);
      Alert.alert(
        "Voice Search Unavailable",
        !branchId
          ? "Select a branch before searching by voice."
          : "Select a saved address before searching by voice.",
      );
      return;
    }

    const requestGeneration = voiceSearchGeneration.current;
    setSearchQuery(query);
    setIsListening(false);
    setIsVoiceSearching(true);

    try {
      const results = await api.voiceSearch(query, branchId, address);
      if (requestGeneration === voiceSearchGeneration.current) {
        setVoiceResultIds(
          results.flatMap((item) =>
            item._id
              ? [item._id]
              : "id" in item && typeof item.id === "string"
                ? [item.id]
                : [],
          ),
        );
      }
    } catch (error) {
      Alert.alert(
        "Voice Search Failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      if (requestGeneration === voiceSearchGeneration.current) {
        setIsVoiceSearching(false);
      }
    }
  }, [activeAddress?.id, activeBranch?.id]);

  useSpeechRecognitionEvent("result", (event) => {
    if (!event.isFinal || voiceResultHandled.current) return;
    voiceResultHandled.current = true;
    void searchRecognizedSpeech(event.results[0]?.transcript ?? "");
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (event.error === "aborted") return;
    voiceResultHandled.current = true;
    Alert.alert(
      event.error === "no-speech"
        ? "No Speech Detected"
        : "Voice Search Failed",
      event.error === "no-speech"
        ? "Please try speaking again."
        : event.message || "Please try again.",
    );
  });

  useSpeechRecognitionEvent("nomatch", () => {
    setIsListening(false);
    voiceResultHandled.current = true;
    Alert.alert("No Speech Detected", "Please try speaking again.");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  const handleVoiceSearch = async () => {
    const speechRecognitionModule =
      speechRecognition?.ExpoSpeechRecognitionModule;
    if (!speechRecognitionModule) {
      Alert.alert(
        "Voice Search Requires a Development Build",
        `Expo Go does not include the speech-recognition native module. Build and install the app with "npx expo run:android" or "npx expo run:ios", then start Metro with "npx expo start --dev-client".${speechRecognitionLoadError instanceof Error ? `\n\nDetails: ${speechRecognitionLoadError.message}` : ""}`,
      );
      return;
    }
    if (voiceSearchInFlight.current) return;
    if (isListening) {
      setIsListening(false);
      speechRecognitionModule.stop();
      return;
    }

    voiceSearchInFlight.current = true;
    try {
      if (Platform.OS === "web") {
        throw new Error(
          "Voice search on this platform cannot guarantee on-device speech recognition. Please use the mobile app.",
        );
      }
      if (!speechRecognitionModule.isRecognitionAvailable()) {
        throw new Error("Speech recognition is not available on this device.");
      }

      const permission =
        await speechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Speech Recognition Permission Required",
          "Allow microphone and speech recognition access to search by voice.",
        );
        return;
      }

      voiceSearchGeneration.current += 1;
      voiceResultHandled.current = false;
      setSearchQuery("");
      setVoiceResultIds(null);
      setIsListening(true);
      speechRecognitionModule.start({
        lang: "en-IN",
        interimResults: false,
        continuous: false,
        iosTaskHint: "search",
      });
    } catch (error) {
      setIsListening(false);
      Alert.alert(
        "Voice Search Failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      voiceSearchInFlight.current = false;
    }
  };

  const handleSearchQueryChange = (query: string) => {
    voiceSearchGeneration.current += 1;
    setSearchQuery(query);
    setVoiceResultIds(null);
    setIsVoiceSearching(false);
  };

  const getFilteredData = () => {
    let filtered = [...menuItems];
    if (activeBranch?.id) {
      filtered = filtered.filter((item: any) => {
        const itemBranchIds = item.branchIds || [];
        return itemBranchIds.length > 0
          ? itemBranchIds.includes(activeBranch.id)
          : !item.branchId || item.branchId === activeBranch.id;
      });
    }
    if (isVegOnly) filtered = filtered.filter((item: any) => item.isVeg);
    if (voiceResultIds) {
      filtered = filtered.filter((item: any) =>
        voiceResultIds.includes(item.id),
      );
    }

    const lowerQuery = searchQuery.toLowerCase().trim();
    if (lowerQuery && voiceResultIds === null) {
      filtered = filtered.filter((item: any) =>
        matchesSearchText(lowerQuery, item.name),
      );
    }
    return filtered.sort(
      (first: any, second: any) =>
        Number(first.isAvailable !== true) -
        Number(second.isAvailable !== true),
    );
  };

  const listData = isSelectedBranchOnline ? getFilteredData() : [];
  const offerCardHeight = offersViewportWidth * 0.4;
  const offersCarousel =
    (orderMode === "Delivery" || orderMode === "Takeaway") && !searchQuery ? (
      <View className="w-full px-4" style={{ overflow: "hidden" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 0 }}
          style={{ width: "100%", flexGrow: 0 }}
          className="mt-2 mb-8"
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          onLayout={(event) => {
            const measuredWidth = event.nativeEvent.layout.width;
            setOffersViewportWidth((currentWidth) =>
              currentWidth === measuredWidth ? currentWidth : measuredWidth,
            );
          }}
          onMomentumScrollEnd={(event) => {
            if (offersViewportWidth <= 0) return;
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / offersViewportWidth,
            );
            setActiveOfferIndex(
              Math.max(0, Math.min(nextIndex, branchOffers.length - 1)),
            );
          }}
        >
          {branchOffers.map((offer: any) => (
            <Pressable
              key={offer.id}
              disabled={offersViewportWidth <= 0}
              onPress={() =>
                router.push({
                  pathname: "/(home)/(tabs)/offers",
                  params: { offerId: offer.id },
                })
              }
              className="relative overflow-hidden rounded-[24px]"
              style={{
                width: offersViewportWidth,
                height: offerCardHeight,
              }}
            >
              {hasImageUri(offer.image) ? (
                <Image
                  source={{ uri: offer.image }}
                  className="absolute h-full w-full"
                  resizeMode="cover"
                />
              ) : null}
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/10" />
              <View className="absolute inset-0 justify-center p-4">
                <Text
                  className="text-3xl font-black text-white tracking-tighter"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {offer.title}
                </Text>
                <Text
                  className="text-base font-bold text-gray-200 mt-1"
                  numberOfLines={2}
                >
                  {offer.subtitle}
                </Text>
                <View className="mt-3 self-start rounded-full bg-white px-5 py-2.5">
                  <Text
                    className="text-sm font-black"
                    style={{ color: theme.primary }}
                  >
                    ORDER NOW
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {branchOffers.length > 1 && (
          <View className="flex-row items-center justify-center -mt-5 mb-6">
            <View className="flex-row items-center">
              {branchOffers.map((offer: any, index: number) => (
                <View
                  key={offer.id}
                  className="mx-1 h-1.5 rounded-full"
                  style={{
                    width: activeOfferIndex === index ? 16 : 6,
                    backgroundColor:
                      activeOfferIndex === index ? theme.primary : theme.border,
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    ) : null;

  const renderEmptyState = () => {
    if (!searchQuery || !branchesLoaded) return null;
    return (
      <View className="items-center justify-center py-16 px-6">
        <Text
          className="text-2xl font-black mb-2 text-center"
          style={{ color: theme.text }}
        >
          No Items found
        </Text>
        <Text
          className="text-sm font-semibold text-center leading-5"
          style={{ color: theme.muted }}
        >
          Try changing your search or location.
        </Text>
      </View>
    );
  };

  const billItems =
    dineInBill?.orders.flatMap((order) =>
      order.items.map((item, index) => ({
        ...item,
        key: `${order._id}:${index}`,
      })),
    ) || [];

  const renderAddressModalItem = ({ item }: any) => {
    const isDeliveryAddress =
      orderMode === "Delivery" && addressModalSelection === "address";
    const branchIsOnline = isBranchOnline(item);
    const isActive = isDeliveryAddress
      ? activeAddress?.id === item.id
      : activeBranch?.id === item.id;
    const Icon = isDeliveryAddress ? MapPin : Store;

    return (
      <Pressable
        onPress={() => {
          if (!isDeliveryAddress && !branchIsOnline) return;
          if (isDeliveryAddress) setActiveAddress(item);
          else if (pendingModeSetup === "Dine-in") {
            void selectDineInBranch(item);
            return;
          } else {
            setActiveBranch(item);
            setActiveOfferIndex(0);
          }

          setShowAddressModal(false);

          if (pendingModeSetup === "Takeaway") {
            setPendingModeSetup(null);
          }
        }}
        disabled={
          isCheckingDineInSession || (!isDeliveryAddress && !branchIsOnline)
        }
        className="flex-row items-center p-4 mb-3 rounded-2xl border"
        style={{
          backgroundColor: theme.card,
          borderColor: isActive ? theme.primary : theme.border,
          opacity: !isDeliveryAddress && !branchIsOnline ? 0.6 : 1,
        }}
      >
        <Icon size={24} color={isActive ? theme.primary : theme.muted} />
        <View className="ml-4 flex-1">
          <Text className="text-base font-bold" style={{ color: theme.text }}>
            {isDeliveryAddress ? item.type : item.name}
          </Text>
          {!isDeliveryAddress && !branchIsOnline ? (
            <Text
              className="mt-1 text-xs font-bold"
              style={{ color: theme.danger }}
            >
              BRANCH IS OFFLINE
            </Text>
          ) : null}
          <Text
            className="text-sm font-semibold mt-1"
            style={{ color: theme.muted }}
          >
            {item.address}
          </Text>
        </View>
        {isActive && <CheckCircle2 size={24} color={theme.primary} />}
      </Pressable>
    );
  };

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center justify-between px-4 pb-2 pt-2 z-10"
        style={{ backgroundColor: theme.bg }}
      >
        <Pressable
          className="flex-1"
          disabled={isOrderLocked}
          onPress={() => {
            setAddressModalSelection(
              orderMode === "Delivery" ? "address" : "branch",
            );
            setShowAddressModal(true);
          }}
        >
          {orderMode === "Delivery" ? (
            <View className="flex-row items-center">
              <MapPin size={22} color={theme.primary} strokeWidth={2.5} />
              <View className="ml-2 flex-1">
                <View className="flex-row items-center">
                  <Text
                    className="text-xl font-black tracking-tight"
                    style={{ color: theme.text }}
                  >
                    {activeAddress?.type || "Choose address"}
                  </Text>
                  {!isOrderLocked && (
                    <ChevronDown
                      size={20}
                      color={theme.text}
                      strokeWidth={2.5}
                      className="ml-1 mt-0.5"
                    />
                  )}
                </View>
                <Text
                  className="text-xs font-bold mt-0.5 tracking-wide"
                  style={{ color: theme.primary }}
                  numberOfLines={1}
                >
                  {activeAddress?.address || "Choose a delivery address"}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Store size={13} color={theme.primary} strokeWidth={2.5} />
                  <Text
                    className="ml-1.5 flex-1 text-xs font-bold"
                    style={{ color: theme.muted, marginRight: 8 }}
                    numberOfLines={1}
                  >
                    {activeBranch?.name || "Choose restaurant branch"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View className="flex-row items-center">
                <Store size={22} color={theme.primary} strokeWidth={2.5} />
                <Text
                  className="ml-1 text-xl font-black tracking-tight"
                  style={{ color: theme.text }}
                >
                  {orderMode === "Takeaway"
                    ? "Pickup from"
                    : activeTable
                      ? `Table ${activeTable}`
                      : "Dining at"}
                </Text>
                {!isOrderLocked && (
                  <ChevronDown
                    size={20}
                    color={theme.text}
                    strokeWidth={2.5}
                    className="ml-1 mt-0.5"
                  />
                )}
              </View>
              <Text
                className="ml-7 text-xs font-bold mt-0.5 tracking-wide pr-4"
                style={{ color: theme.primary }}
                numberOfLines={1}
              >
                {activeBranch?.name || "Choose a branch"}
              </Text>
            </>
          )}
        </Pressable>

        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.push("/(home)/favorites")}
            className="h-11 w-11 items-center justify-center rounded-full shadow-sm border mr-3"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Heart size={20} color={theme.text} strokeWidth={2.5} />
          </Pressable>

          <ProfileAvatarButton className="h-11 w-11 items-center justify-center rounded-full shadow-sm border" />
        </View>
      </View>

      <Animated.View
        key={orderMode}
        entering={FadeIn.duration(400)}
        style={{ flex: 1 }}
      >
        <FlatList
          key={"grid-2"}
          data={listData}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: "space-between",
            paddingHorizontal: 16,
            marginBottom: 16,
          }}
          renderItem={({ item }) => {
            const cartQuantity = activeCart.reduce(
              (quantity: number, cartItem: any) =>
                quantity + (cartItem.id === item.id ? cartItem.quantity : 0),
              0,
            );
            return (
              <View style={{ width: "48%" }}>
                <FoodCard
                  item={item}
                  cartQuantity={cartQuantity}
                  onAddToCart={(qty, addons, total) =>
                    handleAddToCart(item, qty, addons, total)
                  }
                  onDecrement={() => handleDecrementCartItem(item.id)}
                />
              </View>
            );
          }}
          ListHeaderComponent={
            <HomeHeader
              theme={theme}
              orderMode={orderMode}
              onSelectOrderMode={handleSelectMode}
              isOrderLocked={isOrderLocked}
              onOpenScanner={() => {
                setTableNumber("");
                setIsChangingDineInTable(
                  Boolean(activeTable && dineInSession?._id),
                );
                void loadAvailableDineInTables();
                setShowDineInCheckInModal(true);
              }}
              onLeaveTable={() => void handleLeaveTable()}
              onCallWaiter={() => handleServiceRequest("waiter")}
              onRequestWater={() => handleServiceRequest("water")}
              onRequestWifi={() => handleServiceRequest("wifi")}
              onRequestBill={() => handleServiceRequest("bill")}
              onOrderTakeaway={() => router.push("/(home)/orders" as any)}
              searchQuery={searchQuery}
              setSearchQuery={handleSearchQueryChange}
              isListening={isListening}
              isVoiceSearching={isVoiceSearching}
              handleVoiceSearch={handleVoiceSearch}
              isVegOnly={isVegOnly}
              setIsVegOnly={setIsVegOnly}
              categories={branchCategories}
              offersCarousel={offersCarousel}
              featuredReel={branchFeaturedReels[0]}
              restaurantName={restaurantName}
              greetings={greetings}
              searchPlaceholders={searchPlaceholders}
              branchContentLoaded={branchesLoaded}
              router={router}
              activeTable={activeTable}
              timeLeft={timeLeft}
              confirmedOrdersLength={confirmedOrders.length}
              isTimerRunning={dineInCartState === "waiting"}
              isBranchOnline={isSelectedBranchOnline}
              isBranchStatusLoading={!branchesLoaded}
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{
            paddingBottom: activeCart.length > 0 ? 180 : 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingHome}
              onRefresh={() => void refreshHomeData()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        />
      </Animated.View>

      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={Platform.OS === "android"}
        navigationBarTranslucent={Platform.OS === "android"}
        onRequestClose={handleCancelAddressModal}
      >
        <View
          className="flex-1"
          style={{
            backgroundColor: theme.bg,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <View className="flex-row items-center justify-between px-6 pt-6 pb-5">
            <Text
              className="text-xl font-black tracking-tight flex-1"
              style={{ color: theme.text }}
            >
              {orderMode === "Delivery" && addressModalSelection === "address"
                ? "Choose Delivery Address"
                : isCheckingDineInSession
                  ? "Checking Dine-in Session..."
                  : "Choose Branch"}
            </Text>
            <Pressable
              onPress={handleCancelAddressModal}
              className="p-2 ml-3"
              accessibilityRole="button"
              accessibilityLabel="Close address selector"
            >
              <X size={24} color={theme.text} />
            </Pressable>
          </View>
          {orderMode === "Delivery" && (
            <View
              className="mx-6 mb-4 flex-row rounded-xl border p-1"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              {(
                [
                  { id: "address", label: "Delivery Address" },
                  { id: "branch", label: "Restaurant Branch" },
                ] as const
              ).map((option) => {
                const isSelected = addressModalSelection === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setAddressModalSelection(option.id)}
                    className="flex-1 items-center rounded-lg px-2 py-2"
                    style={{
                      backgroundColor: isSelected
                        ? theme.primary
                        : "transparent",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      className="text-xs font-bold"
                      style={{ color: isSelected ? "#fff" : theme.muted }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <FlatList
            data={
              orderMode === "Delivery" && addressModalSelection === "address"
                ? addresses
                : branches
            }
            keyExtractor={(item: any) => item.id.toString()}
            renderItem={renderAddressModalItem}
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 16,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      <Modal
        visible={showDineInCheckInModal}
        transparent={Platform.OS !== "android"}
        animationType={Platform.OS === "android" ? "slide" : "fade"}
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={cancelCheckInModal}
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
              onPress={cancelCheckInModal}
            />
          )}
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Animated.View
              entering={SlideInDown.duration(300)}
              className="absolute inset-0 p-6"
              style={{
                backgroundColor: theme.bg,
                paddingTop: insets.top + 24,
                paddingBottom: insets.bottom + 12,
              }}
            >
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="flex-row items-center justify-between mb-6">
                  <Text
                    className="text-2xl font-black"
                    style={{ color: theme.text }}
                  >
                    Table Check-In
                  </Text>
                  <Pressable
                    onPress={cancelCheckInModal}
                    className="p-2 bg-gray-500/10 rounded-full"
                  >
                    <X size={20} color={theme.text} />
                  </Pressable>
                </View>

                <View className="items-center px-4">
                  <View
                    className="w-24 h-24 rounded-[28px] items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(234, 88, 12, 0.15)" }}
                  >
                    <QrCode size={48} color="#EA580C" strokeWidth={1.5} />
                  </View>

                  <Text
                    className="text-xl font-black text-center mb-1"
                    style={{ color: theme.text }}
                  >
                    Scan Table QR
                  </Text>

                  <Text
                    className="text-xs font-semibold text-center mb-6 px-4"
                    style={{ color: theme.muted }}
                  >
                    Scan the QR sticker on your table or type your table number
                    manually.
                  </Text>

                  <Pressable
                    onPress={async () => {
                      if (!permission?.granted) {
                        await requestPermission();
                      }
                      setShowDineInCheckInModal(false);
                      setTimeout(() => {
                        setScanned(false);
                        setShowCameraScannerModal(true);
                      }, 400);
                    }}
                    className="w-full h-13 py-3.5 rounded-2xl items-center justify-center mb-4 shadow-sm flex-row"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <ScanLine
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-black text-base tracking-wide">
                      Open Scanner
                    </Text>
                  </Pressable>

                  <View className="flex-row items-center justify-center w-full mb-4">
                    <View
                      className="flex-1 h-[1px]"
                      style={{ backgroundColor: theme.border }}
                    />
                    <Text
                      className="px-4 font-bold text-xs"
                      style={{ color: theme.muted }}
                    >
                      OR
                    </Text>
                    <View
                      className="flex-1 h-[1px]"
                      style={{ backgroundColor: theme.border }}
                    />
                  </View>

                  <View
                    className="w-full h-14 rounded-2xl items-center flex-row border px-4"
                    style={{
                      backgroundColor: theme.card,
                      borderColor:
                        tableNumber.length > 0 ? theme.primary : theme.border,
                    }}
                  >
                    <KeyboardIcon
                      size={22}
                      color={
                        tableNumber.length > 0 ? theme.primary : theme.muted
                      }
                      style={{ marginRight: 16 }}
                    />

                    <TextInput
                      placeholder="Enter Table Number (e.g. 12)"
                      placeholderTextColor={theme.muted}
                      value={tableNumber}
                      onChangeText={setTableNumber}
                      keyboardType="number-pad"
                      className="flex-1 font-black text-base"
                      style={{ color: theme.text, height: "100%" }}
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={handleManualTableSubmit}
                    />

                    {tableNumber.trim().length > 0 && (
                      <Pressable
                        onPress={handleManualTableSubmit}
                        className="px-4 py-2 rounded-xl items-center justify-center"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Text className="text-white font-black text-xs uppercase tracking-wider">
                          Go
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View className="w-full mt-6">
                    <Text
                      className="text-base font-black mb-3"
                      style={{ color: theme.text }}
                    >
                      Select a table
                    </Text>
                    {tablesLoading ? (
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        Loading tables for {activeBranch?.name || "this branch"}...
                      </Text>
                    ) : tablesError ? (
                      <View>
                        <Text
                          className="text-sm font-semibold mb-3"
                          style={{ color: theme.danger }}
                        >
                          {tablesError}
                        </Text>
                        <Pressable
                          onPress={() => void loadAvailableDineInTables()}
                          className="self-start px-4 py-2 rounded-xl"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text className="text-white font-bold">Retry</Text>
                        </Pressable>
                      </View>
                    ) : availableDineInTables.length === 0 ? (
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        No tables are currently available at this restaurant.
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap justify-between">
                        {availableDineInTables.map((table) => (
                          <Pressable
                            key={table.id}
                            disabled={
                              !table.isAvailable ||
                              checkingInTableNumber !== null
                            }
                            onPress={() => {
                              setTableNumber(String(table.tableNumber));
                              void checkInAtTable(table.tableNumber);
                            }}
                            className="w-[48%] p-4 mb-3 rounded-2xl border"
                            style={{
                              backgroundColor: theme.card,
                              borderColor: table.isAvailable
                                ? theme.border
                                : theme.muted,
                              opacity:
                                checkingInTableNumber === table.tableNumber
                                  ? 0.65
                                  : table.isAvailable
                                    ? 1
                                    : 0.55,
                            }}
                          >
                            <Text
                              className="text-lg font-black"
                              style={{ color: theme.text }}
                            >
                              {checkingInTableNumber === table.tableNumber
                                ? "Checking in..."
                                : `Table ${table.tableNumber}`}
                            </Text>
                            <Text
                              className="text-xs font-semibold mt-1"
                              style={{ color: theme.muted }}
                            >
                              Seats {table.capacity} ·{" "}
                              {table.isAvailable
                                ? "Available"
                                : table.operationalStatus || table.status}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showCameraScannerModal}
        animationType="fade"
        transparent={false}
        onRequestClose={cancelCameraModal}
      >
        <View className="flex-1 bg-black">
          {permission?.granted ? (
            <CameraView
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={
                scanned
                  ? undefined
                  : ({ data }) => {
                      setScanned(true);
                      handleQRScan(data);
                    }
              }
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white">
                Requesting camera permission...
              </Text>
            </View>
          )}

          <View
            className="flex-1 justify-between p-6 z-10"
            pointerEvents="box-none"
          >
            <View
              className="flex-row items-center justify-between"
              style={{ marginTop: insets.top }}
            >
              <View className="flex-row items-center">
                <Pressable
                  onPress={cancelCameraModal}
                  className="p-2 mr-2 bg-white/10 rounded-full"
                >
                  <ArrowLeft size={24} color="#fff" />
                </Pressable>
                <Text className="text-white font-black text-lg">
                  Scan Table QR
                </Text>
              </View>
            </View>

            <View className="items-center justify-center pointer-events-none">
              <View className="w-64 h-64 border-2 border-dashed border-emerald-400 rounded-3xl items-center justify-center relative overflow-hidden bg-white/5">
                <View className="w-full h-1 bg-emerald-400 absolute top-1/2" />
                <ScanLine size={72} color="#10B981" strokeWidth={1.5} />
              </View>
              <Text className="text-gray-300 text-sm font-semibold text-center mt-6">
                Align the QR code on your table within the frame
              </Text>
            </View>

            <View style={{ marginBottom: insets.bottom + 12 }}>
              <Pressable
                onPress={cancelCameraModal}
                className="w-full py-4 rounded-2xl items-center justify-center mb-3 bg-white/10"
              >
                <Text className="text-white font-black text-base">Go Back</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* IN-STORE SERVICES & PAY BILL POPUP MODALS */}
      <Modal
        visible={activeServiceModal !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <Pressable
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: theme.bg }}
          onPress={() => setActiveServiceModal(null)}
        >
          <Pressable
            className="w-full rounded-[32px] p-6 items-center shadow-lg"
            style={{ backgroundColor: theme.bg }}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              onPress={() => setActiveServiceModal(null)}
              className="absolute top-4 right-4 p-2 bg-gray-500/10 rounded-full z-10"
            >
              <X size={20} color={theme.text} />
            </Pressable>

            {activeServiceModal === "waiter" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(234, 88, 12, 0.15)" }}
                >
                  <BellRing size={40} color="#EA580C" />
                </View>
                <Text
                  className="text-2xl font-black mb-2"
                  style={{ color: theme.text }}
                >
                  {serviceLoading
                    ? "Calling Waiter..."
                    : serviceError && !serviceRequestSent
                      ? "Unable to Call Waiter"
                      : serviceRequestSent
                        ? "Waiter Called"
                        : "Call Waiter"}
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  {serviceError ||
                    (serviceLoading
                      ? "Sending your request to the restaurant..."
                      : serviceRequestSent
                        ? `Your request was sent for Table ${activeTable}${dineInWaiter?.waiterName ? `. ${dineInWaiter.waiterName} is your assigned waiter.` : "."}`
                        : `Call the waiter assigned to Table ${activeTable}.`)}
                </Text>
                {serviceRequestSent && serviceRequests.length > 0 && (
                  <Text
                    className="text-xs font-semibold mb-4"
                    style={{ color: theme.muted }}
                  >
                    {serviceRequests.length} service request
                    {serviceRequests.length === 1 ? "" : "s"} currently listed.
                  </Text>
                )}
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  disabled={serviceLoading}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Got it
                  </Text>
                </Pressable>
              </>
            )}

            {activeServiceModal === "water" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}
                >
                  <GlassWater size={40} color="#3B82F6" />
                </View>
                <Text
                  className="text-2xl font-black mb-2"
                  style={{ color: theme.text }}
                >
                  {serviceLoading
                    ? "Requesting Water..."
                    : serviceError && !serviceRequestSent
                      ? "Unable to Request Water"
                      : serviceRequestSent
                        ? "Water Requested"
                        : "Request Water"}
                </Text>
                <Text
                  className="text-base text-center font-semibold mb-6"
                  style={{ color: theme.muted }}
                >
                  {serviceError ||
                    (serviceLoading
                      ? "Sending your request to the restaurant..."
                      : serviceRequestSent
                        ? `Your water request for Table ${activeTable} was sent.`
                        : `Request water for Table ${activeTable}.`)}
                </Text>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  disabled={serviceLoading}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Got it
                  </Text>
                </Pressable>
              </>
            )}

            {activeServiceModal === "wifi" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(5, 150, 105, 0.15)" }}
                >
                  <Wifi size={40} color="#059669" />
                </View>
                <Text
                  className="text-2xl font-black mb-4"
                  style={{ color: theme.text }}
                >
                  Free Wi-Fi
                </Text>
                <View
                  className="w-full p-4 rounded-2xl mb-6 border"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }}
                >
                  <Text
                    className="text-lg font-black mb-3"
                    style={{ color: theme.text }}
                  >
                    {serviceLoading
                      ? "Loading Wi-Fi details..."
                      : serviceError || ""}
                  </Text>
                  {wifiConnections.map((connection) => (
                    <View key={connection.id} className="mb-3">
                      <Text
                        className="text-sm font-bold mb-1"
                        style={{ color: theme.muted }}
                      >
                        Network Name:
                      </Text>
                      <Text
                        className="text-lg font-black mb-2"
                        style={{ color: theme.text }}
                      >
                        {connection.name}
                      </Text>
                      <Text
                        className="text-sm font-bold mb-1"
                        style={{ color: theme.muted }}
                      >
                        Password:
                      </Text>
                      <Text
                        className="text-lg font-black"
                        style={{ color: theme.primary }}
                      >
                        {connection.password}
                      </Text>
                    </View>
                  ))}
                  {!serviceLoading &&
                    !serviceError &&
                    wifiConnections.length === 0 && (
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.muted }}
                      >
                        No Wi-Fi details are available.
                      </Text>
                    )}
                </View>
                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  className="w-full h-14 rounded-2xl items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Close
                  </Text>
                </Pressable>
              </>
            )}

            {/* DYNAMIC PAY BILL MODAL */}
            {activeServiceModal === "bill" && (
              <>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(5, 150, 105, 0.15)" }}
                >
                  <Receipt size={40} color="#059669" />
                </View>
                <Text
                  className="text-2xl font-black mb-2 text-center"
                  style={{ color: theme.text }}
                >
                  Table {activeTable} Bill
                </Text>
                {serviceLoading && (
                  <Text
                    className="w-full text-center font-semibold mt-2"
                    style={{ color: theme.muted }}
                  >
                    Fetching the latest bill...
                  </Text>
                )}
                {serviceError && (
                  <Text
                    className="w-full text-center font-semibold mt-2"
                    style={{ color: "#DC2626" }}
                  >
                    {serviceError}
                  </Text>
                )}

                <View className="w-full max-h-48 mt-4 mb-2">
                  <FlatList
                    data={billItems}
                    keyExtractor={(item) => item.key}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <View className="flex-row justify-between w-full mb-3">
                        <Text
                          className="text-base font-semibold"
                          style={{ color: theme.text }}
                        >
                          {item.quantity}x {item.name}
                        </Text>
                        <Text
                          className="text-base font-bold"
                          style={{ color: theme.text }}
                        >
                          ₹{formatPrice(item.itemTotal)}
                        </Text>
                      </View>
                    )}
                    ListEmptyComponent={
                      <Text
                        className="text-center italic"
                        style={{ color: theme.muted }}
                      >
                        {serviceLoading ? "" : "No items are on this bill yet."}
                      </Text>
                    }
                  />
                </View>

                {dineInBill && (
                  <View
                    className="w-full border-t pt-4 mb-3"
                    style={{ borderColor: theme.border }}
                  >
                    <View className="flex-row justify-between w-full mb-2">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        Subtotal
                      </Text>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        ₹{formatPrice(dineInBill.pricing.subtotal)}
                      </Text>
                    </View>
                    {dineInBill.pricing.discount > 0 && (
                      <View className="flex-row justify-between w-full mb-2">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          Discount
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          -₹{formatPrice(dineInBill.pricing.discount)}
                        </Text>
                      </View>
                    )}
                    {dineInBill.pricing.packagingFee > 0 && (
                      <View className="flex-row justify-between w-full mb-2">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          Packaging fee
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          ₹{formatPrice(dineInBill.pricing.packagingFee)}
                        </Text>
                      </View>
                    )}
                    {dineInBill.pricing.platformFee > 0 && (
                      <View className="flex-row justify-between w-full mb-2">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          Platform fee
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          ₹{formatPrice(dineInBill.pricing.platformFee)}
                        </Text>
                      </View>
                    )}
                    {dineInBill.pricing.deliveryFee > 0 && (
                      <View className="flex-row justify-between w-full mb-2">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          Delivery fee
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          ₹{formatPrice(dineInBill.pricing.deliveryFee)}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row justify-between w-full mb-2">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        {dineInBill.pricing.taxPercentage
                          ? `Tax (${dineInBill.pricing.taxPercentage}%)`
                          : "Tax"}
                      </Text>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        ₹{formatPrice(dineInBill.pricing.tax)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between w-full mb-2">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        Bill total
                      </Text>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: theme.muted }}
                      >
                        ₹{formatPrice(dineInBill.pricing.total)}
                      </Text>
                    </View>
                    {dineInBill.pricing.paidTotal > 0 && (
                      <View className="flex-row justify-between w-full mb-2">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          Paid
                        </Text>
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: theme.muted }}
                        >
                          -₹{formatPrice(dineInBill.pricing.paidTotal)}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row justify-between w-full">
                      <Text
                        className="text-xl font-black"
                        style={{ color: theme.text }}
                      >
                        Amount Due
                      </Text>
                      <Text
                        className="text-xl font-black"
                        style={{ color: theme.primary }}
                      >
                        ₹{formatPrice(dineInBill.pricing.amountDue)}
                      </Text>
                    </View>
                    <Text
                      className="text-xs font-semibold text-center mt-3"
                      style={{ color: theme.muted }}
                    >
                      {dineInBill.canPay
                        ? "The bill is ready, but in-app payment is not available yet."
                        : `This bill is not payable yet. Payment status: ${dineInBill.paymentStatus}.`}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setActiveServiceModal(null)}
                  disabled={serviceLoading}
                  className="w-full h-14 mt-4 rounded-2xl items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: theme.primary,
                    opacity: serviceLoading ? 0.6 : 1,
                  }}
                >
                  <Text className="text-white font-black text-lg tracking-wide">
                    Close
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
