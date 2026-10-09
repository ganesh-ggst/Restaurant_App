import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ManagedManager } from "../../services/api/manager-profile";
import { managerProfileApi } from "../../services/api/manager-profile";
import { useAppTheme } from "../../hooks/useAppTheme";
import { Card } from "../ui/Card";

type ManagerType = "operations" | "floor";
type ManagerTab = "add" | "showAll";
type StatusFilter = "all" | "active" | "inactive";

const COUNTRIES = [
  { name: "India", code: "+91", minLength: 10, maxLength: 10 },
  { name: "United States", code: "+1", minLength: 10, maxLength: 10 },
  { name: "United Kingdom", code: "+44", minLength: 10, maxLength: 10 },
  { name: "United Arab Emirates", code: "+971", minLength: 9, maxLength: 9 },
  { name: "Canada", code: "+1", minLength: 10, maxLength: 10 },
  { name: "Australia", code: "+61", minLength: 9, maxLength: 9 },
];

const inputStyle = {
  borderRadius: 14,
  borderWidth: 1,
  fontSize: 16,
  height: 50,
  paddingHorizontal: 14,
};

function managerName(manager: ManagedManager) {
  return (
    manager.name ||
    [manager.firstName, manager.lastName].filter(Boolean).join(" ") ||
    manager.phone ||
    "Manager"
  );
}

