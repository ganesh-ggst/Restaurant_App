import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ArrowLeft, Check, Edit2, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MANAGER_MOCK_DATA,
  MANAGER_PHONES,
} from "../../constants/managerMockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";

export default function AddWaiterModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ phone?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();

  const loggedInPhone =
    params.phone || currentManager?.phone || MANAGER_PHONES.admin;

  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [waiterName, setWaiterName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedIsActive, setEditedIsActive] = useState<boolean>(true);
  const [, forceUpdate] = useState({});

  const handleSave = () => {
    if (!waiterName.trim()) {
      Alert.alert("Error", "Please enter waiter name.");
      return;
    }

    try {
      const newWaiter = {
        id: `w_${Date.now()}`,
        name: waiterName.trim(),
        managerId: null,
        status: "available",
        isActive: true,
      };

      if (!MANAGER_MOCK_DATA.waiters) {
        MANAGER_MOCK_DATA.waiters = [];
      }
      MANAGER_MOCK_DATA.waiters.push(newWaiter);

      Alert.alert("Success", "Waiter added & access granted successfully!", [
        {
          text: "OK",
          onPress: () => {
            setWaiterName("");
            setActiveTab("showAll");
            forceUpdate({});
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to add waiter.");
    }
  };

  const handleStartEdit = (waiter: any) => {
    setEditingId(waiter.id);
    setEditedName(waiter.name);
    setEditedIsActive(waiter.isActive !== false);
  };

  const handleSaveEdit = (waiterId: string) => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Waiter name cannot be empty.");
      return;
    }

    const waiter = MANAGER_MOCK_DATA.waiters?.find(
      (w: any) => w.id === waiterId,
    );
    if (waiter) {
      waiter.name = editedName.trim();
      waiter.isActive = editedIsActive;
      if (!editedIsActive) {
        waiter.status = "inactive";
        if (waiter.managerId) {
          waiter.managerId = null;
        }
      } else if (waiter.status === "inactive") {
        waiter.status = "available";
      }
    }

    setEditingId(null);
    setEditedName("");
    setEditedIsActive(true);
    forceUpdate({});
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
          onPress: () => {
            MANAGER_MOCK_DATA.waiters = (
              MANAGER_MOCK_DATA.waiters || []
            ).filter((w: any) => w.id !== waiterId);
            if (editingId === waiterId) setEditingId(null);
            forceUpdate({});
          },
        },
      ],
    );
  };

  const waitersList = MANAGER_MOCK_DATA.waiters || [];

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
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 300 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
                style={{ backgroundColor: theme.primary }}
                className="py-4 rounded-2xl items-center shadow-sm mt-4"
              >
                <Text className="text-white font-black text-base">
                  Save & Grant Access
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              <Text
                className="text-xs font-bold mb-1 ml-1 uppercase tracking-wider"
                style={{ color: theme.muted }}
              >
                All Registered Waiters (with IDs & Status)
              </Text>

              {waitersList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No waiters found. Add one from the "Add Waiter" tab.
                </Text>
              ) : (
                waitersList.map((waiter: any) => {
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
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.primary }}
                          >
                            ID: {waiter.id}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(waiter.id)}
                                className="p-2 rounded-xl"
                                style={{ backgroundColor: theme.primary }}
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
                            <Pressable
                              onPress={() => setEditedIsActive(!editedIsActive)}
                              className="py-3 px-4 rounded-2xl border flex-row items-center justify-between"
                              style={{
                                backgroundColor: editedIsActive
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : "rgba(239, 68, 68, 0.1)",
                                borderColor: editedIsActive
                                  ? "#22c55e"
                                  : "#ef4444",
                              }}
                            >
                              <View className="flex-row items-center gap-2">
                                <View
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: editedIsActive
                                      ? "#22c55e"
                                      : "#ef4444",
                                  }}
                                />
                                <Text
                                  className="text-sm font-bold"
                                  style={{ color: theme.text }}
                                >
                                  {editedIsActive
                                    ? "Active (On Duty)"
                                    : "Inactive (On Leave)"}
                                </Text>
                              </View>
                              <Text
                                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                                style={{
                                  backgroundColor: editedIsActive
                                    ? "#22c55e"
                                    : "#ef4444",
                                  color: "#fff",
                                }}
                              >
                                {editedIsActive ? "ACTIVE" : "INACTIVE"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-between mt-0.5">
                          <Text
                            className="text-lg font-bold"
                            style={{ color: theme.text }}
                          >
                            {waiter.name}
                          </Text>
                          <View
                            className="px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border"
                            style={{
                              backgroundColor: isActive
                                ? "rgba(34, 197, 94, 0.1)"
                                : "rgba(239, 68, 68, 0.1)",
                              borderColor: isActive ? "#22c55e" : "#ef4444",
                            }}
                          >
                            <View
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: isActive
                                  ? "#22c55e"
                                  : "#ef4444",
                              }}
                            />
                            <Text
                              className="text-xs font-bold"
                              style={{
                                color: isActive ? "#22c55e" : "#ef4444",
                              }}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </Text>
                          </View>
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
