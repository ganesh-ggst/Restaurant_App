import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import {
  MANAGER_MOCK_DATA,
  StoreDetailOption,
} from "../../../../../constants/managerMockData";
import { useAppTheme } from "../../../../../hooks/useAppTheme";

export default function StoreDetailDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const sectionIndex = MANAGER_MOCK_DATA.storeDetails.findIndex(
    (s) => s.id === id,
  );
  const section = MANAGER_MOCK_DATA.storeDetails[sectionIndex];

  const [options, setOptions] = useState<StoreDetailOption[]>(
    section?.options || [],
  );
  const [editingOption, setEditingOption] = useState<StoreDetailOption | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [addressLine, setAddressLine] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [thirdVal, setThirdVal] = useState("");
  const [fourthVal, setFourthVal] = useState("");

  if (!section) {
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
        "Could not fetch current location. Please ensure GPS is enabled.",
      );
    }
  };

  const toggleOption = (optionId: string) => {
    if (section.selectionType === "single") {
      section.options.forEach((opt) => (opt.isActive = opt.id === optionId));
    } else {
      const opt = section.options.find((o) => o.id === optionId);
      if (opt) opt.isActive = !opt.isActive;
    }
    MANAGER_MOCK_DATA.storeDetails[sectionIndex] = { ...section };
    setOptions([...section.options]);
  };

  const openEditor = (opt?: StoreDetailOption) => {
    setEditingOption(opt || null);
    if (isTaxSection && opt) {
      setAddressLine(opt.value ? opt.value.replace("%", "") : "");
      setGpsCoordinates(
        opt.subValue ? opt.subValue.replace(/[^0-9.]/g, "") : "",
      );
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
      setAddressLine(packMatch ? packMatch[1] : "");
      setGpsCoordinates(platMatch ? platMatch[1] : "");
      setThirdVal(delMatch ? delMatch[1] : "");
      setFourthVal("");
    } else if (isDeliverySection && opt) {
      setAddressLine(opt.value ? opt.value.split(" ")[0] : "");
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

  const handleSave = () => {
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

    if (editingOption) {
      const idx = section.options.findIndex((o) => o.id === editingOption.id);
      if (idx > -1) {
        section.options[idx].value = finalValue;
        section.options[idx].subValue = finalSubValue;
      }
    } else {
      const isSingle = section.selectionType === "single";
      if (isSingle) {
        section.options.forEach((o) => (o.isActive = false));
      }

      section.options.unshift({
        id: `opt_${Date.now()}`,
        value: finalValue,
        subValue:
          finalSubValue ||
          (isAddressSection ? "GPS: 17.4483° N, 78.3915° E" : ""),
        isActive: true,
      });
    }

    MANAGER_MOCK_DATA.storeDetails[sectionIndex] = { ...section };
    setOptions([...section.options]);
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
        onPress: () => {
          section.options = section.options.filter((o) => o.id !== optionId);
          if (
            !section.options.some((o) => o.isActive) &&
            section.options.length > 0
          ) {
            section.options[0].isActive = true;
          }
          MANAGER_MOCK_DATA.storeDetails[sectionIndex] = { ...section };
          setOptions([...section.options]);
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
          className="px-3 py-1.5 rounded-xl"
          style={{ backgroundColor: theme.primary }}
        >
          <Text className="text-xs font-bold text-white">+ Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {options.map((opt) => (
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
                          : "Enter value..."
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
                    title="Save"
                    onPress={handleSave}
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
