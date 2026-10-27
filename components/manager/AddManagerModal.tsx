import {
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
  MANAGER_PHONES,
} from "@/constants/managerMockData";
import { Feather } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";
import {
  AdminPerson,
  AdminTable,
  AdminWaiter,
  adminProfileApi,
} from "../../services/api/admin-profile";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const COUNTRIES = [
  { name: "India", code: "+91", flag: "🇮🇳", minLen: 10, maxLen: 10 },
  { name: "United States", code: "+1", flag: "🇺🇸", minLen: 10, maxLen: 10 },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", minLen: 10, maxLen: 10 },
  {
    name: "United Arab Emirates",
    code: "+971",
    flag: "🇦🇪",
    minLen: 9,
    maxLen: 9,
  },
  { name: "Canada", code: "+1", flag: "🇨🇦", minLen: 10, maxLen: 10 },
  { name: "Australia", code: "+61", flag: "🇦🇺", minLen: 9, maxLen: 9 },
];

const MANAGER_NUMBER_PREFIX = "restaurant.managerDisplayNumber.";
const MANAGER_NUMBER_COUNTER_KEY = "restaurant.managerDisplayNumber.next";

async function getStoredManagerNumber(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for manager IDs.");
    }
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredManagerNumber(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for manager IDs.");
    }
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStableManagerNumbers(
  managers: AdminPerson[],
): Promise<Map<string, number>> {
  const sortedManagers = [...managers].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  const numbersById = new Map<string, number>();
  const storedNumbers = await Promise.all(
    sortedManagers.map(async (manager) => ({
      id: manager.id,
      value: await getStoredManagerNumber(
        `${MANAGER_NUMBER_PREFIX}${encodeURIComponent(manager.id)}`,
      ),
    })),
  );
  let nextNumber =
    Number(await getStoredManagerNumber(MANAGER_NUMBER_COUNTER_KEY)) || 0;

  storedNumbers.forEach(({ id, value }) => {
    const number = Number(value);
    if (Number.isSafeInteger(number) && number > 0) {
      numbersById.set(id, number);
      nextNumber = Math.max(nextNumber, number);
    }
  });

  for (const manager of sortedManagers) {
    if (numbersById.has(manager.id)) continue;
    nextNumber += 1;
    await setStoredManagerNumber(
      `${MANAGER_NUMBER_PREFIX}${encodeURIComponent(manager.id)}`,
      String(nextNumber),
    );
    numbersById.set(manager.id, nextNumber);
  }

  await setStoredManagerNumber(MANAGER_NUMBER_COUNTER_KEY, String(nextNumber));
  return numbersById;
}

