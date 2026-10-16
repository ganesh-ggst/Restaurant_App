import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { Camera, UserRound } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { Button } from "../../../../components/ui/Button";
import {
  formatProfilePhone,
  ProfileError,
  ProfileScreenHeader,
  ProfileTextField,
} from "../../../../components/profile/ProfileUi";
import { useProfile } from "../../../../components/profile/ProfileContext";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { api } from "../../../../services/api";
import type { UserProfile } from "../../../../services/api/profile";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { updateUser } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setFailedAvatarUrl("");
    try {
      const result = await api.getMyProfile(true);
      setProfile(result);
      setFirstName(result.firstName);
      setLastName(result.lastName);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your personal information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const saveChanges = async () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName || !trimmedLastName) {
      setError("Please enter both your first and last name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updatedProfile = await api.updateMyProfile(
        trimmedFirstName,
        trimmedLastName,
      );
      setProfile(updatedProfile);
      updateUser(updatedProfile);
      Alert.alert("Profile updated", "Your personal information was saved.");
      router.back();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save your personal information.",
      );
    } finally {
      setSaving(false);
    }
  };

  const chooseAvatar = async () => {
    if (uploadingAvatar || !profile) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo Access Required",
          "Allow photo library access to choose a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      setUploadingAvatar(true);
      const avatarUrl = await api.uploadMyAvatar(
        asset.uri,
        asset.fileName || "profile-avatar.jpg",
        asset.mimeType || "image/jpeg",
      );
      const updatedProfile = { ...profile, avatarUrl };
      setProfile(updatedProfile);
      updateUser(updatedProfile);
    } catch (uploadError) {
      Alert.alert(
        "Unable to Update Profile Picture",
        uploadError instanceof Error
          ? uploadError.message
          : "Please try again.",
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader title="Personal Info" onBack={() => router.back()} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 72,
          }}
          enableOnAndroid
          enableAutomaticScroll
          enableResetScrollToCoords={false}
          extraScrollHeight={32}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileError message={error} />
          <Pressable
            onPress={() => void chooseAvatar()}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
            className="mb-6 mt-3 self-center"
          >
            <View
              className="h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full border-[3px]"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.primary,
              }}
            >
              {profile?.avatarUrl && failedAvatarUrl !== profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="none"
                  onError={() => setFailedAvatarUrl(profile.avatarUrl)}
                />
              ) : (
                <UserRound size={52} color={theme.primary} strokeWidth={1.7} />
              )}
            </View>
            <View
              className="absolute bottom-0 right-0 h-11 w-11 items-center justify-center rounded-full border-[3px]"
              style={{
                backgroundColor: theme.primary,
                borderColor: theme.bg,
              }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Camera size={20} color="#fff" strokeWidth={2} />
              )}
            </View>
          </Pressable>
          {!profile?.avatarUrl ? (
            <Text
              className="mb-4 -mt-4 text-center text-xs"
              style={{ color: theme.muted }}
            >
              No profile picture found. Tap to add one.
            </Text>
          ) : failedAvatarUrl === profile.avatarUrl ? (
            <Text
              className="mb-4 -mt-4 text-center text-xs"
              style={{ color: theme.muted }}
            >
              Profile picture could not be loaded. Tap to choose another.
            </Text>
          ) : null}
          <ProfileTextField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            theme={theme}
            placeholder="Enter first name"
            size="large"
          />
          <ProfileTextField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            theme={theme}
            placeholder="Enter last name"
            size="large"
          />
          <View className="mb-7">
            <Text
              className="mb-2 ml-1 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              Mobile Number (cannot be changed)
            </Text>
            <View
              className="min-h-[60px] justify-center rounded-2xl border px-4 py-3"
              style={{
                backgroundColor: theme.secondaryBg,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}
              >
                {profile?.phone ? formatProfilePhone(profile.phone) : ""}
              </Text>
            </View>
          </View>
          <Button
            title="Save Changes"
            onPress={() => void saveChanges()}
            loading={saving}
            disabled={!firstName.trim() || !lastName.trim()}
            className="rounded-2xl"
          />
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
