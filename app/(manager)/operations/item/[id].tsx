import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import {
  FoodItemBadge,
  MANAGER_MOCK_DATA,
} from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function EditMenuItemScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id, categoryId } = useLocalSearchParams<{
    id: string;
    categoryId?: string;
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
          categoryId: categoryId || "",
          images: [],
          dietaryPreference: "veg" as const,
          rating: 4.5,
          prepTime: "20 mins",
          badge: { type: "none", text: "" } as FoodItemBadge,
          addOns: [],
        };

  // State: Core & Media
  const [images, setImages] = useState<string[]>(initialItem.images || []);
  const [itemName, setItemName] = useState(initialItem.name);
  const [itemDescription, setItemDescription] = useState(
    initialItem.description || "",
  );
  const [itemPrice, setItemPrice] = useState(
    initialItem.price ? initialItem.price.toString() : "",
  );

  // FIX: Only initialize offer price if it's a valid number greater than 0, otherwise keep blank
  const [itemOfferPrice, setItemOfferPrice] = useState(
    (initialItem as any).offerPrice && (initialItem as any).offerPrice > 0
      ? (initialItem as any).offerPrice.toString()
      : "",
  );

  const [itemCoupon, setItemCoupon] = useState(
    (initialItem as any).coupon || "",
  );
  const [itemQuantity, setItemQuantity] = useState(
    (initialItem as any).quantity !== null &&
      (initialItem as any).quantity !== undefined
      ? (initialItem as any).quantity.toString()
      : "",
  );

  // State: New Display & Marketing Fields
  const [itemDietary, setItemDietary] = useState<"veg" | "non-veg">(
    initialItem.dietaryPreference === "non-veg" ? "non-veg" : "veg",
  );
  const [itemPrepTime, setItemPrepTime] = useState(
    initialItem.prepTime || "20 mins",
  );
  const [itemBadgeType, setItemBadgeType] = useState<FoodItemBadge["type"]>(
    (initialItem as any).badge?.type || "none",
  );
  const [itemBadgeText, setItemBadgeText] = useState(
    (initialItem as any).badge?.text || "",
  );

  const [isSaving, setIsSaving] = useState(false);

  // Add-Ons
  const [addonGroups, setAddonGroups] = useState(
    (initialItem as any).addOns || [],
  );
  const [isOptionModalVisible, setIsOptionModalVisible] = useState(false);
  const [optionMode, setOptionMode] = useState<"add" | "edit">("add");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");

  const optionNameRef = useRef<TextInput>(null);
  const optionPriceRef = useRef<TextInput>(null);
  const groupNameRefs = useRef<Record<string, TextInput | null>>({});

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
      aspect: [4, 3],
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
      aspect: [4, 3],
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

  const updateGroupName = (groupId: string, newName: string) => {
    setAddonGroups((groups: any) =>
      groups.map((g: any) => (g.id === groupId ? { ...g, name: newName } : g)),
    );
  };

  const toggleGroupStatus = (groupId: string) => {
    setAddonGroups((groups: any) =>
      groups.map((g: any) =>
        g.id === groupId ? { ...g, isActive: !(g as any).isActive } : g,
      ),
    );
  };

  const deleteGroup = (groupId: string) => {
    Alert.alert(
      "Delete Section",
      "Are you sure you want to delete this entire add-on section?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            setAddonGroups((groups: any) =>
              groups.filter((g: any) => g.id !== groupId),
            ),
        },
      ],
    );
  };

  const addGroup = () => {
    setAddonGroups((groups: any) => [
      ...groups,
      {
        id: `g_${Date.now()}`,
        name: "New Add-On Section",
        isActive: true,
        options: [],
      },
    ]);
  };

  const toggleOptionAvailability = (groupId: string, optionId: string) => {
    setAddonGroups((groups: any) =>
      groups.map((g: any) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map((o: any) =>
              o.id === optionId ? { ...o, isAvailable: !o.isAvailable } : o,
            ),
          };
        }
        return g;
      }),
    );
  };

  const openAddOptionModal = (groupId: string) => {
    setOptionMode("add");
    setActiveGroupId(groupId);
    setEditingOptionId(null);
    setOptionName("");
    setOptionPrice("");
    setIsOptionModalVisible(true);
  };

  const openEditOptionModal = (groupId: string, option: any) => {
    setOptionMode("edit");
    setActiveGroupId(groupId);
    setEditingOptionId(option.id);
    setOptionName(option.name);
    setOptionPrice(option.price.toString());
    setIsOptionModalVisible(true);
  };

  const handleSaveOption = () => {
    if (!optionName.trim() || !optionPrice.trim() || !activeGroupId) return;
    setAddonGroups((groups: any) =>
      groups.map((g: any) => {
        if (g.id === activeGroupId) {
          if (optionMode === "add") {
            return {
              ...g,
              options: [
                ...g.options,
                {
                  id: `opt_${Date.now()}`,
                  name: optionName.trim(),
                  price: parseInt(optionPrice) || 0,
                  isAvailable: true,
                },
              ],
            };
          } else if (optionMode === "edit" && editingOptionId) {
            return {
              ...g,
              options: g.options.map((o: any) =>
                o.id === editingOptionId
                  ? {
                      ...o,
                      name: optionName.trim(),
                      price: parseInt(optionPrice) || 0,
                    }
                  : o,
              ),
            };
          }
        }
        return g;
      }),
    );
    setIsOptionModalVisible(false);
  };

  const handleDeleteOption = () => {
    if (activeGroupId && editingOptionId) {
      setAddonGroups((groups: any) =>
        groups.map((g: any) => {
          if (g.id === activeGroupId)
            return {
              ...g,
              options: g.options.filter((o: any) => o.id !== editingOptionId),
            };
          return g;
        }),
      );
      setIsOptionModalVisible(false);
    }
  };

  const handleSaveChanges = () => {
    if (images.length === 0)
      return Alert.alert(
        "Missing Media",
        "At least 1 image is mandatory for the carousel.",
      );

    const regPrice = parseInt(itemPrice) || 0;

    // FIX: Explicitly store as null or undefined if empty/0 so it doesn't default to 0
    const offPrice =
      itemOfferPrice.trim() !== "" &&
      !isNaN(parseInt(itemOfferPrice)) &&
      parseInt(itemOfferPrice) > 0
        ? parseInt(itemOfferPrice)
        : null;

    const qty = itemQuantity.trim() ? parseInt(itemQuantity) : null;

    if (
      !itemName.trim() ||
      regPrice <= 0 ||
      !itemDescription.trim() ||
      !itemPrepTime.trim() ||
      qty === null ||
      qty < 0
    ) {
      return Alert.alert(
        "Missing Details",
        "Name, Description, Price, Prep Time, and Quantity are mandatory.",
      );
    }

    if (isOfferInvalid)
      return Alert.alert(
        "Invalid Price",
        "Offer Price must be less than the Regular Price.",
      );

    setIsSaving(true);
    setTimeout(() => {
      const payload = {
        name: itemName.trim(),
        description: itemDescription.trim(),
        images,
        dietaryPreference: itemDietary,
        prepTime: itemPrepTime.trim(),
        badge: { type: itemBadgeType, text: itemBadgeText.trim() },
        price: regPrice,
        offerPrice: offPrice,
        coupon: itemCoupon.trim(),
        quantity: qty,
        addOns: addonGroups as any,
      };

      if (isNewItem) {
        MANAGER_MOCK_DATA.foodItems = [
          {
            id: `food_${Date.now()}`,
            categoryId: initialItem.categoryId,
            isAvailable: true,
            rating: 4.5,
            crossSellItems: [],
            ...payload,
          },
          ...MANAGER_MOCK_DATA.foodItems,
        ];
      } else if (existingItemIndex > -1) {
        MANAGER_MOCK_DATA.foodItems[existingItemIndex] = {
          ...MANAGER_MOCK_DATA.foodItems[existingItemIndex],
          ...payload,
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
          {isNewItem ? "Add Menu Item" : "Edit Menu Item"}
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
          {/* --- MEDIA SECTION --- */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Media Carousel (Min 1 Mandatory){" "}
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

          {/* --- CORE DETAILS SECTION --- */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Core Details <Text style={{ color: theme.danger }}>*</Text>
          </Text>
          <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Item Name
            </Text>
            <TextInput
              placeholder="e.g. Paneer Butter Masala"
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
              }}
            />

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Description
            </Text>
            <TextInput
              placeholder="e.g. Soft paneer cubes cooked in a rich, creamy tomato gravy with butter."
              placeholderTextColor={theme.muted}
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline={true}
              numberOfLines={3}
              className="px-4 py-3 rounded-xl mb-4 font-medium"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Dietary Preference
            </Text>
            <View className="flex-row gap-3 mb-4">
              {[
                { id: "veg", label: "Veg", icon: "🟢" },
                { id: "non-veg", label: "Non-Veg", icon: "🔴" },
              ].map((diet) => (
                <Pressable
                  key={diet.id}
                  onPress={() => setItemDietary(diet.id as any)}
                  className="flex-1 px-3 py-3 rounded-xl border-2 flex-row items-center justify-center"
                  style={{
                    borderColor:
                      itemDietary === diet.id ? theme.primary : theme.border,
                    backgroundColor:
                      itemDietary === diet.id ? theme.primary : "transparent",
                  }}
                >
                  <Text className="mr-2 text-sm">{diet.icon}</Text>
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color: itemDietary === diet.id ? "#ffffff" : theme.muted,
                    }}
                  >
                    {diet.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Preparation Time
            </Text>
            <TextInput
              placeholder="e.g. 25 mins"
              placeholderTextColor={theme.muted}
              value={itemPrepTime}
              onChangeText={setItemPrepTime}
              className="px-4 rounded-xl mb-2 font-bold"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 18,
                height: 56,
                textAlignVertical: "center",
              }}
            />
          </Card>

          {/* --- PRICING & MARKETING SECTION --- */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Pricing & Marketing
          </Text>
          <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text
                  className="text-xs font-bold mb-2 uppercase"
                  style={{ color: theme.muted }}
                >
                  Regular Price (₹){" "}
                  <Text style={{ color: theme.danger }}>*</Text>
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
              onChangeText={setItemQuantity}
              keyboardType="numeric"
              className="px-4 rounded-xl font-bold mb-5"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 18,
                height: 56,
                textAlignVertical: "center",
              }}
            />

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Image Badge / Marketing Tag
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              {[
                { id: "none", label: "None" },
                { id: "auto_discount", label: "Auto Discount" },
                { id: "bestseller", label: "⭐️ Bestseller" },
                { id: "hot", label: "🔥 Hot" },
                { id: "new", label: "🆕 New" },
              ].map((badge) => (
                <Pressable
                  key={badge.id}
                  onPress={() => {
                    setItemBadgeType(badge.id as any);
                    setItemBadgeText("");
                  }}
                  className="px-4 py-2 rounded-xl mr-2 border-2"
                  style={{
                    borderColor:
                      itemBadgeType === badge.id ? theme.primary : theme.border,
                    backgroundColor:
                      itemBadgeType === badge.id
                        ? theme.primary
                        : "transparent",
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{
                      color:
                        itemBadgeType === badge.id ? "#ffffff" : theme.muted,
                    }}
                  >
                    {badge.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View
              className="flex-row items-center justify-between p-3 rounded-2xl mb-4 border-2 border-dashed"
              style={{ borderColor: theme.border }}
            >
              <Text className="text-sm font-bold" style={{ color: theme.text }}>
                ✏️ Add Custom Tag
              </Text>
              <Switch
                value={itemBadgeType === "custom"}
                onValueChange={(val) => {
                  setItemBadgeType(val ? "custom" : "none");
                  if (!val) setItemBadgeText("");
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                ios_backgroundColor={theme.border}
                thumbColor={"#ffffff"}
                style={{ transform: [{ scale: 0.8 }] }}
              />
            </View>

            {itemBadgeType === "custom" && (
              <TextInput
                placeholder="e.g. FESTIVAL SPL (Max 12 chars)"
                placeholderTextColor={theme.muted}
                value={itemBadgeText}
                onChangeText={setItemBadgeText}
                maxLength={12}
                className="px-4 rounded-xl font-bold uppercase mb-4 border-2"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: theme.primary,
                  fontSize: 16,
                  height: 52,
                  textAlignVertical: "center",
                }}
              />
            )}

            {/* PRICING & BADGE PREVIEW BOX */}
            {itemOfferPrice.trim() !== "" &&
              !isOfferInvalid &&
              !isNaN(parseInt(itemOfferPrice)) &&
              parseInt(itemOfferPrice) > 0 && (
                <View
                  className="mb-4 p-3 rounded-xl border border-dashed"
                  style={{
                    borderColor: theme.primary,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    className="text-xs font-bold mb-1"
                    style={{ color: theme.primary }}
                  >
                    💰 App Display Preview:
                  </Text>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.text }}
                  >
                    Price Text:{" "}
                    <Text
                      style={{
                        textDecorationLine: "line-through",
                        color: theme.muted,
                      }}
                    >
                      ₹{itemPrice}
                    </Text>{" "}
                    <Text style={{ fontWeight: "bold", color: theme.primary }}>
                      ₹{itemOfferPrice}
                    </Text>
                  </Text>
                  {itemBadgeType === "auto_discount" &&
                  Number(itemPrice) > 0 ? (
                    <Text
                      className="text-xs font-medium mt-1"
                      style={{ color: theme.text }}
                    >
                      Image Badge:{" "}
                      <Text
                        style={{ fontWeight: "bold", color: theme.primary }}
                      >
                        {Math.round(
                          ((Number(itemPrice) - Number(itemOfferPrice)) /
                            Number(itemPrice)) *
                            100,
                        )}
                        % OFF
                      </Text>
                    </Text>
                  ) : itemBadgeType !== "none" ? (
                    <Text
                      className="text-[10px] mt-1"
                      style={{ color: theme.muted }}
                    >
                      (The discounted price above is shown to users regardless
                      of the '{itemBadgeType}' image tag)
                    </Text>
                  ) : null}
                </View>
              )}
          </Card>

          {/* ADD-ONS SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Add-Ons (Optional)
          </Text>
          {addonGroups.map((group: any) => (
            <Card
              key={group.id}
              variant="default"
              className="p-4 mb-4 rounded-3xl border-0"
            >
              <View
                className="flex-row items-center justify-between border-b mb-4 pb-2"
                style={{ borderBottomColor: theme.border }}
              >
                <TextInput
                  ref={(el) => {
                    groupNameRefs.current[group.id] = el;
                  }}
                  value={group.name}
                  onChangeText={(text) => updateGroupName(group.id, text)}
                  placeholder="Section Name (e.g. Desserts)"
                  placeholderTextColor={theme.muted}
                  selectTextOnFocus={true}
                  className="flex-1 font-black text-xl mr-2"
                  style={{ color: theme.text, padding: 0 }}
                />
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => groupNameRefs.current[group.id]?.focus()}
                    className="p-2 mr-1"
                  >
                    <Feather name="edit-2" size={16} color={theme.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => deleteGroup(group.id)}
                    className="p-2 mr-2"
                    hitSlop={10}
                  >
                    <Feather name="trash-2" size={16} color={theme.danger} />
                  </Pressable>
                  <Switch
                    value={(group as any).isActive ?? true}
                    onValueChange={() => toggleGroupStatus(group.id)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    ios_backgroundColor={theme.border}
                    thumbColor={"#ffffff"}
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                </View>
              </View>
              {group.options.map((opt: any) => (
                <View
                  key={opt.id}
                  className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-xl"
                  style={{ backgroundColor: theme.bg }}
                >
                  <Pressable
                    className="flex-1 justify-center mr-4 py-1"
                    onPress={() => openEditOptionModal(group.id, opt)}
                  >
                    <Text
                      className="text-base font-semibold"
                      style={{ color: theme.text }}
                    >
                      {opt.name}
                    </Text>
                    <Text
                      className="text-sm font-bold"
                      style={{ color: theme.primary }}
                    >
                      +₹{opt.price}
                    </Text>
                  </Pressable>
                  <View className="flex-row items-center justify-center">
                    <Pressable
                      onPress={() => openEditOptionModal(group.id, opt)}
                      className="px-3"
                      hitSlop={10}
                    >
                      <Feather name="edit-2" size={14} color={theme.muted} />
                    </Pressable>
                    <Switch
                      value={opt.isAvailable}
                      onValueChange={() =>
                        toggleOptionAvailability(group.id, opt.id)
                      }
                      trackColor={{ false: theme.border, true: theme.primary }}
                      ios_backgroundColor={theme.border}
                      thumbColor={"#ffffff"}
                      style={{ transform: [{ scale: 0.8 }] }}
                    />
                  </View>
                </View>
              ))}
              <Pressable
                onPress={() => openAddOptionModal(group.id)}
                className="mt-2 py-3 items-center rounded-xl border-dashed border-2"
                style={{ borderColor: theme.border }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.text }}
                >
                  + Add Option to {group.name || "Section"}
                </Text>
              </Pressable>
            </Card>
          ))}
          <Pressable
            onPress={addGroup}
            className="mb-6 py-4 items-center rounded-3xl border-dashed border-2"
            style={{ borderColor: theme.border }}
          >
            <Text className="text-base font-bold" style={{ color: theme.text }}>
              + Add New Add-On Section
            </Text>
          </Pressable>

          <Button
            title={isNewItem ? "Publish Menu Item" : "Save Changes"}
            onPress={handleSaveChanges}
            loading={isSaving}
            className="py-4 mt-2"
            disabled={isOfferInvalid}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isOptionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            className="flex-1 justify-center px-6"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
            >
              <Text
                className="text-xl font-bold mb-5"
                style={{ color: theme.text }}
              >
                {optionMode === "add" ? "Add New Add-On" : "Edit Add-On"}
              </Text>
              <Text
                className="text-sm font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                Option Name
              </Text>
              <TextInput
                ref={optionNameRef}
                placeholder="e.g. Double Ka Meetha"
                placeholderTextColor={theme.muted}
                value={optionName}
                onChangeText={setOptionName}
                className="px-4 py-4 rounded-xl mb-5 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 18,
                }}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => optionPriceRef.current?.focus()}
                autoFocus={true}
              />
              <Text
                className="text-sm font-bold mb-2 uppercase"
                style={{
                  color: theme.muted,
                }}
              >
                Additional Price (₹)
              </Text>
              <TextInput
                ref={optionPriceRef}
                placeholder="0"
                placeholderTextColor={theme.muted}
                value={optionPrice}
                onChangeText={setOptionPrice}
                keyboardType="numeric"
                className="px-4 py-4 rounded-xl mb-8 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 18,
                }}
              />
              <View className="flex-row justify-between items-center mt-2">
                {optionMode === "edit" ? (
                  <Pressable onPress={handleDeleteOption} className="p-2 -ml-2">
                    <Text
                      className="text-sm uppercase tracking-wider"
                      style={{ color: theme.danger, fontWeight: "bold" }}
                    >
                      🗑️ Delete
                    </Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <View className="flex-row">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsOptionModalVisible(false)}
                    className="mr-3 py-3 px-6"
                  />
                  <Button
                    title={optionMode === "add" ? "Add Option" : "Save"}
                    onPress={handleSaveOption}
                    className="py-3 px-8"
                  />
                </View>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
