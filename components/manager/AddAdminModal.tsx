import { MANAGER_MOCK_DATA } from "@/constants/managerMockData";
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

export default function AddAdminModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ phone?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentManager } = useCurrentManager();

  const loggedInPhone =
    params.phone ||
    currentManager?.phone ||
    MANAGER_MOCK_DATA.managers?.find(
      (m: any) => m.role === "admin" || m.managerType === "admin",
    )?.phone;

  const [activeTab, setActiveTab] = useState<"add" | "showAll">("add");
  const [adminName, setAdminName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [, forceUpdate] = useState({});

  const cleanPhone = (str: string) =>
    String(str || "")
      .replace(/\D/g, "")
      .slice(-10);

  const handleSaveAdmin = () => {
    if (!adminName.trim()) {
      Alert.alert("Error", "Admin Name is mandatory!");
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

    const fullPhoneNumber = `${selectedCountry.code} ${phoneNumber.trim()}`;
    const newId = `admin_${Date.now()}`;

    const newAdminObj = {
      id: newId,
      name: adminName.trim(),
      phone: fullPhoneNumber,
      role: "admin",
      managerType: "admin",
      assignedTables: [],
      assignedWaiters: [],
    };

    if (!MANAGER_MOCK_DATA.managers) {
      MANAGER_MOCK_DATA.managers = [];
    }
    MANAGER_MOCK_DATA.managers.push(newAdminObj as any);

    Alert.alert("Success", `Admin "${adminName.trim()}" added successfully!`, [
      {
        text: "OK",
        onPress: () => {
          setAdminName("");
          setPhoneNumber("");
          setActiveTab("showAll");
          forceUpdate({});
        },
      },
    ]);
  };

  const handleStartEdit = (adm: any) => {
    setEditingId(adm.id);
    setEditedName(adm.name);
    setEditedPhone(adm.phone || "");
  };

  const handleSaveEdit = (admId: string) => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Admin name cannot be empty.");
      return;
    }

    if (!editedPhone.trim()) {
      Alert.alert("Error", "Phone number cannot be empty.");
      return;
    }

    const adm = MANAGER_MOCK_DATA.managers?.find((m: any) => m.id === admId);
    if (adm) {
      adm.name = editedName.trim();
      const isSelf = Boolean(
        (currentManager?.id && adm.id === currentManager.id) ||
        (loggedInPhone &&
          adm.phone &&
          cleanPhone(adm.phone) === cleanPhone(loggedInPhone)),
      );

      if (!isSelf && editedPhone.trim()) {
        adm.phone = editedPhone.trim();
      }
    }

    setEditingId(null);
    setEditedName("");
    setEditedPhone("");
    forceUpdate({});
  };

  const handleDeleteAdmin = (admId: string) => {
    Alert.alert("Delete Admin", "Are you sure you want to remove this admin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          MANAGER_MOCK_DATA.managers = (
            MANAGER_MOCK_DATA.managers || []
          ).filter((m: any) => m.id !== admId);
          if (editingId === admId) setEditingId(null);
          forceUpdate({});
        },
      },
    ]);
  };

  const adminsList = (MANAGER_MOCK_DATA.managers || []).filter(
    (m: any) => m.role === "admin" || m.managerType === "admin",
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
                Admin Full Name *
              </Text>
              <TextInput
                placeholder="e.g. Authorized Admin"
                placeholderTextColor={theme.muted + "44"}
                value={adminName}
                onChangeText={setAdminName}
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

              <Button
                title="Save & Grant Admin Access"
                onPress={handleSaveAdmin}
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

              {adminsList.length === 0 ? (
                <Text
                  className="text-base text-center py-8"
                  style={{ color: theme.muted }}
                >
                  No admins found.
                </Text>
              ) : (
                adminsList.map((adm: any) => {
                  const isEditing = editingId === adm.id;
                  const isSelf = Boolean(
                    (currentManager?.id && adm.id === currentManager.id) ||
                    (loggedInPhone &&
                      adm.phone &&
                      cleanPhone(adm.phone) === cleanPhone(loggedInPhone)),
                  );

                  return (
                    <View
                      key={adm.id}
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
                            ID: {adm.id} | Role: ADMIN {isSelf ? "(You)" : ""}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {isEditing ? (
                            <>
                              <Pressable
                                onPress={() => handleSaveEdit(adm.id)}
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
                              Admin Name
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
                        </View>
                      ) : (
                        <View className="gap-1 mt-0.5">
                          <Text
                            className="text-lg font-bold"
                            style={{ color: theme.text }}
                          >
                            {adm.name}
                          </Text>
                          <Text
                            className="text-sm font-medium"
                            style={{ color: theme.muted }}
                          >
                            📱 {adm.phone}
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
