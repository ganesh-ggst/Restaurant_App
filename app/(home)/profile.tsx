import { useClerk, useUser } from "@clerk/expo";
import { useGlobalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MapPin,
  MessageSquare,
  Palette,
  ShieldCheck,
  UserRound,
  UserRoundPen,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getUserByPhone } from "../../lib/db";

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const { phone } = useGlobalSearchParams<{ phone?: string }>();
  const [dbFirstName, setDbFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (phone) {
      getUserByPhone(phone).then((data) => {
        if (data) setDbFirstName(data.first_name);
      });
    }
  }, [phone]);

  const displayFirstName = dbFirstName || user?.firstName || "Siva";

  // Centralized theme object for perfectly clean JSX
  const theme = {
    bg: isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)",
    card: isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)",
    text: isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)",
    muted: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
    primary: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
    border: isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)",
    danger: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login" as any);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Reusable, ultra-clean list item component
  const SettingsRow = ({ icon: Icon, label, onPress, isLast = false }: any) => (
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Profile Header */}
        <View className="items-center mb-10 px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-5 border-2 shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.primary }}
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
            {phone || "+91 8686868666"}
          </Text>
        </View>

        {/* Clean Grouped Settings */}
        <View className="px-5 gap-6">
          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={UserRoundPen}
              label="Personal Info"
              onPress={() => {}}
            />
            <SettingsRow
              icon={MapPin}
              label="Manage Addresses"
              onPress={() => {}}
            />
            <SettingsRow
              icon={ShieldCheck}
              label="Security"
              onPress={() => {}}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              onPress={() => {}}
              isLast
            />
          </View>

          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={Palette}
              label="Theme & Appearance"
              onPress={() => {}}
            />
            <SettingsRow
              icon={Globe}
              label="Language"
              onPress={() => {}}
              isLast
            />
          </View>

          <View
            className="px-4 py-2 rounded-3xl border shadow-sm"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <SettingsRow
              icon={HelpCircle}
              label="Help Center"
              onPress={() => {}}
            />
            <SettingsRow
              icon={MessageSquare}
              label="Contact Support"
              onPress={() => {}}
            />
            <SettingsRow
              icon={FileText}
              label="Privacy Policy"
              onPress={() => {}}
              isLast
            />
          </View>

          {/* Standalone Logout Button */}
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-3 p-4 rounded-2xl border shadow-sm mt-4"
            style={{
              backgroundColor: isDark
                ? "rgba(220, 38, 38, 0.08)"
                : "rgba(220, 38, 38, 0.04)",
              borderColor: theme.danger,
            }}
          >
            <LogOut size={20} color={theme.danger} strokeWidth={2.5} />
            <Text
              className="text-base font-bold"
              style={{ color: theme.danger }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
