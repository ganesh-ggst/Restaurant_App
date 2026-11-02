import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LocateFixed } from "lucide-react-native";
import { useRef, useState, type ComponentRef } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { MapUnavailableNotice } from "../../../components/maps/MapUnavailableNotice";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  isGoogleMapsApiKeyConfigured,
  isMapSelectionSupported,
} from "../../../services/maps";
import {
  adminMapsApi,
  adminProfileApi,
  type AdminMapGeocodeResult,
} from "../../../services/api/admin-profile";

const DEFAULT_MAP_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

interface Coordinates {
  latitude: number;
  longitude: number;
}

type BranchFormField =
  | "adminName"
  | "adminNumber"
  | "branchName"
  | "branchAddress";

type BranchFormErrors = Partial<Record<BranchFormField, string>>;

function getBranchFormErrors(message: string): BranchFormErrors {
  const fieldNames: Record<string, BranchFormField> = {
    adminname: "adminName",
    adminphone: "adminNumber",
    adminnumber: "adminNumber",
    mobilenumber: "adminNumber",
    phone: "adminNumber",
    phonenumber: "adminNumber",
    branchname: "branchName",
    address: "branchAddress",
  };
  const errors: BranchFormErrors = {};

  message.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([\w.]+)\s*:\s*(.+?)\s*$/);
    if (!match) return;
    const field = fieldNames[match[1].split(".").pop()!.toLowerCase()];
    if (field) errors[field] = match[2];
  });

  if (
    !errors.adminNumber &&
    /\b(?:mobile|phone)\s*(?:number)?\b|admin[\s_-]*(?:phone|number)/i.test(
      message,
    )
  ) {
    errors.adminNumber = message.trim();
  }

  return errors;
}

function getAddress(result: AdminMapGeocodeResult): string {
  const formattedAddress = result.results
    ?.map((place) => place.formattedAddress?.trim())
    .find((address) => Boolean(address));
  return (
    formattedAddress ||
    result.formattedAddress ||
    result.address ||
    result.displayName ||
    [result.area, result.city, result.state].filter(Boolean).join(", ")
  );
}

