import {
  INITIAL_FLOOR_TABLES,
  MANAGER_MOCK_DATA,
} from "@/constants/managerMockData";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../hooks/useAppTheme";
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
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [managerName, setManagerName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerRole, setManagerRole] = useState<"operations" | "floor">(
    "operations",
  );
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedWaiters, setSelectedWaiters] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getTableNumber = (str: string) => {
    const match = String(str).match(/\d+/);
    return match ? match[0] : String(str).toUpperCase().trim();
  };

  const assignedTableNumbers = new Set(
    (MANAGER_MOCK_DATA.managers || [])
      .flatMap((m: any) => m.assignedTables || [])
      .map((val: string) => getTableNumber(val)),
  );

  const unassignedTables = INITIAL_FLOOR_TABLES.filter((t: any) => {
    const tNum = getTableNumber(t.id || t.tableName || t.number || "");
    return !assignedTableNumbers.has(tNum);
  });

  const assignedWaiterIds = new Set(
    (MANAGER_MOCK_DATA.managers || []).flatMap(
      (m: any) => m.assignedWaiters || [],
    ),
  );

  const unassignedWaiters = (MANAGER_MOCK_DATA.waiters || []).filter(
    (w: any) => !assignedWaiterIds.has(w.id) && !w.managerId,
  );

  const toggleTableSelection = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      const nextTables = selectedTables.filter((name) => name !== tableName);
      setSelectedTables(nextTables);
      if (nextTables.length === 0) {
        setSelectedWaiters([]);
      }
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
      assignedTables: managerRole === "floor" ? selectedTables : [],
      assignedWaiters: managerRole === "floor" ? selectedWaiters : [],
    };

    if (!MANAGER_MOCK_DATA.managers) {
      MANAGER_MOCK_DATA.managers = [];
    }
    MANAGER_MOCK_DATA.managers.push(newManagerObj as any);

    if (managerRole === "floor" && MANAGER_MOCK_DATA.waiters) {
      MANAGER_MOCK_DATA.waiters.forEach((w: any) => {
        if (selectedWaiters.includes(w.id)) {
          w.managerId = newId;
        }
      });
    }

    Alert.alert(
      "Success",
      `Manager "${managerName.trim()}" added successfully with ${managerRole.toUpperCase()} access!`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
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
          Add New Manager
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Card variant="default" className="p-6 rounded-3xl border-0 shadow-lg">
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
                  managerRole === "operations" ? theme.primary : theme.border,
              }}
            >
              <Text
                className="text-sm font-black uppercase"
                style={{
                  color: managerRole === "operations" ? "#ffffff" : theme.text,
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
                {unassignedTables.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {unassignedTables.map((table: any) => {
                      const isSelected = selectedTables.includes(
                        table.tableName,
                      );
                      return (
                        <Pressable
                          key={table.id}
                          onPress={() => toggleTableSelection(table.tableName)}
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
                            <Feather name="check" size={14} color="#ffffff" />
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
                    All tables are currently assigned to existing managers.
                  </Text>
                )}
              </View>

              {/* Waiter Selection (Dynamically shown ONLY when at least one table is selected) */}
              {selectedTables.length > 0 && (
                <View>
                  <Text
                    className="text-xs font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Assign Available Waiters *
                  </Text>
                  {unassignedWaiters.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {unassignedWaiters.map((waiter: any) => {
                        const isSelected = selectedWaiters.includes(waiter.id);
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
                              <Feather name="check" size={14} color="#ffffff" />
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
                      No unassigned waiters available in mock data.
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
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
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
