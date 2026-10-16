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
} from "../../../../components/profile/ProfileUi";
import { Button } from "../../../../components/ui/Button";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { api } from "../../../../services/api";
import type { AddressInput } from "../../../../services/api/profile";

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
  type RequiredAddressField = "label" | "line1" | "city" | "state" | "pincode";
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequiredAddressField, string>>
  >({});

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
    setError("");
    setFieldErrors((current) => {
      switch (key) {
        case "label":
          return { ...current, label: undefined };
        case "line1":
          return { ...current, line1: undefined };
        case "city":
          return { ...current, city: undefined };
        case "state":
          return { ...current, state: undefined };
        case "pincode":
          return { ...current, pincode: undefined };
        default:
          return current;
      }
    });
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
    const nextFieldErrors = {
      ...(!payload.label ? { label: "Label is required." } : {}),
      ...(!payload.line1 ? { line1: "Address line 1 is required." } : {}),
      ...(!payload.city ? { city: "City is required." } : {}),
      ...(!payload.state ? { state: "State is required." } : {}),
      ...(!payload.pincode
        ? { pincode: "Pincode is required." }
        : !/^\d{6}$/.test(payload.pincode)
          ? { pincode: "Pincode must be exactly 6 digits." }
          : {}),
    };
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Please complete the highlighted required fields.");
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
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 180,
          }}
          enableOnAndroid
          enableAutomaticScroll
          enableResetScrollToCoords={false}
          extraScrollHeight={80}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileError message={error} />
          <ProfileTextField
            label="Label"
            value={form.label}
            onChangeText={(value) => setField("label", value)}
            theme={theme}
            placeholder="Home, Office"
            required
            error={fieldErrors.label}
          />
          <ProfileTextField
            label="Address Line 1"
            value={form.line1}
            onChangeText={(value) => setField("line1", value)}
            theme={theme}
            placeholder="Street address"
            required
            error={fieldErrors.line1}
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
            required
            error={fieldErrors.city}
          />
          <ProfileTextField
            label="State"
            value={form.state}
            onChangeText={(value) => setField("state", value)}
            theme={theme}
            placeholder="State"
            required
            error={fieldErrors.state}
          />
          <ProfileTextField
            label="Pincode"
            value={form.pincode}
            onChangeText={(value) => setField("pincode", value)}
            theme={theme}
            placeholder="Pincode"
            keyboardType="number-pad"
            required
            error={
              fieldErrors.pincode ||
              (form.pincode && !/^\d{6}$/.test(form.pincode)
                ? "Pincode must be exactly 6 digits."
                : undefined)
            }
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