export default function AddManagerModal() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const params = useLocalSearchParams<{ phone?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();
  const isAdmin = segments[0] === "(admin)";

  const resolvedPathPhone = isAdmin
    ? ""
    : pathname?.includes("floor")
      ? MANAGER_MOCK_DATA.managers?.find(
          (m: any) => m.managerType === "floor" || m.role === "floor",
        )?.phone || MANAGER_PHONES.floor_1
      : MANAGER_MOCK_DATA.managers?.find(
          (m: any) => m.managerType === "operations" || m.role === "operations",
        )?.phone || MANAGER_PHONES.ops_1;

  const loggedInPhone = isAdmin
    ? params.phone || ""
    : params.phone || currentManager?.phone || resolvedPathPhone;

  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [managerFirstName, setManagerFirstName] = useState("");
  const [managerLastName, setManagerLastName] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [managerStatusFilter, setManagerStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [managerRoleFilter, setManagerRoleFilter] = useState<
    "all" | "operations" | "floor"
  >("all");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerRole, setManagerRole] = useState<"operations" | "floor">(
    "operations",
  );
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedWaiters, setSelectedWaiters] = useState<string[]>([]);
  const [requiredFieldErrors, setRequiredFieldErrors] = useState({
    firstName: false,
    phone: false,
    tables: false,
    waiters: false,
  });
  const [editValidationErrors, setEditValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedIsActive, setEditedIsActive] = useState(true);
  const [editedRole, setEditedRole] = useState<
    "operations" | "floor" | "admin"
  >("operations");
  const [editedTables, setEditedTables] = useState<string[]>([]);
  const [editedWaiters, setEditedWaiters] = useState<string[]>([]);
  const [adminManagers, setAdminManagers] = useState<AdminPerson[]>([]);
  const [managerNumbersById, setManagerNumbersById] = useState<
    Map<string, number>
  >(() => new Map());
  const [adminWaiters, setAdminWaiters] = useState<AdminWaiter[]>([]);
  const [adminTables, setAdminTables] = useState<AdminTable[]>([]);
  const [adminAvailableTables, setAdminAvailableTables] = useState<
    AdminTable[]
  >([]);
  const hasLoadedAdminStaff = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const loadAdminStaff = useCallback(async (forceRefresh = false) => {
    if (!isAdmin) return;
    if (!hasLoadedAdminStaff.current) setLoading(true);
    if (forceRefresh) setRefreshing(true);
    try {
      const [managers, waiters, tables] = await Promise.all([
        adminProfileApi.getManagers(forceRefresh),
        adminProfileApi.getWaiters(forceRefresh),
        adminProfileApi.getTables(forceRefresh),
      ]);
      const numbers = await getStableManagerNumbers(managers);
      setManagerNumbersById(numbers);
      setAdminManagers(managers);
      setAdminWaiters(waiters);
      setAdminTables(tables);
      hasLoadedAdminStaff.current = true;
    } catch (error) {
      Alert.alert(
        "Unable to load managers",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin && !hasLoadedAdminStaff.current) {
        void loadAdminStaff();
        return;
      }
      if (isAdmin) return;

      let isCurrent = true;
      getStableManagerNumbers(
        (MANAGER_MOCK_DATA.managers || []).filter(
          (manager: any) =>
            manager.role !== "admin" && manager.managerType !== "admin",
        ),
      )
        .then((numbers) => {
          if (isCurrent) setManagerNumbersById(numbers);
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            Alert.alert(
              "Unable to load manager IDs",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        });

      return () => {
        isCurrent = false;
      };
    }, [isAdmin, loadAdminStaff]),
  );
  const [, forceUpdate] = useState({});

  const getTableNumber = (str: string) => {
    const match = String(str).match(/\d+/);
    return match ? match[0] : String(str).toUpperCase().trim();
  };

  const getAssignmentId = (assignment: unknown): string => {
    if (typeof assignment === "string") return assignment;
    if (assignment && typeof assignment === "object" && "id" in assignment) {
      return String(assignment.id);
    }
    return "";
  };

  const getManagerAssignedWaiters = (manager: AdminPerson) =>
    (manager.relatedWaiters || []).filter((waiter) =>
      typeof waiter.isAssignedToManager === "boolean"
        ? waiter.isAssignedToManager
        : waiter.managerId === undefined || waiter.managerId !== null,
    );

  const tableAssignmentStatus = (table: AdminTable | undefined) =>
    table?.tableStatus !== undefined
      ? table.tableStatus?.status
      : table?.status;
  const tableAssignedManagerId = (table: AdminTable) =>
    table.tableStatus !== undefined
      ? table.tableStatus?.managerId
      : table.managerId;
  const isTableUnassigned = (table: AdminTable) =>
    table.isActive !== false &&
    (table.tableStatus !== undefined
      ? table.tableStatus === null
      : !table.managerId && isTableFree(table.status));
  const waiterAssignmentStatus = (waiter: AdminWaiter) =>
    waiter.waiterStatus !== undefined
      ? waiter.waiterStatus?.status
      : waiter.status;
  const waiterAssignedManagerId = (waiter: AdminWaiter) =>
    waiter.waiterStatus !== undefined
      ? waiter.waiterStatus?.managerId
      : waiter.managerId || waiter.manager?.id;
  const isWaiterUnassigned = (waiter: AdminWaiter) =>
    waiter.isActive !== false &&
    (waiter.waiterStatus !== undefined
      ? waiter.waiterStatus === null
      : !waiter.managerId && !waiter.manager?.id && waiter.status?.toLowerCase() === "available");

  const refreshAssignmentResources = async () => {
    const [managers, waiters, tables] = await Promise.all([
      adminProfileApi.getManagers(true),
      adminProfileApi.getWaiters(true),
      adminProfileApi.getTables(),
    ]);
    const numbers = await getStableManagerNumbers(managers);
    setManagerNumbersById(numbers);
    setAdminManagers(managers);
    setAdminWaiters(waiters);
    setAdminTables(tables);
    const availableTables = tables.filter(isTableUnassigned);
    setAdminAvailableTables(availableTables);
    return { managers, waiters, tables, availableTables };
  };

  const cleanPhone = (str: string) =>
    String(str || "")
      .replace(/\D/g, "")
      .slice(-10);

  const isLoggedInManager = (manager: any) =>
    Boolean(
      (currentManager?.id && manager.id === currentManager.id) ||
      (loggedInPhone &&
        manager.phone &&
        cleanPhone(manager.phone) === cleanPhone(loggedInPhone)) ||
      (loggedInPhone &&
        manager.mobile &&
        cleanPhone(manager.mobile) === cleanPhone(loggedInPhone)),
    );

  const formatTableLabel = (table: unknown) => {
    if (table && typeof table === "object") {
      const entry = table as { tableNumber?: unknown; id?: unknown };
      if (entry.tableNumber !== undefined) {
        return `Table ${entry.tableNumber}`;
      }
      table = entry.id;
    }
    const value = String(table ?? "");
    const number = getTableNumber(value);
    return /^\d+$/.test(number) ? `Table ${number}` : value;
  };

  const otherManagers = isAdmin
    ? adminManagers
        .filter((manager) => manager.id !== editingId)
        .map((manager) => ({
          ...manager,
          assignedTables:
            manager.assignedTables?.map((table) => table.id) || [],
          assignedWaiters:
            manager.relatedWaiters?.map((waiter) => waiter.id) || [],
        }))
    : (MANAGER_MOCK_DATA.managers || []).filter(
        (manager: any) =>
          manager.id !== editingId &&
          manager.role !== "admin" &&
          manager.managerType !== "admin",
      );

  const takenTableNumbers = new Set(
    otherManagers
      .flatMap((m: any) => m.assignedTables || [])
      .map((val: unknown) => getTableNumber(getAssignmentId(val))),
  );

  const managerBeingEdited = isAdmin
    ? adminManagers.find((manager) => manager.id === editingId)
    : MANAGER_MOCK_DATA.managers?.find(
        (manager: any) => manager.id === editingId,
      );
  const currentAssignedTables = isAdmin && managerBeingEdited
    ? (managerBeingEdited.assignedTables || []).map((table: unknown) =>
        getAssignmentId(table),
      )
    : (managerBeingEdited?.assignedTables || []).map((table: unknown) =>
        getAssignmentId(table),
      );
  const assignedActiveTables = isAdmin && managerBeingEdited
    ? managerBeingEdited.assignedTables || []
    : adminTables.filter(
        (table) =>
          Boolean(editingId) &&
          table.isActive !== false &&
          tableAssignedManagerId(table) === editingId,
      );
  const tableOptions = isAdmin
    ? [
        ...(managerBeingEdited?.availableTables ?? adminAvailableTables),
        ...assignedActiveTables,
      ].filter(
        (table: AdminTable, index: number, all: AdminTable[]) =>
          all.findIndex(
            (candidate) =>
              getAssignmentId(candidate) === getAssignmentId(table),
          ) === index,
      )
    : INITIAL_FLOOR_TABLES.filter((table: any) => {
        const tableNumber = getTableNumber(
          table.id || table.tableName || table.number || "",
        );
        return !takenTableNumbers.has(tableNumber);
      });

  const takenWaiterIds = new Set(
    [
      ...adminWaiters
        .filter((waiter) => waiterAssignedManagerId(waiter))
        .map((waiter) => waiter.id),
      ...otherManagers.flatMap((manager: any) =>
        (manager.assignedWaiters || []).map(getAssignmentId),
      ),
    ],
  );

  const availableWaiters = isAdmin
    ? adminWaiters.filter(isWaiterUnassigned)
    : (MANAGER_MOCK_DATA.waiters || []).filter(
        (waiter: any) =>
          waiter.isActive !== false && !takenWaiterIds.has(waiter.id),
      );
  const waiterOptions = isAdmin
    ? [
        ...(managerBeingEdited?.availableWaiters ?? availableWaiters),
        ...(managerBeingEdited
          ? getManagerAssignedWaiters(managerBeingEdited)
          : adminWaiters.filter(
              (waiter) =>
                Boolean(editingId) &&
                waiter.isActive !== false &&
                waiterAssignedManagerId(waiter) === editingId,
            )),
      ].filter(
        (waiter: AdminWaiter, index: number, all: AdminWaiter[]) =>
          all.findIndex((candidate) => candidate.id === waiter.id) === index,
      )
    : availableWaiters;

  const isTableFree = (status: string | undefined) =>
    status?.toLowerCase() === "available" || status?.toLowerCase() === "free";

  const verifyTablesCanBeReleased = async (tableIds: string[]) => {
    if (tableIds.length === 0) return true;
    const tables = await adminProfileApi.getTables();
    const unavailable = tableIds.filter((id) => {
      const table = tables.find((entry) => entry.id === id);
      return (
        !table ||
        table.isActive === false ||
        !isTableFree(tableAssignmentStatus(table))
      );
    });
    if (unavailable.length > 0) {
      const labels = unavailable.map((id) => {
        const table = tables.find((entry) => entry.id === id);
        return `Table ${table?.tableNumber ?? id} (${tableAssignmentStatus(table) || "status unavailable"})`;
      });
      Alert.alert(
        "Cannot change table assignments",
        `These tables must be free before they can be unassigned:\n${labels.join("\n")}`,
      );
      return false;
    }
    return true;
  };

  const verifyWaitersCanBeReleased = async (waiterIds: string[]) => {
    if (waiterIds.length === 0) return true;
    const waiters = await adminProfileApi.getWaiters(true);
    const unavailable = waiterIds.filter((id) => {
      const waiter = waiters.find((entry) => entry.id === id);
      return (
        !waiter ||
        waiter.isActive === false ||
        waiterAssignmentStatus(waiter)?.toLowerCase() !== "available"
      );
    });
    if (unavailable.length > 0) {
      const labels = unavailable.map(
        (id) => waiters.find((waiter) => waiter.id === id)?.name || id,
      );
      Alert.alert(
        "Cannot change waiter assignments",
        `These waiters must be available before they can be unassigned:\n${labels.join("\n")}`,
      );
      return false;
    }
    return true;
  };

  const handleManagerRoleChange = async (role: "operations" | "floor") => {
    if (role === managerRole) return;
    if (role === "floor" && isAdmin) {
      setAssignmentLoading(true);
      try {
        await refreshAssignmentResources();
        setSelectedTables([]);
        setSelectedWaiters([]);
        setRequiredFieldErrors((current) => ({
          ...current,
          tables: false,
          waiters: false,
        }));
        setManagerRole(role);
      } catch (error) {
        Alert.alert(
          "Unable to load assignments",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setAssignmentLoading(false);
      }
      return;
    }
    setSelectedTables([]);
    setSelectedWaiters([]);
    setRequiredFieldErrors((current) => ({
      ...current,
      tables: false,
      waiters: false,
    }));
    setManagerRole(role);
  };

  const handleEditedRoleChange = async (role: "operations" | "floor") => {
    if (role === editedRole) return;
    if (role === "operations" && editedRole === "floor" && isAdmin) {
      setAssignmentLoading(true);
      try {
        if (!(await verifyTablesCanBeReleased(currentAssignedTables))) return;
        const currentWaiterIds = adminWaiters
          .filter(
            (waiter) =>
              waiter.isActive !== false &&
              waiterAssignedManagerId(waiter) === editingId,
          )
          .map((waiter) => waiter.id);
        if (!(await verifyWaitersCanBeReleased(currentWaiterIds))) return;
      } catch (error) {
        Alert.alert(
          "Unable to verify table status",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      } finally {
        setAssignmentLoading(false);
      }
    }
    if (role === "floor" && isAdmin) {
      setAssignmentLoading(true);
      try {
        await refreshAssignmentResources();
      } catch (error) {
        Alert.alert(
          "Unable to load assignments",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      } finally {
        setAssignmentLoading(false);
      }
    }
    setEditedRole(role);
    if (role === "operations") {
      setEditedTables([]);
      setEditedWaiters([]);
    }
  };

  const toggleTableSelection = async (tableId: string) => {
    const removing = selectedTables.includes(tableId);
    if (isAdmin) {
      setAssignmentLoading(true);
      try {
        const tables = await adminProfileApi.getTables();
        const liveTable = tables.find((table) => table.id === tableId);
        if (removing) {
          const canUnassign =
            liveTable &&
            liveTable.isActive !== false &&
            (isTableUnassigned(liveTable) ||
              (tableAssignedManagerId(liveTable) === editingId &&
                isTableFree(tableAssignmentStatus(liveTable))));
          if (!canUnassign) {
            Alert.alert(
              "Table in use",
              "This table can only be unassigned when its status is available.",
            );
            return;
          }
        } else {
          if (
            !liveTable ||
            !isTableUnassigned(liveTable)
          ) {
            Alert.alert(
              "Table unavailable",
              "This table is no longer active and unassigned. Refresh the list and try again.",
            );
            return;
          }
        }
      } catch (error) {
        Alert.alert(
          "Unable to verify table availability",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      } finally {
        setAssignmentLoading(false);
      }
    }
    const nextTables = removing
      ? selectedTables.filter((id) => id !== tableId)
      : [...selectedTables, tableId];
    setSelectedTables(nextTables);
    setRequiredFieldErrors((current) => ({
      ...current,
      tables: false,
      waiters: false,
    }));
    if (nextTables.length === 0) setSelectedWaiters([]);
  };

  const toggleWaiterSelection = async (waiterId: string) => {
    if (isAdmin && !selectedWaiters.includes(waiterId)) {
      setAssignmentLoading(true);
      try {
        const waiters = await adminProfileApi.getWaiters(true);
        const waiter = waiters.find((entry) => entry.id === waiterId);
        if (!waiter || !isWaiterUnassigned(waiter)) {
          Alert.alert(
            "Waiter unavailable",
            "This waiter is no longer active and unassigned.",
          );
          return;
        }
      } catch (error) {
        Alert.alert(
          "Unable to verify waiter availability",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      } finally {
        setAssignmentLoading(false);
      }
    }
    setSelectedWaiters((current) =>
      current.includes(waiterId)
        ? current.filter((id) => id !== waiterId)
        : [...current, waiterId],
    );
    if (!selectedWaiters.includes(waiterId)) {
      setRequiredFieldErrors((current) => ({ ...current, waiters: false }));
    }
  };

  const toggleEditedTableSelection = async (tableId: string) => {
    const removing = editedTables.includes(tableId);
    if (isAdmin) {
      const manager = adminManagers.find((entry) => entry.id === editingId);
      const liveTable = removing
        ? manager?.assignedTables?.find((table) => table.id === tableId)
        : manager?.availableTables?.find((table) => table.id === tableId);
      if (
        !liveTable ||
        liveTable.isActive === false ||
        !isTableFree(tableAssignmentStatus(liveTable))
      ) {
        Alert.alert(
          removing ? "Table in use" : "Table unavailable",
          removing
            ? "This table can only be unassigned when its status is available."
            : "Only active, available tables from the manager response can be assigned.",
        );
        return;
      }
    }
    setEditedTables((current) =>
      removing ? current.filter((id) => id !== tableId) : [...current, tableId],
    );
  };

  const toggleEditedWaiterSelection = async (waiterId: string) => {
    if (isAdmin) {
      const removing = editedWaiters.includes(waiterId);
      const manager = adminManagers.find((entry) => entry.id === editingId);
      const waiter = removing
        ? manager && getManagerAssignedWaiters(manager).find(
            (entry) => entry.id === waiterId,
          )
        : manager?.availableWaiters?.find((entry) => entry.id === waiterId);
      if (
        !waiter ||
        waiter.isActive === false ||
        waiterAssignmentStatus(waiter)?.toLowerCase() !== "available"
      ) {
        Alert.alert(
          removing ? "Waiter in use" : "Waiter unavailable",
          removing
            ? "A related waiter can only be unassigned when their status is available."
            : "Only active, available waiters from the manager response can be assigned.",
        );
        return;
      }
    }
    setEditedWaiters((current) =>
      current.includes(waiterId)
        ? current.filter((id) => id !== waiterId)
        : [...current, waiterId],
    );
  };

  const handleSaveManager = async () => {
    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    const firstNameMissing = !managerFirstName.trim();
    const phoneInvalid =
      cleanedNumber.length < selectedCountry.minLen ||
      cleanedNumber.length > selectedCountry.maxLen;
    const tablesMissing =
      managerRole === "floor" && selectedTables.length === 0;
    const waitersMissing =
      managerRole === "floor" && selectedWaiters.length === 0;
    setRequiredFieldErrors({
      firstName: firstNameMissing,
      phone: phoneInvalid,
      tables: tablesMissing,
      waiters: waitersMissing,
    });

    if (firstNameMissing || phoneInvalid || tablesMissing || waitersMissing) {
      return;
    }

    if (isAdmin) {
      const firstName = managerFirstName.trim();
      const lastName = managerLastName.trim();
      setSaving(true);
      try {
        if (managerRole === "floor") {
          const { waiters, tables, availableTables } =
            await refreshAssignmentResources();
          if (
            selectedTables.some(
              (id) => {
                const table = tables.find((entry) => entry.id === id);
                return (
                  !availableTables.some((entry) => entry.id === id) ||
                  !table ||
                  !isTableUnassigned(table)
                );
              },
            )
          ) {
            throw new Error(
              "One or more selected tables are no longer free and unassigned. Please review the table selection.",
            );
          }
          if (
            selectedWaiters.some((id) => {
              const waiter = waiters.find((entry) => entry.id === id);
              return (
                !waiter ||
                waiter.isActive === false ||
                !isWaiterUnassigned(waiter)
              );
            })
          ) {
            throw new Error(
              "One or more selected waiters are no longer active, available, and unassigned. Please review the waiter selection.",
            );
          }
        }
        await adminProfileApi.createManager({
          name: [firstName, lastName].filter(Boolean).join(" "),
          firstName,
          lastName,
          phone: cleanedNumber,
          managerType: managerRole,
          tableIds: managerRole === "floor" ? selectedTables : [],
          waiterIds: managerRole === "floor" ? selectedWaiters : [],
        });
        await loadAdminStaff();
        setManagerFirstName("");
        setManagerLastName("");
        setPhoneNumber("");
        setSelectedTables([]);
        setSelectedWaiters([]);
        setRequiredFieldErrors({
          firstName: false,
          phone: false,
          tables: false,
          waiters: false,
        });
        setActiveTab("showAll");
        Alert.alert(
          "Success",
          `Manager "${[firstName, lastName].filter(Boolean).join(" ")}" added successfully!`,
        );
      } catch (error) {
        Alert.alert(
          "Unable to add manager",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const fullPhoneNumber = `${selectedCountry.code} ${phoneNumber.trim()}`;
    const newId = `mgr_${Date.now()}`;

    const newManagerObj = {
      id: newId,
      name: [managerFirstName.trim(), managerLastName.trim()]
        .filter(Boolean)
        .join(" "),
      firstName: managerFirstName.trim(),
      lastName: managerLastName.trim(),
      phone: fullPhoneNumber,
      role: "manager",
      managerType: managerRole,
      isActive: true,
      assignedTables:
        managerRole === "floor"
          ? selectedTables.map((tName) => {
              const match = INITIAL_FLOOR_TABLES.find(
                (t: any) => t.tableName === tName || t.id === tName,
              );
              if (match) {
                const num = getTableNumber(match.id || match.tableName);
                return `T${num}`;
              }
              return tName;
            })
          : [],
      assignedWaiters: managerRole === "floor" ? selectedWaiters : [],
    };

    if (!MANAGER_MOCK_DATA.managers) {
      MANAGER_MOCK_DATA.managers = [];
    }
    MANAGER_MOCK_DATA.managers.push(newManagerObj as any);

    Alert.alert(
      "Success",
      `Manager "${[managerFirstName.trim(), managerLastName.trim()].filter(Boolean).join(" ")}" added successfully!`,
      [
        {
          text: "OK",
          onPress: () => {
            setManagerFirstName("");
            setManagerLastName("");
            setPhoneNumber("");
            setSelectedTables([]);
            setSelectedWaiters([]);
            setActiveTab("showAll");
            forceUpdate({});
          },
        },
      ],
    );
  };

  const handleStartEdit = async (mgr: any) => {
    setEditValidationErrors({});
    let manager = mgr;
    let initialTables: string[] = (mgr.assignedTables || []).map(
      (assignment: unknown) => getAssignmentId(assignment),
    );
    let initialWaiters: string[] = (
      isAdmin ? mgr.relatedWaiters || [] : mgr.assignedWaiters || []
    ).map((assignment: unknown) => getAssignmentId(assignment));

    if (isAdmin) {
      setAssignmentLoading(true);
      try {
        const { managers, waiters, tables, availableTables } =
          await refreshAssignmentResources();
        const freshManager = managers.find((entry) => entry.id === mgr.id);
        if (!freshManager) {
          throw new Error(
            "This manager is no longer available. Refresh the list and try again.",
          );
        }
        const assignedTables =
          freshManager.assignedTables?.length
            ? freshManager.assignedTables
            : tables.filter(
                (table) => tableAssignedManagerId(table) === freshManager.id,
              );
        const assignedWaiters = getManagerAssignedWaiters(freshManager);
        const relatedWaiters =
          assignedWaiters.length > 0
            ? assignedWaiters
            : waiters
                .filter(
                  (waiter) =>
                    waiterAssignedManagerId(waiter) === freshManager.id,
                )
                .map((waiter) => ({ ...waiter, isAssignedToManager: true }));
        const managerAvailableTables =
          freshManager.availableTables?.length
            ? freshManager.availableTables
            : availableTables;
        const managerAvailableWaiters =
          freshManager.availableWaiters?.length
            ? freshManager.availableWaiters
            : waiters.filter(isWaiterUnassigned);

        manager = {
          ...freshManager,
          assignedTables,
          availableTables: managerAvailableTables,
          relatedWaiters,
          availableWaiters: managerAvailableWaiters,
        };
        setAdminManagers((current) =>
          current.map((entry) =>
            entry.id === freshManager.id ? manager : entry,
          ),
        );
        initialTables = assignedTables.map((table) =>
          getAssignmentId(table),
        );
        initialWaiters = relatedWaiters.map(
          (waiter) => waiter.id,
        );

        if (
          freshManager.isActive === false &&
          (initialTables.length > 0 || initialWaiters.length > 0)
        ) {
          Alert.alert(
            "Unassign before editing",
            "This manager is inactive. Unassign all tables and related waiters, then save to unlock manager detail editing.",
          );
        }
      } catch (error) {
        Alert.alert(
          "Unable to load assignments",
          error instanceof Error ? error.message : "Please try again.",
        );
        return;
      } finally {
        setAssignmentLoading(false);
      }
    }

    setEditingId(manager.id);
    const [fallbackFirstName = "", ...fallbackLastName] = String(
      manager.name || "",
    ).split(/\s+/);
    setEditedFirstName(manager.firstName || fallbackFirstName);
    setEditedLastName(manager.lastName || fallbackLastName.join(" "));
    setEditedPhone(manager.phone || "");
    setEditedIsActive(manager.isActive !== false);

    let resolvedRole = "operations";
    if (manager.managerType === "floor" || manager.role === "floor") {
      resolvedRole = "floor";
    } else if (manager.managerType === "admin" || manager.role === "admin") {
      resolvedRole = "admin";
    }
    setEditedRole(resolvedRole as any);
    setEditedTables(
      resolvedRole === "floor"
        ? initialTables.filter(Boolean)
        : [],
    );
    setEditedWaiters(
      resolvedRole === "floor"
        ? initialWaiters.filter(Boolean)
        : [],
    );
  };

  const handleEditedActiveChange = (
    manager: AdminPerson,
    isActive: boolean,
  ) => {
    if (!isActive && manager.isCheckIn !== false) {
      Alert.alert(
        manager.isCheckIn ? "Manager is checked in" : "Check-in status unavailable",
        manager.isCheckIn
          ? "Check the manager out before changing their status to inactive."
          : "Refresh the manager list to verify check-in status before changing them to inactive.",
      );
      return;
    }
    setEditedIsActive(isActive);
  };

  const handleSaveEdit = async (mgrId: string) => {
    const errors: Record<string, string> = {};
    if (!editedFirstName.trim()) {
      errors.editedFirstName = "First Name is required.";
    }

    if (!editedPhone.trim()) {
      errors.editedPhone = "Phone Number is required.";
    }
    if (Object.keys(errors).length > 0) {
      setEditValidationErrors(errors);
      return;
    }
    setEditValidationErrors({});

    const mgr = isAdmin
      ? adminManagers.find((manager) => manager.id === mgrId)
      : MANAGER_MOCK_DATA.managers?.find((m: any) => m.id === mgrId);
    if (mgr) {
      if (
        editedRole === "floor" &&
        (editedIsActive || mgr.isActive !== false) &&
        editedTables.length === 0
      ) {
        Alert.alert(
          "Error",
          "Please assign at least one table for the Floor Manager!",
        );
        return;
      }

      if (
        editedRole === "floor" &&
        (editedIsActive || mgr.isActive !== false) &&
        editedWaiters.length === 0
      ) {
        Alert.alert(
          "Error",
          "Please assign at least one waiter for the Floor Manager!",
        );
        return;
      }

      if (isAdmin) {
        const firstName = editedFirstName.trim();
        const lastName = editedLastName.trim();
        setSaving(true);
        try {
          const managers = await adminProfileApi.getManagers(true);
          const numbers = await getStableManagerNumbers(managers);
          setManagerNumbersById(numbers);
          setAdminManagers(managers);
          const freshManager = managers.find((manager) => manager.id === mgrId);
          if (!freshManager) {
            throw new Error(
              "This manager is no longer available. Refresh the list and try again.",
            );
          }
          if (!editedIsActive && freshManager.isCheckIn !== false) {
            Alert.alert(
              freshManager.isCheckIn
                ? "Manager is checked in"
                : "Check-in status unavailable",
              freshManager.isCheckIn
                ? "Check the manager out before changing their status to inactive."
                : "Refresh the manager list to verify check-in status before changing them to inactive.",
            );
            return;
          }
          const assignedTables = freshManager.assignedTables || [];
          const availableTables = freshManager.availableTables || [];
          const relatedWaiters = getManagerAssignedWaiters(freshManager);
          const availableWaiters = freshManager.availableWaiters || [];
          const originalTableIds = assignedTables.map((table) => table.id);
          const originalWaiterIds = relatedWaiters.map((waiter) => waiter.id);
          const removedTableIds = originalTableIds.filter(
            (id: string) =>
              editedRole !== "floor" || !editedTables.includes(id),
          );
          const unavailableTablesToRelease = removedTableIds.filter((id) => {
            const table = assignedTables.find((entry) => entry.id === id);
            return (
              !table ||
              table.isActive === false ||
              !isTableFree(table.status)
            );
          });
          if (unavailableTablesToRelease.length > 0) {
            Alert.alert(
              "Cannot change table assignments",
              "Assigned tables must be active and available before they can be unassigned.",
            );
            return;
          }
          const removedWaiterIds = originalWaiterIds.filter(
            (id: string) =>
              editedRole !== "floor" || !editedWaiters.includes(id),
          );
          const unavailableWaitersToRelease = removedWaiterIds.filter((id) => {
            const waiter = relatedWaiters.find((entry) => entry.id === id);
            return (
              !waiter ||
              waiter.isActive === false ||
              waiter.status?.toLowerCase() !== "available"
            );
          });
          if (unavailableWaitersToRelease.length > 0) {
            Alert.alert(
              "Cannot change waiter assignments",
              "Related waiters must be active and available before they can be unassigned.",
            );
            return;
          }

          if (editedRole === "floor") {
            const newlySelectedTableIds = editedTables.filter(
              (id) => !originalTableIds.includes(id),
            );
            if (
              newlySelectedTableIds.some(
                (id) => {
                  const table = availableTables.find(
                    (entry) => entry.id === id,
                  );
                  return (
                    !table ||
                    table.isActive === false ||
                    !isTableFree(table.status)
                  );
                },
              )
            ) {
              throw new Error(
                "One or more selected tables are no longer free and unassigned. Please review the table selection.",
              );
            }
            const newlySelectedWaiterIds = editedWaiters.filter(
              (id) => !originalWaiterIds.includes(id),
            );
            if (
              newlySelectedWaiterIds.some((id) => {
                const waiter = availableWaiters.find(
                  (entry) => entry.id === id,
                );
                return (
                  !waiter ||
                  waiter.isActive === false ||
                  waiter.status?.toLowerCase() !== "available"
                );
              })
            ) {
              throw new Error(
                "One or more selected waiters are no longer active, available, and unassigned. Please review the waiter selection.",
              );
            }
          }

          const updateBody = {
            name: [firstName, lastName].filter(Boolean).join(" "),
            phone: cleanPhone(editedPhone),
            managerType: editedRole,
            isActive: editedIsActive,
            tableIds: editedRole === "floor" ? editedTables : [],
            waiterIds: editedRole === "floor" ? editedWaiters : [],
          };
          await adminProfileApi.updateManager(mgrId, updateBody);
          await loadAdminStaff();
          setEditingId(null);
          setEditedFirstName("");
          setEditedLastName("");
          setEditedPhone("");
          setEditedRole("operations");
          setEditedTables([]);
          setEditedWaiters([]);
        } catch (error) {
          Alert.alert(
            "Unable to update manager",
            error instanceof Error ? error.message : "Please try again.",
          );
        } finally {
          setSaving(false);
        }
        return;
      }

      mgr.firstName = editedFirstName.trim();
      mgr.lastName = editedLastName.trim();
      mgr.name = [editedFirstName.trim(), editedLastName.trim()]
        .filter(Boolean)
        .join(" ");
      const isAdminRecord = mgr.role === "admin" || mgr.managerType === "admin";
      if (!isAdminRecord) {
        mgr.managerType = editedRole;
        mgr.role = editedRole === "admin" ? "admin" : "manager";
        mgr.assignedTables =
          editedRole === "floor"
            ? editedTables.map((tName) => {
                const match = INITIAL_FLOOR_TABLES.find(
                  (t: any) => t.tableName === tName || t.id === tName,
                );
                if (match) {
                  const num = getTableNumber(match.id || match.tableName);
                  return `T${num}`;
                }
                return tName;
              })
            : [];
        mgr.assignedWaiters = editedRole === "floor" ? editedWaiters : [];
      }
    }

    setEditingId(null);
    setEditedFirstName("");
    setEditedLastName("");
    setEditedPhone("");
    setEditedRole("operations");
    setEditedTables([]);
    setEditedWaiters([]);
    forceUpdate({});
  };

  const handleDeleteManager = (mgrId: string) => {
    Alert.alert(
      "Delete Manager",
      "Are you sure you want to remove this manager?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isAdmin) {
              try {
                await adminProfileApi.deleteManager(mgrId);
                if (editingId === mgrId) setEditingId(null);
                await loadAdminStaff();
              } catch (error) {
                Alert.alert(
                  "Unable to delete manager",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
              return;
            }

            MANAGER_MOCK_DATA.managers = (
              MANAGER_MOCK_DATA.managers || []
            ).filter((m: any) => m.id !== mgrId);
            if (editingId === mgrId) setEditingId(null);
            forceUpdate({});
          },
        },
      ],
    );
  };

  const rawManagersList: any[] = isAdmin
    ? adminManagers.map((manager) => {
        const tablesFromAssignments = adminTables.filter(
          (table) =>
            table.isActive !== false &&
            tableAssignedManagerId(table) === manager.id,
        );
        const waitersFromAssignments = adminWaiters.filter(
          (waiter) =>
            waiter.isActive !== false &&
            waiterAssignedManagerId(waiter) === manager.id,
        );
        const assignedTables = manager.assignedTables ?? tablesFromAssignments;
        const relatedWaiters =
          manager.relatedWaiters !== undefined
            ? getManagerAssignedWaiters(manager)
            : waitersFromAssignments;

        return {
          ...manager,
          role: "manager",
          assignedTableLabels: assignedTables.map(formatTableLabel),
          assignedTables,
          assignedWaiters: relatedWaiters.map((waiter) => waiter.id),
          assignedWaiterLabels: relatedWaiters.map((waiter) => waiter.name),
        };
      })
    : (MANAGER_MOCK_DATA.managers || [])
        .filter((m: any) => m.role !== "admin" && m.managerType !== "admin")
        .map((manager: any) => ({
          ...manager,
          assignedTableLabels: (manager.assignedTables || []).map(
            formatTableLabel,
          ),
          assignedWaiterLabels: (manager.assignedWaiters || []).map(
            (waiterId: string) =>
              MANAGER_MOCK_DATA.waiters?.find(
                (waiter: any) => waiter.id === waiterId,
              )?.name || waiterId,
          ),
        }));

  const managersList = [...rawManagersList].sort((first: any, second: any) => {
    const selfOrder =
      Number(!isLoggedInManager(first)) - Number(!isLoggedInManager(second));
    if (selfOrder !== 0) return selfOrder;
    return (
      (managerNumbersById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (managerNumbersById.get(second.id) ?? Number.MAX_SAFE_INTEGER) ||
      String(first.id).localeCompare(String(second.id))
    );
  });
  const filteredManagers = managersList.filter((manager: any) => {
    const activeMatches =
      managerStatusFilter === "all" ||
      (managerStatusFilter === "active"
        ? manager.isActive !== false
        : manager.isActive === false);
    const managerType = String(
      manager.managerType || manager.role || "",
    ).toLowerCase();
    const roleMatches =
      managerRoleFilter === "all" || managerType === managerRoleFilter;
    const searchMatches = JSON.stringify(manager)
      .toLowerCase()
      .includes(managerSearch.trim().toLowerCase());
    return activeMatches && roleMatches && searchMatches;
  });

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text
          className="text-xl font-black flex-1"
          style={{ color: theme.text }}
        >
          Manage Managers
        </Text>
      </View>

      {/* Tabs Split */}
      <View
        className="flex-row border-b"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => setActiveTab("add")}
          className="flex-1 py-4 items-center border-b-2"
          style={{
            borderBottomColor:
              activeTab === "add" ? theme.primary : "transparent",
          }}
        >
          <Text
            className="text-base font-bold"
            style={{ color: activeTab === "add" ? theme.primary : theme.muted }}
          >
            Add Manager
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("showAll")}
          className="flex-1 py-4 items-center border-b-2"
          style={{
            borderBottomColor:
              activeTab === "showAll" ? theme.primary : "transparent",
          }}
        >
          <Text
            className="text-base font-bold"
            style={{
              color: activeTab === "showAll" ? theme.primary : theme.muted,
            }}
          >
            Show All ({managersList.length})
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {activeTab === "showAll" && (
          <View
            className="mx-5 mt-4 gap-3"
            style={{
              backgroundColor: theme.bg,
              elevation: 8,
              paddingBottom: 12,
              zIndex: 10,
            }}
          >
            <View
              className="flex-row items-center rounded-xl border px-3"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <Feather name="search" size={18} color={theme.muted} />
              <TextInput
                value={managerSearch}
                onChangeText={setManagerSearch}
                placeholder="Search by any manager detail"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search managers"
                className="flex-1 px-3 py-3"
                style={{ color: theme.text, fontSize: 15 }}
              />
              {managerSearch.length > 0 && (
                <Pressable
                  onPress={() => setManagerSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear manager search"
                  hitSlop={10}
                >
                  <Feather name="x-circle" size={18} color={theme.muted} />
                </Pressable>
              )}
            </View>
            <View className="flex-row gap-2">
              {(["all", "active", "inactive"] as const).map((filter) => {
                const selected = managerStatusFilter === filter;
                const label =
                  filter === "all"
                    ? "All"
                    : filter === "active"
                      ? "Active"
                      : "Inactive";
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setManagerStatusFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-1 items-center rounded-xl border py-2.5"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: selected ? theme.primaryForeground : theme.muted,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-2">
              {(["all", "operations", "floor"] as const).map((filter) => {
                const selected = managerRoleFilter === filter;
                const label =
                  filter === "all"
                    ? "All Roles"
                    : filter === "operations"
                      ? "Operations"
                      : "Floor";
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setManagerRoleFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-1 items-center rounded-xl border py-2.5"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: selected ? theme.primaryForeground : theme.muted,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingTop: activeTab === "showAll" ? 12 : 20,
            paddingBottom: 300,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            isAdmin && activeTab === "showAll" ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadAdminStaff(true)}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            ) : undefined
          }
        >
          {activeTab === "add" ? (
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
            >
              <Text
                className="text-xs font-bold mb-1 uppercase"
                style={{
                  color: requiredFieldErrors.firstName
                    ? theme.danger
                    : theme.muted,
                }}
              >
                First Name *
              </Text>
              <TextInput
                placeholder="e.g. Rahul"
                placeholderTextColor={theme.muted + "44"}
                value={managerFirstName}
                onChangeText={(value) => {
                  setManagerFirstName(value);
                  if (value.trim()) {
                    setRequiredFieldErrors((current) => ({
                      ...current,
                      firstName: false,
                    }));
                  }
                }}
                onBlur={() => setManagerFirstName(managerFirstName.trim())}
                autoCapitalize="words"
                className="px-4 rounded-xl mb-4 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: requiredFieldErrors.firstName
                    ? theme.danger
                    : "transparent",
                  fontSize: 16,
                  height: 52,
                }}
              />
              {requiredFieldErrors.firstName && (
                <Text
                  className="text-xs mb-3"
                  style={{ color: theme.danger }}
                >
                  First name is required.
                </Text>
              )}
              <Text
                className="text-xs font-bold mb-1 uppercase"
                style={{ color: theme.muted }}
              >
                Last Name
              </Text>
              <TextInput
                placeholder="e.g. Sharma"
                placeholderTextColor={theme.muted + "44"}
                value={managerLastName}
                onChangeText={setManagerLastName}
                onBlur={() => setManagerLastName(managerLastName.trim())}
                autoCapitalize="words"
                className="px-4 rounded-xl mb-4 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 16,
                  height: 52,
                }}
              />

              <Text
                className="text-xs font-bold mb-1 uppercase"
                style={{
                  color: requiredFieldErrors.phone
                    ? theme.danger
                    : theme.muted,
                }}
              >
                Phone Number *
              </Text>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => setIsModalVisible(true)}
                  className="flex-row items-center px-3 rounded-xl border justify-between"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: requiredFieldErrors.phone
                      ? theme.danger
                      : theme.border,
                    borderWidth: requiredFieldErrors.phone ? 2 : 1,
                    height: 52,
                    width: 110,
                  }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    {selectedCountry.flag} {selectedCountry.code}
                  </Text>
                  <Feather name="chevron-down" size={16} color={theme.muted} />
                </Pressable>

                <TextInput
                  placeholder="9876543210"
                  placeholderTextColor={theme.muted + "44"}
                  value={phoneNumber}
                  onChangeText={(value) => {
                    setPhoneNumber(value);
                    const cleanedValue = value.replace(/\D/g, "");
                    if (
                      cleanedValue.length >= selectedCountry.minLen &&
                      cleanedValue.length <= selectedCountry.maxLen
                    ) {
                      setRequiredFieldErrors((current) => ({
                        ...current,
                        phone: false,
                      }));
                    }
                  }}
                  onBlur={() => setPhoneNumber(phoneNumber.trim())}
                  keyboardType="phone-pad"
                  maxLength={selectedCountry.maxLen}
                  className="flex-1 px-4 rounded-xl font-bold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: requiredFieldErrors.phone
                      ? theme.danger
                      : "transparent",
                    fontSize: 16,
                    height: 52,
                  }}
                />
              </View>
              {requiredFieldErrors.phone && (
                <Text
                  className="text-xs mb-4"
                  style={{ color: theme.danger }}
                >
                  Enter a valid {selectedCountry.minLen}-digit phone number.
                </Text>
              )}

              <Text
                className="text-xs font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                Access Role *
              </Text>
              <View className="flex-row gap-3 mb-6">
                <Pressable
                  onPress={() => void handleManagerRoleChange("operations")}
                  disabled={assignmentLoading}
                  className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                  style={{
                    backgroundColor:
                      managerRole === "operations" ? theme.primary : theme.bg,
                    borderColor:
                      managerRole === "operations"
                        ? theme.primary
                        : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-black uppercase"
                    style={{
                      color:
                        managerRole === "operations" ? "#ffffff" : theme.text,
                    }}
                  >
                    Operations
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleManagerRoleChange("floor")}
                  disabled={assignmentLoading}
                  className="flex-1 py-3.5 rounded-2xl items-center justify-center border"
                  style={{
                    backgroundColor:
                      managerRole === "floor" ? theme.primary : theme.bg,
                    borderColor:
                      managerRole === "floor" ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-black uppercase"
                    style={{
                      color: managerRole === "floor" ? "#ffffff" : theme.text,
                    }}
                  >
                    Floor
                  </Text>
                </Pressable>
              </View>

              {/* TABLE & WAITER ASSIGNMENT SECTION (ONLY FOR FLOOR MANAGERS) */}
              {managerRole === "floor" && (
                <View className="mb-6 gap-6">
                  {/* Tables Selection */}
                  <View
                    className="gap-2"
                    style={
                      requiredFieldErrors.tables
                        ? {
                            borderColor: theme.danger,
                            borderWidth: 1,
                            borderRadius: 12,
                            padding: 8,
                          }
                        : undefined
                    }
                  >
                    <Text
                      className="text-xs font-bold mb-2 uppercase"
                      style={{
                        color: requiredFieldErrors.tables
                          ? theme.danger
                          : theme.muted,
                      }}
                    >
                      Assign Unassigned Tables *
                    </Text>
                    {tableOptions.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {tableOptions.map((table: any) => {
                          const tableId = getAssignmentId(table);
                          const tableName =
                            table.tableNumber !== undefined
                              ? `Table ${table.tableNumber}`
                              : table.tableName || tableId;
                          const isSelected = selectedTables.includes(tableId);
                          return (
                            <Pressable
                              key={tableId}
                              onPress={() => void toggleTableSelection(tableId)}
                              disabled={assignmentLoading}
                              className="px-4 py-3 rounded-xl border flex-row items-center gap-2"
                              style={{
                                backgroundColor: isSelected
                                  ? theme.primary
                                  : theme.bg,
                                borderColor: isSelected
                                  ? theme.primary
                                  : theme.border,
                              }}
                            >
                              <Text
                                className="text-sm font-bold"
                                style={{
                                  color: isSelected ? "#ffffff" : theme.text,
                                }}
                              >
                                {tableName}
                              </Text>
                              {isSelected && (
                                <Feather
                                  name="check"
                                  size={14}
                                  color="#ffffff"
                                />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Text
                        className="text-xs italic"
                        style={{
                          color: requiredFieldErrors.tables
                            ? theme.danger
                            : theme.muted,
                        }}
                      >
                        No free and unassigned tables are available.
                      </Text>
                    )}
                    {requiredFieldErrors.tables && (
                      <Text
                        className="text-xs"
                        style={{ color: theme.danger }}
                      >
                        Select at least one table.
                      </Text>
                    )}
                  </View>

                  {/* Waiter Selection */}
                  <View
                    className="gap-2"
                    style={
                      requiredFieldErrors.waiters
                        ? {
                            borderColor: theme.danger,
                            borderWidth: 1,
                            borderRadius: 12,
                            padding: 8,
                          }
                        : undefined
                    }
                  >
                      <Text
                        className="text-xs font-bold mb-2 uppercase"
                        style={{
                          color: requiredFieldErrors.waiters
                            ? theme.danger
                            : theme.muted,
                        }}
                      >
                        Assign Available Waiters *
                      </Text>
                      {selectedTables.length === 0 ? (
                        <Text
                          className="text-xs italic"
                          style={{
                            color: requiredFieldErrors.waiters
                              ? theme.danger
                              : theme.muted,
                          }}
                        >
                          Select a table before assigning waiters.
                        </Text>
                      ) : waiterOptions.length > 0 ? (
                        <View className="flex-row flex-wrap gap-2">
                          {waiterOptions.map((waiter: any) => {
                            const isSelected = selectedWaiters.includes(
                              waiter.id,
                            );
                            return (
                              <Pressable
                                key={waiter.id}
                                onPress={() =>
                                  void toggleWaiterSelection(waiter.id)
                                }
                                disabled={assignmentLoading}
                                className="px-4 py-3 rounded-xl border flex-row items-center gap-2"
                                style={{
                                  backgroundColor: isSelected
                                    ? theme.primary
                                    : theme.bg,
                                  borderColor: isSelected
                                    ? theme.primary
                                    : theme.border,
                                }}
                              >
                                <Text
                                  className="text-sm font-bold"
                                  style={{
                                    color: isSelected ? "#ffffff" : theme.text,
                                  }}
                                >
                                  👤 {waiter.name}
                                </Text>
                                {isSelected && (
                                  <Feather
                                    name="check"
                                    size={14}
                                    color="#ffffff"
                                  />
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <Text
                          className="text-xs italic"
                          style={{
                            color: requiredFieldErrors.waiters
                              ? theme.danger
                              : theme.muted,
                          }}
                        >
                          No active, available, unassigned waiters are
                          available.
                        </Text>
                      )}
                      {requiredFieldErrors.waiters && (
                        <Text
                          className="text-xs"
                          style={{ color: theme.danger }}
                        >
                          Select at least one waiter.
                        </Text>
                      )}
                  </View>
                </View>
              )}

              <Button
                title={saving ? "Saving..." : "Save & Grant Access"}
                onPress={handleSaveManager}
                disabled={saving}
                className="py-4 w-full"
              />
            </Card>
          ) : (
            <View className="gap-3">
              <Text
                className="text-xs font-bold mb-1 ml-1 uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                All Registered Managers
              </Text>

              {loading ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  Loading managers...
                </Text>
              ) : managersList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No managers found. Add one from the Add Manager tab.
                </Text>
              ) : filteredManagers.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No managers match the selected search and filters.
                </Text>
              ) : (
                filteredManagers.map((mgr: any) => {
                  const isEditing = editingId === mgr.id;
                  const isSelf = isLoggedInManager(mgr);
                  const hasLiveAssignments =
                    isAdmin &&
                    ((mgr.assignedTables?.length || 0) > 0 ||
                      getManagerAssignedWaiters(mgr).length > 0 ||
                      adminTables.some(
                      (table) => tableAssignedManagerId(table) === mgr.id,
                    ) ||
                      adminWaiters.some(
                        (waiter) =>
                          waiterAssignedManagerId(waiter) === mgr.id,
                      ));
                  const assignmentsMustBeCleared =
                    isAdmin && mgr.isActive === false && hasLiveAssignments;
                  const managerNumber = managerNumbersById.get(mgr.id);
                  const canChangePhone =
                    isAdmin &&
                    !isSelf &&
                    mgr.isActive === false &&
                    !hasLiveAssignments;

                  return (
                    <View
                      key={mgr.id}
                      className="p-4 rounded-2xl border gap-3"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: isSelf ? theme.primary : theme.border,
                        borderWidth: isSelf ? 2 : 1,
                      }}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1 pt-2">
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.primary }}
                            numberOfLines={1}
                          >
                            Manager M-
                            {String(managerNumber ?? 0).padStart(3, "0")}
                            {" · "}
                            {String(
                              mgr.managerType || mgr.role || "manager",
                            ).toUpperCase()}
                            {isSelf ? " · You" : ""}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(mgr.id)}
                                disabled={saving}
                                className="p-2 rounded-xl"
                                style={{
                                  backgroundColor: theme.primary,
                                  opacity: saving ? 0.6 : 1,
                                }}
                              >
                                <Feather name="check" size={18} color="#fff" />
                              </Pressable>
                              <Pressable
                                onPress={() => setEditingId(null)}
                                className="p-2 rounded-xl border"
                                style={{ borderColor: theme.border }}
                              >
                                <Feather
                                  name="x"
                                  size={18}
                                  color={theme.text}
                                />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Pressable
                                onPress={() => handleStartEdit(mgr)}
                                className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.bg,
                                }}
                              >
                                <Feather
                                  name="edit-2"
                                  size={16}
                                  color={theme.primary}
                                />
                                <Text
                                  className="text-sm font-semibold"
                                  style={{ color: theme.text }}
                                >
                                  Edit
                                </Text>
                              </Pressable>
                              {!isSelf && (
                                <Pressable
                                  onPress={() => handleDeleteManager(mgr.id)}
                                  disabled={saving}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Delete ${mgr.name || "manager"}`}
                                  className="p-2 rounded-xl border"
                                  style={{
                                    borderColor: theme.border,
                                    backgroundColor: theme.bg,
                                  }}
                                >
                                  <Feather
                                    name="trash-2"
                                    size={16}
                                    color="#ef4444"
                                  />
                                </Pressable>
                              )}
                            </>
                          )}
                        </View>
                      </View>

                      {isEditing ? (
                        <View className="gap-3 mt-1">
                          <View>
                            <Text
                              className="text-xs font-bold mb-1"
                              style={{ color: theme.muted }}
                            >
                              First Name
                            </Text>
                            <TextInput
                              value={editedFirstName}
                              onChangeText={(value) => {
                                setEditedFirstName(value);
                                if (editValidationErrors.editedFirstName) {
                                  setEditValidationErrors((current) => ({
                                    ...current,
                                    editedFirstName: "",
                                  }));
                                }
                              }}
                              onBlur={() => setEditedFirstName(editedFirstName.trim())}
                              editable={!assignmentsMustBeCleared}
                              autoCapitalize="words"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: editValidationErrors.editedFirstName
                                  ? theme.danger
                                  : theme.primary,
                                borderWidth: editValidationErrors.editedFirstName
                                  ? 2
                                  : 1,
                                color: theme.text,
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                fontSize: 16,
                                fontWeight: "600",
                              }}
                              className="rounded-xl border"
                              autoFocus={true}
                            />
                            {editValidationErrors.editedFirstName ? (
                              <Text className="mt-1 text-xs font-semibold" style={{ color: theme.danger }}>
                                {editValidationErrors.editedFirstName}
                              </Text>
                            ) : null}
                          </View>
                          <View>
                            <Text
                              className="text-xs font-bold mb-1"
                              style={{ color: theme.muted }}
                            >
                              Last Name
                            </Text>
                            <TextInput
                              value={editedLastName}
                              onChangeText={setEditedLastName}
                              onBlur={() => setEditedLastName(editedLastName.trim())}
                              editable={!assignmentsMustBeCleared}
                              autoCapitalize="words"
                              style={{
                                backgroundColor: theme.bg,
                                borderColor: theme.primary,
                                color: theme.text,
                                paddingVertical: 8,
                                paddingHorizontal: 10,
                                fontSize: 16,
                                fontWeight: "600",
                              }}
                              className="rounded-xl border"
                            />
                          </View>

                          <View>
                            <Text
                              className="text-xs font-bold mb-1"
                              style={{ color: theme.muted }}
                            >
                              Mobile Number{" "}
                              {isSelf
                                ? "(Cannot be changed - Logged in)"
                                : canChangePhone
                                  ? "(Manager inactive)"
                                  : "(Available only when inactive)"}
                            </Text>
                            {!canChangePhone ? (
                              <View
                                style={{
                                  backgroundColor: theme.bg,
                                  borderColor: theme.border,
                                  paddingVertical: 10,
                                  paddingHorizontal: 10,
                                }}
                                className="rounded-xl border opacity-70"
                              >
                                <Text
                                  style={{
                                    color: theme.muted,
                                    fontSize: 16,
                                    fontWeight: "600",
                                  }}
                                >
                                  {editedPhone}
                                </Text>
                              </View>
                            ) : (
                              <TextInput
                                value={editedPhone}
                                onChangeText={(value) => {
                                  setEditedPhone(value);
                                  if (editValidationErrors.editedPhone) {
                                    setEditValidationErrors((current) => ({
                                      ...current,
                                      editedPhone: "",
                                    }));
                                  }
                                }}
                                onBlur={() => setEditedPhone(editedPhone.trim())}
                                keyboardType="phone-pad"
                                style={{
                                  backgroundColor: theme.bg,
                                  borderColor: editValidationErrors.editedPhone
                                    ? theme.danger
                                    : theme.primary,
                                  borderWidth: editValidationErrors.editedPhone
                                    ? 2
                                    : 1,
                                  color: theme.text,
                                  paddingVertical: 8,
                                  paddingHorizontal: 10,
                                  fontSize: 16,
                                  fontWeight: "600",
                                }}
                                className="rounded-xl border"
                              />
                            )}
                            {editValidationErrors.editedPhone ? (
                              <Text className="mt-1 text-xs font-semibold" style={{ color: theme.danger }}>
                                {editValidationErrors.editedPhone}
                              </Text>
                            ) : null}
                          </View>

                          {isAdmin && (
                            <View>
                              <Text
                                className="text-xs font-bold mb-2 uppercase"
                                style={{ color: theme.muted }}
                              >
                                Manager Status
                              </Text>
                              <Text
                                className="text-xs mb-2"
                                style={{
                                  color:
                                    mgr.isCheckIn === true
                                      ? theme.primary
                                      : theme.muted,
                                }}
                              >
                                Check-in:{" "}
                                {mgr.isCheckIn === true
                                  ? "Checked in"
                                  : mgr.isCheckIn === false
                                    ? "Checked out"
                                    : "Status unavailable"}
                              </Text>
                              <View className="flex-row gap-3">
                                {[true, false].map((isActive) => {
                                  const selected =
                                    editedIsActive === isActive;
                                  return (
                                    <Pressable
                                      key={String(isActive)}
                                      onPress={() =>
                                        handleEditedActiveChange(mgr, isActive)
                                      }
                                      accessibilityRole="button"
                                      accessibilityState={{ selected }}
                                      className="flex-1 py-2.5 rounded-xl items-center justify-center border"
                                      style={{
                                        backgroundColor: selected
                                          ? isActive
                                            ? theme.primary
                                            : theme.danger
                                          : theme.bg,
                                        borderColor: selected
                                          ? isActive
                                            ? theme.primary
                                            : theme.danger
                                          : theme.border,
                                      }}
                                    >
                                      <Text
                                        className="text-xs font-black uppercase"
                                        style={{
                                          color: selected
                                            ? "#ffffff"
                                            : theme.text,
                                        }}
                                      >
                                        {isActive ? "Active" : "Inactive"}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                              <Text
                                className="text-xs mt-2"
                                style={{ color: theme.muted }}
                              >
                                A manager must be checked out before being
                                marked inactive.
                              </Text>
                            </View>
                          )}

                          <View>
                            <Text
                              className="text-xs font-bold mb-2 uppercase"
                              style={{ color: theme.muted }}
                            >
                              Access Role (Changeable)
                            </Text>
                            <View className="flex-row gap-3">
                              <Pressable
                                onPress={() =>
                                  void handleEditedRoleChange("operations")
                                }
                                disabled={
                                  assignmentLoading || assignmentsMustBeCleared
                                }
                                className="flex-1 py-2.5 rounded-xl items-center justify-center border"
                                style={{
                                  backgroundColor:
                                    editedRole === "operations"
                                      ? theme.primary
                                      : theme.bg,
                                  borderColor:
                                    editedRole === "operations"
                                      ? theme.primary
                                      : theme.border,
                                }}
                              >
                                <Text
                                  className="text-xs font-black uppercase"
                                  style={{
                                    color:
                                      editedRole === "operations"
                                        ? "#ffffff"
                                        : theme.text,
                                  }}
                                >
                                  Operations
                                </Text>
                              </Pressable>

                              <Pressable
                                onPress={() =>
                                  void handleEditedRoleChange("floor")
                                }
                                disabled={
                                  assignmentLoading || assignmentsMustBeCleared
                                }
                                className="flex-1 py-2.5 rounded-xl items-center justify-center border"
                                style={{
                                  backgroundColor:
                                    editedRole === "floor"
                                      ? theme.primary
                                      : theme.bg,
                                  borderColor:
                                    editedRole === "floor"
                                      ? theme.primary
                                      : theme.border,
                                }}
                              >
                                <Text
                                  className="text-xs font-black uppercase"
                                  style={{
                                    color:
                                      editedRole === "floor"
                                        ? "#ffffff"
                                        : theme.text,
                                  }}
                                >
                                  Floor
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Editable Tables & Related Waiters if role is floor */}
                          {editedRole === "floor" && (
                            <View
                              className="gap-2 mt-2 pt-2 border-t"
                              style={{ borderTopColor: theme.border }}
                            >
                              <Text
                                className="text-xs font-bold uppercase"
                                style={{ color: theme.muted }}
                              >
                                Assigned & Available Tables
                              </Text>
                              <Text
                                className="text-xs"
                                style={{ color: theme.muted }}
                              >
                                Selected tables and waiters are currently assigned.
                              </Text>

                              {tableOptions.length > 0 ? (
                                <View className="flex-row flex-wrap gap-1.5">
                                  {tableOptions.map((tbl: any) => {
                                    const tId = getAssignmentId(tbl);
                                    const tName =
                                      tbl.tableNumber !== undefined
                                        ? `Table ${tbl.tableNumber}`
                                        : tbl.tableName || tId;
                                    const isSelected =
                                      editedTables.includes(tId);
                                    return (
                                      <Pressable
                                        key={tId}
                                        onPress={() =>
                                          void toggleEditedTableSelection(tId)
                                        }
                                        disabled={assignmentLoading}
                                        className="px-3 py-2 rounded-lg border flex-row items-center gap-1"
                                        style={{
                                          backgroundColor: isSelected
                                            ? theme.primary
                                            : theme.bg,
                                          borderColor: isSelected
                                            ? theme.primary
                                            : theme.border,
                                        }}
                                      >
                                        <Text
                                          className="text-xs font-bold"
                                          style={{
                                            color: isSelected
                                              ? "#fff"
                                              : theme.text,
                                          }}
                                        >
                                          {tName}
                                        </Text>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                              ) : (
                                <Text
                                  className="text-xs italic"
                                  style={{ color: theme.muted }}
                                >
                                  No assigned or available tables were returned.
                                </Text>
                              )}

                              <View className="gap-2">
                                <Text
                                  className="text-xs font-bold uppercase mt-2"
                                  style={{ color: theme.muted }}
                                >
                                  Assigned & Available Waiters
                                </Text>
                                {waiterOptions.length > 0 ? (
                                  <View className="flex-row flex-wrap gap-1.5">
                                    {waiterOptions.map((w: any) => {
                                      const isSelected =
                                        editedWaiters.includes(w.id);
                                      return (
                                        <Pressable
                                          key={w.id}
                                          onPress={() =>
                                            void toggleEditedWaiterSelection(
                                              w.id,
                                            )
                                          }
                                          disabled={assignmentLoading}
                                          className="px-3 py-2 rounded-lg border flex-row items-center gap-1"
                                          style={{
                                            backgroundColor: isSelected
                                              ? theme.primary
                                              : theme.bg,
                                            borderColor: isSelected
                                              ? theme.primary
                                              : theme.border,
                                          }}
                                        >
                                          <Text
                                            className="text-xs font-bold"
                                            style={{
                                              color: isSelected
                                                ? "#fff"
                                                : theme.text,
                                            }}
                                          >
                                            👤 {w.name}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                ) : (
                                  <Text
                                    className="text-xs italic"
                                    style={{ color: theme.muted }}
                                  >
                                    No assigned or available waiters were returned.
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View className="gap-1 mt-0.5">
                          <Text
                            className="text-lg font-bold"
                            style={{ color: theme.text }}
                          >
                            {mgr.firstName || mgr.lastName
                              ? [mgr.firstName, mgr.lastName]
                                  .filter(Boolean)
                                  .join(" ")
                              : mgr.name || "Unnamed manager"}
                          </Text>
                          <Text
                            className="text-sm font-medium"
                            style={{ color: theme.muted }}
                          >
                            {mgr.phone ? `📱 ${mgr.phone}` : "No phone number"}
                          </Text>
                          <Text
                            className="text-xs font-semibold mt-1"
                            style={{
                              color:
                                mgr.isActive !== false
                                  ? theme.primary
                                  : theme.danger,
                            }}
                          >
                            {mgr.isActive !== false ? "Active" : "Inactive"}
                          </Text>
                          {String(mgr.managerType || mgr.role).toLowerCase() ===
                            "floor" && (
                            <View className="mt-2 gap-3">
                              <View>
                                <Text
                                  className="text-xs font-bold uppercase mb-1.5"
                                  style={{ color: theme.muted }}
                                >
                                  Assigned Tables
                                </Text>
                                <View className="flex-row flex-wrap gap-1.5">
                                  {(mgr.assignedTableLabels || []).length >
                                  0 ? (
                                    mgr.assignedTableLabels.map(
                                      (table: string, index: number) => (
                                        <View
                                          key={`${mgr.id}-table-${index}`}
                                          className="px-3 py-2 rounded-lg border"
                                          style={{
                                            backgroundColor: theme.primary,
                                            borderColor: theme.primary,
                                          }}
                                        >
                                          <Text
                                            className="text-xs font-bold"
                                            style={{
                                              color: theme.primaryForeground,
                                            }}
                                          >
                                            {table}
                                          </Text>
                                        </View>
                                      ),
                                    )
                                  ) : (
                                    <Text
                                      className="text-xs"
                                      style={{ color: theme.muted }}
                                    >
                                      No tables assigned
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View>
                                <Text
                                  className="text-xs font-bold uppercase mb-1.5"
                                  style={{ color: theme.muted }}
                                >
                                  Related Waiters
                                </Text>
                                <View className="flex-row flex-wrap gap-1.5">
                                  {(mgr.assignedWaiterLabels || []).length >
                                  0 ? (
                                    mgr.assignedWaiterLabels.map(
                                      (waiter: string, index: number) => (
                                        <View
                                          key={`${mgr.id}-waiter-${index}`}
                                          className="px-3 py-2 rounded-lg border flex-row items-center gap-1"
                                          style={{
                                            backgroundColor: theme.primary,
                                            borderColor: theme.primary,
                                          }}
                                        >
                                          <Text
                                            className="text-xs font-bold"
                                            style={{
                                              color: theme.primaryForeground,
                                            }}
                                          >
                                            👤 {waiter}
                                          </Text>
                                        </View>
                                      ),
                                    )
                                  ) : (
                                    <Text
                                      className="text-xs"
                                      style={{ color: theme.muted }}
                                    >
                                      No waiters assigned
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          )}
                          {String(mgr.managerType || mgr.role).toLowerCase() ===
                            "operations" && (
                            <Text
                              className="text-xs font-bold uppercase mt-1"
                              style={{ color: theme.muted }}
                            >
                              Operations Manager
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)" }}
          className="flex-1 justify-center px-6"
        >
          <Card
            variant="default"
            className="p-6 rounded-3xl border-0 shadow-lg"
          >
            <Text
              className="text-xl font-black mb-4"
              style={{ color: theme.text }}
            >
              Select Country Code
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.name}
                  onPress={() => {
                    setSelectedCountry(c);
                    setIsModalVisible(false);
                    setPhoneNumber("");
                  }}
                  className="flex-1 flex-row items-center justify-between py-3 border-b"
                  style={{ borderBottomColor: theme.border }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    {c.flag} {c.name}
                  </Text>
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.primary }}
                  >
                    {c.code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setIsModalVisible(false)}
              className="mt-4 py-3"
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}
