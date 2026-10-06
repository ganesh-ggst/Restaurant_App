import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import {
  ProfileError,
  ProfileScreenHeader,
  ProfileTextField,
} from "../../../components/profile/ProfileUi";
import { Button } from "../../../components/ui/Button";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import type { AddressInput } from "../../../services/api/profile";

function emptyAddress(): AddressInput {
  return {
    label: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    isDefault: false,
  };
}

export default function AddressFormScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let isActive = true;
    void api
      .getAddress(id)
      .then((address) => {
        if (!isActive) return;
        setForm({
          label: address.label,
          line1: address.line1,
          line2: address.line2 || "",
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          landmark: address.landmark || "",
          lat: address.lat,
          lng: address.lng,
          isDefault: address.isDefault,
        });
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this address.",
          );
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const setField = <K extends keyof AddressInput>(
    key: K,
    value: AddressInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveAddress = async () => {
    const payload: AddressInput = {
      label: form.label.trim(),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      landmark: form.landmark?.trim() || undefined,
      lat: form.lat,
      lng: form.lng,
      isDefault: form.isDefault,
    };
    if (
      !payload.label ||
      !payload.line1 ||
      !payload.city ||
      !payload.state ||
      !payload.pincode
    ) {
      setError("Please fill in the label, address, city, state, and pincode.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (id) {
        await api.updateAddress(id, payload);
      } else {
        await api.createAddress(payload);
      }
      router.back();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this address.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader
        title={id ? "Edit Address" : "Add New Address"}
        onBack={() => router.back()}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 120,
          }}
          enableOnAndroid
          extraScrollHeight={24}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileError message={error} />
          <ProfileTextField
            label="Label"
            value={form.label}
            onChangeText={(value) => setField("label", value)}
            theme={theme}
            placeholder="Home, Office"
          />
          <ProfileTextField
            label="Address Line 1"
            value={form.line1}
            onChangeText={(value) => setField("line1", value)}
            theme={theme}
            placeholder="Street address"
          />
          <ProfileTextField
            label="Address Line 2 (optional)"
            value={form.line2 || ""}
            onChangeText={(value) => setField("line2", value)}
            theme={theme}
            placeholder="Apartment, suite, etc."
          />
          <ProfileTextField
            label="City"
            value={form.city}
            onChangeText={(value) => setField("city", value)}
            theme={theme}
            placeholder="City"
          />
          <ProfileTextField
            label="State"
            value={form.state}
            onChangeText={(value) => setField("state", value)}
            theme={theme}
            placeholder="State"
          />
          <ProfileTextField
            label="Pincode"
            value={form.pincode}
            onChangeText={(value) => setField("pincode", value)}
            theme={theme}
            placeholder="Pincode"
            keyboardType="number-pad"
          />
          <ProfileTextField
            label="Landmark (optional)"
            value={form.landmark || ""}
            onChangeText={(value) => setField("landmark", value)}
            theme={theme}
            placeholder="Nearby landmark"
          />
          <Pressable
            onPress={() => setField("isDefault", !form.isDefault)}
            className="mb-5 flex-row items-center gap-3"
          >
            <View
              className="h-5 w-5 items-center justify-center rounded border"
              style={{
                backgroundColor: form.isDefault ? theme.primary : "transparent",
                borderColor: form.isDefault ? theme.primary : theme.border,
              }}
            >
              {form.isDefault ? <Text className="text-white">✓</Text> : null}
            </View>
            <Text className="font-semibold" style={{ color: theme.text }}>
              Set as default address
            </Text>
          </Pressable>
          <Button
            title={id ? "Save Address" : "Add Address"}
            onPress={() => void saveAddress()}
            loading={saving}
          />
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
