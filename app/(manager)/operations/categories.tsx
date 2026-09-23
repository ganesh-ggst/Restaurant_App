import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../constants/managerMockData";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [categories, setCategories] = useState(MANAGER_MOCK_DATA.categories);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");

  const iconInputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      setCategories([...MANAGER_MOCK_DATA.categories]);
    }, []),
  );

  const openAddModal = () => {
    setModalMode("add");
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryIcon("");
    setIsModalVisible(true);
  };

  const openEditModal = (category: any) => {
    setModalMode("edit");
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryIcon(category.icon || "");
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setCategoryName("");
    setCategoryIcon("");
    setEditingCategoryId(null);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) return;

    if (modalMode === "add") {
      const newCategory = {
        id: `cat_${Date.now()}`,
        name: categoryName.trim(),
        icon: categoryIcon.trim(),
        isActive: true,
      };
      MANAGER_MOCK_DATA.categories = [
        ...MANAGER_MOCK_DATA.categories,
        newCategory,
      ];
    } else if (modalMode === "edit" && editingCategoryId) {
      const index = MANAGER_MOCK_DATA.categories.findIndex(
        (c) => c.id === editingCategoryId,
      );
      if (index > -1) {
        MANAGER_MOCK_DATA.categories[index] = {
          ...MANAGER_MOCK_DATA.categories[index],
          name: categoryName.trim(),
          icon: categoryIcon.trim(),
        };
      }
    }

    setCategories([...MANAGER_MOCK_DATA.categories]);
    closeModal();
  };

  const handleDeleteCategory = (categoryId: string, catName: string) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${catName}"? This will affect all items inside it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            MANAGER_MOCK_DATA.categories = MANAGER_MOCK_DATA.categories.filter(
              (c) => c.id !== categoryId,
            );
            setCategories([...MANAGER_MOCK_DATA.categories]);
          },
        },
      ],
    );
  };

  const filteredCategories = categories.filter((category) => {
    return category.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          Store Categories
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-sm mb-4 font-medium"
          style={{ color: theme.muted }}
        >
          Select a category to view its items below, or use edit/delete.
        </Text>

        <TextInput
          placeholder="Search categories..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="px-4 rounded-2xl mb-4 font-semibold"
          style={{
            backgroundColor: theme.card || theme.border,
            color: theme.text,
            fontSize: 16,
            height: 52,
            textAlignVertical: "center",
            paddingTop: 0,
            paddingBottom: 0,
          }}
        />

        <Pressable
          onPress={openAddModal}
          className="mb-6 p-4 rounded-2xl items-center border-2 border-dashed"
          style={{ borderColor: theme.border }}
        >
          <Text className="text-base font-bold" style={{ color: theme.text }}>
            + Create New Category
          </Text>
        </Pressable>

        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const itemsCount = MANAGER_MOCK_DATA.foodItems.filter(
              (item) => item.categoryId === category.id,
            ).length;

            return (
              <Card
                key={category.id}
                variant="default"
                className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
              >
                <Pressable
                  className="flex-1 mr-3 justify-center py-1"
                  onPress={() =>
                    router.push(
                      `/(manager)/operations/category/${category.id}` as any,
                    )
                  }
                >
                  <View className="flex-row items-center mb-1">
                    {category.icon ? (
                      <Text className="text-xl mr-2">{category.icon}</Text>
                    ) : null}
                    <Text
                      className="text-lg font-bold flex-1"
                      style={{ color: theme.text }}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </View>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.muted }}
                  >
                    {itemsCount} items configured
                  </Text>
                </Pressable>

                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => openEditModal(category)}
                    className="p-2"
                    hitSlop={10}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: theme.primary }}
                    >
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleDeleteCategory(category.id, category.name)
                    }
                    className="p-2"
                    hitSlop={10}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: theme.danger }}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        ) : (
          <View
            className="p-6 rounded-2xl border border-dashed items-center mt-4"
            style={{ borderColor: theme.border }}
          >
            <Text
              className="text-sm italic text-center"
              style={{ color: theme.muted }}
            >
              {categories.length === 0
                ? "No categories configured yet."
                : "No matching categories found."}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* CATEGORY EDITOR MODAL (Keyboard Aware & Backdrop Close) */}
      {/* ========================================================= */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          className="flex-1 justify-center px-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={closeModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Card
                variant="default"
                className="rounded-3xl border-0 shadow-lg p-0 overflow-hidden max-h-[80vh]"
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 24 }}
                >
                  <Text
                    className="text-xl font-bold mb-5"
                    style={{ color: theme.text }}
                  >
                    {modalMode === "add"
                      ? "Create New Category"
                      : "Edit Category"}
                  </Text>

                  <Text
                    className="text-sm font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Category Name
                  </Text>
                  <TextInput
                    placeholder="e.g. Biryani"
                    placeholderTextColor={theme.muted}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    className="px-4 rounded-xl mb-4 font-bold"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                    }}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => iconInputRef.current?.focus()}
                    autoFocus={true}
                  />

                  <Text
                    className="text-sm font-bold mb-2 uppercase"
                    style={{ color: theme.muted }}
                  >
                    Emoji Icon (Optional)
                  </Text>
                  <TextInput
                    ref={iconInputRef}
                    placeholder="e.g. 🍲"
                    placeholderTextColor={theme.muted}
                    value={categoryIcon}
                    onChangeText={setCategoryIcon}
                    className="px-4 rounded-xl mb-6 font-bold"
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      fontSize: 18,
                      height: 56,
                      textAlignVertical: "center",
                    }}
                  />

                  <View className="flex-row justify-end mt-2">
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={closeModal}
                      className="mr-3 py-3 px-6"
                    />
                    <Button
                      title={modalMode === "add" ? "Create" : "Save"}
                      onPress={handleSaveCategory}
                      className="py-3 px-8"
                    />
                  </View>
                </ScrollView>
              </Card>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
