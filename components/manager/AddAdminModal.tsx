import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
import {
  AdminPerson,
  AdminProfile,
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

const ADMIN_NUMBER_PREFIX = "restaurant.adminDisplayNumber.";
const ADMIN_NUMBER_COUNTER_KEY = "restaurant.adminDisplayNumber.next";

async function getStoredAdminNumber(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for admin IDs.");
    }
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredAdminNumber(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for admin IDs.");
    }
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStableAdminNumbers(
  admins: AdminPerson[],
): Promise<Map<string, number>> {
  const sortedAdmins = [...admins].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  const numbersById = new Map<string, number>();
  const storedNumbers = await Promise.all(
    sortedAdmins.map(async (admin) => ({
      id: admin.id,
      value: await getStoredAdminNumber(
        `${ADMIN_NUMBER_PREFIX}${encodeURIComponent(admin.id)}`,
      ),
    })),
  );
  let nextNumber =
    Number(await getStoredAdminNumber(ADMIN_NUMBER_COUNTER_KEY)) || 0;

  storedNumbers.forEach(({ id, value }) => {
    const number = Number(value);
    if (Number.isSafeInteger(number) && number > 0) {
      numbersById.set(id, number);
      nextNumber = Math.max(nextNumber, number);
    }
  });

  for (const admin of sortedAdmins) {
    if (numbersById.has(admin.id)) continue;
    nextNumber += 1;
    await setStoredAdminNumber(
      `${ADMIN_NUMBER_PREFIX}${encodeURIComponent(admin.id)}`,
      String(nextNumber),
    );
    numbersById.set(admin.id, nextNumber);
  }

  await setStoredAdminNumber(ADMIN_NUMBER_COUNTER_KEY, String(nextNumber));
  return numbersById;
}

export default function AddAdminModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminIsActive, setAdminIsActive] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedIsActive, setEditedIsActive] = useState(true);
  const [adminsList, setAdminsList] = useState<AdminPerson[]>([]);
  const [adminNumbersById, setAdminNumbersById] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [loggedInAdmin, setLoggedInAdmin] = useState<AdminProfile>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadAdmins = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const [admins, { admin }] = await Promise.all([
        adminProfileApi.getAdmins(),
        adminProfileApi.getProfile(),
      ]);
      const numbers = await getStableAdminNumbers(admins);
      setAdminNumbersById(numbers);
      setAdminsList(admins);
      setLoggedInAdmin(admin);
      hasLoadedRef.current = true;
    } catch (error) {
      Alert.alert(
        "Unable to load admins",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAdmins();
    }, [loadAdmins]),
  );

  const cleanPhone = (str: string) =>
    String(str || "")
      .replace(/\D/g, "")
      .slice(-10);

  const getAdminName = (admin: AdminPerson) =>
    [admin.firstName, admin.lastName].filter(Boolean).join(" ") ||
    admin.name ||
    "Admin";
  const isLoggedInAdmin = (admin: AdminPerson) =>
    Boolean(
      (loggedInAdmin?.id && admin.id === loggedInAdmin.id) ||
      ((params.phone || loggedInAdmin?.phone) &&
        admin.phone &&
        cleanPhone(admin.phone) ===
          cleanPhone(params.phone || loggedInAdmin?.phone || "")),
    );
  const sortedAdmins = [...adminsList].sort((first, second) => {
    const selfOrder =
      Number(!isLoggedInAdmin(first)) - Number(!isLoggedInAdmin(second));
    if (selfOrder !== 0) return selfOrder;
    return (
      (adminNumbersById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (adminNumbersById.get(second.id) ?? Number.MAX_SAFE_INTEGER) ||
      first.id.localeCompare(second.id)
    );
  });
  const filteredAdmins = sortedAdmins.filter(
    (admin) =>
      (adminStatusFilter === "all" ||
        (adminStatusFilter === "active"
          ? admin.isActive !== false
          : admin.isActive === false)) &&
      JSON.stringify(admin)
        .toLowerCase()
        .includes(adminSearch.trim().toLowerCase()),
  );

  const handleSaveAdmin = async () => {
    if (!adminFirstName.trim()) {
      Alert.alert("Error", "First name is mandatory.");
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Phone Number is mandatory!");
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

    setSaving(true);
    try {
      await adminProfileApi.createAdmin(
        adminFirstName.trim(),
        adminLastName.trim(),
        cleanedNumber,
        adminIsActive,
      );
      await loadAdmins();
      setAdminFirstName("");
      setAdminLastName("");
      setAdminIsActive(true);
      setPhoneNumber("");
      setActiveTab("showAll");
      Alert.alert(
        "Success",
        `${[adminFirstName.trim(), adminLastName.trim()].filter(Boolean).join(" ")} added successfully.`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to add admin",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (adm: AdminPerson) => {
    setEditingId(adm.id);
    const [fallbackFirstName = "", ...fallbackLastName] = String(
      adm.name || "",
    ).split(/\s+/);
    setEditedFirstName(adm.firstName || fallbackFirstName);
    setEditedLastName(adm.lastName || fallbackLastName.join(" "));
    setEditedPhone(adm.phone || "");
    setEditedIsActive(adm.isActive !== false);
  };

  const handleSaveEdit = async (admId: string) => {
    if (!editedFirstName.trim()) {
      Alert.alert("Error", "First name cannot be empty.");
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert("Error", "Phone number cannot be empty.");
      return;
    }

    const adm = adminsList.find((admin) => admin.id === admId);
    const isSelf = Boolean(
      (loggedInAdmin?.id && adm?.id === loggedInAdmin.id) ||
      ((params.phone || loggedInAdmin?.phone) &&
        adm?.phone &&
        cleanPhone(adm.phone) ===
          cleanPhone(params.phone || loggedInAdmin?.phone || "")),
    );
    const firstName = editedFirstName.trim();
    const lastName = editedLastName.trim();
    setSaving(true);
    try {
      await adminProfileApi.updateAdmin(admId, {
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(" "),
        isActive: editedIsActive,
        ...(!isSelf ? { phone: editedPhone.trim() } : {}),
      });
      await loadAdmins();
      setEditingId(null);
      setEditedFirstName("");
      setEditedLastName("");
      setEditedPhone("");
      setEditedIsActive(true);
    } catch (error) {
      Alert.alert(
        "Unable to update admin",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = (admId: string) => {
    Alert.alert("Delete Admin", "Are you sure you want to remove this admin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminProfileApi.deleteAdmin(admId);
            if (editingId === admId) setEditingId(null);
            await loadAdmins();
            Alert.alert("Admin deleted", "The admin was deleted successfully.");
          } catch (error) {
            Alert.alert(
              "Unable to remove admin",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        },
      },
    ]);
  };

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
          Manage Admins
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
            Add Admin
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
            Show All ({adminsList.length})
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
                value={adminSearch}
                onChangeText={setAdminSearch}
                placeholder="Search by any admin detail"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search administrators"
                className="flex-1 px-3 py-3"
                style={{ color: theme.text, fontSize: 15 }}
              />
              {adminSearch.length > 0 && (
                <Pressable
                  onPress={() => setAdminSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear administrator search"
                  hitSlop={10}
                >
                  <Feather name="x-circle" size={18} color={theme.muted} />
                </Pressable>
              )}
            </View>
            <View className="flex-row gap-2">
              {(["all", "active", "inactive"] as const).map((filter) => {
                const selected = adminStatusFilter === filter;
                const label =
                  filter === "all"
                    ? "All"
                    : filter === "active"
                      ? "Active"
                      : "Inactive";
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setAdminStatusFilter(filter)}
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
                First Name *
              </Text>
              <TextInput
                placeholder="e.g. Siva"
                placeholderTextColor={theme.muted + "44"}
                value={adminFirstName}
                onChangeText={setAdminFirstName}
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
                placeholder="e.g. Kumar"
                placeholderTextColor={theme.muted + "44"}
                value={adminLastName}
                onChangeText={setAdminLastName}
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
              <View className="flex-row gap-2 mb-6">
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
                Admin Status
              </Text>
              <View className="flex-row gap-3 mb-6">
                {[true, false].map((isActive) => (
                  <Pressable
                    key={String(isActive)}
                    onPress={() => setAdminIsActive(isActive)}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: adminIsActive === isActive,
                    }}
                    className="flex-1 items-center rounded-xl border py-3"
                    style={{
                      borderColor:
                        adminIsActive === isActive
                          ? isActive
                            ? theme.primary
                            : theme.danger
                          : theme.border,
                      backgroundColor:
                        adminIsActive === isActive
                          ? isActive
                            ? theme.primary
                            : theme.danger
                          : theme.bg,
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color:
                          adminIsActive === isActive ? "#fff" : theme.muted,
                      }}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Button
                title="Save & Grant Admin Access"
                onPress={handleSaveAdmin}
                loading={saving}
                className="py-4 w-full"
              />
            </Card>
          ) : (
            <View className="gap-3">
              <Text
                className="text-xs font-bold mb-1 ml-1 uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                All Registered Administrators
              </Text>

              {loading ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  Loading admins...
                </Text>
              ) : adminsList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No admins found.
                </Text>
              ) : filteredAdmins.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No admins match “{adminSearch.trim()}”.
                </Text>
              ) : (
                filteredAdmins.map((adm) => {
                  const adminNumber = adminNumbersById.get(adm.id);
                  const isEditing = editingId === adm.id;
                  const isActive = adm.isActive !== false;
                  const isSelf = isLoggedInAdmin(adm);

                  return (
                    <View
                      key={adm.id}
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
                            Admin A-{String(adminNumber ?? 0).padStart(3, "0")}
                            {isSelf ? " · You" : ""}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(adm.id)}
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
                                onPress={() => handleStartEdit(adm)}
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
                              {!isSelf && adminsList.length > 1 && (
                                <Pressable
                                  onPress={() => handleDeleteAdmin(adm.id)}
                                  disabled={saving}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Delete ${getAdminName(adm)}`}
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
                          <View>
                            <Text
                              className="text-xs font-bold mb-2"
                              style={{ color: theme.muted }}
                            >
                              Admin Status
                            </Text>
                            <View className="flex-row gap-3">
                              {[true, false].map((active) => (
                                <Pressable
                                  key={String(active)}
                                  onPress={() => setEditedIsActive(active)}
                                  accessibilityRole="button"
                                  accessibilityState={{
                                    selected: editedIsActive === active,
                                  }}
                                  className="flex-1 items-center rounded-xl border py-3"
                                  style={{
                                    borderColor:
                                      editedIsActive === active
                                        ? active
                                          ? theme.primary
                                          : theme.danger
                                        : theme.border,
                                    backgroundColor:
                                      editedIsActive === active
                                        ? active
                                          ? theme.primary
                                          : theme.danger
                                        : theme.bg,
                                  }}
                                >
                                  <Text
                                    className="font-bold"
                                    style={{
                                      color:
                                        editedIsActive === active
                                          ? "#fff"
                                          : theme.muted,
                                    }}
                                  >
                                    {active ? "Active" : "Inactive"}
                                  </Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View className="gap-1 mt-0.5">
                          <Text
                            className="text-lg font-bold"
                            style={{ color: theme.text }}
                          >
                            {getAdminName(adm)}
                          </Text>
                          <Text
                            className="text-sm font-medium"
                            style={{ color: theme.muted }}
                          >
                            {adm.phone ? `📱 ${adm.phone}` : "No phone number"}
                          </Text>
                          <Text
                            className="text-xs font-semibold mt-1"
                            style={{
                              color: isActive ? theme.primary : theme.danger,
                            }}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Text>
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
