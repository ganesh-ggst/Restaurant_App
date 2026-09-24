import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  PackageX,
  SlidersHorizontal,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [foodItems, setFoodItems] = useState(MANAGER_MOCK_DATA.foodItems);

  // Custom Restock Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [customQuantity, setCustomQuantity] = useState("");

  const lowStockItems = foodItems.filter((item) => {
    const qty = item.quantity ?? 0;
    return (qty > 0 && qty < 10) || !item.isAvailable;
  });

  const openCustomRestockModal = (item: any) => {
    setSelectedItemId(item.id);
    setSelectedItemName(item.name);
    setCustomQuantity(String((item.quantity ?? 0) + 10));
    setModalVisible(true);
  };

  const handleSaveCustomRestock = () => {
    const parsedQty = parseInt(customQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid stock number.");
      return;
    }

    if (selectedItemId) {
      const itemIndex = MANAGER_MOCK_DATA.foodItems.findIndex(
        (i) => i.id === selectedItemId,
      );
      if (itemIndex > -1) {
        MANAGER_MOCK_DATA.foodItems[itemIndex].quantity = parsedQty;
        MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable = parsedQty > 0;
        setFoodItems([...MANAGER_MOCK_DATA.foodItems]);
      }
    }
    setModalVisible(false);
  };

  const handleToggleAvailability = (itemId: string) => {
    const itemIndex = MANAGER_MOCK_DATA.foodItems.findIndex(
      (i) => i.id === itemId,
    );
    if (itemIndex > -1) {
      MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable =
        !MANAGER_MOCK_DATA.foodItems[itemIndex].isAvailable;
      setFoodItems([...MANAGER_MOCK_DATA.foodItems]);
    }
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
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Inventory Notifications
        </Text>
      </View>

      {/* Notifications List */}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Actionable Alerts ({lowStockItems.length})
        </Text>

        {lowStockItems.length > 0 ? (
          lowStockItems.map((item) => {
            const isOut = !item.isAvailable;
            const alertColor = isOut ? theme.danger : "#f59e0b";
            const qty = item.quantity ?? 0;

            return (
              <Card
                key={item.id}
                variant="default"
                className="p-5 mb-4 rounded-3xl border-0 shadow-sm"
              >
                <View className="flex-row items-start">
                  <View
                    className="p-3 rounded-2xl mr-3.5"
                    style={{
                      backgroundColor: isDarkOrLight(theme, isOut),
                    }}
                  >
                    {isOut ? (
                      <PackageX size={22} color={alertColor} />
                    ) : (
                      <AlertTriangle size={22} color={alertColor} />
                    )}
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text
                        className="text-base font-bold flex-1 mr-2"
                        style={{ color: theme.text }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{
                          color: alertColor,
                          backgroundColor: isDarkOrLight(theme, isOut),
                        }}
                      >
                        {isOut ? "Out of Stock" : `${qty} Left`}
                      </Text>
                    </View>

                    <Text
                      className="text-xs font-medium mb-4 leading-5"
                      style={{ color: theme.muted }}
                    >
                      {isOut
                        ? `"${item.name}" is currently unavailable. Restock or toggle status to make it active for customers.`
                        : `Stock level has dropped below 10 units. Update quantity to maintain smooth store operations.`}
                    </Text>

                    {/* Manager Action Buttons */}
                    <View className="flex-row gap-3">
                      {!isOut && (
                        <Pressable
                          onPress={() => openCustomRestockModal(item)}
                          className="flex-1 py-3 px-4 rounded-2xl items-center flex-row justify-center gap-2"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <SlidersHorizontal size={16} color="#ffffff" />
                          <Text className="text-white text-xs font-bold tracking-wide">
                            Custom Restock
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => handleToggleAvailability(item.id)}
                        className={`py-3 px-4 rounded-2xl items-center flex-row justify-center border ${isOut ? "flex-1" : ""}`}
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                        }}
                      >
                        <CheckCircle size={16} color={theme.text} />
                        <Text
                          className="text-xs font-bold ml-1.5 tracking-wide"
                          style={{ color: theme.text }}
                        >
                          {isOut ? "Set In Stock" : "Unavailable"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card
            variant="default"
            className="p-8 rounded-3xl border-0 items-center justify-center mt-10"
          >
            <CheckCircle size={40} color={theme.primary} className="mb-3" />
            <Text
              className="text-base font-bold mb-1"
              style={{ color: theme.text }}
            >
              All Stock Levels Healthy!
            </Text>
            <Text
              className="text-xs text-center"
              style={{ color: theme.muted }}
            >
              No low stock or out-of-stock items require your attention right
              now.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Custom Restock Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center px-4 py-12"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card
              variant="default"
              className="p-6 rounded-3xl border-0 shadow-lg"
            >
              <Text
                className="text-xl font-bold mb-1"
                style={{ color: theme.text }}
              >
                Custom Restock
              </Text>
              <Text className="text-xs mb-6" style={{ color: theme.muted }}>
                Update inventory quantity for{" "}
                <Text className="font-bold" style={{ color: theme.text }}>
                  {selectedItemName}
                </Text>
              </Text>

              <Text
                className="text-xs font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                New Stock Quantity *
              </Text>
              <TextInput
                placeholder="e.g. 25"
                placeholderTextColor={theme.muted}
                value={customQuantity}
                onChangeText={setCustomQuantity}
                keyboardType="numeric"
                autoFocus={true}
                className="px-4 rounded-xl mb-6 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 18,
                  height: 56,
                }}
              />

              <View className="flex-row justify-end gap-3">
                <Pressable
                  onPress={() => setModalVisible(false)}
                  className="px-6 py-3 rounded-xl border"
                  style={{ borderColor: theme.border }}
                >
                  <Text
                    className="font-bold text-sm"
                    style={{ color: theme.text }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveCustomRestock}
                  className="px-6 py-3 rounded-xl items-center"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-bold text-sm">
                    Update Stock
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function isDarkOrLight(theme: any, isOut: boolean) {
  if (theme.isDark) {
    return isOut ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)";
  }
  return isOut ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)";
}
