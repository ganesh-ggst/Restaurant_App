import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

import { Button } from "../../../../../components/ui/Button";
import { Card } from "../../../../../components/ui/Card";
import {
  MANAGER_MOCK_DATA,
  StoreDetailOption,
} from "../../../../../constants/managerMockData";
import { useAppTheme } from "../../../../../hooks/useAppTheme";

export default function StorefrontDisplayDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const displayList = (MANAGER_MOCK_DATA as any).storefrontDisplay || [];
  const sectionIndex = displayList.findIndex((s: any) => s.id === id);
  const section = displayList[sectionIndex];

  const [options, setOptions] = useState<StoreDetailOption[]>(
    section?.options || [],
  );
  const [editingOption, setEditingOption] = useState<StoreDetailOption | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");
  const [mediaUri, setMediaUri] = useState("");

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

  const toggleOption = (optionId: string) => {
    if (section.selectionType === "single") {
      section.options.forEach(
        (opt: any) => (opt.isActive = opt.id === optionId),
      );
    } else {
      const opt = section.options.find((o: any) => o.id === optionId);
      if (opt) opt.isActive = !opt.isActive;
    }
    displayList[sectionIndex] = { ...section };
    setOptions([...section.options]);
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

  const handleSave = () => {
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

    if (editingOption) {
      const idx = section.options.findIndex(
        (o: any) => o.id === editingOption.id,
      );
      if (idx > -1) {
        section.options[idx].value = finalValue;
        section.options[idx].subValue = finalSubValue;
      }
    } else {
      const isSingle = section.selectionType === "single";
      if (isSingle) {
        section.options.forEach((o: any) => (o.isActive = false));
      }

      section.options.unshift({
        id: `opt_${Date.now()}`,
        value: finalValue,
        subValue: finalSubValue,
        isActive: true,
      });
    }

    displayList[sectionIndex] = { ...section };
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
          section.options = section.options.filter(
            (o: any) => o.id !== optionId,
          );
          if (
            !section.options.some((o: any) => o.isActive) &&
            section.options.length > 0
          ) {
            section.options[0].isActive = true;
          }
          displayList[sectionIndex] = { ...section };
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
                      Media File (Image / Video) *
                    </Text>
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
