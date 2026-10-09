import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useSegments } from "expo-router";
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

import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";
import {
  getLocalManagerAvatarUri,
  managerProfileApi,
  setLocalManagerAvatarUri,
} from "../../services/api/manager-profile";
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
  const segments = useSegments();
  const {
    currentManager,
    loading: managerLoading,
    error: managerError,
    refreshCurrentManager,
  } = useCurrentManager();
  const isAdmin =
    role === "admin" ||
    (role !== "manager" &&
      (segments[0] === "(admin)" || currentManager?.role === "admin"));

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminAvatarUri, setAdminAvatarUri] = useState<string | null>(null);
  const [managerAvatarUri, setManagerAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [managerFirstNameEdit, setManagerFirstNameEdit] = useState<
    string | null
  >(null);
  const [managerLastNameEdit, setManagerLastNameEdit] = useState<
    string | null
  >(null);
  const managerFirstName =
    managerFirstNameEdit ?? currentManager?.firstName ?? "";
  const managerLastName = managerLastNameEdit ?? currentManager?.lastName ?? "";
  const managerAvatar =
    managerAvatarUri ||
    (currentManager ? getLocalManagerAvatarUri(currentManager.id) : null);

  const displayPhone = isAdmin
    ? adminProfile?.phone || ""
    : currentManager?.phone || "";
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
        if (isAdmin && !adminProfile?.id) {
          Alert.alert(
            "Profile unavailable",
            "Load your admin profile before choosing a picture.",
          );
          return;
        }
        if (isAdmin && adminProfile) {
          setLocalAdminAvatarUri(adminProfile.id, uri);
          setAdminAvatarUri(uri);
        } else if (!isAdmin && currentManager) {
          setLocalManagerAvatarUri(currentManager.id, uri);
          setManagerAvatarUri(uri);
        } else {
          Alert.alert(
            "Profile unavailable",
            "Load your manager profile before choosing a picture.",
          );
        }
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

    if (!managerFirstName.trim() || !currentManager) {
      Alert.alert("Error", "First name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updatedManager = await managerProfileApi.updatePersonalInfo(
        managerFirstName.trim(),
        managerLastName.trim(),
      );
      setManagerFirstNameEdit(updatedManager.firstName || "");
      setManagerLastNameEdit(updatedManager.lastName || "");
      await refreshCurrentManager();
      Alert.alert("Success", "Personal information saved successfully.");
    } catch (error) {
      Alert.alert(
        "Unable to save profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
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
        ) : managerLoading ? (
          <ActivityIndicator color={theme.primary} className="my-5" />
        ) : !currentManager ? (
          <Text className="py-5 text-center" style={{ color: theme.danger }}>
            {managerError || "Unable to load your manager profile."}
          </Text>
        ) : (
          <>
            <Pressable
              onPress={handlePickAvatar}
              disabled={saving}
              className="self-center mb-7"
              accessibilityRole="button"
              accessibilityLabel="Choose manager profile picture"
            >
              <View
                className="w-28 h-28 rounded-full items-center justify-center border-2 overflow-hidden"
                style={{ backgroundColor: theme.bg, borderColor: theme.primary }}
              >
                {managerAvatar || currentManager.avatarUrl ? (
                  <Image
                    source={{
                      uri: managerAvatar || currentManager.avatarUrl || "",
                    }}
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
            <View className="mb-5">
              <Text
                className="text-sm font-bold mb-2 ml-1"
                style={{ color: theme.muted }}
              >
                First Name
              </Text>
              <TextInput
                value={managerFirstName}
                onChangeText={setManagerFirstNameEdit}
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
                value={managerLastName}
                onChangeText={setManagerLastNameEdit}
                style={inputStyle}
                className="px-4 rounded-2xl border"
                placeholderTextColor={theme.muted}
                placeholder="Enter last name"
                autoCapitalize="words"
              />
            </View>
          </>
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
          disabled={
            saving ||
            loading ||
            (!isAdmin && (managerLoading || !currentManager))
          }
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
