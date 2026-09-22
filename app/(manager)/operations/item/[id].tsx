import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
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
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
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
          price: 0,
          offerPrice: 0,
          coupon: "",
          isAvailable: true,
          categoryId: categoryId || "",
        };

  // --- FORM STATES ---
  const [images, setImages] = useState<string[]>(
    isNewItem ? [] : ["mock_existing_image"],
  );
  const [itemName, setItemName] = useState(initialItem.name);
  const [itemPrice, setItemPrice] = useState(
    initialItem.price ? initialItem.price.toString() : "",
  );
  const [itemOfferPrice, setItemOfferPrice] = useState(
    (initialItem as any).offerPrice
      ? (initialItem as any).offerPrice.toString()
      : "",
  );
  const [itemCoupon, setItemCoupon] = useState(
    (initialItem as any).coupon || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  // --- ADD-ON STATES ---
  const [addonGroups, setAddonGroups] = useState([
    {
      id: "g1",
      name: "Biryani Add Ons",
      isActive: true,
      options: [
        { id: "o1", name: "Chicken 65 Full", price: 269, isAvailable: true },
      ],
    },
    {
      id: "g2",
      name: "Desserts",
      isActive: true,
      options: [
        { id: "o2", name: "Apricot Delight", price: 125, isAvailable: true },
      ],
    },
  ]);

  const [isOptionModalVisible, setIsOptionModalVisible] = useState(false);
  const [optionMode, setOptionMode] = useState<"add" | "edit">("add");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");

  // Refs for focusing inputs
  const optionNameRef = useRef<TextInput>(null);
  const optionPriceRef = useRef<TextInput>(null);
  const groupNameRefs = useRef<Record<string, TextInput | null>>({});

  // --- IMAGE PICKER HANDLERS ---
  const handleAddMedia = () => {
    Alert.alert("Upload Media", "Choose an option to add a photo.", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your gallery to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your camera to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // --- ADD-ON HANDLERS ---
  const updateGroupName = (groupId: string, newName: string) => {
    setAddonGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g)),
    );
  };

  const toggleGroupStatus = (groupId: string) => {
    setAddonGroups((groups) =>
      groups.map((g) =>
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
          onPress: () => {
            setAddonGroups((groups) => groups.filter((g) => g.id !== groupId));
          },
        },
      ],
    );
  };

  const addGroup = () => {
    const newGroupId = `g_${Date.now()}`;
    setAddonGroups([
      ...addonGroups,
      {
        id: newGroupId,
        name: "New Add-On Section",
        isActive: true,
        options: [],
      },
    ]);
  };

  const toggleOptionAvailability = (groupId: string, optionId: string) => {
    setAddonGroups((groups) =>
      groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.map((o) =>
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

    setAddonGroups((groups) =>
      groups.map((g) => {
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
              options: g.options.map((o) =>
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
      setAddonGroups((groups) =>
        groups.map((g) => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              options: g.options.filter((o) => o.id !== editingOptionId),
            };
          }
          return g;
        }),
      );
      setIsOptionModalVisible(false);
    }
  };

  // --- SAVE LOGIC ---
  const handleSaveChanges = () => {
    if (images.length === 0) {
      Alert.alert("Missing Media", "At least 1 image is mandatory.");
      return;
    }
    if (!itemName.trim() || !itemPrice.trim() || !itemOfferPrice.trim()) {
      Alert.alert(
        "Missing Details",
        "Item Name, Regular Price, and Offer Price are mandatory.",
      );
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      if (isNewItem) {
        const newItem = {
          id: `food_${Date.now()}`,
          name: itemName.trim(),
          price: parseInt(itemPrice) || 0,
          offerPrice: parseInt(itemOfferPrice) || 0,
          coupon: itemCoupon.trim(),
          isAvailable: true,
          categoryId: initialItem.categoryId,
          addOns: addonGroups as any,
          crossSellItems: [],
        };
        MANAGER_MOCK_DATA.foodItems = [newItem, ...MANAGER_MOCK_DATA.foodItems];
      } else if (existingItemIndex > -1) {
        MANAGER_MOCK_DATA.foodItems[existingItemIndex] = {
          ...MANAGER_MOCK_DATA.foodItems[existingItemIndex],
          name: itemName.trim(),
          price: parseInt(itemPrice) || 0,
          offerPrice: parseInt(itemOfferPrice) || 0,
          coupon: itemCoupon.trim(),
          addOns: addonGroups as any,
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
          {/* MEDIA SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Media (Min 1 Mandatory){" "}
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
                <Text className="text-xs mt-1" style={{ color: theme.muted }}>
                  Tap to open gallery or camera
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
                  {img.startsWith("file://") || img.startsWith("content://") ? (
                    <Image
                      source={{ uri: img }}
                      style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-3xl absolute top-6 left-7 opacity-30">
                      🍲
                    </Text>
                  )}
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
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: theme.text }}
                >
                  Add More
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* DETAILS SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Details <Text style={{ color: theme.danger }}>*</Text>
          </Text>
          <Card variant="default" className="p-4 mb-6 rounded-3xl border-0">
            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Item Name
            </Text>
            <TextInput
              placeholder="e.g. Chicken Dum Biryani"
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
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text
                  className="text-xs font-bold mb-2 uppercase"
                  style={{ color: theme.muted }}
                >
                  Regular Price (₹) *
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
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                />
              </View>

              <View className="flex-1">
                <Text
                  className="text-xs font-bold mb-2 uppercase"
                  style={{ color: theme.primary }}
                >
                  Offer Price (₹) *
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
                    color: theme.primary,
                    borderColor: theme.primary,
                    fontSize: 18,
                    height: 56,
                    textAlignVertical: "center",
                    paddingTop: 0,
                    paddingBottom: 0,
                  }}
                />
              </View>
            </View>

            <Text
              className="text-xs font-bold mb-2 uppercase"
              style={{ color: theme.muted }}
            >
              Coupon Code (Optional)
            </Text>
            <TextInput
              placeholder="e.g. SAVE20"
              placeholderTextColor={theme.muted}
              value={itemCoupon}
              onChangeText={setItemCoupon}
              className="px-4 rounded-xl font-bold uppercase"
              style={{
                backgroundColor: theme.bg,
                color: theme.text,
                fontSize: 16,
                height: 52,
                textAlignVertical: "center",
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
          </Card>

          {/* ADD-ONS SECTION */}
          <Text
            className="text-xs font-bold mb-3 uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            Add-Ons (Optional)
          </Text>

          {addonGroups.map((group) => (
            <Card
              key={group.id}
              variant="default"
              className="p-4 mb-4 rounded-3xl border-0"
            >
              {/* Heading with Order: Edit -> Delete -> Toggle */}
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

              {/* Add-On Item Rows */}
              {group.options.map((opt) => (
                <View
                  key={opt.id}
                  className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-xl"
                  style={{ backgroundColor: theme.bg }}
                >
                  {/* Text (Tappable for Edit) */}
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

                  {/* Grouped Controls (Pencil + Switch) */}
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

          {/* Add New Section Button */}
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
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Option Add/Edit Modal */}
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
                style={{ color: theme.muted }}
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
