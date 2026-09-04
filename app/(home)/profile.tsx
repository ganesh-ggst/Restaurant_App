import { useClerk, useUser } from "@clerk/expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getUserByPhone } from "../../lib/db";

interface ProfileMenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  isDark: boolean;
}

function ProfileMenuItem({
  icon,
  label,
  onPress,
  isDark,
}: ProfileMenuItemProps) {
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  return (
    <Pressable onPress={onPress} className="mb-3">
      <Card variant="subtle">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <MaterialCommunityIcons
              name={icon as any}
              size={24}
              color={primaryColor}
            />
            <Text
              className="text-base font-semibold"
              style={{ color: textColor }}
            >
              {label}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={primaryColor}
          />
        </View>
      </Card>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Catch the phone number globally passed from authentication
  const { phone } = useGlobalSearchParams<{ phone?: string }>();
  const [dbFirstName, setDbFirstName] = useState<string | null>(null);

  // Fetch the name dynamically from Neon DB
  useEffect(() => {
    if (phone) {
      getUserByPhone(phone).then((data) => {
        if (data) setDbFirstName(data.first_name);
      });
    }
  }, [phone]);

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const subtitleColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  const handleLogout = async () => {
    try {
      await signOut(); // Safe to leave here for Clerk cleanup later
      router.replace("(auth)/login" as any);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Priority: 1. Neon DB, 2. Clerk (if using it later), 3. Fallback
  const displayFirstName = dbFirstName || user?.firstName || "Siva";

  return (
    <ScrollView
      style={{ backgroundColor: bgColor }}
      contentContainerStyle={{ flexGrow: 1 }}
      className="px-6 py-4"
    >
      <Card variant="elevated" className="mb-6">
        <View className="items-center gap-4">
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 80,
              height: 80,
              backgroundColor: isDark
                ? "hsl(149, 27%, 15%)"
                : "hsl(143, 61%, 91%)",
            }}
          >
            <MaterialCommunityIcons
              name="account"
              size={48}
              color={primaryColor}
            />
          </View>

          <View className="items-center">
            <Text className="text-2xl font-bold" style={{ color: textColor }}>
              {displayFirstName}
            </Text>
          </View>
        </View>
      </Card>

      <View className="mb-6">
        <Text className="mb-3 text-lg font-bold" style={{ color: textColor }}>
          Account
        </Text>
        <ProfileMenuItem
          icon="account-edit"
          label="Edit Profile"
          onPress={() => console.log("Edit profile")}
          isDark={isDark}
        />
        <ProfileMenuItem
          icon="shield-lock"
          label="Security"
          onPress={() => console.log("Security")}
          isDark={isDark}
        />
        <ProfileMenuItem
          icon="bell-outline"
          label="Notifications"
          onPress={() => console.log("Notifications")}
          isDark={isDark}
        />
      </View>

      <View className="mb-6">
        <Text className="mb-3 text-lg font-bold" style={{ color: textColor }}>
          Settings
        </Text>
        <ProfileMenuItem
          icon="palette-outline"
          label="Theme"
          onPress={() => console.log("Theme")}
          isDark={isDark}
        />
        <ProfileMenuItem
          icon="translate"
          label="Language"
          onPress={() => console.log("Language")}
          isDark={isDark}
        />
        <ProfileMenuItem
          icon="file-document-outline"
          label="Terms & Privacy"
          onPress={() => console.log("Terms")}
          isDark={isDark}
        />
      </View>

      <View className="mb-6">
        <Text className="mb-3 text-lg font-bold" style={{ color: textColor }}>
          Support
        </Text>
        <ProfileMenuItem
          icon="help-circle-outline"
          label="Help & Support"
          onPress={() => console.log("Help")}
          isDark={isDark}
        />
        <ProfileMenuItem
          icon="message-text-outline"
          label="Contact Us"
          onPress={() => console.log("Contact")}
          isDark={isDark}
        />
      </View>

      <View className="mb-4">
        <Button title="Sign Out" variant="destructive" onPress={handleLogout} />
      </View>

      <Text className="text-center text-xs" style={{ color: subtitleColor }}>
        Restaurant App v1.0.0
      </Text>
    </ScrollView>
  );
}
