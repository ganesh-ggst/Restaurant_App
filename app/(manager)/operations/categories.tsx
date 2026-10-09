import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { useAppTheme } from "../../../hooks/useAppTheme";
import {
  OperationsCategory,
  operationsApi,
} from "../../../services/api/operations";
import { operationsCache } from "../../../services/api/operations-cache";

export default function CategoriesScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [categories, setCategories] = useState<OperationsCategory[]>(
    () => operationsCache.getCategories() ?? [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<{
    text: string;
    tone: "success" | "error";
  } | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");

  const iconInputRef = useRef<TextInput>(null);
  const categoryMessageTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const showCategoryMessage = (message: {
    text: string;
    tone: "success" | "error";
  }) => {
    if (categoryMessageTimeout.current) {
      clearTimeout(categoryMessageTimeout.current);
    }
    setCategoryMessage(message);
    categoryMessageTimeout.current = setTimeout(() => {
      setCategoryMessage(null);
      categoryMessageTimeout.current = null;
    }, 5000);
  };

  const dismissCategoryMessage = () => {
    if (categoryMessageTimeout.current) {
      clearTimeout(categoryMessageTimeout.current);
      categoryMessageTimeout.current = null;
    }
    setCategoryMessage(null);
  };

  useEffect(
    () => () => {
      if (categoryMessageTimeout.current) {
        clearTimeout(categoryMessageTimeout.current);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!operationsCache.areCategoriesStale()) return;
      let isCurrent = true;
      operationsApi
        .getCategories()
        .then((data) => {
          if (isCurrent) {
            operationsCache.setCategories(data);
            setCategories(data);
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            Alert.alert(
              "Unable to load categories",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        });
      return () => {
        isCurrent = false;
      };
    }, []),
  );

  const refreshCategories = async () => {
    const data = await operationsApi.getCategories();
    operationsCache.setCategories(data);
    setCategories(data);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCategories();
    } catch (error) {
      Alert.alert(
        "Unable to refresh categories",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryIcon("");
    setIsModalVisible(true);
  };

  const openEditModal = (category: OperationsCategory) => {
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

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    setSaving(true);
    try {
      if (modalMode === "add") {
        await operationsApi.createCategory({
          name: categoryName.trim(),
          icon: categoryIcon.trim(),
        });
        operationsCache.invalidateCategories();
      } else if (modalMode === "edit" && editingCategoryId) {
        await operationsApi.updateCategory(editingCategoryId, {
          name: categoryName.trim(),
          icon: categoryIcon.trim(),
        });
        operationsCache.invalidateCategory(editingCategoryId);
        operationsCache.invalidateCategories();
      }
      await refreshCategories();
      closeModal();
    } catch (error) {
      Alert.alert(
        "Unable to save category",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (categoryId: string, catName: string) => {
    dismissCategoryMessage();
    Alert.alert(
      "Delete Category",
      `Check that "${catName}" has no menu items or cross-sell items before deleting it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const [menuItems, crossSellItems] = await Promise.all([
                operationsApi.getCategoryItems(categoryId),
                operationsApi.getCrossSells(categoryId),
              ]);
              if (menuItems.length > 0 || crossSellItems.length > 0) {
                showCategoryMessage({
                  text: "Please delete all menu items and cross-sell items before deleting this category.",
                  tone: "error",
                });
                return;
              }

              const result = await operationsApi.deleteCategory(categoryId);
              operationsCache.invalidateCategory(categoryId);
              operationsCache.invalidateCategories();
              await refreshCategories();
              showCategoryMessage({
                text:
                  !result.deleted && !result.isActive
                    ? `"${catName}" was deactivated and removed from active categories.`
                    : `"${catName}" was deleted.`,
                tone: "success",
              });
            } catch (error) {
              showCategoryMessage({
                text:
                  error instanceof Error
                    ? `Unable to verify or delete the category: ${error.message}`
                    : "Unable to verify or delete the category. Please try again.",
                tone: "error",
              });
            }
          },
        },
      ],
    );
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? category.isActive : !category.isActive);
    return matchesSearch && matchesStatus;
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

      <View className="flex-1 px-6 pt-6">
        <View
          className="pb-1"
          style={{ backgroundColor: theme.bg }}
        >
          <TextInput
            placeholder="Search categories..."
            placeholderTextColor={theme.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="mb-4 rounded-2xl px-4 font-semibold"
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

          <View className="mb-4 flex-row rounded-xl p-1" style={{ backgroundColor: theme.card }}>
            {(["all", "active", "inactive"] as const).map((filter) => {
              const selected = statusFilter === filter;
              const label =
                filter === "all"
                  ? `All (${categories.length})`
                  : filter === "active"
                    ? `Active (${categories.filter((category) => category.isActive).length})`
                    : `Inactive (${categories.filter((category) => !category.isActive).length})`;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="flex-1 items-center rounded-lg px-2 py-3"
                  style={{
                    backgroundColor: selected ? theme.primary : "transparent",
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: selected ? "#ffffff" : theme.text }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={openAddModal}
            className="mb-6 items-center rounded-2xl border-2 border-dashed p-4"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              + Create New Category
            </Text>
          </Pressable>
        </View>

        {categoryMessage ? (
          <View
            className="mb-3 flex-row items-center rounded-xl border px-4 py-3"
            style={{
              backgroundColor:
                categoryMessage.tone === "success"
                  ? theme.isDark
                    ? "#123a29"
                    : "#eaf8ef"
                  : theme.isDark
                    ? "#3a1c1c"
                    : "#fff0f0",
              borderColor:
                categoryMessage.tone === "success"
                  ? theme.primary
                  : theme.danger,
            }}
            accessibilityRole="alert"
          >
            <Text
              className="mr-2 text-base font-bold"
              style={{
                color:
                  categoryMessage.tone === "success"
                    ? theme.primary
                    : theme.danger,
              }}
            >
              {categoryMessage.tone === "success" ? "✓" : "!"}
            </Text>
            <Text
              className="flex-1 text-sm font-semibold"
              style={{ color: theme.text }}
            >
              {categoryMessage.text}
            </Text>
            <Pressable
              onPress={dismissCategoryMessage}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
            >
              <Text className="text-lg" style={{ color: theme.muted }}>
                ×
              </Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
        <View>
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => {
            const itemsCount = category.itemCount ?? 0;

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
                  <Text
                    className="mt-1 text-[10px] font-bold uppercase"
                    style={{
                      color: category.isActive ? theme.primary : theme.muted,
                    }}
                  >
                    {category.isActive ? "Active" : "Inactive"}
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
                : "No categories match this search and status filter."}
            </Text>
          </View>
        )}
        </View>
        </ScrollView>
      </View>

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
                      className="mr-3 h-14 w-32 px-0 py-0"
                    />
                    <Button
                      title={modalMode === "add" ? "Create" : "Save"}
                      onPress={handleSaveCategory}
                      loading={saving}
                      disabled={saving}
                      className="h-14 w-32 px-0 py-0"
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
