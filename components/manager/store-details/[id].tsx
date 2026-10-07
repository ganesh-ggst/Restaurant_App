import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MANAGER_MOCK_DATA,
  StoreDetailOption,
  StoreDetailSection,
} from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { adminProfileApi } from "../../../services/api/admin-profile";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import {
  createMockProfileItemId,
  getStoreDetailDefinition,
  mapAdminStoreDetailSection,
  updateMockStoreDetailOptions,
} from "../adminProfileSections";

export default function StoreDetailDetailComponent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = segments[0] === "(admin)";

  const sectionIndex = isAdmin
    ? -1
    : MANAGER_MOCK_DATA.storeDetails.findIndex((s) => s.id === id);
  const mockSection = isAdmin
    ? undefined
    : MANAGER_MOCK_DATA.storeDetails[sectionIndex];

  const [options, setOptions] = useState<StoreDetailOption[]>(
    mockSection?.options || [],
  );
  const [adminSection, setAdminSection] = useState<StoreDetailSection>();
  const [loading, setLoading] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [editingOption, setEditingOption] = useState<StoreDetailOption | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [addressLine, setAddressLine] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [thirdVal, setThirdVal] = useState("");
  const [fourthVal, setFourthVal] = useState("");
  const section = isAdmin ? adminSection : mockSection;

  useEffect(() => {
    if (!isAdmin || !id) return;
    const definition = getStoreDetailDefinition(id);
    if (!definition) return;

    let isCurrent = true;
    adminProfileApi
      .getStoreDetailSection(definition.key)
      .then((data) => {
        if (!isCurrent) return;
        const nextSection = mapAdminStoreDetailSection(id, data);
        if (nextSection) {
          setAdminSection(nextSection);
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
    if (isAdmin && loading) {
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

  const refreshAdminSection = async () => {
    if (!isAdmin) return;
    const definition = getStoreDetailDefinition(id);
    if (!definition) return;
    const data = await adminProfileApi.getStoreDetailSection(definition.key);
    const nextSection = mapAdminStoreDetailSection(id, data);
    if (nextSection) {
      setAdminSection(nextSection);
      setOptions(nextSection.options);
    }
  };

  const toggleOption = async (optionId: string) => {
    if (isAdmin) {
      const definition = getStoreDetailDefinition(id);
      const option = options.find((item) => item.id === optionId);
      if (!definition || !option) return;
      try {
        await adminProfileApi.setStoreDetailActive(
          definition.key,
          optionId,
          !option.isActive,
        );
        await refreshAdminSection();
      } catch (error) {
        Alert.alert(
          "Unable to update active store detail",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
      return;
    }

    const nextOptions =
      section.selectionType === "single"
        ? section.options.map((option) => ({
            ...option,
            isActive: option.id === optionId,
          }))
        : section.options.map((option) =>
            option.id === optionId
              ? { ...option, isActive: !option.isActive }
              : option,
          );
    updateMockStoreDetailOptions(id, nextOptions);
    setOptions(nextOptions);
  };

  const openEditor = (opt?: StoreDetailOption) => {
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
      setAddressLine(opt.value || "");
      setGpsCoordinates(opt.subValue || "");
      setThirdVal("");
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
    if (!addressLine.trim() && !isChargesSection && !isDeliverySection) {
      Alert.alert("Error", "Please enter a valid value.");
      return;
    }

    let finalValue = addressLine.trim();
    let finalSubValue = gpsCoordinates.trim();

    if (isTaxSection) {
      const cgst = parseFloat(addressLine) || 0;
      const sgst = parseFloat(gpsCoordinates) || 0;
      const total = cgst + sgst;
      finalValue = `${total}%`;
      finalSubValue = `CGST: ${cgst}% + SGST: ${sgst}%`;
    } else if (isChargesSection) {
      const packaging = parseFloat(addressLine) || 0;
      const platform = parseFloat(gpsCoordinates) || 0;
      const delivery = parseFloat(thirdVal) || 0;
      finalValue = `Packaging: ₹${packaging} | Platform: ₹${platform} | Delivery: ₹${delivery}`;
      finalSubValue = `Packaging Charge: ₹${packaging}, Platform Fee: ₹${platform}, Base Delivery Fee: ₹${delivery}`;
    } else if (isDeliverySection) {
      const title = addressLine.trim();
      const price = parseFloat(gpsCoordinates) || 0;
      const subtitle = thirdVal.trim();
      const time = fourthVal.trim();

      const priceDisplay =
        price === 0 ? "Free" : price > 0 ? `₹${price}` : `-₹${Math.abs(price)}`;
      finalValue = `${title} (${priceDisplay})`;
      finalSubValue = `${subtitle} • ${time}`;
    }

    if (isAdmin) {
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
          await adminProfileApi.updateStoreDetail(
            definition.key,
            editingOption.id,
            body,
          );
        } else {
          await adminProfileApi.createStoreDetail(definition.key, body);
        }
        await refreshAdminSection();
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

    const nextOptions = editingOption
      ? section.options.map((option) =>
          option.id === editingOption.id
            ? { ...option, value: finalValue, subValue: finalSubValue }
            : option,
        )
      : [
          {
            id: createMockProfileItemId(),
            value: finalValue,
            subValue:
              finalSubValue ||
              (isAddressSection ? "GPS: 17.4483° N, 78.3915° E" : ""),
            isActive: true,
          },
          ...(section.selectionType === "single"
            ? section.options.map((option) => ({
                ...option,
                isActive: false,
              }))
            : section.options),
        ];

    updateMockStoreDetailOptions(id, nextOptions);
    setOptions(nextOptions);
    setIsEditorOpen(false);
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
            await refreshAdminSection();
          } catch (error) {
            Alert.alert(
              "Unable to delete store detail",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
          return;
        }

        let nextOptions = section.options.filter(
          (option) => option.id !== optionId,
        );
        if (
          !nextOptions.some((option) => option.isActive) &&
          nextOptions.length > 0
        ) {
          nextOptions = nextOptions.map((option, index) => ({
            ...option,
            isActive: index === 0,
          }));
        }
        updateMockStoreDetailOptions(id, nextOptions);
        setOptions(nextOptions);
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

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
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

                {isAddressSection ? (
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
                      onChangeText={setAddressLine}
                      multiline
                      className="px-4 py-3 rounded-xl mb-6 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 80,
                        textAlignVertical: "top",
                      }}
                    />
                  </>
                ) : isTaxSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      CGST Percentage (%)
                    </Text>
                    <TextInput
                      placeholder="e.g. 2.5"
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={setAddressLine}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      SGST Percentage (%)
                    </Text>
                    <TextInput
                      placeholder="e.g. 2.5"
                      placeholderTextColor={theme.muted}
                      value={gpsCoordinates}
                      onChangeText={setGpsCoordinates}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-6 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />

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
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Description
                    </Text>
                    <TextInput
                      placeholder="Optional charge description"
                      placeholderTextColor={theme.muted}
                      value={fourthVal}
                      onChangeText={setFourthVal}
                      className="px-4 rounded-xl mb-6 font-semibold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
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
                      onChangeText={setAddressLine}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />

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
                      onChangeText={setGpsCoordinates}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
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
                      Base Delivery Fee (₹)
                    </Text>
                    <TextInput
                      placeholder="e.g. 30"
                      placeholderTextColor={theme.muted}
                      value={thirdVal}
                      onChangeText={setThirdVal}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-6 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />

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
                      Delivery Type Title
                    </Text>
                    <TextInput
                      placeholder="e.g. Express, Standard, Eco Saver"
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={setAddressLine}
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Price / Fee (₹) [Use -10 for discounts]
                    </Text>
                    <TextInput
                      placeholder="e.g. 29, 0, -10"
                      placeholderTextColor={theme.muted}
                      value={gpsCoordinates}
                      onChangeText={setGpsCoordinates}
                      keyboardType="numeric"
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
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
                      Subtitle Description
                    </Text>
                    <TextInput
                      placeholder="e.g. Fastest delivery, directly to you!"
                      placeholderTextColor={theme.muted}
                      value={thirdVal}
                      onChangeText={setThirdVal}
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
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
                      Estimated Time Range
                    </Text>
                    <TextInput
                      placeholder="e.g. 20-25 mins"
                      placeholderTextColor={theme.muted}
                      value={fourthVal}
                      onChangeText={setFourthVal}
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
                    <TextInput
                      placeholder={
                        id === "sd_wifi"
                          ? "Network SSID (Name)..."
                          : "Enter Name"
                      }
                      placeholderTextColor={theme.muted}
                      value={addressLine}
                      onChangeText={setAddressLine}
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {id === "sd_wifi" && (
                      <TextInput
                        placeholder="Password..."
                        placeholderTextColor={theme.muted}
                        value={gpsCoordinates}
                        onChangeText={setGpsCoordinates}
                        className="px-4 rounded-xl mb-6 font-semibold"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.text,
                          fontSize: 16,
                          height: 52,
                        }}
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
