import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { Button } from "../../../components/ui/Button";
import {
  formatProfilePhone,
  ProfileError,
  ProfileScreenHeader,
  ProfileTextField,
} from "../../../components/profile/ProfileUi";
import { useProfile } from "../../../components/profile/ProfileContext";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import type { UserProfile } from "../../../services/api/profile";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { updateUser } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getMyProfile();
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
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          enableOnAndroid
          extraScrollHeight={24}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileError message={error} />
          <ProfileTextField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            theme={theme}
            placeholder="Enter first name"
          />
          <ProfileTextField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            theme={theme}
            placeholder="Enter last name"
          />
          <View className="mb-7">
            <Text
              className="mb-2 ml-1 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              Mobile Number (cannot be changed)
            </Text>
            <View
              className="justify-center rounded-2xl border px-4 py-3.5"
              style={{
                backgroundColor: theme.secondaryBg,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                {profile?.phone ? formatProfilePhone(profile.phone) : ""}
              </Text>
            </View>
          </View>
          <Button
            title="Save Changes"
            onPress={() => void saveChanges()}
            loading={saving}
            disabled={!firstName.trim() || !lastName.trim()}
          />
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
