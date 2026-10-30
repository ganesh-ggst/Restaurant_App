import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
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
import { operationsApi } from "../../../services/api/operations";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import {
  getStorefrontDefinition,
  mapAdminStorefrontSection,
} from "../adminProfileSections";

export default function StorefrontDisplayDetailComponent() {
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingOption, setEditingOption] = useState<StoreDetailOption | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [mediaUri, setMediaUri] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const section = isAdmin ? adminSection : managerSection;

  useEffect(() => {
    if (!id) return;
    const definition = getStorefrontDefinition(id);
    if (!definition) return;

    let isCurrent = true;
    (isAdmin
      ? adminProfileApi.getStorefrontSection(definition.key, true)
      : managerProfileApi.getStorefrontSection(definition.key))
      .then((data) => {
        if (!isCurrent) return;
        const nextSection = mapAdminStorefrontSection(id, data);
        if (nextSection) {
          if (isAdmin) setAdminSection(nextSection);
          else setManagerSection(nextSection);
          setOptions(nextSection.options);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          Alert.alert(
            "Unable to load storefront section",
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
          <Text style={{ color: theme.muted }}>
            Loading storefront settings...
          </Text>
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

  const isFeaturedSection = id === "sf_featured";
  const isSingleInputSection = id === "sf_greetings" || id === "sf_search";
  const singleInputLabel =
    id === "sf_greetings" ? "Greeting Text" : "Search Placeholder";
  const singleInputPlaceholder =
    id === "sf_greetings"
      ? "e.g. Welcome to Spice Garden!"
      : "e.g. Search for 'Chicken'";
  const updateField = (
    field: string,
    value: string,
    setter: (nextValue: string) => void,
  ) => {
    setter(value);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const fieldInputStyle = (field: string) =>
    fieldErrors[field]
      ? { borderColor: theme.danger, borderWidth: 2 }
      : undefined;

  const pickFeaturedImage = async (source: "camera" | "gallery") => {
    if (uploadingImage) return;
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access required",
            "Allow camera access to take a featured-content photo.",
          );
          return;
        }
      } else {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Photo access required",
            "Allow photo library access to attach a featured-content image.",
          );
          return;
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;

      setUploadingImage(true);
      const branchId = isAdmin
        ? (await adminProfileApi.getProfile()).admin.branchId
        : (await managerProfileApi.getProfile()).manager.branchId;
      if (!branchId) {
        throw new Error(
          "Your account is not associated with a branch. Contact your administrator.",
        );
      }
      const mimeType = asset.mimeType || "image/jpeg";
      const extension = mimeType.split("/")[1] || "jpg";
      const [uploadedUrl] = await operationsApi.uploadMenuImages(
        [
          {
            uri: asset.uri,
            fileName:
              asset.fileName || `featured-content-${Date.now()}.${extension}`,
            mimeType,
          },
        ],
        "storefront-display",
        branchId,
      );
      setMediaUri(uploadedUrl);
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.mediaUri;
        return next;
      });
    } catch (error) {
      Alert.alert(
        "Unable to attach image",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const refreshSection = async () => {
    const definition = getStorefrontDefinition(id);
    if (!definition) return;
    const data = isAdmin
      ? await adminProfileApi.getStorefrontSection(definition.key, true)
      : await managerProfileApi.getStorefrontSection(definition.key);
    const nextSection = mapAdminStorefrontSection(id, data);
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
        "Unable to refresh storefront settings",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const toggleOption = async (optionId: string) => {
    const definition = getStorefrontDefinition(id);
    const option = options.find((item) => item.id === optionId);
    if (!definition || !option) return;
    try {
      if (isAdmin) {
        await adminProfileApi.setStorefrontItemActive(
          definition.key,
          optionId,
          !option.isActive,
        );
      } else {
        await managerProfileApi.setStorefrontItemActive(
          definition.key,
          optionId,
          !option.isActive,
        );
      }
      await refreshSection();
    } catch (error) {
      Alert.alert(
        "Unable to update storefront item",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const openEditor = (opt?: StoreDetailOption) => {
    setFieldErrors({});
    setEditingOption(opt || null);
    if (isFeaturedSection && opt) {
      setVal1(opt.value || "");
      const subParts = opt.subValue ? opt.subValue.split("•") : [];
      setVal2(subParts[0] ? subParts[0].trim() : "");
      setMediaUri(subParts[1] ? subParts[1].trim() : "");
    } else {
      setVal1(opt ? opt.value : "");
      setVal2(opt && opt.subValue ? opt.subValue : "");
      setMediaUri("");
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    const trimmedVal1 = val1.trim();
    const trimmedVal2 = val2.trim();
    const trimmedMediaUri = mediaUri.trim();
    setVal1(trimmedVal1);
    setVal2(trimmedVal2);
    setMediaUri(trimmedMediaUri);

    const errors: Record<string, string> = {};
    if (isFeaturedSection) {
      if (!trimmedVal1) errors.val1 = "Title is required.";
      if (!trimmedVal2) errors.val2 = "Subtitle is required.";
      if (!trimmedMediaUri) errors.mediaUri = "Featured image is required.";
      else if (!/^https?:\/\/\S+$/i.test(trimmedMediaUri)) {
        errors.mediaUri = "Attach a valid image from your gallery or camera.";
      }
    } else if (isSingleInputSection) {
      if (!trimmedVal1) errors.val1 = "Text is required.";
    } else {
      if (!trimmedVal1) errors.val1 = "This field is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (isAdmin) {
      const definition = getStorefrontDefinition(id);
      if (!definition) return;

      let body: Record<string, unknown>;
      if (id === "sf_greetings" || id === "sf_search") {
        body = { text: val1.trim() };
      } else if (isFeaturedSection) {
        body = {
          title: val1.trim(),
          subtitle: val2.trim(),
          imageUrl: mediaUri.trim(),
          ...(!editingOption ? { badge: "FEATURED", displayOrder: 1 } : {}),
        };
      } else {
        Alert.alert("Unsupported storefront section", "This section cannot be saved.");
        return;
      }

      setSaving(true);
      try {
        if (editingOption) {
          await adminProfileApi.updateStorefrontItem(
            definition.key,
            editingOption.id,
            body,
          );
        } else if (isFeaturedSection) {
          await adminProfileApi.createFeaturedContent({
            title: val1.trim(),
            subtitle: val2.trim(),
            badge: "FEATURED",
            imageUrl: mediaUri.trim(),
            displayOrder: 1,
            isActive: true,
          });
        } else {
          await adminProfileApi.createStorefrontItem(definition.key, {
            ...body,
            isActive: true,
          });
        }
        await refreshSection();
        setIsEditorOpen(false);
      } catch (error) {
        Alert.alert(
          "Unable to save storefront item",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const definition = getStorefrontDefinition(id);
    if (!definition) return;
    let body: Record<string, unknown>;
    if (id === "sf_greetings" || id === "sf_search") {
      body = { text: val1.trim() };
    } else if (isFeaturedSection) {
      body = {
        title: val1.trim(),
        subtitle: val2.trim(),
        imageUrl: mediaUri.trim(),
        ...(!editingOption ? { badge: "FEATURED", displayOrder: 1 } : {}),
      };
    } else {
      Alert.alert("Unsupported storefront section", "This section cannot be saved.");
      return;
    }

    setSaving(true);
    try {
      if (editingOption) {
        await managerProfileApi.updateStorefrontItem(
          definition.key,
          editingOption.id,
          body,
        );
      } else {
        await managerProfileApi.createStorefrontItem(definition.key, body);
      }
      await refreshSection();
      setIsEditorOpen(false);
    } catch (error) {
      Alert.alert(
        "Unable to save storefront item",
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
            const definition = getStorefrontDefinition(id);
            if (!definition) return;
            try {
              await adminProfileApi.deleteStorefrontItem(
                definition.key,
                optionId,
              );
              await refreshSection();
            } catch (error) {
              Alert.alert(
                "Unable to delete storefront item",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
            return;
          }
          const definition = getStorefrontDefinition(id);
          if (!definition) return;
          try {
            await managerProfileApi.deleteStorefrontItem(definition.key, optionId);
            await refreshSection();
          } catch (error) {
            Alert.alert(
              "Unable to delete storefront item",
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
          !isAdmin ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handlePullToRefresh()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          ) : undefined
        }
      >
        {loading ? (
          <Text
            className="text-base text-center py-8"
            style={{ color: theme.muted }}
          >
            Loading storefront settings...
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
              style={{ maxHeight: "80%" }}
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
                {isFeaturedSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Title *
                    </Text>
                    <TextInput
                      placeholder="e.g. Freshly Crafted Daily"
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={(value) => updateField("val1", value, setVal1)}
                      onBlur={() => setVal1(val1.trim())}
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        ...(fieldInputStyle("val1") || {}),
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {fieldErrors.val1 ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.val1}
                      </Text>
                    ) : null}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Subtitle *
                    </Text>
                    <TextInput
                      placeholder="e.g. Freshly made, just for you"
                      placeholderTextColor={theme.muted + "44"}
                      value={val2}
                      onChangeText={(value) => updateField("val2", value, setVal2)}
                      onBlur={() => setVal2(val2.trim())}
                      className="px-4 rounded-xl mb-4 font-semibold"
                      style={{
                        ...(fieldInputStyle("val2") || {}),
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {fieldErrors.val2 ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.val2}
                      </Text>
                    ) : null}

                    <Text
                      className="text-xs font-bold mb-2 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Featured Image *
                    </Text>
                    {mediaUri ? (
                      <Image
                        source={{ uri: mediaUri }}
                        resizeMode="cover"
                        style={{
                          width: "100%",
                          height: 160,
                          borderRadius: 12,
                          marginBottom: 12,
                          backgroundColor: theme.bg,
                        }}
                      />
                    ) : null}
                    <View className="mb-6 flex-row gap-3">
                      <Pressable
                        onPress={() => void pickFeaturedImage("gallery")}
                        disabled={uploadingImage || saving}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-3"
                        style={{
                          borderColor: fieldErrors.mediaUri
                            ? theme.danger
                            : theme.primary,
                          borderWidth: fieldErrors.mediaUri ? 2 : 1,
                          opacity: uploadingImage ? 0.6 : 1,
                        }}
                      >
                        <Feather name="image" size={18} color={theme.primary} />
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          Gallery
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void pickFeaturedImage("camera")}
                        disabled={uploadingImage || saving}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-3"
                        style={{
                          borderColor: fieldErrors.mediaUri
                            ? theme.danger
                            : theme.primary,
                          borderWidth: fieldErrors.mediaUri ? 2 : 1,
                          opacity: uploadingImage ? 0.6 : 1,
                        }}
                      >
                        <Feather name="camera" size={18} color={theme.primary} />
                        <Text
                          className="text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          Camera
                        </Text>
                      </Pressable>
                    </View>
                    {fieldErrors.mediaUri ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.mediaUri}
                      </Text>
                    ) : null}
                    {uploadingImage ? (
                      <View className="mb-4 flex-row items-center justify-center gap-2">
                        <ActivityIndicator color={theme.primary} />
                        <Text style={{ color: theme.muted }}>
                          Uploading image...
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : isSingleInputSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      {singleInputLabel} *
                    </Text>
                    <TextInput
                      placeholder={singleInputPlaceholder}
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={(value) => updateField("val1", value, setVal1)}
                      onBlur={() => setVal1(val1.trim())}
                      className="px-4 rounded-xl mb-6 font-bold"
                      style={{
                        ...(fieldInputStyle("val1") || {}),
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {fieldErrors.val1 ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.val1}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Title *
                    </Text>
                    <TextInput
                      placeholder="e.g. A little something special"
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={(value) => updateField("val1", value, setVal1)}
                      onBlur={() => setVal1(val1.trim())}
                      className="px-4 rounded-xl mb-4 font-bold"
                      style={{
                        ...(fieldInputStyle("val1") || {}),
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
                    {fieldErrors.val1 ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.val1}
                      </Text>
                    ) : null}

                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Subtitle *
                    </Text>
                    <TextInput
                      placeholder="e.g. Enjoy a fresh meal made to order"
                      placeholderTextColor={theme.muted + "44"}
                      value={val2}
                      onChangeText={(value) => updateField("val2", value, setVal2)}
                      onBlur={() => setVal2(val2.trim())}
                      className="px-4 rounded-xl mb-6 font-semibold"
                      style={{
                        ...(fieldInputStyle("val2") || {}),
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                    {fieldErrors.val2 ? (
                      <Text
                        className="mb-3 text-xs font-semibold"
                        style={{ color: theme.danger }}
                      >
                        {fieldErrors.val2}
                      </Text>
                    ) : null}
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
                    disabled={saving || uploadingImage}
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
