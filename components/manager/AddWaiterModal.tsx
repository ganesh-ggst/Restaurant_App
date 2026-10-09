import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  ArrowLeft,
  Check,
  Edit2,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { AdminWaiter, adminProfileApi } from "../../services/api/admin-profile";

const WAITER_NUMBER_PREFIX = "restaurant.waiterDisplayNumber.";
const WAITER_NUMBER_COUNTER_KEY = "restaurant.waiterDisplayNumber.next";

async function getStoredWaiterNumber(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for waiter IDs.");
    }
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredWaiterNumber(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") {
      throw new Error("Browser storage is unavailable for waiter IDs.");
    }
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStableWaiterNumbers(
  waiters: AdminWaiter[],
): Promise<Map<string, number>> {
  const sortedWaiters = [...waiters].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  const numbersById = new Map<string, number>();
  const storedNumbers = await Promise.all(
    sortedWaiters.map(async (waiter) => ({
      id: waiter.id,
      value: await getStoredWaiterNumber(
        `${WAITER_NUMBER_PREFIX}${encodeURIComponent(waiter.id)}`,
      ),
    })),
  );
  let nextNumber =
    Number(await getStoredWaiterNumber(WAITER_NUMBER_COUNTER_KEY)) || 0;

  storedNumbers.forEach(({ id, value }) => {
    const number = Number(value);
    if (Number.isSafeInteger(number) && number > 0) {
      numbersById.set(id, number);
      nextNumber = Math.max(nextNumber, number);
    }
  });

  for (const waiter of sortedWaiters) {
    if (numbersById.has(waiter.id)) continue;
    nextNumber += 1;
    await setStoredWaiterNumber(
      `${WAITER_NUMBER_PREFIX}${encodeURIComponent(waiter.id)}`,
      String(nextNumber),
    );
    numbersById.set(waiter.id, nextNumber);
  }

  await setStoredWaiterNumber(WAITER_NUMBER_COUNTER_KEY, String(nextNumber));
  return numbersById;
}

