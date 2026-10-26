import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import {
  OperationsMenuItem,
  operationsApi,
} from "../../../../services/api/operations";
import { operationsCache } from "../../../../services/api/operations-cache";

export default function EditCrossSellScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id, triggerCategoryId } = useLocalSearchParams<{
    id: string;
    triggerCategoryId?: string;
  }>();
  const isNewItem = id === "new";
  const [item, setItem] = useState<OperationsMenuItem | null>(null);
  const [loading, setLoading] = useState(!isNewItem);
  const [saving, setSaving] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [foodType, setFoodType] = useState<"veg" | "non_veg">("veg");
  const hasLoadedItem = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isNewItem) {
        setLoading(false);
        return;
      }
      let isCurrent = true;
      if (!hasLoadedItem.current) setLoading(true);
      (async () => {
        const crossSells = triggerCategoryId
          ? await operationsApi.getCrossSells(triggerCategoryId)
          : [];
        let found = crossSells.find((candidate) => candidate._id === id);
        if (!found) {
          const candidates = await operationsApi.getInventoryCandidates();
          found = candidates.find(
            (candidate) =>
              candidate._id === id && candidate.isCrossSellOnly,
          );
        }
        if (!found) throw new Error("This cross-sell item was not found.");
        if (!isCurrent) return;
        hasLoadedItem.current = true;
        setItem(found);
        setName(found.name);
        setDescription(found.description || "");
        setPrice(String(found.price));
        setQuantity(
          found.availableQuantity === undefined
            ? ""
            : String(found.availableQuantity),
        );
        setImageUrl(found.imageUrl || "");
        setImagePreviewFailed(false);
        setFoodType(found.foodType === "non_veg" ? "non_veg" : "veg");
      })()
        .catch((error: unknown) => {
          if (isCurrent) {
            Alert.alert(
              "Unable to load cross-sell item",
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
    }, [id, isNewItem, triggerCategoryId]),
  );

  const pickImage = async (source: "camera" | "gallery") => {
    if (uploadingImage) return;
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access required",
            "Allow camera access to take a cross-sell photo.",
          );
          return;
        }
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Photo access required",
            "Allow photo library access to attach a cross-sell image.",
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      setUploadingImage(true);
      const mimeType = asset.mimeType || "image/jpeg";
      const extension = mimeType.split("/")[1] || "jpg";
      const uploadedUrls = await operationsApi.uploadMenuImages(
        [
          {
            uri: asset.uri,
            fileName:
              asset.fileName || `cross-sell-${Date.now()}.${extension}`,
            mimeType,
          },
        ],
        "cross-sells",
      );
      setImageUrl(uploadedUrls[0]);
      setImagePreviewFailed(false);
    } catch (error) {
      Alert.alert(
        "Unable to attach image",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    if (!name.trim()) {
      Alert.alert("Name required", "Enter a name for this cross-sell item.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert("Invalid price", "Enter a price greater than zero.");
      return;
    }
    if (
      !quantity.trim() ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 0
    ) {
      Alert.alert("Invalid quantity", "Enter a non-negative whole number for available quantity.");
      return;
    }
    if (!imageUrl.trim()) {
      Alert.alert(
        "Image required",
        "Attach an image from your gallery or camera.",
      );
      return;
    }
    if (isNewItem && !triggerCategoryId) {
      Alert.alert("Category required", "Choose a category before adding a cross-sell item.");
      return;
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      foodType,
      price: numericPrice,
      availableQuantity: numericQuantity,
      imageUrl: imageUrl.trim(),
    };
    setSaving(true);
    try {
      if (isNewItem) {
        await operationsApi.createCrossSell(triggerCategoryId!, body);
      } else {
        await operationsApi.updateCrossSell(id, body);
      }
      const resolvedCategoryId =
        triggerCategoryId ||
        (typeof item?.categoryId === "string"
          ? item.categoryId
          : item?.categoryId?._id);
      operationsCache.invalidateCategory(resolvedCategoryId);
      operationsCache.invalidateCategories();
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to save cross-sell item",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: "default" | "numeric" = "default",
    multiline = false,
    required = false,
    invalid = false,
  ) => (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase" style={{ color: theme.muted }}>
        {label}
        {required ? (
          <Text style={{ color: theme.danger }}> *</Text>
        ) : (
          <Text style={{ color: theme.muted }}> (Optional)</Text>
        )}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        className="rounded-xl border px-4 py-3"
        style={{
          backgroundColor: theme.card,
          borderColor: invalid ? theme.danger : theme.border,
          borderWidth: invalid ? 2 : 1,
          color: invalid ? theme.danger : theme.text,
          minHeight: multiline ? 88 : 48,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
      {invalid ? (
        <Text className="mt-1 text-xs font-semibold" style={{ color: theme.danger }}>
          {label === "Cross-sell name"
            ? "Name is required."
            : label === "Regular price (₹)"
              ? "Enter a price greater than zero."
              : "Enter a non-negative whole number."}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <View
        className="flex-row items-center border-b px-5 py-4"
        style={{ borderBottomColor: theme.border }}
      >
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-2xl" style={{ color: theme.text }}>←</Text>
        </Pressable>
        <Text className="text-xl font-bold" style={{ color: theme.text }}>
          {isNewItem ? "Add Cross-sell" : "Edit Cross-sell"}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          className="flex-1 px-5 pt-5"
          contentContainerStyle={{ paddingBottom: 44 }}
          enableOnAndroid
          enableAutomaticScroll
          enableResetScrollToCoords={false}
          extraScrollHeight={8}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-2 text-xs font-black uppercase" style={{ color: theme.muted }}>
            Image *
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            {imageUrl ? (
              <View className="mb-4 self-start">
                {imagePreviewFailed ? (
                  <View
                    className="items-center justify-center rounded-xl"
                    style={{
                      width: 128,
                      height: 96,
                      backgroundColor: theme.secondaryBg,
                    }}
                  >
                    <Feather name="image" size={24} color={theme.muted} />
                    <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                      Preview unavailable
                    </Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: imageUrl }}
                    resizeMode="cover"
                    style={{
                      width: 128,
                      height: 96,
                      borderRadius: 12,
                      backgroundColor: theme.secondaryBg,
                    }}
                    onError={() => setImagePreviewFailed(true)}
                    accessibilityLabel="Cross-sell image preview"
                  />
                )}
                <Pressable
                  onPress={() => {
                    setImageUrl("");
                    setImagePreviewFailed(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove cross-sell image"
                  hitSlop={8}
                  className="absolute right-1 top-1 rounded-full p-1"
                  style={{ backgroundColor: theme.card }}
                >
                  <Feather name="x-circle" size={20} color={theme.danger} />
                </Pressable>
              </View>
            ) : null}
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => void pickImage("gallery")}
                disabled={uploadingImage}
                className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3"
                style={{
                  borderColor:
                    hasAttemptedSave && !imageUrl.trim()
                      ? theme.danger
                      : theme.border,
                  borderWidth: hasAttemptedSave && !imageUrl.trim() ? 2 : 1,
                }}
              >
                <Feather name="image" size={16} color={theme.primary} />
                <Text className="ml-2 text-sm font-bold" style={{ color: theme.primary }}>
                  Gallery
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void pickImage("camera")}
                disabled={uploadingImage}
                className="flex-1 flex-row items-center justify-center rounded-xl border px-3 py-3"
                style={{
                  borderColor:
                    hasAttemptedSave && !imageUrl.trim()
                      ? theme.danger
                      : theme.border,
                  borderWidth: hasAttemptedSave && !imageUrl.trim() ? 2 : 1,
                }}
              >
                <Feather name="camera" size={16} color={theme.primary} />
                <Text className="ml-2 text-sm font-bold" style={{ color: theme.primary }}>
                  Camera
                </Text>
              </Pressable>
            </View>
            {hasAttemptedSave && !imageUrl.trim() ? (
              <Text className="mt-2 text-xs font-semibold" style={{ color: theme.danger }}>
                Add an image to continue.
              </Text>
            ) : null}
            {uploadingImage ? (
              <View className="mt-4 flex-row items-center justify-center">
                <ActivityIndicator size="small" color={theme.primary} />
                <Text className="ml-2 text-sm" style={{ color: theme.muted }}>
                  Uploading image...
                </Text>
              </View>
            ) : null}
          </Card>

          <Text className="mb-2 text-xs font-black uppercase" style={{ color: theme.muted }}>
            Details *
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            <Text className="mb-2 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Dietary preference <Text style={{ color: theme.danger }}>*</Text>
            </Text>
            <View className="mb-4 flex-row gap-2">
              {(["veg", "non_veg"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFoodType(type)}
                  className="flex-1 items-center rounded-xl border py-4"
                  style={{
                    backgroundColor: foodType === type ? theme.primary : theme.card,
                    borderColor: foodType === type ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: foodType === type ? "#fff" : theme.text }}
                  >
                    {type === "veg" ? "🟢 Veg" : "🔴 Non-Veg"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {field(
              "Cross-sell name",
              name,
              setName,
              "e.g. Refreshing drink",
              "default",
              false,
              true,
              hasAttemptedSave && !name.trim(),
            )}
            {field("Description", description, setDescription, "Describe this item", "default", true)}
            {field(
              "Regular price (₹)",
              price,
              setPrice,
              "0",
              "numeric",
              false,
              true,
              hasAttemptedSave &&
                (!Number.isFinite(Number(price)) || Number(price) <= 0),
            )}
            {field(
              "Available quantity",
              quantity,
              setQuantity,
              "e.g. 30",
              "numeric",
              false,
              true,
              hasAttemptedSave &&
                (!quantity.trim() ||
                  !Number.isInteger(Number(quantity)) ||
                  Number(quantity) < 0),
            )}
          </Card>

          <Button
            title={isNewItem ? "Publish Cross-Sell Item" : "Save Changes"}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving || (!isNewItem && !item)}
            className="mb-8"
          />
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}
