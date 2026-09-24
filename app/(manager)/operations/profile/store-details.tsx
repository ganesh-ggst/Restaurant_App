import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import {
    MANAGER_MOCK_DATA,
    StoreDetailOption,
    StoreDetailSection,
} from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function StoreDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [storeDetails, setStoreDetails] = useState<StoreDetailSection[]>(
    MANAGER_MOCK_DATA.storeDetails,
  );

  // Modal & Editor States
  const [storeModalState, setStoreModalState] = useState<
    "hub" | "sectionEditor" | "optionManager" | "optionEditor" | null
  >("hub");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const [inputVal1, setInputVal1] = useState("");
  const [inputVal2, setInputVal2] = useState("");
  const [inputToggle, setInputToggle] = useState<"single" | "multiple">(
    "single",
  );

  const currentActiveSection = storeDetails.find(
    (s) => s.id === selectedSectionId,
  );

  useFocusEffect(
    useCallback(() => {
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    }, []),
  );

  const toggleStoreSectionVisibility = (sectionId: string) => {
    const idx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === sectionId,
    );
    if (idx > -1) {
      MANAGER_MOCK_DATA.storeDetails[idx].isSectionActive =
        !MANAGER_MOCK_DATA.storeDetails[idx].isSectionActive;
      setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    }
  };

  const toggleStoreOptionVisibility = (sectionId: string, optionId: string) => {
    const sIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === sectionId,
    );
    if (sIdx === -1) return;
    const section = MANAGER_MOCK_DATA.storeDetails[sIdx];

    if (section.selectionType === "single") {
      section.options.forEach((opt) => (opt.isActive = opt.id === optionId));
    } else {
      const oIdx = section.options.findIndex((o) => o.id === optionId);
      if (oIdx > -1)
        section.options[oIdx].isActive = !section.options[oIdx].isActive;
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
  };

  const openSectionEditor = (section?: StoreDetailSection) => {
    setEditingSectionId(section ? section.id : null);
    setInputVal1(section ? section.title : "");
    setInputToggle(section ? section.selectionType : "single");
    setStoreModalState("sectionEditor");
  };

  const handleSaveSection = () => {
    if (!inputVal1.trim()) return;
    if (editingSectionId) {
      const idx = MANAGER_MOCK_DATA.storeDetails.findIndex(
        (s) => s.id === editingSectionId,
      );
      if (idx > -1) {
        MANAGER_MOCK_DATA.storeDetails[idx].title = inputVal1.trim();
        MANAGER_MOCK_DATA.storeDetails[idx].selectionType = inputToggle;
      }
    } else {
      MANAGER_MOCK_DATA.storeDetails.unshift({
        id: `sd_${Date.now()}`,
        title: inputVal1.trim(),
        selectionType: "single",
        isSectionActive: true,
        options: [],
      });
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    setStoreModalState("hub");
  };

  const handleDeleteSection = (sectionId: string, title: string) => {
    Alert.alert("Delete Category", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          MANAGER_MOCK_DATA.storeDetails =
            MANAGER_MOCK_DATA.storeDetails.filter((s) => s.id !== sectionId);
          setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
        },
      },
    ]);
  };

  const openOptionManager = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setStoreModalState("optionManager");
  };

  const openOptionEditor = (option?: StoreDetailOption) => {
    setEditingOptionId(option ? option.id : null);
    setInputVal1(option ? option.value : "");
    setInputVal2(option && option.subValue ? option.subValue : "");
    setStoreModalState("optionEditor");
  };

  const handleSaveOption = () => {
    if (!inputVal1.trim() || !selectedSectionId) return;
    const secIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
      (s) => s.id === selectedSectionId,
    );
    if (secIdx === -1) return;

    if (editingOptionId) {
      const optIdx = MANAGER_MOCK_DATA.storeDetails[secIdx].options.findIndex(
        (o) => o.id === editingOptionId,
      );
      if (optIdx > -1) {
        MANAGER_MOCK_DATA.storeDetails[secIdx].options[optIdx].value =
          inputVal1.trim();
        MANAGER_MOCK_DATA.storeDetails[secIdx].options[optIdx].subValue =
          inputVal2.trim();
      }
    } else {
      MANAGER_MOCK_DATA.storeDetails[secIdx].options.unshift({
        id: `opt_${Date.now()}`,
        value: inputVal1.trim(),
        subValue: inputVal2.trim(),
        isActive:
          MANAGER_MOCK_DATA.storeDetails[secIdx].selectionType === "multiple",
      });
    }
    setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
    setStoreModalState("optionManager");
  };

  const handleDeleteOption = (optionId: string, value: string) => {
    Alert.alert("Delete Item", `Remove "${value}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const secIdx = MANAGER_MOCK_DATA.storeDetails.findIndex(
            (s) => s.id === selectedSectionId,
          );
          if (secIdx > -1) {
            MANAGER_MOCK_DATA.storeDetails[secIdx].options =
              MANAGER_MOCK_DATA.storeDetails[secIdx].options.filter(
                (o) => o.id !== optionId,
              );
            setStoreDetails([...MANAGER_MOCK_DATA.storeDetails]);
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
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Store Details Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Pressable
          onPress={() => openSectionEditor()}
          className="mb-4 p-4 rounded-2xl items-center border-2 border-dashed"
          style={{ borderColor: theme.border }}
        >
          <Text className="text-sm font-bold" style={{ color: theme.text }}>
            + Add New Store Detail Category
          </Text>
        </Pressable>

        {storeDetails.map((section) => {
          const activeOptions = section.options.filter((o) => o.isActive);
          let displayValue = "None Active";
          if (activeOptions.length > 0) {
            displayValue =
              section.selectionType === "single"
                ? activeOptions[0].value
                : `${activeOptions.length} Active`;
          }
          return (
            <Pressable
              key={section.id}
              onPress={() => openOptionManager(section.id)}
            >
              <Card
                variant="default"
                className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-base font-bold mb-0.5"
                    style={{
                      color: section.isSectionActive ? theme.text : theme.muted,
                    }}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                  >
                    {displayValue}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Switch
                    value={section.isSectionActive}
                    onValueChange={() =>
                      toggleStoreSectionVisibility(section.id)
                    }
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={"#ffffff"}
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                  <Pressable
                    onPress={() => openSectionEditor(section)}
                    hitSlop={10}
                    className="p-1.5"
                  >
                    <Feather name="edit-2" size={16} color={theme.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleDeleteSection(section.id, section.title)
                    }
                    hitSlop={10}
                    className="p-1.5"
                  >
                    <Feather name="trash-2" size={16} color={theme.danger} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* SECTION EDITOR MODAL */}
      <Modal
        visible={storeModalState === "sectionEditor"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState("hub")}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setStoreModalState("hub")}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Card
                variant="default"
                className="rounded-3xl border-0 shadow-lg p-6"
              >
                <Text
                  className="text-xl font-bold mb-5"
                  style={{ color: theme.text }}
                >
                  {editingSectionId ? "Edit Category" : "Add New Category"}
                </Text>
                <TextInput
                  placeholder="e.g. Restaurant Name, Tax, Wi-Fi"
                  placeholderTextColor={theme.muted}
                  value={inputVal1}
                  onChangeText={setInputVal1}
                  className="px-4 rounded-xl mb-6 font-bold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 18,
                    height: 56,
                  }}
                  autoFocus={true}
                />
                <View className="flex-row justify-end gap-3">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setStoreModalState("hub")}
                    className="py-3 px-6"
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveSection}
                    className="py-3 px-8"
                  />
                </View>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* OPTION MANAGER MODAL */}
      <Modal
        visible={storeModalState === "optionManager"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState("hub")}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setStoreModalState("hub")}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
              style={{ maxHeight: "80%" }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-xl font-bold"
                  style={{ color: theme.text }}
                >
                  Modify {currentActiveSection?.title}
                </Text>
                <Pressable onPress={() => setStoreModalState("hub")}>
                  <Text
                    className="text-lg font-bold"
                    style={{ color: theme.muted }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => openOptionEditor()}
                className="mb-4 p-3 rounded-xl items-center border border-dashed"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: theme.text }}
                >
                  + Add New Entry
                </Text>
              </Pressable>

              <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
                {currentActiveSection?.options.map((opt) => (
                  <View
                    key={opt.id}
                    className="flex-row justify-between items-center p-3 mb-2 rounded-xl"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <View className="flex-1 mr-2">
                      <Text
                        className="text-sm font-bold"
                        style={{
                          color: opt.isActive ? theme.text : theme.muted,
                        }}
                        numberOfLines={1}
                      >
                        {opt.value}
                      </Text>
                      {opt.subValue ? (
                        <Text
                          className="text-[10px]"
                          style={{ color: theme.muted }}
                          numberOfLines={1}
                        >
                          {opt.subValue}
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Switch
                        value={opt.isActive}
                        onValueChange={() =>
                          toggleStoreOptionVisibility(
                            currentActiveSection.id,
                            opt.id,
                          )
                        }
                        trackColor={{
                          false: theme.border,
                          true: theme.primary,
                        }}
                        thumbColor={"#ffffff"}
                        style={{ transform: [{ scale: 0.75 }] }}
                      />
                      <Pressable
                        onPress={() => openOptionEditor(opt)}
                        hitSlop={10}
                        className="p-1"
                      >
                        <Feather
                          name="edit-2"
                          size={16}
                          color={theme.primary}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteOption(opt.id, opt.value)}
                        hitSlop={10}
                        className="p-1"
                      >
                        <Feather
                          name="trash-2"
                          size={16}
                          color={theme.danger}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      {/* OPTION EDITOR MODAL */}
      <Modal
        visible={storeModalState === "optionEditor"}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStoreModalState("optionManager")}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setStoreModalState("optionManager")}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Card
                variant="default"
                className="rounded-3xl border-0 shadow-lg p-6"
              >
                <Text
                  className="text-xl font-bold mb-5"
                  style={{ color: theme.text }}
                >
                  {editingOptionId ? "Edit Value" : "Add Value"}
                </Text>
                <TextInput
                  placeholder="Enter value..."
                  placeholderTextColor={theme.muted}
                  value={inputVal1}
                  onChangeText={setInputVal1}
                  className="px-4 rounded-xl mb-4 font-bold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 16,
                    height: 52,
                  }}
                  autoFocus={true}
                />
                <TextInput
                  placeholder="Optional sub-value / password..."
                  placeholderTextColor={theme.muted}
                  value={inputVal2}
                  onChangeText={setInputVal2}
                  className="px-4 rounded-xl mb-6 font-semibold"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.text,
                    fontSize: 16,
                    height: 52,
                  }}
                />
                <View className="flex-row justify-end gap-3">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setStoreModalState("optionManager")}
                    className="py-3 px-6"
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveOption}
                    className="py-3 px-8"
                  />
                </View>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}
