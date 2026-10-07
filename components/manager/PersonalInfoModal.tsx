import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MANAGER_MOCK_DATA,
  MANAGER_PHONES,
  updateMockManagerName,
} from "../../constants/managerMockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";
import {
  AdminProfile,
  adminProfileApi,
  getLocalAdminAvatarUri,
  setLocalAdminAvatarUri,
} from "../../services/api/admin-profile";

interface PersonalInfoModalProps {
  role?: "admin" | "manager";
}

export default function PersonalInfoModal({
  role,
}: PersonalInfoModalProps = {}) {
  const router = useRouter();
  const theme = useAppTheme();
  const pathname = usePathname();
  const segments = useSegments();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { currentManager } = useCurrentManager();
  const isAdmin =
    role === "admin" ||
    (role !== "manager" &&
      (segments[0] === "(admin)" || currentManager?.role === "admin"));

  const mockManagers = isAdmin
    ? []
    : (MANAGER_MOCK_DATA as any).managers || [];
  const phoneMatch = mockManagers.find(
    (manager: any) =>
      manager.phone === phone || manager.phone === currentManager?.phone,
  );
  const isFloor =
    pathname?.includes("floor") || currentManager?.managerType === "floor";
  const targetType = isFloor ? "floor" : "operations";
  const roleMatch = mockManagers.find(
      (manager: any) => manager.managerType?.toLowerCase() === targetType,
  );
  const matchedManager = isAdmin
    ? phoneMatch
    : phoneMatch ||
      roleMatch || {
      name: "RAM SITA",
      phone: MANAGER_PHONES.admin,
      role: "admin",
      managerType: "admin",
    };
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminAvatarUri, setAdminAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [editFirstName, setEditFirstName] = useState(
    matchedManager?.name || "",
  );

  const displayPhone = isAdmin
    ? adminProfile?.phone || ""
    : matchedManager?.phone ||
      matchedManager?.phoneNumber ||
      matchedManager?.mobile ||
      MANAGER_PHONES.ops_1;

  useEffect(() => {
    if (!isAdmin) return;

    let isCurrent = true;
    adminProfileApi
      .getProfile()
      .then(({ admin }) => {
        if (!isCurrent) return;
        setAdminProfile(admin);
        setAdminFirstName(admin.firstName || "");
        setAdminLastName(admin.lastName || "");
        setAdminAvatarUri(getLocalAdminAvatarUri(admin.id));
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          Alert.alert(
            "Unable to load profile",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAdmin]);

  const handlePickAvatar = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photo access required",
          "Allow photo library access to choose a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (!adminProfile?.id) {
          Alert.alert(
            "Profile unavailable",
            "Load your admin profile before choosing a picture.",
          );
          return;
        }
        setLocalAdminAvatarUri(adminProfile.id, uri);
        setAdminAvatarUri(uri);
      }
    } catch (error) {
      Alert.alert(
        "Unable to choose photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleSave = async () => {
    if (isAdmin) {
      if (!adminFirstName.trim()) {
        Alert.alert("Error", "First name cannot be empty.");
        return;
      }

      setSaving(true);
      try {
        const updatedProfile = await adminProfileApi.updatePersonalInfo(
          adminFirstName.trim(),
          adminLastName.trim(),
        );
        setAdminProfile(updatedProfile);
        setAdminFirstName(updatedProfile.firstName || "");
        setAdminLastName(updatedProfile.lastName || "");
        Alert.alert("Success", "Personal information saved successfully.");
      } catch (error) {
        Alert.alert(
          "Unable to save profile",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!editFirstName.trim()) {
      Alert.alert("Error", "Manager name cannot be empty.");
      return;
    }

    if (matchedManager?.id) {
      updateMockManagerName(matchedManager.id, editFirstName.trim());
    }

    Alert.alert("Success", "Changes saved successfully!");
  };

  const inputStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
    color: theme.text,
    paddingVertical: 12,
    fontSize: 17,
    fontWeight: "600" as const,
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.bg }}
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
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Personal Info
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {isAdmin ? (
          <>
            <Pressable
              onPress={handlePickAvatar}
              disabled={loading || !adminProfile?.id}
              className="self-center mb-7"
              accessibilityRole="button"
              accessibilityLabel="Choose admin profile picture"
            >
              <View
                className="w-28 h-28 rounded-full items-center justify-center border-2 overflow-hidden"
                style={{ backgroundColor: theme.bg, borderColor: theme.primary }}
              >
                {adminAvatarUri || adminProfile?.avatarUrl ? (
                  <Image
                    source={{ uri: adminAvatarUri || adminProfile?.avatarUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="user" size={44} color={theme.primary} />
                )}
              </View>
              <View
                className="absolute bottom-0 right-0 rounded-full p-2"
                style={{ backgroundColor: theme.primary }}
              >
                <Feather name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            {loading ? (
              <ActivityIndicator color={theme.primary} className="my-5" />
            ) : (
              <>
                <View className="mb-5">
                  <Text
                    className="text-sm font-bold mb-2 ml-1"
                    style={{ color: theme.muted }}
                  >
                    First Name
                  </Text>
                  <TextInput
                    value={adminFirstName}
                    onChangeText={setAdminFirstName}
                    style={inputStyle}
                    className="px-4 rounded-2xl border"
                    placeholderTextColor={theme.muted}
                    placeholder="Enter first name"
                    autoCapitalize="words"
                  />
                </View>
                <View className="mb-5">
                  <Text
                    className="text-sm font-bold mb-2 ml-1"
                    style={{ color: theme.muted }}
                  >
                    Last Name
                  </Text>
                  <TextInput
                    value={adminLastName}
                    onChangeText={setAdminLastName}
                    style={inputStyle}
                    className="px-4 rounded-2xl border"
                    placeholderTextColor={theme.muted}
                    placeholder="Enter last name"
                    autoCapitalize="words"
                  />
                </View>
              </>
            )}
          </>
        ) : (
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
              style={inputStyle}
              className="px-4 rounded-2xl border"
              placeholderTextColor={theme.muted}
              placeholder="Enter Name"
            />
          </View>
        )}

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
            <Text style={{ color: theme.muted, fontSize: 17, fontWeight: "600" }}>
              {displayPhone}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving || (isAdmin && loading)}
          style={{ backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }}
          className="py-4 rounded-2xl items-center shadow-sm"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-black text-base">
              Save Changes
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
