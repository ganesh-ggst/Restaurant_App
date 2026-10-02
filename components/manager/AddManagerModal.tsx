import {
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
  MANAGER_PHONES,
} from "@/constants/managerMockData";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useState } from "react";
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

export default function AddManagerModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ phone?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();

  const resolvedPathPhone = pathname?.includes("admin")
    ? MANAGER_PHONES.admin
    : pathname?.includes("floor")
      ? MANAGER_MOCK_DATA.managers?.find(
          (m: any) => m.managerType === "floor" || m.role === "floor",
        )?.phone || MANAGER_PHONES.floor_1
      : MANAGER_MOCK_DATA.managers?.find(
          (m: any) => m.managerType === "operations" || m.role === "operations",
        )?.phone || MANAGER_PHONES.ops_1;

  const loggedInPhone =
    params.phone || currentManager?.phone || resolvedPathPhone;

  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [managerName, setManagerName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerRole, setManagerRole] = useState<"operations" | "floor">(
    "operations",
  );
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedWaiters, setSelectedWaiters] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedRole, setEditedRole] = useState<
    "operations" | "floor" | "admin"
  >("operations");
  const [editedTables, setEditedTables] = useState<string[]>([]);
  const [editedWaiters, setEditedWaiters] = useState<string[]>([]);
  const [editedIsActive, setEditedIsActive] = useState<boolean>(true);
  const [, forceUpdate] = useState({});

  const getTableNumber = (str: string) => {
    const match = String(str).match(/\d+/);
    return match ? match[0] : String(str).toUpperCase().trim();
  };

  const cleanPhone = (str: string) =>
    String(str || "")
      .replace(/\D/g, "")
      .slice(-10);

  const otherManagers = (MANAGER_MOCK_DATA.managers || []).filter(
    (m: any) =>
      m.id !== editingId &&
      m.role !== "admin" &&
      m.managerType !== "admin" &&
      m.isActive !== false,
  );

  const takenTableNumbers = new Set(
    otherManagers
      .flatMap((m: any) => m.assignedTables || [])
      .map((val: string) => getTableNumber(val)),
  );

  const seenTableNums = new Set<string>();
  const availableTables = INITIAL_FLOOR_TABLES.filter((t: any) => {
    const tNum = getTableNumber(t.id || t.tableName || t.number || "");
    if (takenTableNumbers.has(tNum) || seenTableNums.has(tNum)) return false;
    seenTableNums.add(tNum);
    return true;
  });

  const takenWaiterIds = new Set(
    otherManagers.flatMap((m: any) => m.assignedWaiters || []),
  );

  const availableWaiters = (MANAGER_MOCK_DATA.waiters || []).filter(
    (w: any) => w.isActive !== false && !takenWaiterIds.has(w.id),
  );

  const toggleTableSelection = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      const nextTables = selectedTables.filter((name) => name !== tableName);
      setSelectedTables(nextTables);
      if (nextTables.length === 0) setSelectedWaiters([]);
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const toggleWaiterSelection = (waiterId: string) => {
    if (selectedWaiters.includes(waiterId)) {
      setSelectedWaiters(selectedWaiters.filter((id) => id !== waiterId));
    } else {
      setSelectedWaiters([...selectedWaiters, waiterId]);
    }
  };

  const toggleEditedTableSelection = (tableName: string) => {
    if (editedTables.includes(tableName)) {
      setEditedTables(editedTables.filter((name) => name !== tableName));
    } else {
      setEditedTables([...editedTables, tableName]);
    }
  };

  const toggleEditedWaiterSelection = (waiterId: string) => {
    if (editedWaiters.includes(waiterId)) {
      setEditedWaiters(editedWaiters.filter((id) => id !== waiterId));
    } else {
      setEditedWaiters([...editedWaiters, waiterId]);
    }
  };

  const handleSaveManager = () => {
    if (!managerName.trim()) {
      Alert.alert("Error", "Manager Name is mandatory!");
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

    const fullPhoneNumber = `${selectedCountry.code} ${phoneNumber.trim()}`;
    const newId = `mgr_${Date.now()}`;

    const newManagerObj = {
      id: newId,
      name: managerName.trim(),
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
      `Manager "${managerName.trim()}" added successfully!`,
      [
        {
          text: "OK",
          onPress: () => {
            setManagerName("");
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

  const handleStartEdit = (mgr: any) => {
    setEditingId(mgr.id);
    setEditedName(mgr.name);
    setEditedPhone(mgr.phone || "");

    let resolvedRole = "operations";
    if (mgr.managerType === "floor" || mgr.role === "floor") {
      resolvedRole = "floor";
    } else if (mgr.managerType === "admin" || mgr.role === "admin") {
      resolvedRole = "admin";
    } else {
      resolvedRole = "operations";
    }
    setEditedRole(resolvedRole as any);

    const normalizedTables = (mgr.assignedTables || []).map((val: string) => {
      const matchTable = INITIAL_FLOOR_TABLES.find(
        (t: any) =>
          t.id === val ||
          t.tableName === val ||
          t.id?.toLowerCase() === val?.toLowerCase() ||
          t.tableName?.toLowerCase() === val?.toLowerCase() ||
          getTableNumber(t.id) === getTableNumber(val) ||
          getTableNumber(t.tableName) === getTableNumber(val),
      );
      return matchTable ? matchTable.tableName : val;
    });

    setEditedTables(normalizedTables);
    setEditedWaiters(mgr.assignedWaiters || []);
    setEditedIsActive(mgr.isActive !== false);
  };

  const handleSaveEdit = (mgrId: string) => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Manager name cannot be empty.");
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert("Error", "Phone number cannot be empty.");
      return;
    }

    const mgr = MANAGER_MOCK_DATA.managers?.find((m: any) => m.id === mgrId);
    if (mgr) {
      if (mgr.isActive === false) {
        Alert.alert(
          "Error",
          "This manager is currently inactive and cannot be updated.",
        );
        return;
      }

      if (editedRole === "floor" && editedTables.length === 0) {
        Alert.alert(
          "Error",
          "Please assign at least one table for the Floor Manager!",
        );
        return;
      }

      if (editedRole === "floor" && editedWaiters.length === 0) {
        Alert.alert(
          "Error",
          "Please assign at least one waiter for the Floor Manager!",
        );
        return;
      }

      mgr.name = editedName.trim();
      const isSelf = Boolean(
        (currentManager?.id && mgr.id === currentManager.id) ||
        (loggedInPhone &&
          mgr.phone &&
          cleanPhone(mgr.phone) === cleanPhone(loggedInPhone)) ||
        (loggedInPhone &&
          mgr.mobile &&
          cleanPhone(mgr.mobile) === cleanPhone(loggedInPhone)),
      );

      if (!isSelf && editedPhone.trim()) {
        mgr.phone = editedPhone.trim();
      }

      const isAdmin = mgr.role === "admin" || mgr.managerType === "admin";
      if (!isAdmin) {
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
    setEditedName("");
    setEditedPhone("");
    setEditedRole("operations");
    setEditedTables([]);
    setEditedWaiters([]);
    setEditedIsActive(true);
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
          onPress: () => {
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

  const rawManagersList = (MANAGER_MOCK_DATA.managers || []).filter(
    (m: any) => m.role !== "admin" && m.managerType !== "admin",
  );

  const managersList = [...rawManagersList].sort((a: any, b: any) => {
    const aIsSelf = Boolean(
      (currentManager?.id && a.id === currentManager.id) ||
      (loggedInPhone &&
        a.phone &&
        cleanPhone(a.phone) === cleanPhone(loggedInPhone)),
    );
    const bIsSelf = Boolean(
      (currentManager?.id && b.id === currentManager.id) ||
      (loggedInPhone &&
        b.phone &&
        cleanPhone(b.phone) === cleanPhone(loggedInPhone)),
    );
    if (aIsSelf) return -1;
    if (bIsSelf) return 1;
    return 0;
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
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 300 }}
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
                Manager Full Name *
              </Text>
              <TextInput
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.muted + "44"}
                value={managerName}
                onChangeText={setManagerName}
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
                  onPress={() => setManagerRole("operations")}
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
                  onPress={() => setManagerRole("floor")}
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
                    {availableTables.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {availableTables.map((table: any) => {
                          const isSelected = selectedTables.includes(
                            table.tableName,
                          );
                          return (
                            <Pressable
                              key={table.id}
                              onPress={() =>
                                toggleTableSelection(table.tableName)
                              }
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
                                {table.tableName}
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
                        All tables are currently assigned.
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
                      {availableWaiters.length > 0 ? (
                        <View className="flex-row flex-wrap gap-2">
                          {availableWaiters.map((waiter: any) => {
                            const isSelected = selectedWaiters.includes(
                              waiter.id,
                            );
                            return (
                              <Pressable
                                key={waiter.id}
                                onPress={() => toggleWaiterSelection(waiter.id)}
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
                          No unassigned waiters available.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <Button
                title="Save & Grant Access"
                onPress={handleSaveManager}
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

              {managersList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No managers found. Add one from the "Add Manager" tab.
                </Text>
              ) : (
                managersList.map((mgr: any) => {
                  const isEditing = editingId === mgr.id;
                  const isSelf = Boolean(
                    (currentManager?.id && mgr.id === currentManager.id) ||
                    (loggedInPhone &&
                      mgr.phone &&
                      cleanPhone(mgr.phone) === cleanPhone(loggedInPhone)) ||
                    (loggedInPhone &&
                      mgr.mobile &&
                      cleanPhone(mgr.mobile) === cleanPhone(loggedInPhone)),
                  );

                  const isAdmin =
                    mgr.role === "admin" || mgr.managerType === "admin";

                  return (
                    <View
                      key={mgr.id}
                      className="p-4 rounded-2xl border gap-3"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.primary }}
                          >
                            ID: {mgr.id} | Role:{" "}
                            {String(
                              mgr.managerType || mgr.role || "",
                            ).toUpperCase()}{" "}
                            {isSelf ? "(You)" : ""}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(mgr.id)}
                                className="p-2 rounded-xl"
                                style={{ backgroundColor: theme.primary }}
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
                              Manager Name
                            </Text>
                            <TextInput
                              value={editedName}
                              onChangeText={setEditedName}
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
                              Mobile Number{" "}
                              {isSelf
                                ? "(Cannot be changed - Logged in)"
                                : "(Changeable)"}
                            </Text>
                            {isSelf ? (
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

                          {/* Role Selector during edit (ONLY FOR NON-ADMINS) */}
                          {!isAdmin && (
                            <View>
                              <Text
                                className="text-xs font-bold mb-2 uppercase"
                                style={{ color: theme.muted }}
                              >
                                Access Role (Changeable)
                              </Text>
                              <View className="flex-row gap-3">
                                <Pressable
                                  onPress={() => setEditedRole("operations")}
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
                                  onPress={() => setEditedRole("floor")}
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
                          )}

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

                              <View className="flex-row flex-wrap gap-1.5">
                                {availableTables.map((tbl: any) => {
                                  const tName = tbl.tableName || tbl;
                                  const isSelected =
                                    editedTables.includes(tName);
                                  return (
                                    <Pressable
                                      key={tName}
                                      onPress={() =>
                                        toggleEditedTableSelection(tName)
                                      }
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

                              <Text
                                className="text-xs font-bold uppercase mt-2"
                                style={{ color: theme.muted }}
                              >
                                Related Waiters
                              </Text>
                              <View className="flex-row flex-wrap gap-1.5">
                                {availableWaiters.map((w: any) => {
                                  const isSelected = editedWaiters.includes(
                                    w.id,
                                  );
                                  return (
                                    <Pressable
                                      key={w.id}
                                      onPress={() =>
                                        toggleEditedWaiterSelection(w.id)
                                      }
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
                            </View>
                          )}
                        </View>
                      ) : (
                        <View className="gap-1 mt-0.5">
                          <View className="flex-row items-center justify-between">
                            <Text
                              className="text-lg font-bold"
                              style={{ color: theme.text }}
                            >
                              {mgr.name}
                            </Text>
                            <View
                              className="px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border"
                              style={{
                                backgroundColor:
                                  mgr.isActive !== false
                                    ? "rgba(34, 197, 94, 0.1)"
                                    : "rgba(239, 68, 68, 0.1)",
                                borderColor:
                                  mgr.isActive !== false
                                    ? "#22c55e"
                                    : "#ef4444",
                              }}
                            >
                              <View
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    mgr.isActive !== false
                                      ? "#22c55e"
                                      : "#ef4444",
                                }}
                              />
                              <Text
                                className="text-xs font-bold"
                                style={{
                                  color:
                                    mgr.isActive !== false
                                      ? "#22c55e"
                                      : "#ef4444",
                                }}
                              >
                                {mgr.isActive !== false ? "Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>
                          <Text
                            className="text-sm font-medium"
                            style={{ color: theme.muted }}
                          >
                            📱 {mgr.phone}
                          </Text>
                          {mgr.managerType === "floor" && (
                            <View
                              className="mt-2 pt-2 border-t gap-1"
                              style={{ borderTopColor: theme.border }}
                            >
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: theme.primary }}
                              >
                                Tables:{" "}
                                {(mgr.assignedTables || []).join(", ") ||
                                  "None"}
                              </Text>
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: theme.muted }}
                              >
                                Waiters:{" "}
                                {(mgr.assignedWaiters || [])
                                  .map(
                                    (wId: string) =>
                                      MANAGER_MOCK_DATA.waiters?.find(
                                        (w: any) => w.id === wId,
                                      )?.name || wId,
                                  )
                                  .join(", ") || "None"}
                              </Text>
                            </View>
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