export default function BranchManagersView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [managers, setManagers] = useState<ManagedManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ManagerTab>("add");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ManagerType>("all");
  const [managerType, setManagerType] = useState<ManagerType>("operations");
  const [editingManager, setEditingManager] =
    useState<ManagedManager | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editManagerType, setEditManagerType] =
    useState<ManagerType>("operations");
  const [editIsActive, setEditIsActive] = useState(true);
  const hasLoaded = useRef(false);

  const loadManagers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasLoaded.current) setLoading(true);
    setError("");
    try {
      setManagers(await managerProfileApi.getManagers(isRefresh));
      hasLoaded.current = true;
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load branch managers.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoaded.current) void loadManagers();
    }, [loadManagers]),
  );

  const createManager = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!firstName.trim()) {
      Alert.alert("Missing name", "Enter the manager's first name.");
      return;
    }
    if (
      cleanPhone.length < selectedCountry.minLength ||
      cleanPhone.length > selectedCountry.maxLength
    ) {
      Alert.alert(
        "Invalid phone number",
        `Phone number for ${selectedCountry.name} must be exactly ${selectedCountry.minLength} digits.`,
      );
      return;
    }

    setSaving(true);
    try {
      await managerProfileApi.createManager({
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: cleanPhone,
        managerType,
      });
      await loadManagers();
      setFirstName("");
      setLastName("");
      setPhone("");
      setSelectedCountry(COUNTRIES[0]);
      setActiveTab("showAll");
      Alert.alert("Success", "Manager added successfully.");
    } catch (saveError: unknown) {
      Alert.alert(
        "Unable to add manager",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (manager: ManagedManager) => {
    setEditingManager(manager);
    setEditFirstName(manager.firstName || managerName(manager).split(" ")[0]);
    setEditLastName(
      manager.lastName || managerName(manager).split(" ").slice(1).join(" "),
    );
    setEditPhone(manager.phone || "");
    setEditManagerType(
      manager.managerType?.toLowerCase() === "floor" ? "floor" : "operations",
    );
    setEditIsActive(manager.isActive !== false);
  };

  const saveManager = async () => {
    if (!editingManager) return;
    if (!editFirstName.trim()) {
      Alert.alert("Missing name", "Enter the manager's first name.");
      return;
    }
    if (editPhone.replace(/\D/g, "").length !== 10) {
      Alert.alert("Invalid phone number", "Enter a 10-digit phone number.");
      return;
    }

    setSaving(true);
    try {
      await managerProfileApi.updateManager(editingManager.id, {
        name: `${editFirstName.trim()} ${editLastName.trim()}`,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.replace(/\D/g, ""),
        managerType: editManagerType,
        isActive: editIsActive,
      });
      setEditingManager(null);
      await loadManagers();
    } catch (saveError: unknown) {
      Alert.alert(
        "Unable to update manager",
        saveError instanceof Error ? saveError.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteManager = (manager: ManagedManager) => {
    Alert.alert(
      "Delete Manager",
      `Remove ${managerName(manager)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await managerProfileApi.deleteManager(manager.id);
              await loadManagers();
            } catch (deleteError: unknown) {
              Alert.alert(
                "Unable to delete manager",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const renderRolePicker = (
    selected: ManagerType,
    setSelected: (type: ManagerType) => void,
  ) => (
    <View className="flex-row gap-3">
      {(["operations", "floor"] as const).map((type) => {
        const isSelected = selected === type;
        return (
          <Pressable
            key={type}
            onPress={() => setSelected(type)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className="flex-1 items-center rounded-xl border py-3"
            style={{
              backgroundColor: isSelected ? theme.primary : theme.card,
              borderColor: isSelected ? theme.primary : theme.border,
            }}
          >
            <Text
              className="font-bold capitalize"
              style={{
                color: isSelected ? theme.primaryForeground : theme.muted,
              }}
            >
              {type}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const filteredManagers = managers.filter((manager) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active"
        ? manager.isActive !== false
        : manager.isActive === false);
    const matchesType =
      typeFilter === "all" || manager.managerType.toLowerCase() === typeFilter;
    const matchesSearch = JSON.stringify(manager)
      .toLowerCase()
      .includes(managerSearch.trim().toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <View
        className="flex-row items-center border-b px-4 py-4"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable onPress={() => router.back()} className="mr-4 p-1">
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Manage Managers
        </Text>
      </View>

      <View
        className="flex-row border-b"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        {(["add", "showAll"] as const).map((tab) => {
          const selected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 items-center border-b-2 py-4"
              style={{
                borderBottomColor: selected ? theme.primary : "transparent",
              }}
            >
              <Text
                className="text-base font-bold"
                style={{ color: selected ? theme.primary : theme.muted }}
              >
                {tab === "add" ? "Add Manager" : `Show All (${managers.length})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "add" ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Card variant="default" className="rounded-3xl border-0 p-5">
            <Text className="mb-5 text-lg font-black" style={{ color: theme.text }}>
              Manager Details
            </Text>
            <Text className="mb-2 ml-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              First Name *
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={theme.muted}
              style={[
                inputStyle,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  marginBottom: 12,
                },
              ]}
            />
            <Text className="mb-2 ml-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Last Name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={theme.muted}
              style={[
                inputStyle,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  marginBottom: 12,
                },
              ]}
            />
            <Text className="mb-2 ml-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Phone Number *
            </Text>
            <View className="mb-5 flex-row gap-2">
              <Pressable
                onPress={() => setCountryPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`Country calling code ${selectedCountry.code}`}
                className="h-[50px] items-center justify-center rounded-xl border px-3"
                style={{ backgroundColor: theme.bg, borderColor: theme.border }}
              >
                <Text className="font-bold" style={{ color: theme.text }}>
                  {selectedCountry.code}
                </Text>
                <Feather
                  name="chevron-down"
                  size={16}
                  color={theme.muted}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>
              <TextInput
                value={phone}
                onChangeText={(value) =>
                  setPhone(
                    value
                      .replace(/\D/g, "")
                      .slice(0, selectedCountry.maxLength),
                  )
                }
                placeholder="Phone number"
                placeholderTextColor={theme.muted}
                keyboardType="phone-pad"
                maxLength={selectedCountry.maxLength}
                style={[
                  inputStyle,
                  {
                    flex: 1,
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
              />
            </View>
            <Text className="mb-2 ml-1 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Access Role *
            </Text>
            {renderRolePicker(managerType, setManagerType)}
            <Pressable
              onPress={() => void createManager()}
              disabled={saving}
              className="mt-6 items-center rounded-2xl py-4"
              style={{ backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }}
            >
              <Text className="text-base font-black text-white">
                {saving ? "Saving..." : "Save & Grant Access"}
              </Text>
            </Pressable>
          </Card>
        </ScrollView>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.muted }}>Loading managers...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadManagers(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <View className="mb-4 gap-3">
            <View
              className="flex-row items-center rounded-xl border px-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <Feather name="search" size={18} color={theme.muted} />
              <TextInput
                value={managerSearch}
                onChangeText={setManagerSearch}
                placeholder="Search by any manager detail"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 px-3 py-3"
                style={{ color: theme.text, fontSize: 15 }}
              />
            </View>
            <View className="flex-row gap-2">
              {(["all", "active", "inactive"] as const).map((filter) => {
                const selected = statusFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setStatusFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-1 items-center rounded-xl border py-2.5"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      className="font-bold capitalize"
                      style={{
                        color: selected ? theme.primaryForeground : theme.muted,
                      }}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="flex-row gap-2">
              {(["all", "operations", "floor"] as const).map((filter) => {
                const selected = typeFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setTypeFilter(filter)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="flex-1 items-center rounded-xl border py-2.5"
                    style={{
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      className="font-bold capitalize"
                      style={{
                        color: selected ? theme.primaryForeground : theme.muted,
                      }}
                    >
                      {filter === "all" ? "All Roles" : filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {error ? (
            <Text className="py-3 text-center" style={{ color: theme.danger }}>
              {error}
            </Text>
          ) : null}
          {filteredManagers.map((manager) => (
            <Card
              key={manager.id}
              variant="default"
              className="mb-3 rounded-2xl border-0 p-4"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold" style={{ color: theme.text }}>
                    {managerName(manager)}
                  </Text>
                  {manager.phone ? (
                    <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                      {manager.phone}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-xs capitalize" style={{ color: theme.muted }}>
                    {manager.managerType || "manager"}
                  </Text>
                </View>
                <Switch
                  value={manager.isActive !== false}
                  onValueChange={async (isActive) => {
                    try {
                      await managerProfileApi.updateManager(manager.id, {
                        isActive,
                      });
                      await loadManagers();
                    } catch (updateError: unknown) {
                      Alert.alert(
                        "Unable to update manager status",
                        updateError instanceof Error
                          ? updateError.message
                          : "Please try again.",
                      );
                    }
                  }}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#ffffff"
                />
              </View>
              <View className="mt-4 flex-row justify-end gap-4">
                <Pressable
                  onPress={() => startEditing(manager)}
                  className="flex-row items-center gap-1"
                >
                  <Feather name="edit-2" size={16} color={theme.primary} />
                  <Text className="text-xs font-bold" style={{ color: theme.primary }}>
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteManager(manager)}
                  className="flex-row items-center gap-1"
                >
                  <Feather name="trash-2" size={16} color={theme.danger} />
                  <Text className="text-xs font-bold" style={{ color: theme.danger }}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </Card>
          ))}
          {!error && filteredManagers.length === 0 ? (
            <Text className="py-12 text-center" style={{ color: theme.muted }}>
              {managers.length === 0
                ? "No managers found."
                : "No managers match your filters."}
            </Text>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={countryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => setCountryPickerVisible(false)}
          />
          <View
            className="rounded-t-3xl p-5"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="mb-4 text-lg font-black" style={{ color: theme.text }}>
              Select Country
            </Text>
            {COUNTRIES.map((country) => (
              <Pressable
                key={`${country.name}-${country.code}`}
                onPress={() => {
                  setSelectedCountry(country);
                  setPhone("");
                  setCountryPickerVisible(false);
                }}
                className="flex-row items-center justify-between border-b py-4"
                style={{ borderBottomColor: theme.border }}
              >
                <Text style={{ color: theme.text }}>{country.name}</Text>
                <Text className="font-bold" style={{ color: theme.primary }}>
                  {country.code}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={editingManager !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingManager(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <Pressable
            className="flex-1"
            onPress={() => setEditingManager(null)}
          />
          <View
            className="rounded-t-3xl p-6 pb-10"
            style={{ backgroundColor: theme.card }}
          >
            <Text className="mb-5 text-xl font-black" style={{ color: theme.text }}>
              Edit Manager
            </Text>
            <TextInput
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="First name"
              placeholderTextColor={theme.muted}
              style={[
                inputStyle,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  marginBottom: 12,
                },
              ]}
            />
            <TextInput
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Last name"
              placeholderTextColor={theme.muted}
              style={[
                inputStyle,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  marginBottom: 18,
                },
              ]}
            />
            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="10-digit phone number"
              placeholderTextColor={theme.muted}
              keyboardType="phone-pad"
              maxLength={10}
              style={[
                inputStyle,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  marginBottom: 18,
                },
              ]}
            />
            {renderRolePicker(editManagerType, setEditManagerType)}
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="font-bold" style={{ color: theme.text }}>
                Active
              </Text>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <Pressable
              onPress={() => void saveManager()}
              disabled={saving}
              className="mt-6 items-center rounded-2xl py-4"
              style={{ backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 }}
            >
              <Text className="text-base font-black text-white">
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