export default function AddWaiterModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [waiterName, setWaiterName] = useState("");
  const [waiterSearch, setWaiterSearch] = useState("");
  const [waiterStatusFilter, setWaiterStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedIsActive, setEditedIsActive] = useState<boolean>(true);
  const [waiters, setWaiters] = useState<AdminWaiter[]>([]);
  const [waiterNumbers, setWaiterNumbers] = useState<Map<string, number>>(
    () => new Map(),
  );
  const hasLoadedWaiters = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadWaiters = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!hasLoadedWaiters.current) setLoading(true);
    try {
      const nextWaiters = await adminProfileApi.getWaiters(isRefresh);
      const numbers = await getStableWaiterNumbers(nextWaiters);
      setWaiterNumbers(numbers);
      setWaiters(nextWaiters);
      hasLoadedWaiters.current = true;
    } catch (error) {
      Alert.alert(
        "Unable to load waiters",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedWaiters.current) void loadWaiters();
    }, [loadWaiters]),
  );

  const handleSave = async () => {
    if (!waiterName.trim()) {
      Alert.alert("Error", "Please enter waiter name.");
      return;
    }

    setSaving(true);
    try {
      await adminProfileApi.createWaiter(waiterName.trim());
      await loadWaiters();
      setWaiterName("");
      setActiveTab("showAll");
      Alert.alert("Success", "Waiter added & access granted successfully!");
    } catch (error) {
      Alert.alert(
        "Unable to add waiter",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (waiter: any) => {
    setEditingId(waiter.id);
    setEditedName(waiter.name);
    setEditedIsActive(waiter.isActive !== false);
  };

  const handleSaveEdit = async (waiterId: string) => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Waiter name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const waiter = waiters.find((item) => item.id === waiterId);
      const status = editedIsActive
        ? waiter?.status === "off_duty"
          ? "available"
          : waiter?.status || "available"
        : "off_duty";
      await adminProfileApi.updateWaiter(waiterId, {
        name: editedName.trim(),
        isActive: editedIsActive,
        status,
      });
      await loadWaiters();
      setEditingId(null);
      setEditedName("");
      setEditedIsActive(true);
    } catch (error) {
      Alert.alert(
        "Unable to update waiter",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWaiter = (waiterId: string) => {
    Alert.alert(
      "Delete Waiter",
      "Are you sure you want to remove this waiter?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminProfileApi.deleteWaiter(waiterId);
              if (editingId === waiterId) setEditingId(null);
              await loadWaiters();
            } catch (error) {
              Alert.alert(
                "Unable to delete waiter",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const waitersList = waiters;
  const waiterNumbersById = waiterNumbers;
  const sortedWaiters = [...waitersList].sort(
    (first: any, second: any) =>
      (waiterNumbersById.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
        (waiterNumbersById.get(second.id) ?? Number.MAX_SAFE_INTEGER) ||
      String(first.id).localeCompare(String(second.id)),
  );
  const filteredWaiters = sortedWaiters.filter(
    (waiter: any) =>
      (waiterStatusFilter === "all" ||
        (waiterStatusFilter === "active"
          ? waiter.isActive !== false
          : waiter.isActive === false)) &&
      JSON.stringify(waiter)
        .toLowerCase()
        .includes(waiterSearch.trim().toLowerCase()),
  );

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
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Manage Waiters
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
            Add Waiter
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
            Show All ({waitersList.length})
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
              <Search size={18} color={theme.muted} />
              <TextInput
                value={waiterSearch}
                onChangeText={setWaiterSearch}
                placeholder="Search by any waiter detail"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search waiters"
                className="flex-1 px-3 py-3"
                style={{ color: theme.text, fontSize: 15 }}
              />
              {waiterSearch.length > 0 && (
                <Pressable
                  onPress={() => setWaiterSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear waiter search"
                  hitSlop={10}
                >
                  <X size={18} color={theme.muted} />
                </Pressable>
              )}
            </View>
            <View className="flex-row gap-2">
              {(["all", "active", "inactive"] as const).map((filter) => {
                const selected = waiterStatusFilter === filter;
                const label =
                  filter === "all"
                    ? "All"
                    : filter === "active"
                      ? "Active"
                      : "Inactive";
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setWaiterStatusFilter(filter)}
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
            activeTab === "showAll" ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadWaiters(true)}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            ) : undefined
          }
        >
          {activeTab === "add" ? (
            <View>
              <View className="mb-6">
                <Text
                  className="text-sm font-bold mb-2 ml-1"
                  style={{ color: theme.muted }}
                >
                  Waiter Name
                </Text>
                <TextInput
                  value={waiterName}
                  onChangeText={setWaiterName}
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                    paddingVertical: 12,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                  className="px-4 rounded-2xl border"
                  placeholderTextColor={theme.muted}
                  placeholder="Enter Waiter Name"
                  autoFocus={true}
                />
              </View>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: theme.primary }}
                className="py-4 rounded-2xl items-center shadow-sm mt-4"
              >
                <Text className="text-white font-black text-base">
                  {saving ? "Saving..." : "Save & Grant Access"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <Text
                className="text-xs font-bold mb-1 ml-1 uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                All Registered Waiters
              </Text>

              {loading ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  Loading waiters...
                </Text>
              ) : waitersList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No waiters found. Add one from the Add Waiter tab.
                </Text>
              ) : filteredWaiters.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No waiters match “{waiterSearch.trim()}”.
                </Text>
              ) : (
                filteredWaiters.map((waiter: any) => {
                  const waiterNumber = waiterNumbersById.get(waiter.id);
                  const isEditing = editingId === waiter.id;
                  const isActive = waiter.isActive !== false;

                  return (
                    <View
                      key={waiter.id}
                      className="p-4 rounded-2xl border gap-3"
                      style={{
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      }}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1 pt-2">
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.primary }}
                            numberOfLines={1}
                          >
                            Waiter W-
                            {String(waiterNumber ?? 0).padStart(3, "0")}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(waiter.id)}
                                disabled={saving}
                                className="p-2 rounded-xl"
                                style={{
                                  backgroundColor: theme.primary,
                                  opacity: saving ? 0.6 : 1,
                                }}
                              >
                                <Check size={18} color="#fff" />
                              </Pressable>
                              <Pressable
                                onPress={() => setEditingId(null)}
                                className="p-2 rounded-xl border"
                                style={{ borderColor: theme.border }}
                              >
                                <X size={18} color={theme.text} />
                              </Pressable>
                            </>
                          ) : (
                            <>
                              <Pressable
                                onPress={() => handleStartEdit(waiter)}
                                className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl border"
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.bg,
                                }}
                              >
                                <Edit2 size={16} color={theme.primary} />
                                <Text
                                  className="text-sm font-semibold"
                                  style={{ color: theme.text }}
                                >
                                  Edit
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleDeleteWaiter(waiter.id)}
                                disabled={saving}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${waiter.name}`}
                                className="p-2 rounded-xl border"
                                style={{
                                  borderColor: theme.border,
                                  backgroundColor: theme.bg,
                                }}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </Pressable>
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
                              Waiter Name
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

                          <View className="mt-1">
                            <Text
                              className="text-xs font-bold mb-2 uppercase"
                              style={{ color: theme.muted }}
                            >
                              Waiter Status (Manager / Admin Controlled)
                            </Text>
                            <View className="flex-row gap-3">
                              {[true, false].map((isActive) => (
                                <Pressable
                                  key={String(isActive)}
                                  onPress={() => setEditedIsActive(isActive)}
                                  accessibilityRole="button"
                                  accessibilityState={{
                                    selected: editedIsActive === isActive,
                                  }}
                                  className="flex-1 items-center rounded-xl border py-3"
                                  style={{
                                    borderColor:
                                      editedIsActive === isActive
                                        ? isActive
                                          ? theme.primary
                                          : theme.danger
                                        : theme.border,
                                    backgroundColor:
                                      editedIsActive === isActive
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
                                        editedIsActive === isActive
                                          ? "#fff"
                                          : theme.muted,
                                    }}
                                  >
                                    {isActive ? "Active" : "Inactive"}
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
                            {waiter.name || "Unnamed waiter"}
                          </Text>
                          {waiter.phone ? (
                            <Text
                              className="text-sm font-medium"
                              style={{ color: theme.muted }}
                            >
                              📱 {waiter.phone}
                            </Text>
                          ) : null}
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
    </View>
  );
}
