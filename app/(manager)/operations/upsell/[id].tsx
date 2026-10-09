import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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

  const handleSave = async () => {
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
    if (!/^https?:\/\/\S+$/i.test(imageUrl.trim())) {
      Alert.alert(
        "Valid image required",
        "Enter an image URL starting with http:// or https://.",
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
          borderColor: theme.border,
          color: theme.text,
          minHeight: multiline ? 88 : 48,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
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
            Media *
          </Text>
          <Card variant="default" className="mb-5 rounded-3xl border p-5">
            {field("Image URL", imageUrl, setImageUrl, "https://...", "default", false, true)}
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
            {field("Cross-sell name", name, setName, "e.g. Refreshing drink", "default", false, true)}
            {field("Description", description, setDescription, "Describe this item", "default", true)}
            {field("Regular price (₹)", price, setPrice, "0", "numeric", false, true)}
            {field("Available quantity", quantity, setQuantity, "e.g. 30", "numeric", false, true)}
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
