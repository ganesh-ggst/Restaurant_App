import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function EditCrossSellScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const { id, triggerCategoryId } = useLocalSearchParams<{
    id: string;
    triggerCategoryId?: string;
  }>();

  const isNewItem = id === "new";

  const existingItemIndex = MANAGER_MOCK_DATA.foodItems.findIndex(
    (item) => item.id === id,
  );
  const initialItem =
    existingItemIndex > -1
      ? MANAGER_MOCK_DATA.foodItems[existingItemIndex]
      : {
          name: "",
          description: "",
          price: 0,
          offerPrice: null,
          coupon: "",
          quantity: null,
          isAvailable: true,
          images: [],
          dietaryPreference: "veg" as const,
          prepTime: "15 mins",
        };

  const [images, setImages] = useState<string[]>(
    isNewItem ? [] : (initialItem as any).images || ["mock_existing_image"],
  );
  const [itemName, setItemName] = useState(initialItem.name);
  const [itemDescription, setItemDescription] = useState(
    (initialItem as any).description || "Recommended add-on item",
  );
  const [itemPrice, setItemPrice] = useState(
    initialItem.price ? initialItem.price.toString() : "",
  );
  const [itemOfferPrice, setItemOfferPrice] = useState(
    (initialItem as any).offerPrice && (initialItem as any).offerPrice > 0
      ? (initialItem as any).offerPrice.toString()
      : "",
  );
  const [itemQuantity, setItemQuantity] = useState(
    (initialItem as any).quantity !== null &&
      (initialItem as any).quantity !== undefined
      ? (initialItem as any).quantity.toString()
      : "",
  );
  const [dietaryPreference, setDietaryPreference] = useState<"veg" | "non-veg">(
    (initialItem as any).dietaryPreference || "veg",
  );
  const [isSaving, setIsSaving] = useState(false);

  const parsedOfferPrice =
    itemOfferPrice.trim() !== "" ? parseInt(itemOfferPrice) : NaN;
  const isOfferInvalid =
    !isNaN(parsedOfferPrice) &&
    parsedOfferPrice > 0 &&
    parsedOfferPrice >= Number(itemPrice);

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "We need access to your gallery.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "We need access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleAddMedia = () => {
    Alert.alert("Upload Media", "Choose an option to add a photo.", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSaveChanges = () => {
    if (images.length === 0)
      return Alert.alert("Missing Media", "At least 1 image is mandatory.");

    const regPrice = parseInt(itemPrice) || 0;
    const offPrice =
      itemOfferPrice.trim() !== "" &&
      !isNaN(parseInt(itemOfferPrice)) &&
      parseInt(itemOfferPrice) > 0
        ? parseInt(itemOfferPrice)
        : null;
    const qty = itemQuantity.trim() ? parseInt(itemQuantity) : null;

    if (!itemName.trim() || regPrice <= 0 || qty === null || qty < 0) {
      return Alert.alert(
        "Missing Details",
        "Cross-Sell Name, Regular Price, and Available Quantity are mandatory.",
      );
    }

    if (isOfferInvalid) {
      return Alert.alert(
        "Invalid Price",
        "Offer Price must be less than the Regular Price.",
      );
    }

    setIsSaving(true);
    setTimeout(() => {
      if (isNewItem) {
        const newItemId = `upsell_${Date.now()}`;
        const newItem = {
          id: newItemId,
          name: itemName.trim(),
          description: itemDescription.trim(),
          images,
          dietaryPreference,
          rating: 4.5,
          prepTime: "15 mins",
          badge: { type: "none" as const, text: "" },
          price: regPrice,
          offerPrice: offPrice,
          coupon: "",
          quantity: qty,
          isAvailable: true,
          categoryId: `hidden_cross_sell_for_${triggerCategoryId}`,
          addOns: [],
          crossSellItems: [],
        };

        MANAGER_MOCK_DATA.foodItems = [newItem, ...MANAGER_MOCK_DATA.foodItems];

        if (triggerCategoryId) {
          let csList = MANAGER_MOCK_DATA.crossSellItems.find(
            (cs) => cs.triggerCategoryId === triggerCategoryId,
          );
          if (!csList) {
            csList = {
              id: `cs_list_${Date.now()}`,
              categoryName: "Recommended Extras",
              triggerCategoryId: triggerCategoryId,
              items: [],
            };
            MANAGER_MOCK_DATA.crossSellItems.push(csList);
          }
          csList.items.push(newItemId);
        }
      } else if (existingItemIndex > -1) {
        MANAGER_MOCK_DATA.foodItems[existingItemIndex] = {
          ...MANAGER_MOCK_DATA.foodItems[existingItemIndex],
          name: itemName.trim(),
          description: itemDescription.trim(),
          images,
          price: regPrice,
          offerPrice: offPrice,
          quantity: qty,
          dietaryPreference,
        };
      }
      setIsSaving(false);
      router.back();
    }, 600);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        className="flex-row items-center px-6 pt-4 pb-4 border-b"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
          hitSlop={20}
        >
          <Text className="text-2xl" style={{ color: theme.text }}>
            ←
          </Text>
        </Pressable>
        <Text className="text-2xl font-bold" style={{ color: theme.text }}>
          {isNewItem ? "Add Cross-Sell Item" : "Edit Cross-Sell"}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* MEDIA SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Media (Min 1 Mandatory){" "}
            <Text style={{ color: theme.danger }}>*</Text>
          </Text>
          {images.length === 0 ? (
            <Pressable onPress={handleAddMedia}>
              <Card
                variant="default"
                className="p-6 mb-6 rounded-3xl items-center justify-center border-dashed border-2"
                style={{ borderColor: theme.border }}
              >
                <Text className="text-3xl mb-2">📸</Text>
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.text }}
                >
                  Select from Mobile Gallery
                </Text>
              </Card>
            </Pressable>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4 flex-row"
            >
              {images.map((img, idx) => (
                <View
                  key={idx}
                  className="w-24 h-24 rounded-2xl mr-3 overflow-hidden"
                  style={{ backgroundColor: theme.border }}
                >
                  <Text className="text-3xl absolute top-6 left-7 opacity-30">
                    🍲
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveImage(idx)}
                    className="bg-red-500 w-6 h-6 items-center justify-center rounded-bl-lg absolute top-0 right-0 z-10"
                  >
                    <Text className="text-white text-xs font-bold">X</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={handleAddMedia}
                className="w-24 h-24 rounded-2xl border-dashed border-2 items-center justify-center mr-6"
                style={{ borderColor: theme.border }}
              >
                <Text className="text-2xl mb-1">📸</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* DETAILS SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Details <Text style={{ color: theme.danger }}>*</Text>
          </Text>
          <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
            {/* Dietary Preference Selection (Matching Reference UI Style) */}
            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Dietary Preference
            </Text>
            <View className="flex-row gap-3 mb-4">
              <Pressable
                onPress={() => setDietaryPreference("veg")}
                className="flex-1 py-3.5 rounded-2xl items-center flex-row justify-center gap-2"
                style={{
                  backgroundColor:
                    dietaryPreference === "veg" ? "#22c55e" : "transparent",
                  borderWidth: dietaryPreference === "veg" ? 0 : 1,
                  borderColor: theme.border,
                }}
              >
                <Text className="text-sm">🟢</Text>
                <Text
                  className="text-sm font-bold"
                  style={{
                    color: dietaryPreference === "veg" ? "#ffffff" : theme.text,
                  }}
                >
                  Veg
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDietaryPreference("non-veg")}
                className="flex-1 py-3.5 rounded-2xl items-center flex-row justify-center gap-2"
                style={{
                  backgroundColor:
                    dietaryPreference === "non-veg" ? "#22c55e" : "transparent",
                  borderWidth: dietaryPreference === "non-veg" ? 0 : 1,
                  borderColor: theme.border,
                }}
              >
                <Text className="text-sm">🔴</Text>
                <Text
                  className="text-sm font-bold"
                  style={{
                    color:
                      dietaryPreference === "non-veg" ? "#ffffff" : theme.text,
                  }}
                >
                  Non-Veg
                </Text>
              </Pressable>
            </View>

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Cross-Sell Name
            </Text>
            <TextInput
              placeholder="e.g. Refreshing Thums Up"
              placeholderTextColor={theme.muted}
              value={itemName}
              onChangeText={setItemName}
              className="px-4 rounded-xl mb-4 font-bold"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 18,
                height: 56,
                textAlignVertical: "center",
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text
                  className="text-xs font-bold mb-2 uppercase"
                  style={{ color: theme.muted }}
                >
                  Regular Price (₹) *
                </Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={theme.muted}
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="numeric"
                  className="px-4 rounded-xl font-bold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 18,
                    height: 56,
                    textAlignVertical: "center",
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                />
              </View>

              {Number(itemPrice) > 0 && (
                <View className="flex-1">
                  <Text
                    className="text-xs font-bold mb-2 uppercase"
                    style={{
                      color: isOfferInvalid ? theme.danger : theme.primary,
                    }}
                  >
                    Offer Price (₹)
                  </Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={theme.muted}
                    value={itemOfferPrice}
                    onChangeText={setItemOfferPrice}
                    keyboardType="numeric"
                    className="px-4 rounded-xl font-bold border-2"
                    style={{
                      backgroundColor: theme.bg,
                      color: isOfferInvalid ? theme.danger : theme.primary,
                      borderColor: isOfferInvalid
                        ? theme.danger
                        : theme.primary,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                  />
                  {isOfferInvalid && (
                    <Text
                      className="text-[10px] font-bold mt-1"
                      style={{ color: theme.danger }}
                    >
                      Must be less than regular
                    </Text>
                  )}
                </View>
              )}
            </View>

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Available Quantity <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <TextInput
              placeholder="e.g. 50"
              placeholderTextColor={theme.muted}
              value={itemQuantity}
              onChangeText={(text) =>
                setItemQuantity(text.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
              className="px-4 rounded-xl font-bold"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 18,
                height: 56,
                textAlignVertical: "center",
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
          </Card>

          <Button
            title={isNewItem ? "Publish Cross-Sell Item" : "Save Changes"}
            onPress={handleSaveChanges}
            loading={isSaving}
            className="py-4 mt-2"
            disabled={isOfferInvalid}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
