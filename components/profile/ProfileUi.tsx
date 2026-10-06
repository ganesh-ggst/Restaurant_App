import { ArrowLeft, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, TextInput, View } from "react-native";

import { useAppTheme } from "../../hooks/useAppTheme";

type Theme = ReturnType<typeof useAppTheme>;

export function formatProfilePhone(phone: string): string {
  const compactPhone = phone.replace(/\s/g, "");
  if (compactPhone.startsWith("+")) {
    return compactPhone;
  }
  if (compactPhone.startsWith("91") && compactPhone.length === 12) {
    return `+${compactPhone}`;
  }
  return `+91 ${phone}`;
}

export function ProfileScreenHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const theme = useAppTheme();

  return (
    <View
      className="flex-row items-center border-b px-4 py-4"
      style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
    >
      <Pressable onPress={onBack} className="mr-4 p-1" hitSlop={15}>
        <ArrowLeft size={24} color={theme.text} />
      </Pressable>
      <Text className="text-xl font-black" style={{ color: theme.text }}>
        {title}
      </Text>
    </View>
  );
}

export function ProfileTextField({
  label,
  value,
  onChangeText,
  theme,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  theme: Theme;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 ml-1 text-sm font-bold" style={{ color: theme.muted }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "number-pad" ? "none" : "words"}
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          color: theme.text,
          textAlignVertical: multiline ? "top" : "center",
          minHeight: multiline ? 88 : undefined,
          paddingVertical: 12,
          fontSize: 16,
          fontWeight: "600",
        }}
        className="rounded-2xl border px-4"
      />
    </View>
  );
}

export function ProfileError({ message }: { message: string }) {
  const theme = useAppTheme();
  if (!message) return null;
  return (
    <Text className="mb-4" style={{ color: theme.danger }}>
      {message}
    </Text>
  );
}

export function ProfileComingSoon({
  title,
  message,
  icon: Icon,
}: {
  title: string;
  message: string;
  icon: LucideIcon;
}) {
  const theme = useAppTheme();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Icon size={40} color={theme.primary} />
      <Text
        className="mt-4 text-center text-lg font-black"
        style={{ color: theme.text }}
      >
        {title}
      </Text>
      <Text className="mt-2 text-center" style={{ color: theme.muted }}>
        {message}
      </Text>
    </View>
  );
}
