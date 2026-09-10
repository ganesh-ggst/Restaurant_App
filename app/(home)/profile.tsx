import { useGlobalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Palette,
  Plus,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  UserRoundPen,
  X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOCK_ADDRESSES, MOCK_USER } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { useOrderMode } from "./_layout";

// Dummy Notifications
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: "Order Delivered! 📦",
    desc: "Your Biryani has arrived safely. Enjoy your meal!",
    time: "2h ago",
    read: false,
  },
  {
    id: 2,
    title: "Exclusive 50% OFF 🎉",
    desc: "Check out the Offers tab for a massive weekend discount.",
    time: "5h ago",
    read: true,
  },
  {
    id: 3,
    title: "Security Alert",
    desc: "New login detected from an unrecognized device.",
    time: "1d ago",
    read: true,
  },
];

const themeOptions = [
  { label: "Light Mode", value: "light", icon: Sun },
  { label: "Dark Mode", value: "dark", icon: Moon },
  { label: "System Default", value: "system", icon: Smartphone },
];

// --- STABLE EXTERNAL COMPONENTS ---

const SettingsRow = ({
  icon: Icon,
  label,
  onPress,
  isLast = false,
  theme,
}: any) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center justify-between py-4 ${!isLast ? "border-b" : ""}`}
    style={{ borderBottomColor: theme.border }}
  >
    <View className="flex-row items-center gap-4">
      <Icon size={22} color={theme.primary} strokeWidth={2} />
      <Text className="text-base font-semibold" style={{ color: theme.text }}>
        {label}
      </Text>
    </View>
    <ChevronRight size={20} color={theme.muted} strokeWidth={2} />
  </Pressable>
);

const AnimatedStackScreen = ({
  isVisible,
  title,
  children,
  zIndex = 10,
  theme,
  insets,
  onBack,
}: any) => {
  if (!isVisible) return null;
  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutRight.duration(300)}
      className="absolute inset-0"
      style={{
        backgroundColor: theme.bg,
        paddingTop: insets.top,
        zIndex,
        elevation: zIndex,
      }}
    >
      <View
        className="flex-row items-center px-4 py-4 border-b z-10 shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable onPress={onBack} className="mr-4 p-1" hitSlop={15}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          {title}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
};

export default function ProfileScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const theme = useAppTheme();
  const dangerColor = isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)";

  const { phone } = useGlobalSearchParams<{ phone?: string }>();

  const [userData, setUserData] = useState<any>(MOCK_USER);
  const [localAddresses, setLocalAddresses] = useState<any[]>(
    MOCK_ADDRESSES as any,
  );

  // Forms State
  const [editFirstName, setEditFirstName] = useState(
    userData?.first_name || "",
  );
  const [editLastName, setEditLastName] = useState(userData?.last_name || "");
  const [newAddressType, setNewAddressType] = useState("");
  const [newAddressText, setNewAddressText] = useState("");

  // --- CUSTOM IPHONE-STYLE STACK NAVIGATION ---
  const [stack, setStack] = useState<string[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const pushScreen = (screen: string) => {
    if (screen === "personal") {
      setEditFirstName(userData?.first_name || "");
      setEditLastName(userData?.last_name || "");
    } else if (screen === "add_address") {
      setNewAddressType("");
      setNewAddressText("");
    }
    setStack((prev) => [...prev, screen]);
  };

  const popScreen = () => setStack((prev) => prev.slice(0, -1));

  // Android Hardware Back Button Support
  useEffect(() => {
    const onBackPress = () => {
      if (stack.length > 0) {
        popScreen();
        return true;
      }
      if (showThemeModal) {
        setShowThemeModal(false);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [stack, showThemeModal]);

  const { mode: orderMode, carts } = useOrderMode();
  const activeCart = carts[orderMode] || [];
  const activeCartTotalItems = activeCart.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  useEffect(() => {
    const fetchUser = async () => {
      if (phone) {
        try {
          const data = await api.getUserByPhone(phone);
          if (data && data.exists && data.user) {
            setUserData(data.user);
            setEditFirstName(data.user.first_name);
            setEditLastName(data.user.last_name || "");
          }
        } catch (error) {
          console.error("Failed to fetch user", error);
        }
      }
    };
    fetchUser();
  }, [phone]);

  const displayFirstName = userData?.first_name || "Guest";
  const displayPhone = userData?.phone_number || "+91 0000000000";

  // --- ACTIONS ---

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => router.replace("/(auth)/login" as any),
      },
    ]);
  };

  const handleComingSoon = (featureName: string) => {
    Alert.alert(
      "Coming Soon",
      `${featureName} is currently under development.`,
    );
  };

  const savePersonalInfo = () => {
    setUserData({
      ...userData,
      first_name: editFirstName,
      last_name: editLastName,
    });
    popScreen();
  };

  const confirmDeleteAddress = (id: string | number) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            setLocalAddresses((prev) => prev.filter((addr) => addr.id !== id)),
        },
      ],
    );
  };

  const handleAddAddressSubmit = () => {
    if (!newAddressType.trim() || !newAddressText.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please enter both an address label and the full address.",
      );
      return;
    }
    const newAddr = {
      id: Date.now().toString(),
      type: newAddressType.trim(),
      address: newAddressText.trim(),
    };
    setLocalAddresses([...localAddresses, newAddr]);
    setNewAddressType("");
    setNewAddressText("");
    popScreen();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* --- BASE PROFILE SCREEN --- */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: activeCartTotalItems > 0 ? 180 : 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10 px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-5 border-[2px]"
            style={{ backgroundColor: theme.bg, borderColor: theme.primary }}
          >
            <UserRound size={40} color={theme.primary} strokeWidth={1.5} />
          </View>
          <Text
            className="text-2xl font-black mb-1"
            style={{ color: theme.text }}
          >
            {displayFirstName}
          </Text>
          <Text
            className="text-sm font-semibold tracking-wide"
            style={{ color: theme.muted }}
          >
            {displayPhone}
          </Text>
        </View>

        <View className="px-5 gap-6">
          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={UserRoundPen}
              label="Personal Info"
              onPress={() => pushScreen("personal")}
              theme={theme}
            />
            <SettingsRow
              icon={MapPin}
              label="Manage Addresses"
              onPress={() => pushScreen("addresses")}
              theme={theme}
            />
            <SettingsRow
              icon={ShieldCheck}
              label="Security"
              onPress={() => pushScreen("security")}
              theme={theme}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              onPress={() => pushScreen("notifications")}
              isLast
              theme={theme}
            />
          </View>

          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={Palette}
              label="Theme & Appearance"
              onPress={() => setShowThemeModal(true)}
              theme={theme}
            />
            <SettingsRow
              icon={Globe}
              label="Language"
              onPress={() => handleComingSoon("Language Selection")}
              isLast
              theme={theme}
            />
          </View>

          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={HelpCircle}
              label="Help Center"
              onPress={() => handleComingSoon("Help Center")}
              theme={theme}
            />
            <SettingsRow
              icon={MessageSquare}
              label="Contact Support"
              onPress={() => handleComingSoon("Contact Support")}
              theme={theme}
            />
            <SettingsRow
              icon={FileText}
              label="Privacy Policy"
              onPress={() => handleComingSoon("Privacy Policy")}
              isLast
              theme={theme}
            />
          </View>

          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-3 p-4 rounded-2xl border shadow-sm mt-4"
            style={{
              backgroundColor: isDark
                ? "rgba(220, 38, 38, 0.08)"
                : "rgba(220, 38, 38, 0.04)",
              borderColor: dangerColor,
            }}
          >
            <LogOut size={20} color={dangerColor} strokeWidth={2.5} />
            <Text
              className="text-base font-bold"
              style={{ color: dangerColor }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* =========================================
          CUSTOM REANIMATED SCREENS (IPHONE STYLE)
          ========================================= */}

      {/* PERSONAL INFO SCREEN */}
      <AnimatedStackScreen
        isVisible={stack.includes("personal")}
        title="Personal Info"
        zIndex={10}
        theme={theme}
        insets={insets}
        onBack={popScreen}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text
              className="text-sm font-bold mb-2 ml-1"
              style={{ color: theme.muted }}
            >
              First Name
            </Text>
            <TextInput
              value={editFirstName}
              onChangeText={setEditFirstName}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                textAlignVertical: "center",
                includeFontPadding: false,
                paddingVertical: 12,
                fontSize: 17,
                fontWeight: "600",
              }}
              className="px-4 rounded-2xl border"
              placeholderTextColor={theme.muted}
              placeholder="Enter First Name"
            />
          </View>
          <View className="mb-6">
            <Text
              className="text-sm font-bold mb-2 ml-1"
              style={{ color: theme.muted }}
            >
              Last Name
            </Text>
            <TextInput
              value={editLastName}
              onChangeText={setEditLastName}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                textAlignVertical: "center",
                includeFontPadding: false,
                paddingVertical: 12,
                fontSize: 17,
                fontWeight: "600",
              }}
              className="px-4 rounded-2xl border"
              placeholderTextColor={theme.muted}
              placeholder="Enter Last Name"
            />
          </View>
          <View className="mb-8">
            <Text
              className="text-sm font-bold mb-2 ml-1"
              style={{ color: theme.muted }}
            >
              Mobile Number (Cannot be changed)
            </Text>
            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
                borderColor: theme.border,
                paddingVertical: 14,
              }}
              className="px-4 rounded-2xl border justify-center"
            >
              <Text
                style={{ color: theme.muted, fontSize: 17, fontWeight: "600" }}
                className="opacity-70"
              >
                {displayPhone}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={savePersonalInfo}
            style={{ backgroundColor: theme.primary }}
            className="py-4 rounded-2xl items-center shadow-sm"
          >
            <Text className="text-white font-black text-base">
              Save Changes
            </Text>
          </Pressable>
        </ScrollView>
      </AnimatedStackScreen>

      {/* MANAGE ADDRESSES SCREEN */}
      <AnimatedStackScreen
        isVisible={stack.includes("addresses")}
        title="Manage Addresses"
        zIndex={10}
        theme={theme}
        insets={insets}
        onBack={popScreen}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {localAddresses.map((item) => (
            <View
              key={item.id}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="flex-row items-center p-4 mb-4 rounded-2xl border shadow-sm"
            >
              <MapPin size={24} color={theme.primary} />
              <View className="ml-4 flex-1">
                <Text
                  className="text-base font-bold mb-1"
                  style={{ color: theme.text }}
                >
                  {item.type}
                </Text>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.muted }}
                >
                  {item.address}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmDeleteAddress(item.id)}
                className="p-2 ml-2 rounded-full"
                style={{
                  backgroundColor: isDark
                    ? "rgba(220,38,38,0.1)"
                    : "rgba(220,38,38,0.05)",
                }}
              >
                <Trash2 size={18} color={dangerColor} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => pushScreen("add_address")}
            className="flex-row items-center justify-center p-4 mt-2 rounded-2xl border border-dashed"
            style={{
              borderColor: theme.primary,
              backgroundColor: isDark
                ? "rgba(34, 197, 94, 0.05)"
                : "rgba(34, 197, 94, 0.02)",
            }}
          >
            <Plus size={20} color={theme.primary} strokeWidth={2.5} />
            <Text
              className="ml-2 font-black text-base"
              style={{ color: theme.primary }}
            >
              Add New Address
            </Text>
          </Pressable>
        </ScrollView>
      </AnimatedStackScreen>

      {/* ADD NEW ADDRESS SCREEN */}
      <AnimatedStackScreen
        isVisible={stack.includes("add_address")}
        title="Add New Address"
        zIndex={20}
        theme={theme}
        insets={insets}
        onBack={popScreen}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text
              className="text-sm font-bold mb-2 ml-1"
              style={{ color: theme.muted }}
            >
              Address Label (e.g., Home, Office)
            </Text>
            <TextInput
              value={newAddressType}
              onChangeText={setNewAddressType}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                textAlignVertical: "center",
                includeFontPadding: false,
                paddingVertical: 12,
                fontSize: 17,
                fontWeight: "600",
              }}
              className="px-4 rounded-2xl border"
              placeholderTextColor={theme.muted}
              placeholder="Enter Label"
            />
          </View>
          <View className="mb-8">
            <Text
              className="text-sm font-bold mb-2 ml-1"
              style={{ color: theme.muted }}
            >
              Complete Address
            </Text>
            <TextInput
              value={newAddressText}
              onChangeText={setNewAddressText}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                textAlignVertical: "top",
                includeFontPadding: false,
                paddingTop: 12,
                fontSize: 17,
                fontWeight: "600",
              }}
              className="px-4 rounded-2xl border min-h-[100px]"
              placeholderTextColor={theme.muted}
              placeholder="Enter Full Address"
            />
          </View>
          <Pressable
            onPress={handleAddAddressSubmit}
            style={{ backgroundColor: theme.primary }}
            className="py-4 rounded-2xl items-center shadow-sm"
          >
            <Text className="text-white font-black text-base">
              Save Address
            </Text>
          </Pressable>
        </ScrollView>
      </AnimatedStackScreen>

      {/* SECURITY SCREEN */}
      <AnimatedStackScreen
        isVisible={stack.includes("security")}
        title="Security Settings"
        zIndex={10}
        theme={theme}
        insets={insets}
        onBack={popScreen}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
            className="rounded-3xl border px-4 py-2 mb-6 shadow-sm"
          >
            <SettingsRow
              icon={Smartphone}
              label="Change Mobile Number"
              onPress={() => handleComingSoon("Change Mobile Number")}
              isLast={true}
              theme={theme}
            />
          </View>
        </ScrollView>
      </AnimatedStackScreen>

      {/* NOTIFICATIONS SCREEN */}
      <AnimatedStackScreen
        isVisible={stack.includes("notifications")}
        title="Notifications"
        zIndex={10}
        theme={theme}
        insets={insets}
        onBack={popScreen}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {MOCK_NOTIFICATIONS.map((notif) => (
            <View
              key={notif.id}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="p-4 mb-4 rounded-2xl border shadow-sm relative"
            >
              {!notif.read && (
                <View className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
              )}
              <Text
                className="text-base font-black mb-1.5 pr-4"
                style={{ color: theme.text }}
              >
                {notif.title}
              </Text>
              <Text
                className="text-sm font-medium mb-3"
                style={{ color: theme.muted, lineHeight: 20 }}
              >
                {notif.desc}
              </Text>
              <Text
                className="text-xs font-bold"
                style={{ color: theme.primary }}
              >
                {notif.time}
              </Text>
            </View>
          ))}
        </ScrollView>
      </AnimatedStackScreen>

      {/* THEME SELECTION MODAL */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={() => setShowThemeModal(false)}
          />
          <View
            className="rounded-t-[32px] p-6 pb-12"
            style={{ backgroundColor: theme.bg, maxHeight: "80%" }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                className="text-xl font-black tracking-tight"
                style={{ color: theme.text }}
              >
                Choose Theme
              </Text>
              <Pressable
                onPress={() => setShowThemeModal(false)}
                className="p-2"
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
            <View>
              {themeOptions.map((opt) => {
                const isActive = colorScheme === opt.value;
                const Icon = opt.icon;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      setColorScheme(opt.value as any);
                      setShowThemeModal(false);
                    }}
                    className="flex-row items-center p-4 mb-3 rounded-2xl border"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: isActive ? theme.primary : theme.border,
                    }}
                  >
                    <Icon
                      size={24}
                      color={isActive ? theme.primary : theme.muted}
                    />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-base font-bold"
                        style={{ color: theme.text }}
                      >
                        {opt.label}
                      </Text>
                    </View>
                    {isActive && (
                      <CheckCircle2 size={24} color={theme.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
