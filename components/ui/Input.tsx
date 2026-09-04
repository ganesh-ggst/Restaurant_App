import { useColorScheme } from "nativewind";
import { Text, TextInput, View } from "react-native";

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "phone-pad"
    | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  error?: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  maxLength?: number;
  autoFocus?: boolean;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  editable = true,
  error,
  icon,
  prefix,
  maxLength,
  autoFocus = false,
}: InputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const placeholderColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const borderColor = error
    ? isDark
      ? "hsl(7, 85%, 76%)"
      : "hsl(6, 74%, 54%)"
    : isDark
      ? "hsl(149, 16%, 24%)"
      : "hsl(141, 47%, 83%)";
  const labelColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";

  return (
    <View className="mb-4 w-full">
      {label && (
        <Text
          className="mb-2 text-base font-semibold"
          style={{ color: labelColor }}
        >
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center rounded-xl border-2 px-4"
        style={{ borderColor: borderColor }}
      >
        {icon && <View className="mr-3">{icon}</View>}
        {prefix && <View className="mr-2">{prefix}</View>}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          maxLength={maxLength}
          autoFocus={autoFocus}
          style={{
            color: textColor,
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 0,
            fontSize: 16,
          }}
          className="font-medium"
        />
      </View>
      {error && (
        <Text
          className="mt-2 text-sm font-medium"
          style={{
            color: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
