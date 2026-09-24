import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Edit2,
  Map,
  Navigation,
  Plus,
  Store,
  Trash2
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

export default function HotelAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // Safely find or create the branches section in store details
  let branchSection = MANAGER_MOCK_DATA.storeDetails.find(
    (s) => s.id === "sd_branches",
  );

  if (!branchSection) {
    branchSection = {
      id: "sd_branches",
      title: "Branch Location",
      selectionType: "single",
      isSectionActive: true,
      options: [],
    };
    MANAGER_MOCK_DATA.storeDetails.unshift(branchSection);
  }

  const [branches, setBranches] = useState<any[]>(branchSection.options || []);

  // Modal State for Add/Edit Branch
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const handleOpenAddModal = () => {
    setEditingId(null);
    setBranchName("");
    setBranchAddress("");
    setModalVisible(true);
  };

  const handleOpenEditModal = (branch: any) => {
    setEditingId(branch.id);
    setBranchName(branch.value);
    setBranchAddress(branch.subValue || "");
    setModalVisible(true);
  };

  const handleSaveBranch = () => {
    if (!branchName.trim() || !branchAddress.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please enter both Branch Name and Address.",
      );
      return;
    }

    if (!branchSection) return;

    if (editingId) {
      // Edit existing branch
      branchSection.options = branchSection.options.map((opt) =>
        opt.id === editingId
          ? { ...opt, value: branchName.trim(), subValue: branchAddress.trim() }
          : opt,
      );
    } else {
      // Add new branch
      const newOpt = {
        id: `branch_${Date.now()}`,
        value: branchName.trim(),
        subValue: branchAddress.trim(),
        isActive: true,
      };
      branchSection.options.unshift(newOpt);
    }

    setBranches([...branchSection.options]);
    setModalVisible(false);
  };

  const handleDeleteBranch = (id: string, name: string) => {
    Alert.alert("Delete Branch", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (branchSection) {
            branchSection.options = branchSection.options.filter(
              (opt) => opt.id !== id,
            );
            setBranches([...branchSection.options]);
          }
        },
      },
    ]);
  };

  const handleSimulateGPS = () => {
    Alert.alert("GPS Location", "Fetching coordinates from device GPS...");
    setBranchName("Gachibowli Express");
    setBranchAddress("DLF Cyber City, Gachibowli");
  };

  const handleSimulateMap = () => {
    Alert.alert("Map Picker", "Map pin dropped successfully.");
    setBranchName("Jubilee Hills Outlet");
    setBranchAddress("Road No 36, Jubilee Hills");
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
          Manage Hotel Branches
        </Text>
      </View>

      {/* Branch List */}
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          Active Dining & Takeaway Outlets (Visible to Customers)
        </Text>

        {branches.map((branch) => (
          <Card
            key={branch.id}
            variant="default"
            className="p-4 mb-4 rounded-2xl border-0 flex-row justify-between items-center"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <Store size={22} color={theme.primary} />
              <View className="ml-3 flex-1">
                <Text
                  className="text-base font-bold mb-0.5"
                  style={{ color: theme.text }}
                  numberOfLines={1}
                >
                  {branch.value}
                </Text>
                <Text
                  className="text-xs font-medium"
                  style={{ color: theme.muted }}
                  numberOfLines={2}
                >
                  {branch.subValue || "No address details provided"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => handleOpenEditModal(branch)}
                className="p-2"
                hitSlop={10}
              >
                <Edit2 size={18} color={theme.primary} />
              </Pressable>
              <Pressable
                onPress={() => handleDeleteBranch(branch.id, branch.value)}
                className="p-2"
                hitSlop={10}
              >
                <Trash2 size={18} color={theme.danger} />
              </Pressable>
            </View>
          </Card>
        ))}

        {/* Add New Branch Button */}
        <Pressable
          onPress={handleOpenAddModal}
          className="flex-row items-center justify-center p-4 mt-2 rounded-2xl border border-dashed"
          style={{
            borderColor: theme.primary,
            backgroundColor: theme.isDark
              ? "rgba(34, 197, 94, 0.05)"
              : "rgba(34, 197, 94, 0.02)",
          }}
        >
          <Plus size={20} color={theme.primary} strokeWidth={2.5} />
          <Text
            className="ml-2 font-black text-base"
            style={{ color: theme.primary }}
          >
            Add New Branch Outlet
          </Text>
        </Pressable>
      </ScrollView>

      {/* Add / Edit Branch Modal */}
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
                className="text-xl font-bold mb-4"
                style={{ color: theme.text }}
              >
                {editingId ? "Edit Branch Outlet" : "Add New Branch Outlet"}
              </Text>

              {/* GPS & Map Helpers for future Google Maps integration */}
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={handleSimulateGPS}
                  className="flex-1 p-3 rounded-xl items-center justify-center border border-dashed flex-row gap-2"
                  style={{
                    borderColor: theme.primary,
                    backgroundColor: theme.card,
                  }}
                >
                  <Navigation size={16} color={theme.primary} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.primary }}
                  >
                    Current GPS
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSimulateMap}
                  className="flex-1 p-3 rounded-xl items-center justify-center border border-dashed flex-row gap-2"
                  style={{
                    borderColor: theme.primary,
                    backgroundColor: theme.card,
                  }}
                >
                  <Map size={16} color={theme.primary} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: theme.primary }}
                  >
                    Open Map
                  </Text>
                </Pressable>
              </View>

              <Text
                className="text-xs font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                Branch Name / Title *
              </Text>
              <TextInput
                placeholder="e.g. Hitech City Premium"
                placeholderTextColor={theme.muted}
                value={branchName}
                onChangeText={setBranchName}
                className="px-4 rounded-xl mb-4 font-bold"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 16,
                  height: 52,
                }}
              />

              <Text
                className="text-xs font-bold mb-2 uppercase"
                style={{ color: theme.muted }}
              >
                Detailed Sub-Address *
              </Text>
              <TextInput
                placeholder="e.g. Inorbit Mall Madhapur"
                placeholderTextColor={theme.muted}
                value={branchAddress}
                onChangeText={setBranchAddress}
                multiline
                numberOfLines={3}
                className="px-4 rounded-xl mb-6 font-semibold pt-3"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: "top",
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
                  onPress={handleSaveBranch}
                  className="px-6 py-3 rounded-xl items-center"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text className="text-white font-bold text-sm">
                    Save Branch
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
