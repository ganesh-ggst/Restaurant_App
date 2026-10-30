import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { LocateFixed, MapPin } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
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
import { MapUnavailableNotice } from "../../../../components/maps/MapUnavailableNotice";
import { Button } from "../../../../components/ui/Button";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { api } from "../../../../services/api";
import type { AddressInput } from "../../../../services/api/profile";
import {
  isGoogleMapsApiKeyConfigured,
  isMapSelectionSupported,
} from "../../../../services/maps";

const DEFAULT_MAP_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

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

function ReadOnlyAddressField({
  label,
  value,
  placeholder,
  theme,
}: {
  label: string;
  value: string;
  placeholder: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 ml-1 text-sm font-bold" style={{ color: theme.muted }}>
        {label}
      </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        editable={false}
        style={{
          backgroundColor: theme.secondaryBg,
          borderColor: theme.border,
          color: theme.text,
          paddingVertical: 12,
          fontSize: 16,
          fontWeight: "600",
        }}
        className="rounded-2xl border px-4"
      />
    </View>
  );
}

export default function AddressFormScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id, source } = useLocalSearchParams<{
    id?: string;
    source?: "current" | "map";
  }>();
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationSelected, setLocationSelected] = useState(false);
  const [savedCoordinateAddressId, setSavedCoordinateAddressId] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const mapInteractionStarted = useRef(false);
  const mapViewRef = useRef<MapView | null>(null);
  const line1ManuallyEdited = useRef(false);
  const line2ManuallyEdited = useRef(false);
  const landmarkManuallyEdited = useRef(false);
  const reverseGeocodeRequest = useRef(0);
  const mapRegion = useRef<Region>(DEFAULT_MAP_REGION);
  const [mapRegionState, setMapRegionState] = useState<Region>(
    DEFAULT_MAP_REGION,
  );
  const mapSelectionSupported = isMapSelectionSupported();
  const googleMapsProviderConfigured = isGoogleMapsApiKeyConfigured();
  type RequiredAddressField = "label" | "line1";
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequiredAddressField, string>>
  >({});

  const applyCoordinates = useCallback(
    async (latitude: number, longitude: number) => {
      const requestId = ++reverseGeocodeRequest.current;
      setCoordinates({ latitude, longitude });
      setLocationSelected(true);
      setForm((current) => ({ ...current, lat: latitude, lng: longitude }));
      setError("");

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (place && requestId === reverseGeocodeRequest.current) {
          setForm((current) => ({
            ...current,
            line1: line1ManuallyEdited.current
              ? current.line1
              : [place.name, place.street].filter(Boolean).join(", "),
            city: place.city || place.district || current.city,
            state: place.region || current.state,
            pincode: place.postalCode || current.pincode,
          }));
        }
      } catch (geocodeError) {
        if (requestId !== reverseGeocodeRequest.current) return;
        console.error("Unable to preview the selected address.", geocodeError);
        setError(
          "Location selected, but the address preview could not be loaded. You can still continue.",
        );
      }
    },
    [],
  );

  const chooseCurrentLocation = useCallback(async () => {
    setLocationBusy(true);
    setError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Allow location access to use your current location.");
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const nextRegion = {
        ...mapRegion.current,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      mapRegion.current = nextRegion;
      setMapRegionState(nextRegion);
      mapViewRef.current?.animateToRegion(nextRegion);
      await applyCoordinates(
        location.coords.latitude,
        location.coords.longitude,
      );
    } catch (locationError) {
      setError(
        locationError instanceof Error
          ? locationError.message
          : "Unable to get your current location.",
      );
    } finally {
      setLocationBusy(false);
    }
  }, [applyCoordinates]);

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
        if (
          typeof address.lat === "number" &&
          typeof address.lng === "number"
        ) {
          setCoordinates({
            latitude: address.lat,
            longitude: address.lng,
          });
          mapRegion.current = {
            ...mapRegion.current,
            latitude: address.lat,
            longitude: address.lng,
          };
        }
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

  useEffect(() => {
    if (id) return;
    const timeout = setTimeout(() => {
      if (source === "current") void chooseCurrentLocation();
      if (source === "map") setMapPickerVisible(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, [chooseCurrentLocation, id, source]);

  useEffect(() => {
    if (!mapPickerVisible || coordinates) return;
    const timeout = setTimeout(() => {
      void chooseCurrentLocation();
    }, 0);
    return () => clearTimeout(timeout);
  }, [chooseCurrentLocation, coordinates, mapPickerVisible]);

  const setField = <K extends keyof AddressInput>(
    key: K,
    value: AddressInput[K],
  ) => {
    if (key === "line1") line1ManuallyEdited.current = true;
    if (key === "line2") line2ManuallyEdited.current = true;
    if (key === "landmark") landmarkManuallyEdited.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setFieldErrors((current) => {
      if (key === "label" || key === "line1") {
        return { ...current, [key]: undefined };
      }
      return current;
    });
  };

  const saveAddress = async () => {
    const label = form.label.trim();
    const line1 = form.line1.trim();
    const nextFieldErrors = {
      ...(!label ? { label: "Label is required." } : {}),
      ...(!line1 ? { line1: "Address Line 1 is required." } : {}),
    };
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Enter the required address details.");
      return;
    }
    if (!id && !locationSelected) {
      setError("Choose your current location or select a point on the map.");
      return;
    }
    if (!coordinates) {
      setError("Select a location before saving this address.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const editableFields: Partial<AddressInput> = {
        label,
        line1,
        ...(line2ManuallyEdited.current
          ? { line2: form.line2?.trim() || "" }
          : {}),
        ...(landmarkManuallyEdited.current
          ? { landmark: form.landmark?.trim() || "" }
          : {}),
        isDefault: form.isDefault,
      };
      let savedAddressId = id || savedCoordinateAddressId || undefined;

      if (locationSelected && (id || !savedCoordinateAddressId)) {
        const savedAddress = await api.saveAddressFromCoordinates({
          lat: String(coordinates.latitude),
          lng: String(coordinates.longitude),
          label,
          landmark: form.landmark?.trim() || "",
          ...(id ? { addressId: id } : {}),
        });
        savedAddressId = id || savedAddress._id;
        if (!id) setSavedCoordinateAddressId(savedAddress._id);
      }

      if (!savedAddressId) {
        throw new Error("Choose a location before creating an address.");
      }
      await api.updateAddress(savedAddressId, editableFields);
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

  const openMapPicker = () => {
    mapInteractionStarted.current = false;
    if (coordinates) {
      const nextRegion = {
        ...mapRegion.current,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
      mapRegion.current = nextRegion;
      setMapRegionState(nextRegion);
    }
    setMapPickerVisible(true);
  };

  const handleMapRegionChangeComplete = (region: Region) => {
    mapRegion.current = region;
    if (mapInteractionStarted.current) {
      mapInteractionStarted.current = false;
      void applyCoordinates(region.latitude, region.longitude);
    }
  };

  const handleMapSelection = (latitude: number, longitude: number) => {
    mapInteractionStarted.current = false;
    void applyCoordinates(latitude, longitude);
    mapRegion.current = {
      ...mapRegion.current,
      latitude,
      longitude,
    };
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader
        title={mapPickerVisible ? "Choose Location" : id ? "Edit Address" : "Add New Address"}
        onBack={() =>
          mapPickerVisible ? setMapPickerVisible(false) : router.back()
        }
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : mapPickerVisible ? (
        <View className="flex-1">
          {mapSelectionSupported ? (
            <MapView
              ref={mapViewRef}
              style={{ flex: 1 }}
              provider={
                googleMapsProviderConfigured ? PROVIDER_GOOGLE : undefined
              }
              initialRegion={mapRegionState}
              showsUserLocation
              showsMyLocationButton={false}
              onPanDrag={() => {
                mapInteractionStarted.current = true;
              }}
              onRegionChangeComplete={handleMapRegionChangeComplete}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                handleMapSelection(latitude, longitude);
              }}
            >
              {coordinates ? (
                <Marker
                  coordinate={coordinates}
                  title="Selected address"
                  pinColor={theme.primary}
                />
              ) : null}
            </MapView>
          ) : (
            <MapUnavailableNotice />
          )}
          <View
            className="absolute left-4 right-4 top-4"
            style={{ gap: 12 }}
          >
            <Pressable
              onPress={() => void chooseCurrentLocation()}
              disabled={locationBusy}
              className="flex-row items-center justify-center rounded-2xl border p-4"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              {locationBusy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <LocateFixed size={20} color={theme.primary} />
              )}
              <Text className="ml-2 font-bold" style={{ color: theme.primary }}>
                Use my current location
              </Text>
            </Pressable>
            <ProfileError message={error} />
          </View>
          <View
            className="border-t p-4"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 16) + 72 + 16,
            }}
          >
            <Text className="mb-1 font-black" style={{ color: theme.text }}>
              Selected location
            </Text>
            <Text className="mb-4" style={{ color: theme.muted }}>
              {coordinates
                ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
                : "Tap or pan the map to select a point."}
            </Text>
            <Button
              title="Use this location"
              onPress={() => {
                if (!coordinates) {
                  setError("Tap or pan the map to choose a location first.");
                  return;
                }
                setMapPickerVisible(false);
              }}
            />
          </View>
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
          <View className="mb-5 flex-row gap-3">
            <Pressable
              onPress={() => void chooseCurrentLocation()}
              disabled={locationBusy}
              className="flex-1 flex-row items-center justify-center rounded-2xl border p-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              {locationBusy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <LocateFixed size={18} color={theme.primary} />
              )}
              <Text
                className="ml-2 text-center text-sm font-bold"
                style={{ color: theme.primary }}
              >
                Current location
              </Text>
            </Pressable>
            <Pressable
              onPress={openMapPicker}
              className="flex-1 flex-row items-center justify-center rounded-2xl border p-3"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
            >
              <MapPin size={18} color={theme.primary} />
              <Text
                className="ml-2 text-center text-sm font-bold"
                style={{ color: theme.primary }}
              >
                Choose from map
              </Text>
            </Pressable>
          </View>
          {coordinates ? (
            <View
              className="mb-5 rounded-2xl p-4"
              style={{ backgroundColor: theme.secondaryBg }}
            >
              <Text className="font-bold" style={{ color: theme.primary }}>
                Location selected
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </Text>
            </View>
          ) : null}
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
          <ReadOnlyAddressField
            label="City"
            value={form.city || ""}
            theme={theme}
            placeholder="Filled from selected location"
          />
          <ReadOnlyAddressField
            label="State"
            value={form.state || ""}
            theme={theme}
            placeholder="Filled from selected location"
          />
          <ReadOnlyAddressField
            label="Pincode"
            value={form.pincode || ""}
            theme={theme}
            placeholder="Filled from selected location"
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
