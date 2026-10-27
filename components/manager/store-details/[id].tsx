import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type StoreDetailOption,
  type StoreDetailSection,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { adminProfileApi } from "../../../services/api/admin-profile";
import { managerProfileApi } from "../../../services/api/manager-profile";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import {
  getStoreDetailDefinition,
  mapAdminStoreDetailSection,
} from "../adminProfileSections";

export default function StoreDetailDetailComponent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = segments[0] === "(admin)";

  const [options, setOptions] = useState<StoreDetailOption[]>([]);
  const [adminSection, setAdminSection] = useState<StoreDetailSection>();
  const [managerSection, setManagerSection] = useState<StoreDetailSection>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOption, setEditingOption] = useState<StoreDetailOption | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const deliveryDescriptionRef =
    useRef<React.ElementRef<typeof TextInput>>(null);

  const [addressLine, setAddressLine] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [thirdVal, setThirdVal] = useState("");
  const [fourthVal, setFourthVal] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [chargeErrors, setChargeErrors] = useState<
    Partial<Record<"packaging" | "platform" | "delivery", string>>
  >({});
  const [deliveryErrors, setDeliveryErrors] = useState<
    Partial<Record<"name" | "price" | "description" | "time", string>>
  >({});
  const [wifiErrors, setWifiErrors] = useState<
    Partial<Record<"name" | "password", string>>
  >({});
  const [taxErrors, setTaxErrors] = useState<
    Partial<Record<"first" | "second", string>>
  >({});
  const section = isAdmin ? adminSection : managerSection;

  useEffect(() => {
    if (!id) return;
    const definition = getStoreDetailDefinition(id);
    if (!definition) return;

    let isCurrent = true;
    (isAdmin
      ? adminProfileApi.getStoreDetailSection(definition.key, true)
      : managerProfileApi.getStoreDetailSection(definition.key))
      .then((data) => {
        if (!isCurrent) return;
        const nextSection = mapAdminStoreDetailSection(id, data);
        if (nextSection) {
          if (isAdmin) setAdminSection(nextSection);
          else setManagerSection(nextSection);
          setOptions(nextSection.options);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          Alert.alert(
            "Unable to load store-detail section",
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
  }, [id, isAdmin]);

  if (!section) {
    if (loading) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.bg,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.muted }}>Loading store details...</Text>
        </View>
      );
    }
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.text }}>Section not found.</Text>
      </View>
    );
  }

  const isTaxSection = id === "sd_tax";
  const isWifiSection = id === "sd_wifi";
  const isChargesSection =
    id === "sd_charges" || section.title.toLowerCase().includes("charges");
  const isDeliverySection =
    id === "sd_delivery" || section.title.toLowerCase().includes("delivery");
  const isAddressSection =
    id === "sd_address" || section.title.toLowerCase().includes("address");
  const addressFieldLabel =
    isAddressSection
      ? "Address"
      : isWifiSection
        ? "Network name"
        : isTaxSection
          ? isAdmin
            ? "CGST percentage"
            : "GST percentage"
          : section.title;
  const updateAddressLine = (value: string) => {
    setAddressLine(value);
    if (fieldError) setFieldError("");
  };
  const updateChargeValue = (
    field: "packaging" | "platform" | "delivery",
    value: string,
    setter: (nextValue: string) => void,
  ) => {
    setter(value);
    if (chargeErrors[field]) {
      setChargeErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Permission to access location was denied.",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      setGpsCoordinates(
        `GPS: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
      );

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(", ");
        setAddressLine(formattedAddress);
      } else {
        setAddressLine(`Lat: ${latitude}, Lon: ${longitude}`);
      }

      Alert.alert("Success", "Real-time device location fetched successfully!");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not fetch current location. Please ensure GPS is enabled.",
      );
    }
  };

  const refreshSection = async () => {
    const definition = getStoreDetailDefinition(id);
    if (!definition) return;
    const data = isAdmin
      ? await adminProfileApi.getStoreDetailSection(definition.key, true)
      : await managerProfileApi.getStoreDetailSection(definition.key);
    const nextSection = mapAdminStoreDetailSection(id, data);
    if (nextSection) {
      if (isAdmin) setAdminSection(nextSection);
      else setManagerSection(nextSection);
      setOptions(nextSection.options);
    }
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSection();
    } catch (error) {
      Alert.alert(
        "Unable to refresh store details",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const toggleOption = async (optionId: string) => {
    const definition = getStoreDetailDefinition(id);
    const option = options.find((item) => item.id === optionId);
    if (!definition || !option) return;
    try {
      if (isAdmin) {
        await adminProfileApi.setStoreDetailActive(
          definition.key,
          optionId,
          !option.isActive,
        );
      } else {
        await managerProfileApi.setStoreDetailActive(
          definition.key,
          optionId,
          !option.isActive,
        );
      }
      await refreshSection();
    } catch (error) {
      Alert.alert(
        "Unable to update active store detail",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const openEditor = (opt?: StoreDetailOption) => {
    setFieldError("");
    setChargeErrors({});
    setDeliveryErrors({});
    setWifiErrors({});
    setTaxErrors({});
    setEditingOption(opt || null);
    if (isTaxSection && opt) {
      const cgstMatch = opt.subValue
        ? opt.subValue.match(/CGST:\s*([0-9.]+)/)
        : null;
      const sgstMatch = opt.subValue
        ? opt.subValue.match(/SGST:\s*([0-9.]+)/)
        : null;
      setAddressLine(
        cgstMatch ? cgstMatch[1] : opt.value ? opt.value.replace("%", "") : "",
      );
      setGpsCoordinates(sgstMatch ? sgstMatch[1] : "");
      setThirdVal("");
      setFourthVal("");
    } else if (isChargesSection && opt) {
      const packMatch = opt.subValue
        ? opt.subValue.match(/Packaging Charge: ₹([0-9.]+)/)
        : null;
      const platMatch = opt.subValue
        ? opt.subValue.match(/Platform Fee: ₹([0-9.]+)/)
        : null;
      const delMatch = opt.subValue
        ? opt.subValue.match(/Base Delivery Fee: ₹([0-9.]+)/)
        : null;
      const descriptionMatch = opt.subValue
        ? opt.subValue.match(/Base Delivery Fee: ₹[0-9.]+(?:\s*•\s*(.*))?$/)
        : null;
      setAddressLine(packMatch ? packMatch[1] : "");
      setGpsCoordinates(platMatch ? platMatch[1] : "");
      setThirdVal(delMatch ? delMatch[1] : "");
      setFourthVal(descriptionMatch?.[1] || "");
    } else if (isDeliverySection && opt) {
      const titleMatch = opt.value ? opt.value.match(/^(.*?)\s*\(/) : null;
      setAddressLine(titleMatch ? titleMatch[1] : opt.value || "");
      const priceMatch = opt.value ? opt.value.match(/₹([0-9-]+)/) : null;
      setGpsCoordinates(priceMatch ? priceMatch[1] : "0");
      const subParts = opt.subValue ? opt.subValue.split("•") : [];
      setThirdVal(subParts[0] ? subParts[0].trim() : "");
      setFourthVal(subParts[1] ? subParts[1].trim() : "");
    } else if (isAddressSection && opt) {
      setAddressLine(isAdmin ? opt.area || "" : opt.value || "");
      setGpsCoordinates(opt.subValue || "");
      setThirdVal(isAdmin ? opt.phone || "" : "");
      setFourthVal("");
    } else {
      setAddressLine(opt ? opt.value : "");
      setGpsCoordinates(opt && opt.subValue ? opt.subValue : "");
      setThirdVal("");
      setFourthVal("");
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    const trimmedAddressLine = addressLine.trim();
    if (id === "sd_rest") {
      setAddressLine(trimmedAddressLine);
    }
    if (isTaxSection) {
      setAddressLine(addressLine.trim());
      setGpsCoordinates(gpsCoordinates.trim());
      const errors: typeof taxErrors = {};
      const firstLabel = isAdmin ? "CGST Percentage" : "GST Percentage";
      if (!addressLine.trim()) {
        errors.first = `${firstLabel} is required.`;
      } else if (!Number.isFinite(Number(addressLine.trim()))) {
        errors.first = `Enter a valid ${firstLabel.toLowerCase()}.`;
      }
      if (isAdmin) {
        if (!gpsCoordinates.trim()) {
          errors.second = "SGST Percentage is required.";
        } else if (!Number.isFinite(Number(gpsCoordinates.trim()))) {
          errors.second = "Enter a valid SGST percentage.";
        }
      }
      if (Object.keys(errors).length > 0) {
        setTaxErrors(errors);
        return;
      }
    }
    setTaxErrors({});
    if (isWifiSection) {
      setAddressLine(addressLine.trim());
      setGpsCoordinates(gpsCoordinates.trim());
      const errors: typeof wifiErrors = {};
      if (!addressLine.trim()) errors.name = "Network name is required.";
      if (!gpsCoordinates.trim()) errors.password = "Password is required.";
      if (Object.keys(errors).length > 0) {
        setWifiErrors(errors);
        return;
      }
    }
    setWifiErrors({});
    if (isChargesSection) {
      setAddressLine(addressLine.trim());
      setGpsCoordinates(gpsCoordinates.trim());
      setThirdVal(thirdVal.trim());
    }
    if (isDeliverySection) {
      const errors: typeof deliveryErrors = {};
      if (!addressLine.trim()) errors.name = "Delivery Type Title is required.";
      if (!gpsCoordinates.trim()) {
        errors.price = "Price / Fee is required.";
      } else if (!Number.isFinite(Number(gpsCoordinates.trim()))) {
        errors.price = "Enter a valid Price / Fee.";
      }
      if (!thirdVal.trim()) {
        errors.description = "Subtitle Description is required.";
      }
      if (!fourthVal.trim()) {
        errors.time = "Estimated Time Range is required.";
      }
      if (Object.keys(errors).length > 0) {
        setDeliveryErrors(errors);
        return;
      }
    }
    setDeliveryErrors({});
    if (isChargesSection) {
      const errors: typeof chargeErrors = {};
      const chargeFields = [
        ["packaging", addressLine, "Packaging Charge"],
        ["platform", gpsCoordinates, "Platform Fee"],
        ["delivery", thirdVal, "Base Delivery Fee"],
      ] as const;
      chargeFields.forEach(([field, value, label]) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) {
          errors[field] = `${label} is required.`;
        } else if (!Number.isFinite(Number(trimmedValue))) {
          errors[field] = `Enter a valid ${label.toLowerCase()}.`;
        }
      });
      if (Object.keys(errors).length > 0) {
        setChargeErrors(errors);
        return;
      }
    }
    setChargeErrors({});
    if (!trimmedAddressLine && !isChargesSection && !isDeliverySection) {
      setFieldError(`${addressFieldLabel} is required.`);
      return;
    }
    setFieldError("");

    if (isAdmin) {
      const definition = getStoreDetailDefinition(id);
      if (!definition) return;

      let body: Record<string, unknown>;
      if (editingOption && id === "sd_rest") {
        body = { name: addressLine.trim() };
      } else if (editingOption && isAddressSection) {
        body = { area: addressLine.trim(), phone: thirdVal.trim() };
      } else if (editingOption && isTaxSection) {
        body = {
          cgstPercentage: Number(addressLine) || 0,
          sgstPercentage: Number(gpsCoordinates) || 0,
        };
      } else if (editingOption && isWifiSection) {
        body = {
          name: addressLine.trim(),
          password: gpsCoordinates.trim(),
        };
      } else if (editingOption && isChargesSection) {
        body = {
          packaging: Number(addressLine) || 0,
          platform: Number(gpsCoordinates) || 0,
          delivery: Number(thirdVal) || 0,
        };
      } else if (editingOption && isDeliverySection) {
        body = {
          name: addressLine.trim(),
          title: addressLine.trim(),
          price: Number(gpsCoordinates) || 0,
          description: thirdVal.trim(),
          estimatedTimeRange: fourthVal.trim(),
        };
      } else if (id === "sd_rest") {
        body = { name: addressLine.trim() };
      } else if (isAddressSection) {
        const coordinates = gpsCoordinates.match(/-?\d+(?:\.\d+)?/g) || [];
        body = {
          address: addressLine.trim(),
          ...(coordinates.length >= 2
            ? {
                location: {
                  lat: Number(coordinates[0]),
                  lng: Number(coordinates[1]),
                },
              }
            : {}),
        };
      } else if (isTaxSection) {
        body = {
          cgstPercentage: Number(addressLine) || 0,
          sgstPercentage: Number(gpsCoordinates) || 0,
        };
      } else if (isWifiSection) {
        body = { name: addressLine.trim(), password: gpsCoordinates.trim() };
      } else if (isChargesSection) {
        body = {
          packaging: Number(addressLine) || 0,
          platform: Number(gpsCoordinates) || 0,
          delivery: Number(thirdVal) || 0,
          description: fourthVal.trim(),
        };
      } else if (isDeliverySection) {
        body = {
          name: addressLine.trim(),
          price: Number(gpsCoordinates) || 0,
          description: thirdVal.trim(),
          estimatedTimeRange: fourthVal.trim(),
        };
      } else {
        Alert.alert("Unsupported store detail", "This section cannot be saved.");
        return;
      }

      setSaving(true);
      try {
        if (editingOption) {
          await adminProfileApi.updateStoreDetail(
            definition.key,
            editingOption.id,
            body,
          );
        } else {
          await adminProfileApi.createStoreDetail(definition.key, {
            ...body,
            isActive: true,
          });
        }
        await refreshSection();
        setIsEditorOpen(false);
      } catch (error) {
        Alert.alert(
          "Unable to save store detail",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const definition = getStoreDetailDefinition(id);
    if (!definition) return;
    let body: Record<string, unknown>;
    if (id === "sd_rest") {
      body = { name: addressLine.trim() };
    } else if (isAddressSection) {
      const coordinates = gpsCoordinates.match(/-?\d+(?:\.\d+)?/g) || [];
      body = {
        address: addressLine.trim(),
        ...(coordinates.length >= 2
          ? { location: { lat: Number(coordinates[0]), lng: Number(coordinates[1]) } }
          : {}),
      };
    } else if (isTaxSection) {
      body = isAdmin
        ? {
            cgstPercentage: Number(addressLine) || 0,
            sgstPercentage: Number(gpsCoordinates) || 0,
          }
        : { gstPercentage: Number(addressLine) || 0 };
    } else if (isWifiSection) {
      body = { name: addressLine.trim(), password: gpsCoordinates.trim() };
    } else if (isChargesSection) {
      body = {
        packaging: Number(addressLine) || 0,
        platform: Number(gpsCoordinates) || 0,
        delivery: Number(thirdVal) || 0,
        description: fourthVal.trim(),
      };
    } else if (isDeliverySection) {
      body = {
        name: addressLine.trim(),
        title: addressLine.trim(),
        price: Number(gpsCoordinates) || 0,
        description: thirdVal.trim(),
        estimatedTimeRange: fourthVal.trim(),
      };
    } else {
      Alert.alert("Unsupported store detail", "This section cannot be saved.");
      return;
    }

    setSaving(true);
    try {
      if (editingOption) {
        if (isAdmin) {
          await adminProfileApi.updateStoreDetail(definition.key, editingOption.id, body);
        } else {
          await managerProfileApi.updateStoreDetail(definition.key, editingOption.id, body);
        }
      } else if (isAdmin) {
        await adminProfileApi.createStoreDetail(definition.key, body);
      } else {
        await managerProfileApi.createStoreDetail(definition.key, body);
      }
      await refreshSection();
      setIsEditorOpen(false);
    } catch (error) {
      Alert.alert(
        "Unable to save store detail",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (optionId: string, value: string) => {
    if (section.options.length <= 1) {
      Alert.alert("Cannot Delete", "You must keep at least one entry.");
      return;
    }

    Alert.alert("Delete Item", `Remove "${value}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
      onPress: async () => {
        if (isAdmin) {
          const definition = getStoreDetailDefinition(id);
          if (!definition) return;
          try {
            await adminProfileApi.deleteStoreDetail(
              definition.key,
              optionId,
            );
            await refreshSection();
          } catch (error) {
            Alert.alert(
              "Unable to delete store detail",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
          return;
        }
        const definition = getStoreDetailDefinition(id);
        if (!definition) return;
        try {
          await managerProfileApi.deleteStoreDetail(definition.key, optionId);
          await refreshSection();
        } catch (error) {
          Alert.alert(
            "Unable to delete store detail",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
        },
      },
    ]);
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
          {section.title}
        </Text>
        <Pressable
          onPress={() => openEditor()}
          disabled={loading || saving}
          className="px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: theme.primary, opacity: loading ? 0.6 : 1 }}
        >
          <Text className="text-xs font-bold text-white">+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handlePullToRefresh()}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading ? (
          <Text
            className="text-base text-center py-8"
            style={{ color: theme.muted }}
          >
            Loading store details...
          </Text>
        ) : options.map((opt) => (
          <Card
            key={opt.id}
            variant="default"
            className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
          >
            <Pressable
              className="flex-1 mr-3 flex-row items-center gap-3"
              onPress={() => toggleOption(opt.id)}
            >
              {section.selectionType === "single" ? (
                <View
                  className="w-6 h-6 rounded-full border-2 items-center justify-center"
                  style={{
                    borderColor: opt.isActive ? theme.primary : theme.muted,
                  }}
                >
                  {opt.isActive && (
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                  )}
                </View>
              ) : (
                <Switch
                  value={opt.isActive}
                  onValueChange={() => toggleOption(opt.id)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={"#ffffff"}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              )}
              <View className="flex-1">
                <Text
                  className="text-base font-bold mb-0.5"
                  style={{ color: opt.isActive ? theme.text : theme.muted }}
                  numberOfLines={1}
                >
                  {opt.value}
                </Text>
                {opt.subValue ? (
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.muted }}
                    numberOfLines={1}
                  >
                    {opt.subValue}
                  </Text>
                ) : null}
              </View>
            </Pressable>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => openEditor(opt)}
                hitSlop={10}
                className="p-2"
              >
                <Feather name="edit-2" size={18} color={theme.primary} />
              </Pressable>
              {options.length > 1 && (
                <Pressable
                  onPress={() => handleDelete(opt.id, opt.value)}
                  hitSlop={10}
                  className="p-2"
                >
                  <Feather name="trash-2" size={18} color={theme.danger} />
                </Pressable>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* EDITOR MODAL */}
      {isEditorOpen && (
        <View
          className="absolute inset-0 justify-center items-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", paddingTop: insets.top }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%", maxWidth: 400 }}
          >
            <Card
              variant="default"
              className="p-0 rounded-3xl border-0 shadow-lg overflow-hidden"
              style={{ maxHeight: "75%" }}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 30 }}
              >
                <Text
                  className="text-xl font-black mb-4"
                  style={{ color: theme.text }}
                >
                  {editingOption
                    ? `Edit ${section.title}`
                    : `Add ${section.title}`}
                </Text>
                {fieldError ? (
                  <Text
                    className="mb-3 text-sm font-semibold"
                    style={{ color: theme.danger }}
                  >
                    {fieldError}
                  </Text>
                ) : null}

                {isAddressSection ? (
                  isAdmin && editingOption ? (
                    <>
                      <Text
                        className="text-xs font-bold mb-1 uppercase"
                        style={{ color: theme.muted }}
                      >
                        Area
                      </Text>
                      <TextInput
                        placeholder="Area"
                        placeholderTextColor={theme.muted}
                        value={addressLine}
                        onChangeText={updateAddressLine}
                        onBlur={() => setAddressLine(addressLine.trim())}
                        className="px-4 rounded-xl mb-4 font-bold"
                        style={{
                          borderColor: theme.danger,
                          borderWidth: fieldError ? 2 : 0,
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
                        Phone
                      </Text>
                      <TextInput
                        placeholder="Phone number"
                        placeholderTextColor={theme.muted}
                        value={thirdVal}
                        onChangeText={setThirdVal}
                        keyboardType="phone-pad"
                        className="px-4 rounded-xl mb-6 font-bold"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.text,
                          fontSize: 16,
                          height: 52,
                        }}
                      />
                    </>
                  ) : (
                  <>
                    <Text
                      className="text-xs font-bold mb-2 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Fetch Location from Device GPS
                    </Text>
                    <View className="flex-row gap-2 mb-4">
                      <Pressable
                        onPress={fetchCurrentLocation}
                        className="flex-1 p-3 rounded-xl items-center justify-center border border-dashed"
                        style={{
                          borderColor: theme.primary,
                          backgroundColor: theme.card,
                        }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: theme.primary }}
                        >
                          📍 Get Current GPS Location
                        </Text>
                      </Pressable>
                    </View>

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Captured Coordinates
                    </Text>
                    <TextInput
                      placeholder="Latitude, Longitude..."
                      placeholderTextColor={theme.muted}
                      value={gpsCoordinates}
                      onChangeText={setGpsCoordinates}
                      className="px-4 rounded-xl mb-4 font-semibold text-xs"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.muted,
                        height: 44,
                      }}
                      editable={false}
                    />

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      User Readable Address (Street, Landmark, Floor)
                    </Text>
                    <TextInput
                      placeholder="e.g. Plot 15, Cyber Towers Lane..."
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={updateAddressLine}
                      onBlur={() => setAddressLine(addressLine.trim())}
                      multiline
                      className="px-4 py-3 rounded-xl mb-6 font-bold"
                      style={{
                        borderColor: theme.danger,
                        borderWidth: fieldError ? 2 : 0,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 80,
                        textAlignVertical: "top",
                      }}
                    />
                  </>
                  )
                ) : isTaxSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      {isAdmin ? "CGST Percentage (%) *" : "GST Percentage (%) *"}
                    </Text>
                    <TextInput
                      placeholder="e.g. 2.5"
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={(value) => {
                        setAddressLine(value);
                        if (taxErrors.first) {
                          setTaxErrors((current) => ({
                            ...current,
                            first: undefined,
                          }));
                        }
                      }}
                      onBlur={() => setAddressLine(addressLine.trim())}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: taxErrors.first
                          ? theme.danger
                          : theme.border,
                        borderWidth: taxErrors.first ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {taxErrors.first ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {taxErrors.first}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}
                    {isAdmin ? (
                      <>
                        <Text
                          className="text-xs font-bold mb-1 uppercase"
                          style={{ color: theme.muted }}
                        >
                          SGST Percentage (%) *
                        </Text>
                        <TextInput
                          placeholder="e.g. 2.5"
                          placeholderTextColor={theme.muted}
                          value={gpsCoordinates}
                          onChangeText={(value) => {
                            setGpsCoordinates(value);
                            if (taxErrors.second) {
                              setTaxErrors((current) => ({
                                ...current,
                                second: undefined,
                              }));
                            }
                          }}
                          onBlur={() =>
                            setGpsCoordinates(gpsCoordinates.trim())
                          }
                          keyboardType="numeric"
                          className="px-4 rounded-xl mb-1 font-bold"
                          style={{
                            borderColor: taxErrors.second
                              ? theme.danger
                              : theme.border,
                            borderWidth: taxErrors.second ? 2 : 1,
                            backgroundColor: theme.bg,
                            color: theme.text,
                            fontSize: 16,
                            height: 52,
                          }}
                        />
                        {taxErrors.second ? (
                          <Text
                            className="mb-3 text-xs font-semibold"
                            style={{ color: theme.danger }}
                          >
                            {taxErrors.second}
                          </Text>
                        ) : (
                          <View className="mb-3" />
                        )}
                        <View className="p-3 mb-6 rounded-xl bg-black/5 dark:bg-white/5 flex-row justify-between items-center">
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.muted }}
                          >
                            Calculated Total GST:
                          </Text>
                          <Text
                            className="text-sm font-black"
                            style={{ color: theme.primary }}
                          >
                            {(parseFloat(addressLine) || 0) +
                              (parseFloat(gpsCoordinates) || 0)}
                            %
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </>
                ) : isChargesSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Packaging Charge (₹)
                    </Text>
                    <TextInput
                      placeholder="e.g. 20"
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={(value) =>
                        updateChargeValue("packaging", value, setAddressLine)
                      }
                      onBlur={() => setAddressLine(addressLine.trim())}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: chargeErrors.packaging
                          ? theme.danger
                          : theme.border,
                        borderWidth: chargeErrors.packaging ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {chargeErrors.packaging ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {chargeErrors.packaging}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Platform Fee (₹)
                    </Text>
                    <TextInput
                      placeholder="e.g. 10"
                      placeholderTextColor={theme.muted}
                      value={gpsCoordinates}
                      onChangeText={(value) =>
                        updateChargeValue("platform", value, setGpsCoordinates)
                      }
                      onBlur={() =>
                        setGpsCoordinates(gpsCoordinates.trim())
                      }
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: chargeErrors.platform
                          ? theme.danger
                          : theme.border,
                        borderWidth: chargeErrors.platform ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {chargeErrors.platform ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {chargeErrors.platform}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Base Delivery Fee (₹)
                    </Text>
                    <TextInput
                      placeholder="e.g. 30"
                      placeholderTextColor={theme.muted}
                      value={thirdVal}
                      onChangeText={(value) =>
                        updateChargeValue("delivery", value, setThirdVal)
                      }
                      onBlur={() => setThirdVal(thirdVal.trim())}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: chargeErrors.delivery
                          ? theme.danger
                          : theme.border,
                        borderWidth: chargeErrors.delivery ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {chargeErrors.delivery ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {chargeErrors.delivery}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <View className="p-3 mb-6 rounded-xl bg-black/5 dark:bg-white/5 flex-row justify-between items-center">
                      <Text
                        className="text-xs font-bold"
                        style={{ color: theme.muted }}
                      >
                        Total Additional Charges:
                      </Text>
                      <Text
                        className="text-sm font-black"
                        style={{ color: theme.primary }}
                      >
                        ₹
                        {(parseFloat(addressLine) || 0) +
                          (parseFloat(gpsCoordinates) || 0) +
                          (parseFloat(thirdVal) || 0)}
                      </Text>
                    </View>
                  </>
                ) : isDeliverySection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Delivery Type Title *
                    </Text>
                    <TextInput
                      placeholder="e.g. Express, Standard, Eco Saver"
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={(value) => {
                        updateAddressLine(value);
                        if (deliveryErrors.name) {
                          setDeliveryErrors((current) => ({
                            ...current,
                            name: undefined,
                          }));
                        }
                      }}
                      onBlur={() => setAddressLine(addressLine.trim())}
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: deliveryErrors.name
                          ? theme.danger
                          : theme.border,
                        borderWidth: deliveryErrors.name ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {deliveryErrors.name ? (
                      <Text className="mb-3 text-xs font-semibold" style={{ color: theme.danger }}>
                        {deliveryErrors.name}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Price / Fee (₹) [Use -10 for discounts] *
                    </Text>
                    <TextInput
                      placeholder="e.g. 29, 0, -10"
                      placeholderTextColor={theme.muted}
                      value={gpsCoordinates}
                      onChangeText={(value) => {
                        setGpsCoordinates(value);
                        if (deliveryErrors.price) {
                          setDeliveryErrors((current) => ({
                            ...current,
                            price: undefined,
                          }));
                        }
                      }}
                      onBlur={() => setGpsCoordinates(gpsCoordinates.trim())}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: deliveryErrors.price
                          ? theme.danger
                          : theme.border,
                        borderWidth: deliveryErrors.price ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {deliveryErrors.price ? (
                      <Text className="mb-3 text-xs font-semibold" style={{ color: theme.danger }}>
                        {deliveryErrors.price}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Subtitle Description *
                    </Text>
                    <TextInput
                      key={editingOption?.id ?? "new-delivery-option"}
                      ref={deliveryDescriptionRef}
                      placeholder="e.g. Fastest delivery, directly to you!"
                      placeholderTextColor={theme.muted}
                      value={thirdVal}
                      onChangeText={(value) => {
                        setThirdVal(value);
                        if (deliveryErrors.description) {
                          setDeliveryErrors((current) => ({
                            ...current,
                            description: undefined,
                          }));
                        }
                      }}
                      onBlur={() => setThirdVal(thirdVal.trim())}
                      onFocus={() => {
                        const end = thirdVal.length;
                        requestAnimationFrame(() => {
                          deliveryDescriptionRef.current?.setNativeProps({
                            selection: { start: end, end },
                          });
                        });
                      }}
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: deliveryErrors.description
                          ? theme.danger
                          : theme.border,
                        borderWidth: deliveryErrors.description ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {deliveryErrors.description ? (
                      <Text className="mb-3 text-xs font-semibold" style={{ color: theme.danger }}>
                        {deliveryErrors.description}
                      </Text>
                    ) : (
                      <View className="mb-3" />
                    )}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Estimated Time Range *
                    </Text>
                    <TextInput
                      placeholder="e.g. 20-25 mins"
                      placeholderTextColor={theme.muted}
                      value={fourthVal}
                      onChangeText={(value) => {
                        setFourthVal(value);
                        if (deliveryErrors.time) {
                          setDeliveryErrors((current) => ({
                            ...current,
                            time: undefined,
                          }));
                        }
                      }}
                      onBlur={() => setFourthVal(fourthVal.trim())}
                      className="px-4 rounded-xl mb-1 font-bold"
                      style={{
                        borderColor: deliveryErrors.time
                          ? theme.danger
                          : theme.border,
                        borderWidth: deliveryErrors.time ? 2 : 1,
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {deliveryErrors.time ? (
                      <Text className="mb-3 text-xs font-semibold" style={{ color: theme.danger }}>
                        {deliveryErrors.time}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    {isWifiSection ? (
                      <>
                        <Text
                          className="text-xs font-bold mb-1 uppercase"
                          style={{ color: theme.muted }}
                        >
                          Network SSID (Name) *
                        </Text>
                        <TextInput
                          placeholder="Network SSID (Name)..."
                          placeholderTextColor={theme.muted}
                          value={addressLine}
                          onChangeText={(value) => {
                            updateAddressLine(value);
                            if (wifiErrors.name) {
                              setWifiErrors((current) => ({
                                ...current,
                                name: undefined,
                              }));
                            }
                          }}
                          onBlur={() => setAddressLine(addressLine.trim())}
                          className="px-4 rounded-xl mb-1 font-bold"
                          style={{
                            borderColor: wifiErrors.name
                              ? theme.danger
                              : theme.border,
                            borderWidth: wifiErrors.name ? 2 : 1,
                            backgroundColor: theme.bg,
                            color: theme.text,
                            fontSize: 16,
                            height: 52,
                          }}
                          autoFocus={true}
                        />
                        {wifiErrors.name ? (
                          <Text
                            className="mb-3 text-xs font-semibold"
                            style={{ color: theme.danger }}
                          >
                            {wifiErrors.name}
                          </Text>
                        ) : (
                          <View className="mb-3" />
                        )}
                        <Text
                          className="text-xs font-bold mb-1 uppercase"
                          style={{ color: theme.muted }}
                        >
                          Password *
                        </Text>
                        <TextInput
                          placeholder="Password..."
                          placeholderTextColor={theme.muted}
                          value={gpsCoordinates}
                          onChangeText={(value) => {
                            setGpsCoordinates(value);
                            if (wifiErrors.password) {
                              setWifiErrors((current) => ({
                                ...current,
                                password: undefined,
                              }));
                            }
                          }}
                          onBlur={() =>
                            setGpsCoordinates(gpsCoordinates.trim())
                          }
                          className="px-4 rounded-xl mb-1 font-semibold"
                          style={{
                            borderColor: wifiErrors.password
                              ? theme.danger
                              : theme.border,
                            borderWidth: wifiErrors.password ? 2 : 1,
                            backgroundColor: theme.bg,
                            color: theme.text,
                            fontSize: 16,
                            height: 52,
                          }}
                        />
                        {wifiErrors.password ? (
                          <Text
                            className="mb-3 text-xs font-semibold"
                            style={{ color: theme.danger }}
                          >
                            {wifiErrors.password}
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      <TextInput
                        placeholder="Enter Name"
                        placeholderTextColor={theme.muted}
                        value={addressLine}
                        onChangeText={updateAddressLine}
                        onBlur={() => setAddressLine(addressLine.trim())}
                        className="px-4 rounded-xl mb-4 font-bold"
                        style={{
                          borderColor: theme.danger,
                          borderWidth: fieldError ? 2 : 0,
                          backgroundColor: theme.bg,
                          color: theme.text,
                          fontSize: 16,
                          height: 52,
                        }}
                        autoFocus={true}
                      />
                    )}
                  </>
                )}

                <View className="flex-row justify-end gap-3 mt-2">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsEditorOpen(false)}
                    className="py-3 px-6"
                  />
                  <Button
                    title={saving ? "Saving..." : "Save"}
                    onPress={handleSave}
                    disabled={saving}
                    className="py-3 px-8"
                  />
                </View>
              </ScrollView>
            </Card>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}