export default function AddBranchScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminNumber, setAdminNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<BranchFormErrors>({});
  const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);
  const mapViewRef = useRef<MapView | null>(null);
  const formScrollRef = useRef<KeyboardAwareScrollView | null>(null);
  const addressInputRef = useRef<ComponentRef<typeof TextInput> | null>(null);
  const reverseGeocodeRequest = useRef(0);
  const mapSelectionSupported = isMapSelectionSupported();
  const googleMapsProviderConfigured = isGoogleMapsApiKeyConfigured();

  const applyCoordinates = async (latitude: number, longitude: number) => {
    const requestId = ++reverseGeocodeRequest.current;
    setCoordinates({ latitude, longitude });
    setLocationError("");
    try {
      const place = await adminMapsApi.reverseGeocode(latitude, longitude);
      if (requestId !== reverseGeocodeRequest.current) return;
      const address = getAddress(place);
      if (address) setBranchAddress(address);
      else {
        setLocationError(
          "Location selected, but no address was returned. Enter the address manually.",
        );
      }
    } catch (error) {
      if (requestId !== reverseGeocodeRequest.current) return;
      console.error("Unable to preview the selected branch address.", error);
      setLocationError(
        "Location selected, but the address preview could not be loaded. Enter the address manually.",
      );
    }
  };

  const chooseCurrentLocation = async () => {
    setLocationBusy(true);
    setLocationError("");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Allow location access to use your current location.");
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      const nextRegion = { ...mapRegion, latitude, longitude };
      setMapRegion(nextRegion);
      mapViewRef.current?.animateToRegion(nextRegion);
      await applyCoordinates(latitude, longitude);
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Unable to get your current location.",
      );
    } finally {
      setLocationBusy(false);
    }
  };

  const openLocationOptions = () => {
    Alert.alert("Choose branch location", "Select how to set the location.", [
      {
        text: "Use current location",
        onPress: () => void chooseCurrentLocation(),
      },
      {
        text: "Choose from map",
        onPress: () => {
          if (!mapSelectionSupported) {
            setMapPickerVisible(true);
            return;
          }
          if (coordinates) {
            setMapRegion((current) => ({
              ...current,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            }));
          }
          setMapPickerVisible(true);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const saveBranch = async () => {
    const validationErrors: BranchFormErrors = {
      ...(!adminName.trim() ? { adminName: "Admin name is required." } : {}),
      ...(!/^\d{10}$/.test(adminNumber)
        ? { adminNumber: "Enter a valid 10-digit mobile number." }
        : {}),
      ...(!branchName.trim() ? { branchName: "Branch name is required." } : {}),
      ...(!branchAddress.trim()
        ? { branchAddress: "Branch address is required." }
        : {}),
    };
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFormError("");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await adminProfileApi.createBranch({
        adminName: adminName.trim(),
        adminPhone: `+91${adminNumber}`,
        branchName: branchName.trim(),
        address: branchAddress.trim(),
      });
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create the branch.";
      const mappedErrors = getBranchFormErrors(message);
      setFieldErrors(mappedErrors);
      setFormError(
        Object.keys(mappedErrors).length > 0 ? "" : message,
      );
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: BranchFormField, value: string) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
    if (field === "adminName") setAdminName(value);
    if (field === "adminNumber") setAdminNumber(value);
    if (field === "branchName") setBranchName(value);
    if (field === "branchAddress") setBranchAddress(value);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View className="flex-row items-center px-6 pb-4 pt-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          className="mr-3 p-1"
        >
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text className="text-2xl font-black" style={{ color: theme.text }}>
          Add new branch
        </Text>
      </View>

      <KeyboardAwareScrollView
        ref={formScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 180 }}
        enableOnAndroid
        enableAutomaticScroll
        enableResetScrollToCoords={false}
        extraScrollHeight={100}
        keyboardOpeningTime={350}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <Input
            label="Admin name"
            placeholder="Enter admin name"
            value={adminName}
            onChangeText={(value) => updateField("adminName", value)}
            error={fieldErrors.adminName}
            autoCapitalize="words"
          />
          <Input
            label="Admin number"
            placeholder="Enter admin number"
            value={adminNumber}
            onChangeText={(value) =>
              updateField("adminNumber", value.replace(/\D/g, "").slice(0, 10))
            }
            error={fieldErrors.adminNumber}
            keyboardType="phone-pad"
            maxLength={10}
            prefix={
              <View
                className="mr-1 flex-row items-center border-r pr-3"
                style={{ borderRightColor: theme.border }}
              >
                <Text className="mr-2 text-lg">🇮🇳</Text>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.text }}
                >
                  +91
                </Text>
              </View>
            }
          />
          <Input
            label="Branch name"
            placeholder="Enter branch name"
            value={branchName}
            onChangeText={(value) => updateField("branchName", value)}
            error={fieldErrors.branchName}
            autoCapitalize="words"
          />
          <View className="mb-5">
            <Text
              className="mb-2 ml-1 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              Choose branch location
            </Text>
            <Pressable
              onPress={openLocationOptions}
              disabled={locationBusy}
              accessibilityRole="button"
              className="flex-row items-center justify-center rounded-2xl border-2 px-4 py-4"
              style={{
                borderColor: theme.primary,
                backgroundColor: theme.secondaryBg,
              }}
            >
              {locationBusy ? (
                <Text className="font-bold" style={{ color: theme.primary }}>
                  Getting current location...
                </Text>
              ) : (
                <>
                  <LocateFixed size={19} color={theme.primary} />
                  <Text
                    className="ml-2 font-bold"
                    style={{ color: theme.primary }}
                  >
                    Choose current location or map
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View className="mb-5">
            <Text
              className="mb-2 ml-1 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              Branch coordinates
            </Text>
            <View
              className="min-h-14 justify-center rounded-2xl border px-4 py-4"
              style={{
                backgroundColor: theme.secondaryBg,
                borderColor: theme.border,
              }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: coordinates ? theme.text : theme.muted }}
              >
                {coordinates
                  ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
                  : "Latitude, Longitude"}
              </Text>
            </View>
          </View>

          <View className="mb-5">
            <Text
              className="mb-2 ml-1 text-sm font-bold"
              style={{ color: theme.muted }}
            >
              Branch address
            </Text>
            <TextInput
              ref={addressInputRef}
              value={branchAddress}
              onChangeText={(value) => updateField("branchAddress", value)}
              onFocus={() => {
                if (addressInputRef.current) {
                  formScrollRef.current?.scrollToFocusedInput(
                    addressInputRef.current,
                    120,
                    350,
                  );
                }
              }}
              placeholder="Street, landmark, floor"
              placeholderTextColor={theme.muted}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 112,
                backgroundColor: theme.secondaryBg,
                borderColor: fieldErrors.branchAddress
                  ? theme.danger
                  : theme.border,
                color: theme.text,
                padding: 16,
                fontSize: 16,
                fontWeight: "600",
              }}
              className="rounded-2xl border-2"
            />
            {fieldErrors.branchAddress ? (
              <Text
                className="mt-2 text-sm font-medium"
                style={{ color: theme.danger }}
              >
                {fieldErrors.branchAddress}
              </Text>
            ) : null}
          </View>

          {locationError ? (
            <Text className="mb-4 text-sm" style={{ color: theme.danger }}>
              {locationError}
            </Text>
          ) : null}
          {formError ? (
            <Text className="mb-4 text-sm" style={{ color: theme.danger }}>
              {formError}
            </Text>
          ) : null}

          <Button
            title="Add branch"
            onPress={() => void saveBranch()}
            loading={saving}
          />
      </KeyboardAwareScrollView>

      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        onRequestClose={() => setMapPickerVisible(false)}
      >
        <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
          <StatusBar style={theme.isDark ? "light" : "dark"} />
          <View className="flex-row items-center px-6 py-4">
            <Pressable
              onPress={() => setMapPickerVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              hitSlop={10}
              className="mr-3 p-1"
            >
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-lg font-black" style={{ color: theme.text }}>
                Choose from map
              </Text>
              <Text className="text-xs" style={{ color: theme.muted }}>
                Tap the map to pin the branch
              </Text>
            </View>
          </View>

          {mapSelectionSupported ? (
            <MapView
              ref={mapViewRef}
              provider={
                googleMapsProviderConfigured ? PROVIDER_GOOGLE : undefined
              }
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setMapRegion((current) => ({
                  ...current,
                  latitude,
                  longitude,
                }));
                void applyCoordinates(latitude, longitude);
              }}
            >
              <Marker
                coordinate={
                  coordinates ?? {
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude,
                  }
                }
                title="Branch location"
              />
            </MapView>
          ) : (
            <View className="flex-1">
              <MapUnavailableNotice />
            </View>
          )}

          <View className="border-t px-6 py-4" style={{ borderColor: theme.border }}>
            <Text
              className="mb-3 text-xs"
              style={{ color: locationError ? theme.danger : theme.muted }}
            >
              {locationError ||
                (coordinates
                  ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
                  : "Select a point on the map")}
            </Text>
            <Button
              title="Use this location"
              onPress={() => setMapPickerVisible(false)}
              disabled={!mapSelectionSupported || !coordinates}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
