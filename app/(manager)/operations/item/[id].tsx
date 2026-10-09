import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
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
  OperationsCustomizationGroup,
  OperationsMenuItem,
  operationsApi,
} from "../../../../services/api/operations";
import { operationsCache } from "../../../../services/api/operations-cache";

type CustomizationEditor =
  | { type: "group"; groupIndex: number | null }
  | { type: "option"; groupIndex: number };

const marketingTagOptions = [
  ["none", "None"],
  ["auto_discount", "Auto Discount"],
  ["⭐ Bestseller", "⭐ Bestseller"],
  ["🔥 Hot", "🔥 Hot"],
] as const;

const normalizeMarketingTag = (tag: string | undefined): string => {
  switch (tag) {
    case "bestseller":
      return "⭐ Bestseller";
    case "hot":
      return "🔥 Hot";
    default:
      return tag || "auto_discount";
  }
};

export default function EditMenuItemScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id, categoryId } = useLocalSearchParams<{
    id: string;
    categoryId?: string;
  }>();
  const isNewItem = id === "new";
  const [item, setItem] = useState<OperationsMenuItem | null>(null);
  const [loading, setLoading] = useState(!isNewItem);
  const [saving, setSaving] = useState(false);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [foodType, setFoodType] = useState<"veg" | "non_veg">("veg");
  const [marketingTag, setMarketingTag] = useState("auto_discount");
  const [customTag, setCustomTag] = useState("");
  const [customTagEnabled, setCustomTagEnabled] = useState(false);
  const [customizationGroups, setCustomizationGroups] = useState<
    OperationsCustomizationGroup[]
  >([]);
  const [customizationEditor, setCustomizationEditor] =
    useState<CustomizationEditor | null>(null);
  const [customizationName, setCustomizationName] = useState("");
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("0");
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
        const categoryItems = categoryId
          ? await operationsApi.getCategoryItems(categoryId)
          : await operationsApi.getInventoryCandidates();
        let found = categoryItems.find((candidate) => candidate._id === id);
        if (!found && categoryId) {
          const inventoryItems = await operationsApi.getInventoryCandidates();
          found = inventoryItems.find((candidate) => candidate._id === id);
        }
        if (!found) throw new Error("This menu item was not found.");
        if (!isCurrent) return;
        hasLoadedItem.current = true;
        setItem(found);
        setItemName(found.name);
        setDescription(found.description || "");
        setRegularPrice(String(found.compareAtPrice ?? found.price));
        setOfferPrice(
          found.compareAtPrice === undefined || found.compareAtPrice === null
            ? ""
            : String(found.price),
        );
        setQuantity(
          found.availableQuantity === undefined
            ? ""
            : String(found.availableQuantity),
        );
        setPrepTime(
          found.prepTimeMinutes === undefined
            ? ""
            : String(found.prepTimeMinutes),
        );
        setImageUrl(found.imageUrl || "");
        setFoodType(found.foodType === "non_veg" ? "non_veg" : "veg");
        setMarketingTag(normalizeMarketingTag(found.marketingTag));
        setCustomTag(found.customTag || "");
        const hasCustomTag =
          found.customTagEnabled ?? Boolean(found.customTag?.trim());
        setCustomTagEnabled(hasCustomTag);
        if (hasCustomTag) setMarketingTag("none");
        setCustomizationGroups(found.customizationGroups || []);
      })()
        .catch((error: unknown) => {
          if (isCurrent) {
            Alert.alert(
              "Unable to load menu item",
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
    }, [categoryId, id, isNewItem]),
  );

  const resolvedCategoryId =
    categoryId ||
    (typeof item?.categoryId === "string"
      ? item.categoryId
      : item?.categoryId?._id);

  const handleSave = async () => {
    const parsedRegularPrice = Number(regularPrice);
    const parsedOfferPrice = offerPrice.trim()
      ? Number(offerPrice)
      : undefined;
    const parsedQuantity = Number(quantity);
    const parsedPrepTime = Number(prepTime);
    if (!itemName.trim()) {
      Alert.alert("Item name required", "Enter a name for this menu item.");
      return;
    }
    if (!Number.isFinite(parsedRegularPrice) || parsedRegularPrice <= 0) {
      Alert.alert("Invalid regular price", "Regular price must be greater than ₹0.");
      return;
    }
    if (offerPrice.trim() && isOfferPriceInvalid) {
      Alert.alert(
        "Invalid offer price",
        "Offer price must be greater than ₹0 and less than the regular price.",
      );
      return;
    }
    if (!quantity.trim() || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      Alert.alert("Invalid quantity", "Enter a non-negative whole number for available quantity.");
      return;
    }
    if (
      prepTime.trim() &&
      (!Number.isInteger(parsedPrepTime) || parsedPrepTime < 0)
    ) {
      Alert.alert("Invalid preparation time", "Enter a valid preparation time in minutes.");
      return;
    }
    if (isNewItem && !resolvedCategoryId) {
      Alert.alert("Category required", "Choose a category before creating a menu item.");
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(imageUrl.trim())) {
      Alert.alert(
        "Valid image required",
        "Enter an image URL starting with http:// or https://.",
      );
      return;
    }
    if (customTagEnabled && !customTag.trim()) {
      Alert.alert("Custom tag required", "Enter a custom tag or turn off Add Custom Tag.");
      return;
    }
    for (const group of customizationGroups) {
      if (!group.name.trim()) {
        Alert.alert("Add-on name required", "Give each add-on section a name.");
        return;
      }
      const availableOptionCount = group.options.filter(
        (option) => option.isAvailable,
      ).length;
      if (
        group.minSelections < 0 ||
        group.maxSelections < 1 ||
        group.options.length === 0 ||
        group.maxSelections > group.options.length ||
        (availableOptionCount > 0 &&
          group.maxSelections > availableOptionCount) ||
        group.minSelections > group.maxSelections ||
        group.minSelections > availableOptionCount ||
        (group.selectionType === "single" && group.maxSelections > 1)
      ) {
        Alert.alert(
          "Invalid add-on selection rules",
          `Add available options and check the selection limits for "${group.name}".`,
        );
        return;
      }
    }

    const autoDiscountLabel =
      parsedOfferPrice !== undefined &&
      Number.isFinite(parsedOfferPrice) &&
      parsedRegularPrice > parsedOfferPrice
        ? `₹${parsedRegularPrice - parsedOfferPrice} OFF`
        : undefined;
    const body: Record<string, unknown> = {
      name: itemName.trim(),
      description: description.trim(),
      foodType,
      price: parsedOfferPrice ?? parsedRegularPrice,
      ...(parsedOfferPrice !== undefined
        ? { compareAtPrice: parsedRegularPrice }
        : {}),
      availableQuantity: parsedQuantity,
      ...(prepTime.trim() ? { prepTimeMinutes: parsedPrepTime } : {}),
      imageUrl: imageUrl.trim(),
      marketingTag: customTagEnabled ? "none" : marketingTag,
      customTag: customTag.trim(),
      customTagEnabled: customTagEnabled && Boolean(customTag.trim()),
      customizationGroups,
      ...(item?.tags !== undefined ? { tags: item.tags } : {}),
      ...(!customTagEnabled && marketingTag === "auto_discount"
        ? autoDiscountLabel
          ? { discountLabel: autoDiscountLabel }
          : item?.discountLabel !== undefined
            ? { discountLabel: item.discountLabel }
            : {}
        : item?.discountLabel !== undefined
          ? { discountLabel: item.discountLabel }
          : {}),
    };

    setSaving(true);
    try {
      if (isNewItem) {
        await operationsApi.createCategoryItem(resolvedCategoryId!, body);
      } else {
        if (!resolvedCategoryId) {
          throw new Error("The item's category could not be determined.");
        }
        await operationsApi.updateCategoryItem(resolvedCategoryId, id, body);
      }
      operationsCache.invalidateCategory(resolvedCategoryId);
      operationsCache.invalidateCategories();
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to save menu item",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: theme.card,
    borderColor: theme.border,
    color: theme.text,
  };
  const showOfferPrice = regularPrice.trim().length > 0;
  const parsedRegularPriceForOffer = Number(regularPrice);
  const parsedOfferPriceForValidation = Number(offerPrice);
  const isOfferPriceInvalid =
    offerPrice.trim().length > 0 &&
    (!Number.isFinite(parsedOfferPriceForValidation) ||
      parsedOfferPriceForValidation <= 0 ||
      !Number.isFinite(parsedRegularPriceForOffer) ||
      parsedOfferPriceForValidation >= parsedRegularPriceForOffer);
  const autoDiscountAmount =
    Number.isFinite(parsedRegularPriceForOffer) &&
    Number.isFinite(parsedOfferPriceForValidation) &&
    regularPrice.trim() &&
    offerPrice.trim() &&
    parsedRegularPriceForOffer > parsedOfferPriceForValidation
      ? parsedRegularPriceForOffer - parsedOfferPriceForValidation
      : null;

  const field = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: "default" | "numeric" = "default",
    multiline = false,
    required = false,
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
        blurOnSubmit={!multiline}
        className="rounded-xl border px-4 py-3"
        style={{
          ...inputStyle,
          minHeight: multiline ? 88 : 48,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );

  const openNewGroupEditor = () => {
    setCustomizationName("");
    setCustomizationEditor({ type: "group", groupIndex: null });
  };

  const openEditGroupEditor = (group: OperationsCustomizationGroup, index: number) => {
    setCustomizationName(group.name);
    setCustomizationEditor({ type: "group", groupIndex: index });
  };

  const saveCustomizationEditor = () => {
    if (customizationEditor?.type === "group") {
      const name = customizationName.trim();
      const existingGroup =
        customizationEditor.groupIndex === null
          ? null
          : customizationGroups[customizationEditor.groupIndex];
      if (!name) {
        Alert.alert("Add-on name required", "Enter a name for this add-on section.");
        return;
      }

      const group: OperationsCustomizationGroup = {
        name,
        selectionType: existingGroup?.selectionType ?? "single",
        minSelections: existingGroup?.minSelections ?? 0,
        maxSelections: existingGroup?.maxSelections ?? 1,
        options: existingGroup?.options ?? [],
      };
      setCustomizationGroups((current) => {
        if (customizationEditor.groupIndex === null) return [...current, group];
        return current.map((entry, index) =>
          index === customizationEditor.groupIndex ? group : entry,
        );
      });
      setCustomizationEditor(null);
      return;
    }

    if (customizationEditor?.type === "option") {
      const name = optionName.trim();
      const priceValue = Number(optionPrice);
      if (
        !name ||
        !optionPrice.trim() ||
        !Number.isFinite(priceValue) ||
        priceValue < 0
      ) {
        Alert.alert(
          "Invalid add-on option",
          "Enter an option name and a valid non-negative price.",
        );
        return;
      }
      const groupIndex = customizationEditor.groupIndex;
      setCustomizationGroups((current) =>
        current.map((group, index) =>
          index === groupIndex
            ? {
                ...group,
                options: [
                  ...group.options,
                  { name, price: priceValue, isAvailable: true },
                ],
              }
            : group,
        ),
      );
      setCustomizationEditor(null);
    }
  };

  const toggleCustomizationGroup = (groupIndex: number, isAvailable: boolean) => {
    setCustomizationGroups((current) =>
      current.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option) => ({
                ...option,
                isAvailable,
              })),
            }
          : group,
      ),
    );
  };

  const toggleCustomizationOption = (
    groupIndex: number,
    optionIndex: number,
    isAvailable: boolean,
  ) => {
    setCustomizationGroups((current) =>
      current.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex
                  ? { ...option, isAvailable }
                  : option,
              ),
            }
          : group,
      ),
    );
  };

  const removeCustomizationGroup = (groupIndex: number) => {
    setCustomizationGroups((current) =>
      current.filter((_, index) => index !== groupIndex),
    );
  };

  const removeCustomizationOption = (groupIndex: number, optionIndex: number) => {
    setCustomizationGroups((current) =>
      current.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.filter(
                (_, currentOptionIndex) => currentOptionIndex !== optionIndex,
              ),
            }
          : group,
      ),
    );
  };

  const openNewOptionEditor = (groupIndex: number) => {
    setOptionName("");
    setOptionPrice("0");
    setCustomizationEditor({ type: "option", groupIndex });
  };

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
          {isNewItem ? "Add Menu Item" : "Edit Menu Item"}
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
            Media carousel *
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Image URL"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              keyboardType="url"
              className="rounded-xl border px-4 py-4"
              style={inputStyle}
              accessibilityLabel="Required image URL"
            />
          </Card>

          <Text className="mb-2 text-xs font-black uppercase" style={{ color: theme.muted }}>
            Core Details
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            {field("Item name", itemName, setItemName, "e.g. Paneer Butter Masala", "default", false, true)}
            {field("Description", description, setDescription, "Describe this item", "default", true)}
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
            {field("Preparation time", prepTime, setPrepTime, "20 mins", "numeric")}
          </Card>

          <Text className="mb-2 text-xs font-black uppercase" style={{ color: theme.muted }}>
            Pricing &amp; Marketing
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            <View className="mb-4">
              <Text
                className="mb-2 text-xs font-black uppercase"
                style={{ color: theme.muted }}
              >
                Regular price (₹) <Text style={{ color: theme.danger }}>*</Text>
              </Text>
              <TextInput
                value={regularPrice}
                onChangeText={(value) => {
                  setRegularPrice(value);
                  if (!value.trim()) setOfferPrice("");
                }}
                placeholder="0"
                placeholderTextColor={theme.muted}
                keyboardType="numeric"
                className="rounded-xl border px-4 py-3"
                style={{ ...inputStyle, minHeight: 48 }}
                accessibilityLabel="Required regular price in rupees"
              />
            </View>
            {showOfferPrice ? (
              <View className="mb-4">
                <Text
                  className="mb-2 text-xs font-black uppercase"
                  style={{
                    color: isOfferPriceInvalid ? theme.danger : theme.primary,
                  }}
                >
                  Offer price (₹) (Optional)
                </Text>
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="0"
                  placeholderTextColor={theme.muted}
                  keyboardType="numeric"
                  className="rounded-xl border-2 px-4 py-3"
                  style={{
                    ...inputStyle,
                    borderColor: isOfferPriceInvalid
                      ? theme.danger
                      : theme.primary,
                    color: isOfferPriceInvalid ? theme.danger : theme.text,
                    minHeight: 48,
                  }}
                  accessibilityLabel="Optional offer price in rupees"
                  accessibilityHint={
                    isOfferPriceInvalid
                      ? "Offer price must be greater than zero and less than the regular price."
                      : undefined
                  }
                />
                {isOfferPriceInvalid ? (
                  <Text
                    className="mt-1 text-xs font-semibold"
                    style={{ color: theme.danger }}
                    accessibilityRole="alert"
                  >
                    Must be greater than ₹0 and less than regular
                  </Text>
                ) : null}
              </View>
            ) : null}
            {field("Available quantity", quantity, setQuantity, "e.g. 50", "numeric", false, true)}
            <Text className="mb-2 text-xs font-bold uppercase" style={{ color: theme.muted }}>
              Image badge / marketing tag (Optional)
            </Text>
            <ScrollView
              horizontal
              className="mb-4"
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {marketingTagOptions.map(([value, label]) => {
                const selected = marketingTag === value;
                return (
                  <Pressable
                      key={value}
                      onPress={() => {
                        if (!customTagEnabled) setMarketingTag(value);
                      }}
                      disabled={customTagEnabled}
                      className="mr-2 rounded-xl border px-4 py-3"
                    style={{
                      backgroundColor: selected ? theme.primary : "transparent",
                      borderColor: selected ? theme.primary : theme.border,
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
            </ScrollView>
            <View className="mb-4 flex-row items-center">
              <View
                className="rounded-full border px-3 py-1"
                style={{
                  borderColor:
                    customTagEnabled || marketingTag === "none"
                      ? theme.border
                      : theme.primary,
                  backgroundColor:
                    customTagEnabled || marketingTag === "none"
                      ? theme.bg
                      : theme.primary,
                }}
              >
                <Text
                  className="text-[10px] font-black uppercase"
                  style={{
                    color:
                      customTagEnabled || marketingTag === "none"
                        ? theme.muted
                        : theme.primaryForeground,
                  }}
                >
                  {customTagEnabled || marketingTag === "none"
                    ? "No badge"
                    : marketingTag === "auto_discount"
                      ? autoDiscountAmount !== null
                        ? `₹${autoDiscountAmount} OFF`
                        : item?.discountLabel || "Auto Discount"
                      : marketingTag}
                </Text>
              </View>
              <Text className="ml-2 text-[10px]" style={{ color: theme.muted }}>
                Saved as marketingTag
              </Text>
            </View>
            <View
              className="mb-4 flex-row items-center rounded-xl border-2 border-dashed px-4 py-3"
              style={{ borderColor: theme.border }}
            >
              <Text className="flex-1 text-sm font-bold" style={{ color: theme.text }}>
                ✏️ Add Custom Tag
              </Text>
              <Switch
                value={customTagEnabled}
                onValueChange={(enabled) => {
                  setCustomTagEnabled(enabled);
                  setMarketingTag(enabled ? "none" : "auto_discount");
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
                accessibilityLabel="Enable custom tag"
              />
            </View>
            {customTagEnabled
              ? (
                  <>
                    {field(
                      "Custom tag",
                      customTag,
                      setCustomTag,
                      "e.g. ✨ Chef's Special",
                      "default",
                      false,
                      true,
                    )}
                    {customTag.trim() ? (
                      <View className="mb-2 flex-row items-center">
                        <View
                          className="rounded-full px-3 py-1"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <Text
                            className="text-[10px] font-black"
                            style={{ color: theme.primaryForeground }}
                          >
                            {customTag.trim()}
                          </Text>
                        </View>
                        <Text
                          className="ml-2 text-[10px]"
                          style={{ color: theme.muted }}
                        >
                          Saved as customTag
                        </Text>
                      </View>
                    ) : null}
                  </>
                )
              : null}
          </Card>

          <Text className="mb-2 text-xs font-black uppercase" style={{ color: theme.muted }}>
            Add-ons (Optional)
          </Text>
          {customizationGroups.map((group, groupIndex) => {
            const groupAvailable = group.options.some((option) => option.isAvailable);
            return (
              <Card
                key={`${group.name}-${groupIndex}`}
                variant="default"
                className="mb-4 rounded-3xl border p-5"
              >
                <View className="flex-row items-center">
                  <Text
                    className="mr-2 flex-1 text-lg font-black"
                    style={{
                      color: groupAvailable ? theme.text : theme.muted,
                    }}
                    numberOfLines={2}
                  >
                    {group.name}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => openEditGroupEditor(group, groupIndex)}
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: theme.bg }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${group.name}`}
                    >
                      <Feather name="edit-2" size={18} color={theme.text} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert("Delete add-on section?", `Remove "${group.name}" and its options?`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => removeCustomizationGroup(groupIndex),
                          },
                        ])
                      }
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: theme.bg }}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${group.name}`}
                    >
                      <Feather name="trash-2" size={18} color={theme.danger} />
                    </Pressable>
                    <Switch
                      value={groupAvailable}
                      onValueChange={(value) =>
                        toggleCustomizationGroup(groupIndex, value)
                      }
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#ffffff"
                      accessibilityLabel={`${groupAvailable ? "Disable" : "Enable"} ${group.name}`}
                    />
                  </View>
                </View>
                <View
                  className="my-3 border-b"
                  style={{ borderColor: theme.border }}
                />
                <Text className="mb-2 text-xs" style={{ color: theme.muted }}>
                  {group.selectionType === "single" ? "Choose one" : "Choose multiple"} ·
                  {" "}{group.minSelections}–{group.maxSelections} selections
                </Text>
                {group.options.map((option, optionIndex) => (
                  <View
                    key={`${option.name}-${optionIndex}`}
                    className="mb-2 flex-row items-center rounded-xl px-3 py-2"
                    style={{ backgroundColor: theme.bg }}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold"
                        style={{ color: theme.text }}
                      >
                        {option.name}
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                        +₹{option.price}
                      </Text>
                    </View>
                    <Switch
                      value={option.isAvailable}
                      onValueChange={(value) =>
                        toggleCustomizationOption(groupIndex, optionIndex, value)
                      }
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#ffffff"
                      accessibilityLabel={`${option.isAvailable ? "Disable" : "Enable"} ${option.name}`}
                    />
                    <Pressable
                      onPress={() =>
                        removeCustomizationOption(groupIndex, optionIndex)
                      }
                      className="ml-1 p-2"
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${option.name}`}
                    >
                      <Feather name="x" size={18} color={theme.danger} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => openNewOptionEditor(groupIndex)}
                  className="mt-2 items-center rounded-xl border-2 border-dashed px-3 py-3"
                  style={{ borderColor: theme.border }}
                >
                  <Text className="text-center text-sm font-bold" style={{ color: theme.text }}>
                    + Add option
                  </Text>
                </Pressable>
              </Card>
            );
          })}
          <Pressable
            onPress={openNewGroupEditor}
            className="mb-6 items-center rounded-2xl border-2 border-dashed py-4"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-sm font-bold" style={{ color: theme.text }}>
              + Add New Add-On Section
            </Text>
          </Pressable>

          <Button
            title={isNewItem ? "Publish Menu Item" : "Save Changes"}
            onPress={() => void handleSave()}
            loading={saving}
            disabled={saving}
          />
        </KeyboardAwareScrollView>
      )}

      <Modal
        visible={customizationEditor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomizationEditor(null)}
      >
        <SafeAreaView
          edges={["top", "bottom"]}
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
        >
          <KeyboardAwareScrollView
            className="flex-1 px-5"
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={24}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingVertical: 16,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View
              className="rounded-3xl border p-5"
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
            >
              <Text className="mb-5 text-xl font-black" style={{ color: theme.text }}>
                {customizationEditor?.type === "option"
                  ? "Add New Add-On"
                  : customizationEditor?.groupIndex === null
                    ? "Add Add-On Section"
                    : "Edit Add-On Section"}
              </Text>
              {customizationEditor?.type === "group" ? (
                <>
                  {field(
                    "Section name",
                    customizationName,
                    setCustomizationName,
                    "e.g. Spice Level",
                    "default",
                    false,
                    true,
                  )}
                </>
              ) : (
                <>
                  {field("Option name", optionName, setOptionName, "e.g. Extra spicy", "default", false, true)}
                  {field("Additional price (₹)", optionPrice, setOptionPrice, "0", "numeric", false, true)}
                </>
              )}
              <View className="mt-2 flex-row gap-3">
                <Pressable
                  onPress={() => setCustomizationEditor(null)}
                  className="h-14 flex-1 items-center justify-center rounded-xl border-2 px-2"
                  style={{ borderColor: theme.primary }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={saveCustomizationEditor}
                  className="h-14 flex-1 items-center justify-center rounded-xl border-2 px-2"
                  style={{
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.primaryForeground }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {customizationEditor?.type === "option"
                      ? "Add Option"
                      : "Save Section"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
