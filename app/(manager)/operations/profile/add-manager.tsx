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
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { MANAGER_PHONES } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

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

export default function AddManagerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [managerName, setManagerName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [managerRole, setManagerRole] = useState<"operations" | "floor">(
    "operations",
  );
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSaveManager = () => {
    if (!managerName.trim()) {
      Alert.alert("Error", "Manager Name is mandatory!");
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
    const newKey = `${managerRole}_${Date.now()}`;
    (MANAGER_PHONES as any)[newKey] = fullPhoneNumber;

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

          <Button
            title="Save & Grant Access"
            onPress={handleSaveManager}
            className="py-4 w-full"
          />
        </Card>
      </ScrollView>

      {/* COUNTRY SELECTOR MODAL */}
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
                  className="flex-row items-center justify-between py-3 border-b"
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
