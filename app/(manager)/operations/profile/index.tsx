import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  UserPlus,
  UserRound,
  UserRoundPen,
  X
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { MANAGER_MOCK_DATA } from "../../../../constants/managerMockData";
import { useAppTheme } from "../../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../../hooks/useCurrentManager";

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

export default function ManagerProfileScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const currentThemeMode = (colorScheme as string) || "light";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const theme = useAppTheme();
  const dangerColor =
    currentThemeMode === "dark" ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)";

  const { currentManager } = useCurrentManager();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [, forceUpdate] = useState({});

  useFocusEffect(
    useCallback(() => {
      forceUpdate({});
    }, []),
  );

  const displayFirstName =
    (MANAGER_MOCK_DATA as any).managerName || currentManager?.name || "Manager";
  const displayPhone =
    currentManager?.phone ||
    currentManager?.phoneNumber ||
    currentManager?.mobile ||
    currentManager?.id ||
    "+91 9999999996";

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: 160,
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
          {displayPhone ? (
            <Text
              className="text-sm font-semibold tracking-wide"
              style={{ color: theme.muted }}
            >
              {displayPhone}
            </Text>
          ) : null}
        </View>

        <View className="px-5 gap-6">
          <Card variant="default" className="p-4 rounded-3xl border-0">
            <SettingsRow
              icon={UserRoundPen}
              label="Personal Info"
              onPress={() =>
                router.push("/(manager)/operations/profile/personal" as any)
              }
              theme={theme}
            />
            <SettingsRow
              icon={Store}
              label="Store Details"
              onPress={() =>
                router.push(
                  "/(manager)/operations/profile/store-details" as any,
                )
              }
              theme={theme}
            />
            <SettingsRow
              icon={Sparkles}
              label="Storefront Display"
              onPress={() =>
                router.push(
                  "/(manager)/operations/profile/storefront-display" as any,
                )
              }
              theme={theme}
            />
            <SettingsRow
              icon={Shield}
              label="Security & Access"
              onPress={() =>
                router.push("/(manager)/operations/profile/security" as any)
              }
              theme={theme}
            />
            <SettingsRow
              icon={UserPlus}
              label="Add New Manager"
              onPress={() =>
                router.push("/(manager)/operations/profile/add-manager" as any)
              }
              theme={theme}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              onPress={() =>
                router.push(
                  "/(manager)/operations/profile/notifications" as any,
                )
              }
              isLast
              theme={theme}
            />
          </Card>

          <Card variant="default" className="p-4 rounded-3xl border-0">
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
          </Card>

          <Card variant="default" className="p-4 rounded-3xl border-0">
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
          </Card>

          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-3 p-4 rounded-2xl border shadow-sm mt-4"
            style={{
              backgroundColor:
                currentThemeMode === "dark"
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

      {/* Theme Modal */}
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
            <View className="gap-3">
              <Pressable
                onPress={() => {
                  setColorScheme("light");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "light" ? theme.primary : theme.border,
                }}
              >
                <Sun
                  size={24}
                  color={
                    currentThemeMode === "light" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    Light Mode
                  </Text>
                </View>
                {currentThemeMode === "light" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setColorScheme("dark");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "dark" ? theme.primary : theme.border,
                }}
              >
                <Moon
                  size={24}
                  color={
                    currentThemeMode === "dark" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    Dark Mode
                  </Text>
                </View>
                {currentThemeMode === "dark" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setColorScheme("system");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "system"
                      ? theme.primary
                      : theme.border,
                }}
              >
                <Smartphone
                  size={24}
                  color={
                    currentThemeMode === "system" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    System Default
                  </Text>
                </View>
                {currentThemeMode === "system" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
