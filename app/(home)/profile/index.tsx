import {
  type Href,
  useGlobalSearchParams,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  UserRoundPen,
  X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "../../../components/profile/ProfileContext";
import { formatProfilePhone } from "../../../components/profile/ProfileUi";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { api } from "../../../services/api";
import { useOrderMode } from "../_layout";

const themeOptions = [
  { label: "Light Mode", value: "light", icon: Sun },
  { label: "Dark Mode", value: "dark", icon: Moon },
  { label: "System Default", value: "system", icon: Smartphone },
] as const;

interface ProfileLink {
  title: string;
  route?: Href;
  icon: typeof UserRound;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isGuest, phone } = useGlobalSearchParams<{
    isGuest?: string;
    phone?: string;
  }>();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { user, error, reloadProfile, clearUser } = useProfile();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const { mode, carts, dineInCartState } = useOrderMode();
  const cartItems = (carts?.[mode] || []).reduce(
    (total: number, item: { quantity: number }) => total + item.quantity,
    0,
  );
  const cartButtonVisible =
    cartItems > 0 || (mode === "Dine-in" && dineInCartState !== "idle");

  const handleComingSoon = (featureName: string) => {
    Alert.alert(
      "Coming Soon",
      `${featureName} is currently under development.`,
    );
  };

  const settingsGroups: ProfileLink[][] = [
    [
      {
        title: "Personal Info",
        route: "/(home)/profile/personal-info",
        icon: UserRoundPen,
      },
      {
        title: "Manage Addresses",
        route: "/(home)/profile/addresses",
        icon: MapPin,
      },
      { title: "Security", route: "/(home)/profile/security", icon: ShieldCheck },
      {
        title: "Notifications",
        route: "/(home)/profile/notifications",
        icon: Bell,
      },
    ],
    [
      {
        title: "Theme & Appearance",
        icon: Palette,
        onPress: () => setShowThemeModal(true),
      },
      {
        title: "Language",
        icon: Globe,
        onPress: () => handleComingSoon("Language Selection"),
      },
    ],
    [
      {
        title: "Help Center",
        icon: HelpCircle,
        onPress: () => handleComingSoon("Help Center"),
      },
      {
        title: "Contact Support",
        icon: MessageSquare,
        onPress: () => handleComingSoon("Contact Support"),
      },
      {
        title: "Privacy Policy",
        icon: FileText,
        onPress: () => handleComingSoon("Privacy Policy"),
      },
    ],
  ];
  const visibleSettingsGroups =
    isGuest === "true" ? settingsGroups.slice(1) : settingsGroups;

  const handleSignIn = async () => {
    try {
      await api.clearLocalSession();
      clearUser();
      router.replace("/(auth)/login");
    } catch (sessionError) {
      Alert.alert(
        "Unable to Sign In",
        sessionError instanceof Error
          ? sessionError.message
          : "Please try again.",
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await api.logout();
            clearUser();
            router.replace("/(auth)/login");
          } catch (logoutError) {
            Alert.alert(
              "Sign Out Failed",
              logoutError instanceof Error
                ? logoutError.message
                : "Unable to clear your saved session.",
            );
            clearUser();
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || "Your Profile"
    : isGuest === "true"
      ? "Guest"
      : "Your Profile";
  const displayPhone = user?.phone
    ? formatProfilePhone(user.phone)
    : isGuest === "true" && phone
      ? formatProfilePhone(phone)
      : "";

  useEffect(() => {
    if (
      !/invalid access token|authentication session has ended/i.test(error)
    ) {
      return;
    }

    let isActive = true;
    const returnToSignIn = async () => {
      try {
        await api.clearLocalSession();
      } catch (clearError) {
        if (isActive) {
          Alert.alert(
            "Sign In Required",
            clearError instanceof Error
              ? clearError.message
              : "Your session has ended. Please sign in again.",
          );
        }
      } finally {
        if (isActive) {
          clearUser();
          router.replace("/(auth)/login");
        }
      }
    };

    void returnToSignIn();
    return () => {
      isActive = false;
    };
  }, [clearUser, error, router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + (cartButtonVisible ? 230 : 150),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-6 pt-8 pb-10">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-5 border-2"
            style={{ backgroundColor: theme.card, borderColor: theme.primary }}
          >
            <UserRound size={40} color={theme.primary} strokeWidth={1.5} />
          </View>
          <Text
            className="text-2xl font-black mb-1"
            style={{ color: theme.text }}
          >
            {user || isGuest === "true" ? displayName : " "}
          </Text>
          <Text
            className="text-sm font-semibold tracking-wide"
            style={{ color: theme.muted }}
          >
            {user || isGuest === "true" ? displayPhone : " "}
          </Text>
        </View>

        {error ? (
          <View
            className="mx-5 mb-5 rounded-2xl border p-4"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Text className="mb-3" style={{ color: theme.danger }}>
              {error}
            </Text>
            <Pressable onPress={() => void reloadProfile()}>
              <Text className="font-bold" style={{ color: theme.primary }}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {visibleSettingsGroups.map((group, groupIndex) => (
          <View
            key={groupIndex}
            className="mx-5 mb-6 rounded-3xl border px-4 py-2"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            {group.map(({ title, route, icon: Icon, onPress }, index) => (
              <Pressable
                key={title}
                onPress={() => (route ? router.push(route) : onPress?.())}
                className={`flex-row items-center justify-between py-4 ${
                  index < group.length - 1 ? "border-b" : ""
                }`}
                style={{ borderBottomColor: theme.border }}
              >
                <View className="flex-row items-center gap-4">
                  <Icon size={22} color={theme.primary} strokeWidth={2} />
                  <Text
                    className="text-base font-semibold"
                    style={{ color: theme.text }}
                  >
                    {title}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.muted} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        ))}

        {isGuest === "true" ? (
          <Pressable
            onPress={() => void handleSignIn()}
            className="mx-5 mt-2 flex-row items-center justify-center gap-3 rounded-2xl border p-4"
            style={{
              backgroundColor: theme.secondaryBg,
              borderColor: theme.primary,
            }}
          >
            <LogIn size={20} color={theme.primary} strokeWidth={2.5} />
            <Text
              className="text-base font-bold"
              style={{ color: theme.primary }}
            >
              Sign In
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleLogout}
            className="mx-5 mt-2 flex-row items-center justify-center gap-3 rounded-2xl border p-4"
            style={{
              backgroundColor: theme.dangerBg,
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
        )}
      </ScrollView>

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={() => setShowThemeModal(false)}
            accessibilityLabel="Close theme options"
          />
          <View
            className="rounded-t-[32px] p-6"
            style={{
              backgroundColor: theme.bg,
              maxHeight: "80%",
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View className="mb-6 flex-row items-center justify-between">
              <Text
                className="text-xl font-black tracking-tight"
                style={{ color: theme.text }}
              >
                Choose Theme
              </Text>
              <Pressable
                onPress={() => setShowThemeModal(false)}
                className="p-2"
                hitSlop={15}
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
            {themeOptions.map(({ label, value, icon: Icon }) => {
              const selected = (colorScheme ?? "system") === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setColorScheme(value);
                    setShowThemeModal(false);
                  }}
                  className="mb-3 flex-row items-center rounded-2xl border p-4"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                  }}
                >
                  <Icon
                    size={24}
                    color={selected ? theme.primary : theme.muted}
                  />
                  <View className="ml-4 flex-1">
                    <Text
                      className="text-base font-bold"
                      style={{ color: theme.text }}
                    >
                      {label}
                    </Text>
                  </View>
                  {selected ? (
                    <CheckCircle2 size={24} color={theme.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
