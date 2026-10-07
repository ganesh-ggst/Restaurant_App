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
  Image,
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
  getStorefrontDefinition,
  mapAdminStorefrontSection,
  updateMockStorefrontOptions,
} from "../adminProfileSections";

export default function StorefrontDisplayDetailComponent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = segments[0] === "(admin)";

  const mockDisplayList = isAdmin
    ? []
    : (MANAGER_MOCK_DATA as any).storefrontDisplay || [];
  const sectionIndex = isAdmin
    ? -1
    : mockDisplayList.findIndex((item: any) => item.id === id);
  const mockSection = isAdmin ? undefined : mockDisplayList[sectionIndex];

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

  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [mediaUri, setMediaUri] = useState("");
  const section = isAdmin ? adminSection : mockSection;

  useEffect(() => {
    if (!isAdmin || !id) return;
    const definition = getStorefrontDefinition(id);
    if (!definition) return;

    let isCurrent = true;
    adminProfileApi
      .getStorefrontSection(definition.key)
      .then((data) => {
        if (!isCurrent) return;
        const nextSection = mapAdminStorefrontSection(id, data);
        if (nextSection) {
          setAdminSection(nextSection);
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

  const isCelebrationsSection = id === "sf_celebrations";
  const isFeaturedSection = id === "sf_featured";
  const isEmptySection = id === "sf_empty";
  const isSingleInputSection = id === "sf_greetings" || id === "sf_search";

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to upload media!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const refreshAdminSection = async () => {
    if (!isAdmin) return;
    const definition = getStorefrontDefinition(id);
    if (!definition) return;
    const data = await adminProfileApi.getStorefrontSection(definition.key);
    const nextSection = mapAdminStorefrontSection(id, data);
    if (nextSection) {
      setAdminSection(nextSection);
      setOptions(nextSection.options);
    }
  };

  const toggleOption = async (optionId: string) => {
    if (isAdmin) {
      const definition = getStorefrontDefinition(id);
      const option = options.find((item) => item.id === optionId);
      if (!definition || !option) return;
      try {
        await adminProfileApi.setStorefrontItemActive(
          definition.key,
          optionId,
          !option.isActive,
        );
        await refreshAdminSection();
      } catch (error) {
        Alert.alert(
          "Unable to update storefront item",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
      return;
    }

    const nextOptions =
      section.selectionType === "single"
        ? section.options.map((option: StoreDetailOption) => ({
            ...option,
            isActive: option.id === optionId,
          }))
        : section.options.map((option: StoreDetailOption) =>
            option.id === optionId
              ? { ...option, isActive: !option.isActive }
              : option,
          );
    updateMockStorefrontOptions(id, nextOptions);
    setOptions(nextOptions);
  };

  const openEditor = (opt?: StoreDetailOption) => {
    setEditingOption(opt || null);
    if (isFeaturedSection && opt) {
      setVal1(opt.value || "");
      const subParts = opt.subValue ? opt.subValue.split("•") : [];
      setVal2(subParts[0] ? subParts[0].trim() : "");
      setMediaUri(subParts[1] ? subParts[1].trim() : "");
    } else if (isEmptySection && opt) {
      setVal1(opt.value || "");
      setVal2(opt.subValue || "");
      setMediaUri("");
    } else {
      setVal1(opt ? opt.value : "");
      setVal2(opt && opt.subValue ? opt.subValue : "");
      setMediaUri("");
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    let finalValue = val1.trim();
    let finalSubValue = val2.trim();

    if (isCelebrationsSection) {
      if (!val1.trim()) {
        Alert.alert("Error", "Emoji field is mandatory.");
        return;
      }
      const hasEmoji = /\p{Extended_Pictographic}/u.test(val1);
      const hasAlphabets = /[a-zA-Z]/u.test(val1);

      if (!hasEmoji || hasAlphabets) {
        Alert.alert(
          "Invalid Input",
          "Please enter an emoji character only (alphabets and text are not allowed).",
          [{ text: "OK", onPress: () => setVal1("") }],
        );
        return;
      }
      finalSubValue = "Checkout success confetti effect";
    } else if (isFeaturedSection) {
      if (!val1.trim() || !val2.trim() || !mediaUri.trim()) {
        Alert.alert(
          "Error",
          "All fields (Title, Subtitle, and Media file) are mandatory!",
        );
        return;
      }
      if (isAdmin && !/^https?:\/\//i.test(mediaUri.trim())) {
        Alert.alert(
          "Image URL required",
          "Enter a public http or https image URL to save featured content.",
        );
        return;
      }
      finalSubValue = `${val2.trim()} • ${mediaUri}`;
    } else if (isEmptySection) {
      if (!val1.trim() || !val2.trim()) {
        Alert.alert("Error", "Both Title and Description are mandatory!");
        return;
      }
      finalSubValue = val2.trim();
    } else if (isSingleInputSection) {
      if (!val1.trim()) {
        Alert.alert("Error", "This field is mandatory!");
        return;
      }
      finalSubValue = "";
    } else {
      if (!val1.trim()) {
        Alert.alert("Error", "Field is mandatory!");
        return;
      }
    }

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
      } else if (isEmptySection) {
        body = { title: val1.trim(), description: val2.trim() };
      } else if (isCelebrationsSection) {
        body = { emoji: val1.trim() };
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
        } else {
          await adminProfileApi.createStorefrontItem(definition.key, body);
        }
        await refreshAdminSection();
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

    const nextOptions = editingOption
      ? section.options.map((option: StoreDetailOption) =>
          option.id === editingOption.id
            ? { ...option, value: finalValue, subValue: finalSubValue }
            : option,
        )
      : [
          {
            id: createMockProfileItemId(),
            value: finalValue,
            subValue: finalSubValue,
            isActive: true,
          },
          ...(section.selectionType === "single"
            ? section.options.map((option: StoreDetailOption) => ({
                ...option,
                isActive: false,
              }))
            : section.options),
        ];

    updateMockStorefrontOptions(id, nextOptions);
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
            const definition = getStorefrontDefinition(id);
            if (!definition) return;
            try {
              await adminProfileApi.deleteStorefrontItem(
                definition.key,
                optionId,
              );
              await refreshAdminSection();
            } catch (error) {
              Alert.alert(
                "Unable to delete storefront item",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
            return;
          }

          let nextOptions = section.options.filter(
            (option: StoreDetailOption) => option.id !== optionId,
          );
          if (
            !nextOptions.some((option: StoreDetailOption) => option.isActive) &&
            nextOptions.length > 0
          ) {
            nextOptions = nextOptions.map(
              (option: StoreDetailOption, index: number) => ({
                ...option,
                isActive: index === 0,
              }),
            );
          }
          updateMockStorefrontOptions(id, nextOptions);
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

                {isCelebrationsSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Emoji Character Only *
                    </Text>
                    <TextInput
                      placeholder="🌸"
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={setVal1}
                      maxLength={4}
                      className="rounded-xl mb-6 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 26,
                        height: 48,
                        textAlign: "center",
                        textAlignVertical: "center",
                        paddingHorizontal: 0,
                      }}
                      autoFocus={true}
                    />
                  </>
                ) : isFeaturedSection ? (
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
                      onChangeText={setVal1}
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
                      Subtitle *
                    </Text>
                    <TextInput
                      placeholder="e.g. Featured Reel Banner"
                      placeholderTextColor={theme.muted + "44"}
                      value={val2}
                      onChangeText={setVal2}
                      className="px-4 rounded-xl mb-4 font-semibold"
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
                      {isAdmin ? "Image URL *" : "Media File (Image / Video) *"}
                    </Text>
                    {isAdmin ? (
                      <TextInput
                        placeholder="https://example.com/image.jpg"
                        placeholderTextColor={theme.muted + "44"}
                        value={mediaUri}
                        onChangeText={setMediaUri}
                        autoCapitalize="none"
                        keyboardType="url"
                        className="px-4 rounded-xl mb-6 font-semibold"
                        style={{
                          backgroundColor: theme.bg,
                          color: theme.text,
                          fontSize: 16,
                          height: 52,
                        }}
                      />
                    ) : (
                      <Pressable
                        onPress={pickMedia}
                        className="p-4 rounded-xl items-center justify-center border border-dashed mb-6"
                        style={{
                          borderColor: theme.primary,
                          backgroundColor: theme.bg,
                        }}
                      >
                        {mediaUri ? (
                          <View className="items-center">
                            <Image
                              source={{ uri: mediaUri }}
                              className="w-24 h-24 rounded-xl mb-2"
                            />
                            <Text
                              className="text-xs font-bold"
                              style={{ color: theme.primary }}
                            >
                              Change Media File 📁
                            </Text>
                          </View>
                        ) : (
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.primary }}
                          >
                            📷 Select Image or Video *
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </>
                ) : isEmptySection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Title *
                    </Text>
                    <TextInput
                      placeholder="e.g. Oops! No matches found."
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={setVal1}
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
                      Description *
                    </Text>
                    <TextInput
                      placeholder="e.g. We couldn't find anything matching..."
                      placeholderTextColor={theme.muted + "44"}
                      value={val2}
                      onChangeText={setVal2}
                      className="px-4 rounded-xl mb-6 font-semibold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
                  </>
                ) : isSingleInputSection ? (
                  <>
                    <Text
                      className="text-xs font-bold mb-1 uppercase"
                      style={{ color: theme.muted }}
                    >
                      Text *
                    </Text>
                    <TextInput
                      placeholder="Enter value..."
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={setVal1}
                      className="px-4 rounded-xl mb-6 font-bold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                      autoFocus={true}
                    />
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
                      placeholder="Enter title..."
                      placeholderTextColor={theme.muted + "44"}
                      value={val1}
                      onChangeText={setVal1}
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
                      Subtitle *
                    </Text>
                    <TextInput
                      placeholder="Enter subtitle..."
                      placeholderTextColor={theme.muted + "44"}
                      value={val2}
                      onChangeText={setVal2}
                      className="px-4 rounded-xl mb-6 font-semibold"
                      style={{
                        backgroundColor: theme.bg,
                        color: theme.text,
                        fontSize: 16,
                        height: 52,
                      }}
                    />
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
