import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAppTheme } from "../../hooks/useAppTheme";
import { AdminTable, adminProfileApi } from "../../services/api/admin-profile";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

function tableIsActive(table: AdminTable): boolean {
  return table.isActive ?? table.status?.toLowerCase() !== "inactive";
}

export default function AdminTablesView() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [tables, setTables] = useState<AdminTable[]>([]);
  const hasLoadedTables = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busyTableId, setBusyTableId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingTable, setEditingTable] = useState<AdminTable | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("");

  const loadTables = useCallback(
    async (background = false, forceRefresh = false): Promise<boolean> => {
      if (!background && !hasLoadedTables.current) setIsLoading(true);
      if (!background && forceRefresh) setIsRefreshing(true);
      setLoadError("");
      try {
        const nextTables = await adminProfileApi.getTables(forceRefresh);
        hasLoadedTables.current = true;
        setTables((current) =>
          current === nextTables ? current : nextTables,
        );
        return true;
      } catch (error) {
        const message = errorMessage(error);
        setLoadError(message);
        if (background) {
          Alert.alert(
            "Table created",
            `The table was created, but the list could not be refreshed: ${message}`,
          );
        }
        return false;
      } finally {
        if (!background) setIsLoading(false);
        if (!background) setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTables();
    }, [loadTables]),
  );

  const addTable = async () => {
    const parsedTableNumber = Number(newTableNumber.trim());
    const parsedCapacity = Number(newCapacity.trim());
    if (!Number.isSafeInteger(parsedTableNumber) || parsedTableNumber < 1) {
      Alert.alert(
        "Invalid table number",
        "Enter a whole number greater than zero.",
      );
      return;
    }
    if (!Number.isSafeInteger(parsedCapacity) || parsedCapacity < 1) {
      Alert.alert(
        "Invalid capacity",
        "Enter a whole number greater than zero.",
      );
      return;
    }

    setIsCreating(true);
    try {
      const createdTable = await adminProfileApi.createTable({
        tableNumber: parsedTableNumber,
        capacity: parsedCapacity,
      });
      if (createdTable) {
        setTables((current) => [
          ...current.filter((table) => table.id !== createdTable.id),
          createdTable,
        ]);
      }
      setNewTableNumber("");
      setNewCapacity("");
      setActiveTab("showAll");
      if (!createdTable) void loadTables(true);
      Alert.alert("Success", `Table ${parsedTableNumber} added successfully!`);
    } catch (error) {
      Alert.alert("Unable to create table", errorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTables = tables.filter((table) => {
    const isActive = tableIsActive(table);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? isActive : !isActive);
    const matchesSearch = JSON.stringify({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      isActive,
    })
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openEditModal = (table: AdminTable, fallbackNumber: number) => {
    setEditingTable(table);
    setTableNumber(String(table.tableNumber ?? fallbackNumber));
    setCapacity(table.capacity === undefined ? "" : String(table.capacity));
  };

  const saveTable = async () => {
    if (!editingTable) return;

    const parsedTableNumber = Number(tableNumber.trim());
    const parsedCapacity = capacity.trim()
      ? Number(capacity.trim())
      : undefined;
    if (!Number.isSafeInteger(parsedTableNumber) || parsedTableNumber < 1) {
      Alert.alert(
        "Invalid table number",
        "Enter a whole number greater than zero.",
      );
      return;
    }
    if (
      parsedCapacity !== undefined &&
      (!Number.isSafeInteger(parsedCapacity) || parsedCapacity < 1)
    ) {
      Alert.alert(
        "Invalid capacity",
        "Enter a whole number greater than zero.",
      );
      return;
    }

    const body: Record<string, unknown> = { tableNumber: parsedTableNumber };
    if (parsedCapacity !== undefined) body.capacity = parsedCapacity;

    setBusyTableId(editingTable.id);
    try {
      await adminProfileApi.updateTable(editingTable.id, body);
      setTables((current) =>
        current.map((table) =>
          table.id === editingTable.id
            ? {
                ...table,
                tableNumber: parsedTableNumber,
                ...(parsedCapacity === undefined
                  ? {}
                  : { capacity: parsedCapacity }),
              }
            : table,
        ),
      );
      setEditingTable(null);
    } catch (error) {
      Alert.alert("Unable to update table", errorMessage(error));
    } finally {
      setBusyTableId(null);
    }
  };

  const toggleTableActive = async (table: AdminTable, isActive: boolean) => {
    setBusyTableId(table.id);
    const previousTable = table;
    setTables((current) =>
      current.map((entry) =>
        entry.id === table.id ? { ...entry, isActive } : entry,
      ),
    );
    try {
      await adminProfileApi.updateTable(table.id, { isActive });
    } catch (error) {
      setTables((current) =>
        current.map((entry) =>
          entry.id === previousTable.id ? previousTable : entry,
        ),
      );
      Alert.alert("Unable to update table status", errorMessage(error));
    } finally {
      setBusyTableId(null);
    }
  };

  const deleteTable = (table: AdminTable) => {
    const displayName =
      table.tableNumber === undefined
        ? "this table"
        : `Table ${table.tableNumber}`;
    Alert.alert(
      "Delete table",
      `Are you sure you want to delete ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyTableId(table.id);
            try {
              await adminProfileApi.deleteTable(table.id);
              setTables((current) =>
                current.filter((entry) => entry.id !== table.id),
              );
            } catch (error) {
              Alert.alert("Unable to delete table", errorMessage(error));
            } finally {
              setBusyTableId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        className="flex-row items-center border-b px-4 py-4"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-black" style={{ color: theme.text }}>
            Manage Tables
          </Text>
          <Text className="text-sm" style={{ color: theme.muted }}>
            Create tables and manage their details and availability.
          </Text>
        </View>
        <Pressable
          onPress={() => void loadTables(false, true)}
          hitSlop={12}
          accessibilityLabel="Refresh tables"
        >
          <Feather name="refresh-cw" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <View
        className="flex-row border-b"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => setActiveTab("add")}
          className="flex-1 items-center border-b-2 py-4"
          style={{
            borderBottomColor:
              activeTab === "add" ? theme.primary : "transparent",
          }}
        >
          <Text
            className="text-base font-bold"
            style={{ color: activeTab === "add" ? theme.primary : theme.muted }}
          >
            Add Table
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("showAll")}
          className="flex-1 items-center border-b-2 py-4"
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
            Show All ({tables.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === "showAll" ? (
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
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Feather name="search" size={18} color={theme.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by table number, capacity, or status"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search tables"
              className="flex-1 px-3 py-3"
              style={{ color: theme.text, fontSize: 15 }}
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                accessibilityRole="button"
                accessibilityLabel="Clear table search"
                hitSlop={10}
              >
                <Feather name="x-circle" size={18} color={theme.muted} />
              </Pressable>
            )}
          </View>
          <View className="flex-row gap-2">
            {(["all", "active", "inactive"] as const).map((filter) => {
              const selected = statusFilter === filter;
              const label =
                filter === "all"
                  ? "All"
                  : filter === "active"
                    ? "Active"
                    : "Inactive";
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
      ) : null}

      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: activeTab === "showAll" ? 12 : 20,
          paddingBottom: 100,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadTables(false, true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {activeTab === "add" ? (
          <View>
            <Card className="p-5">
              <Text
                className="mb-1 text-lg font-bold"
                style={{ color: theme.text }}
              >
                Add a table
              </Text>
              <Text className="mb-5 text-sm" style={{ color: theme.muted }}>
                Enter the table number and its guest capacity.
              </Text>
              <Text
                className="mb-2 text-sm font-bold"
                style={{ color: theme.muted }}
              >
                Table Number
              </Text>
              <TextInput
                value={newTableNumber}
                onChangeText={setNewTableNumber}
                keyboardType="number-pad"
                placeholder="Enter table number"
                placeholderTextColor={theme.muted}
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  paddingVertical: 14,
                  fontSize: 16,
                }}
                className="mb-4 rounded-xl border px-4"
              />
              <Text
                className="mb-2 text-sm font-bold"
                style={{ color: theme.muted }}
              >
                Table Capacity
              </Text>
              <TextInput
                value={newCapacity}
                onChangeText={setNewCapacity}
                keyboardType="number-pad"
                placeholder="Enter number of guests"
                placeholderTextColor={theme.muted}
                style={{
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                  paddingVertical: 14,
                  fontSize: 16,
                }}
                className="mb-2 rounded-xl border px-4"
              />
              <Button
                title="Add New Table"
                onPress={() => void addTable()}
                loading={isCreating}
                disabled={isCreating}
                className="mt-4"
              />
            </Card>
          </View>
        ) : (
          <View className="gap-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                All Tables
              </Text>
              {!isLoading && (
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.muted }}
                >
                  {filteredTables.length}{" "}
                  {filteredTables.length === 1 ? "table" : "tables"}
                </Text>
              )}
            </View>
            {loadError ? (
              <Card className="mb-4 p-4">
                <Text className="mb-3 text-sm" style={{ color: theme.danger }}>
                  {loadError}
                </Text>
                <Button
                  title="Try Again"
                  variant="outline"
                  onPress={() => void loadTables()}
                />
              </Card>
            ) : null}

            {isLoading ? (
              <Text className="py-8 text-center" style={{ color: theme.muted }}>
                Loading tables...
              </Text>
            ) : tables.length === 0 && !loadError ? (
              <Card className="p-5">
                <Text
                  className="text-center text-sm"
                  style={{ color: theme.muted }}
                >
                  No tables yet. Add a new table to get started.
                </Text>
              </Card>
            ) : filteredTables.length === 0 && !loadError ? (
              <Card className="p-5">
                <Text
                  className="text-center text-sm"
                  style={{ color: theme.muted }}
                >
                  {search.trim()
                    ? `No tables match "${search.trim()}".`
                    : "No tables match the selected filter."}
                </Text>
              </Card>
            ) : (
              filteredTables.map((table, index) => {
                const active = tableIsActive(table);
                const disabled = busyTableId === table.id;
                const displayedNumber = table.tableNumber ?? index + 1;
                return (
                  <Card key={table.id} className="mb-3 p-4">
                    <View className="mb-4 flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text
                          className="text-lg font-bold"
                          style={{ color: theme.text }}
                        >
                          Table {displayedNumber}
                        </Text>
                        <Text
                          className="mt-1 text-sm"
                          style={{ color: theme.muted }}
                        >
                          {table.capacity
                            ? `Capacity: ${table.capacity} guests`
                            : "Capacity not set"}
                        </Text>
                        <Text
                          className="mt-1 text-xs"
                          style={{ color: theme.muted }}
                        >
                          Table status: {table.status || "Not available"}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-3 py-1"
                        style={{
                          backgroundColor: active
                            ? theme.secondaryBg
                            : theme.dangerBg,
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: active ? theme.primary : theme.danger,
                          }}
                        >
                          {active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="mb-4 flex-row items-center justify-between border-t pt-3"
                      style={{ borderColor: theme.border }}
                    >
                      <Text
                        className="font-semibold"
                        style={{ color: theme.text }}
                      >
                        Active
                      </Text>
                      <Switch
                        value={active}
                        onValueChange={(value) =>
                          void toggleTableActive(table, value)
                        }
                        disabled={disabled}
                        trackColor={{
                          false: theme.border,
                          true: theme.primary,
                        }}
                        accessibilityLabel={`Set Table ${displayedNumber} active`}
                      />
                    </View>

                    <View className="flex-row gap-3">
                      <Button
                        title="Edit"
                        variant="outline"
                        onPress={() => openEditModal(table, displayedNumber)}
                        disabled={disabled}
                        className="flex-1"
                      />
                      <Button
                        title="Delete"
                        variant="destructive"
                        onPress={() => deleteTable(table)}
                        disabled={disabled}
                        className="flex-1"
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={editingTable !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTable(null)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 justify-end bg-black/60">
            <Pressable
              className="flex-1"
              onPress={() => setEditingTable(null)}
              accessibilityLabel="Close edit table dialog"
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
              }}
              style={{ maxHeight: "85%" }}
            >
              <View
                className="rounded-t-3xl p-6"
                style={{
                  backgroundColor: theme.bg,
                  paddingBottom: Math.max(insets.bottom, 24),
                }}
              >
                <Text
                  className="mb-5 text-xl font-black"
                  style={{ color: theme.text }}
                >
                  Edit Table
                </Text>
                <Input
                  label="Table number"
                  value={tableNumber}
                  onChangeText={setTableNumber}
                  keyboardType="numeric"
                  placeholder="Enter table number"
                />
                <Input
                  label="Capacity (guests)"
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="numeric"
                  placeholder="Enter capacity"
                />
                <View className="mt-2 flex-row gap-3">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setEditingTable(null)}
                    className="flex-1"
                  />
                  <Button
                    title="Save Changes"
                    onPress={() => void saveTable()}
                    loading={Boolean(
                      editingTable && busyTableId === editingTable.id,
                    )}
                    disabled={Boolean(
                      editingTable && busyTableId === editingTable.id,
                    )}
                    className="flex-1"
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
