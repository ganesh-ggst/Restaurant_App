import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
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

export default function PersonalInfoModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const pathname = usePathname();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { currentManager } = useCurrentManager();

  const isFloor = pathname?.includes("floor");
  const targetType = isFloor ? "floor" : "operations";

  let matchedManager = (MANAGER_MOCK_DATA as any).managers?.find(
    (m: any) => m.phone === phone || m.phone === currentManager?.phone,
  );

  if (!matchedManager) {
    matchedManager = (MANAGER_MOCK_DATA as any).managers?.find(
      (m: any) => m.managerType?.toLowerCase() === targetType,
    );
  }

  const [editFirstName, setEditFirstName] = useState(
    matchedManager?.name || (isFloor ? "Floor Manager" : "Operations Manager"),
  );

  const displayPhone =
    matchedManager?.phone ||
    matchedManager?.phoneNumber ||
    matchedManager?.mobile ||
    (isFloor ? MANAGER_PHONES.floor_1 : MANAGER_PHONES.ops_1);

  const handleSave = () => {
    if (!editFirstName.trim()) {
      Alert.alert("Error", "Manager name cannot be empty.");
      return;
    }

    if (matchedManager) {
      matchedManager.name = editFirstName.trim();
    }

    Alert.alert("Success", "Changes saved successfully!");
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
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Personal Info
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text
            className="text-sm font-bold mb-2 ml-1"
            style={{ color: theme.muted }}
          >
            Manager Name
          </Text>
          <TextInput
            value={editFirstName}
            onChangeText={setEditFirstName}
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
            placeholder="Enter Name"
          />
        </View>
        <View className="mb-8">
          <Text
            className="text-sm font-bold mb-2 ml-1"
            style={{ color: theme.muted }}
          >
            Mobile Number (Cannot be changed)
          </Text>
          <View
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              paddingVertical: 14,
            }}
            className="px-4 rounded-2xl border justify-center opacity-70"
          >
            <Text
              style={{ color: theme.muted, fontSize: 17, fontWeight: "600" }}
            >
              {displayPhone}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSave}
          style={{ backgroundColor: theme.primary }}
          className="py-4 rounded-2xl items-center shadow-sm"
        >
          <Text className="text-white font-black text-base">Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
