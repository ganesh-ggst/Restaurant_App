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
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
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
  const [saving, setSaving] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const loadAdminStaff = useCallback(async () => {
    if (!isAdmin) return;
    if (!hasLoadedAdminStaff.current) setLoading(true);
    try {
      const [managers, waiters, tables] = await Promise.all([
        adminProfileApi.getManagers(),
        adminProfileApi.getWaiters(),
        adminProfileApi.getTables(),
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
    ? adminTables
        .filter(
          (table) =>
            tableAssignedManagerId(table) === managerBeingEdited.id,
        )
        .map((table) => table.id)
    : (managerBeingEdited?.assignedTables || []).map((table: unknown) =>
        getAssignmentId(table),
      );
  const assignedActiveTables = adminTables.filter(
    (table) =>
      Boolean(editingId) &&
      table.isActive !== false &&
      tableAssignedManagerId(table) === editingId,
  );
  const tableOptions = isAdmin
    ? [
        ...adminAvailableTables,
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
        ...availableWaiters,
        ...adminWaiters.filter(
          (waiter) =>
            Boolean(editingId) &&
            waiter.isActive !== false &&
            waiterAssignedManagerId(waiter) === editingId,
        ),
      ]
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
  };

  const toggleEditedTableSelection = async (tableId: string) => {
    const removing = editedTables.includes(tableId);
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
        } else if (
          !liveTable ||
          !isTableUnassigned(liveTable)
        ) {
          Alert.alert(
            "Table unavailable",
            "Only active, unassigned tables can be assigned.",
          );
          return;
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
    setEditedTables((current) =>
      removing ? current.filter((id) => id !== tableId) : [...current, tableId],
    );
  };

  const toggleEditedWaiterSelection = async (waiterId: string) => {
    if (isAdmin) {
      setAssignmentLoading(true);
      try {
        const waiters = await adminProfileApi.getWaiters(true);
        const waiter = waiters.find((entry) => entry.id === waiterId);
        if (!waiter || waiter.isActive === false) {
          Alert.alert("Waiter unavailable", "This waiter is no longer active.");
          return;
        }
        if (editedWaiters.includes(waiterId)) {
          const assignedToThisManager =
            waiterAssignedManagerId(waiter) === editingId;
          if (
            assignedToThisManager &&
            waiterAssignmentStatus(waiter)?.toLowerCase() !== "available"
          ) {
            Alert.alert(
              "Waiter in use",
              "This waiter can only be unassigned when their status is available.",
            );
            return;
          }
          if (
            !assignedToThisManager &&
            !isWaiterUnassigned(waiter)
          ) {
            Alert.alert(
              "Waiter unavailable",
              "This waiter can no longer be unassigned.",
            );
            return;
          }
        } else if (!isWaiterUnassigned(waiter)) {
          Alert.alert(
            "Waiter unavailable",
            "Only active, unassigned waiters can be assigned.",
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
    setEditedWaiters((current) =>
      current.includes(waiterId)
        ? current.filter((id) => id !== waiterId)
        : [...current, waiterId],
    );
  };

  const handleSaveManager = async () => {
    if (!managerFirstName.trim()) {
      Alert.alert("Error", "Manager first name is mandatory.");
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Phone Number is mandatory!");
      return;
    }

    if (managerRole === "floor" && selectedTables.length === 0) {
      Alert.alert(
        "Error",
        "Please assign at least one table for the Floor Manager!",
      );
      return;
    }

    if (managerRole === "floor" && selectedWaiters.length === 0) {
      Alert.alert(
        "Error",
        "Please assign at least one waiter for the Floor Manager!",
      );
      return;
    }

    const cleanedNumber = phoneNumber.replace(/\D/g, "");
    if (
      cleanedNumber.length < selectedCountry.minLen ||
      cleanedNumber.length > selectedCountry.maxLen
    ) {
      Alert.alert(
        "Invalid Number",
        `Phone number for ${selectedCountry.name} must be exactly ${selectedCountry.minLen} digits.`,
      );
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
          assignedTables: managerRole === "floor" ? selectedTables : [],
          relatedWaiters: managerRole === "floor" ? selectedWaiters : [],
        });
        await loadAdminStaff();
        setManagerFirstName("");
        setManagerLastName("");
        setPhoneNumber("");
        setSelectedTables([]);
        setSelectedWaiters([]);
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
        const { managers, tables, waiters } =
          await refreshAssignmentResources();
        const freshManager = managers.find((entry) => entry.id === mgr.id);
        if (!freshManager) {
          throw new Error(
            "This manager is no longer available. Refresh the list and try again.",
          );
        }
        manager = freshManager;
        initialTables = tables
          .filter(
            (table) =>
              table.isActive !== false &&
              tableAssignedManagerId(table) === freshManager.id,
          )
          .map((table) => table.id);
        initialWaiters = waiters
          .filter(
            (waiter) =>
              waiter.isActive !== false &&
              waiterAssignedManagerId(waiter) === freshManager.id,
          )
          .map((waiter) => waiter.id);

        if (
          freshManager.isActive === false &&
          (tables.some(
            (table) => tableAssignedManagerId(table) === freshManager.id,
          ) ||
            waiters.some(
              (waiter) => waiterAssignedManagerId(waiter) === freshManager.id,
            ))
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

  const handleSaveEdit = async (mgrId: string) => {
    if (!editedFirstName.trim()) {
      Alert.alert("Error", "Manager first name cannot be empty.");
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert("Error", "Phone number cannot be empty.");
      return;
    }

    const mgr = isAdmin
      ? adminManagers.find((manager) => manager.id === mgrId)
      : MANAGER_MOCK_DATA.managers?.find((m: any) => m.id === mgrId);
    if (mgr) {
      if (
        editedRole === "floor" &&
        mgr.isActive !== false &&
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
        mgr.isActive !== false &&
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
          const { managers, waiters, tables, availableTables } =
            await refreshAssignmentResources();
          const freshManager = managers.find((manager) => manager.id === mgrId);
          if (!freshManager) {
            throw new Error(
              "This manager is no longer available. Refresh the list and try again.",
            );
          }
          const originalTableIds = tables
            .filter(
              (table) =>
                tableAssignedManagerId(table) === mgrId,
            )
            .map((table) => table.id);
          const originalWaiterIds = waiters
            .filter(
              (waiter) =>
                waiterAssignedManagerId(waiter) === mgrId,
            )
            .map((waiter) => waiter.id);
          if (
            freshManager.isActive === false &&
            (editedTables.length > 0 || editedWaiters.length > 0)
          ) {
            Alert.alert(
              "Unassign before editing",
              "Unassign all tables and related waiters, then save. You can edit manager details afterward.",
            );
            return;
          }
          const removedTableIds = originalTableIds.filter(
            (id: string) =>
              editedRole !== "floor" || !editedTables.includes(id),
          );
          if (!(await verifyTablesCanBeReleased(removedTableIds))) return;
          const removedWaiterIds = originalWaiterIds.filter(
            (id: string) =>
              editedRole !== "floor" || !editedWaiters.includes(id),
          );
          if (!(await verifyWaitersCanBeReleased(removedWaiterIds))) return;

          if (editedRole === "floor") {
            const newlySelectedTableIds = editedTables.filter(
              (id) => !originalTableIds.includes(id),
            );
            if (
              newlySelectedTableIds.some(
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
            const newlySelectedWaiterIds = editedWaiters.filter(
              (id) => !originalWaiterIds.includes(id),
            );
            if (
              newlySelectedWaiterIds.some((id) => {
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

          const canChangePhone =
            isAdmin &&
            !isLoggedInManager(freshManager) &&
            freshManager.isActive === false;
          const updateBody: Record<string, unknown> = {
            name: [firstName, lastName].filter(Boolean).join(" "),
            firstName,
            lastName,
            managerType: editedRole,
            assignedTables: editedRole === "floor" ? editedTables : [],
            relatedWaiters: editedRole === "floor" ? editedWaiters : [],
          };
          if (canChangePhone) updateBody.phone = cleanPhone(editedPhone);
          await adminProfileApi.updateManager(mgrId, updateBody);
          await loadAdminStaff();
          setEditingId(null);
          setEditedFirstName("");
          setEditedLastName("");
          setEditedPhone("");
          setEditedRole("operations");
          setEditedTables([]);
          setEditedWaiters([]);
          if (
            freshManager.isActive === false &&
            (originalTableIds.length > 0 || originalWaiterIds.length > 0)
          ) {
            Alert.alert(
              "Assignments cleared",
              "All tables and related waiters were unassigned. Tap Edit again to update the manager details.",
            );
          }
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
                  "Unable to deactivate manager",
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
        const relatedTables = adminTables.filter(
          (table) =>
            table.isActive !== false &&
            tableAssignedManagerId(table) === manager.id,
        );
        const relatedWaiters = adminWaiters.filter(
          (waiter) =>
            waiter.isActive !== false &&
            waiterAssignedManagerId(waiter) === manager.id,
        );
        const assignedTableIds = relatedTables.map((table) => table.id);
        const assignedWaiterIds = relatedWaiters.map((waiter) => waiter.id);

        return {
          ...manager,
          role: "manager",
          assignedTableLabels: assignedTableIds.map((id) => {
            const table = adminTables.find((entry) => entry.id === id);
            return table ? formatTableLabel(table) : formatTableLabel(id);
          }),
          assignedTables: assignedTableIds,
          assignedWaiters: assignedWaiterIds,
          assignedWaiterLabels: assignedWaiterIds.map(
            (id) =>
              adminWaiters.find((waiter) => waiter.id === id)?.name || id,
          ),
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
        >
          {activeTab === "add" ? (
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
            >
              <Text
                className="text-xs font-bold mb-1 uppercase"
                style={{ color: theme.muted }}
              >
                First Name *
              </Text>
              <TextInput
                placeholder="e.g. Rahul"
                placeholderTextColor={theme.muted + "44"}
                value={managerFirstName}
                onChangeText={setManagerFirstName}
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
                style={{ color: theme.muted }}
              >
                Last Name
              </Text>
              <TextInput
                placeholder="e.g. Sharma"
                placeholderTextColor={theme.muted + "44"}
                value={managerLastName}
                onChangeText={setManagerLastName}
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
                style={{ color: theme.muted }}
              >
                Phone Number *
              </Text>
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={() => setIsModalVisible(true)}
                  className="flex-row items-center px-3 rounded-xl border justify-between"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
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
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={selectedCountry.maxLen}
                  className="flex-1 px-4 rounded-xl font-bold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 16,
                    height: 52,
                  }}
                />
              </View>

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
                  <View>
                    <Text
                      className="text-xs font-bold mb-2 uppercase"
                      style={{ color: theme.muted }}
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
                        style={{ color: theme.muted }}
                      >
                        No free and unassigned tables are available.
                      </Text>
                    )}
                  </View>

                  {/* Waiter Selection */}
                  {selectedTables.length > 0 && (
                    <View>
                      <Text
                        className="text-xs font-bold mb-2 uppercase"
                        style={{ color: theme.muted }}
                      >
                        Assign Available Waiters *
                      </Text>
                      {waiterOptions.length > 0 ? (
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
                          style={{ color: theme.muted }}
                        >
                          No active, available, unassigned waiters are
                          available.
                        </Text>
                      )}
                    </View>
                  )}
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
                    (adminTables.some(
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
                              onChangeText={setEditedFirstName}
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
                              autoFocus={true}
                            />
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
                                onChangeText={setEditedPhone}
                                keyboardType="phone-pad"
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
                            )}
                          </View>

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
                                Assigned Tables & Related Waiters
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
                                  No free and unassigned tables are available.
                                </Text>
                              )}

                              {editedTables.length > 0 && (
                                <View className="gap-2">
                                  <Text
                                    className="text-xs font-bold uppercase mt-2"
                                    style={{ color: theme.muted }}
                                  >
                                    Related Waiters
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
                                      No active, available, unassigned waiters
                                      are available.
                                    </Text>
                                  )}
                                </View>
                              )}
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
