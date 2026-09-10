import { forwardRef } from "react";
import { Text, TextInput, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

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

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
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
    },
    ref,
  ) => {
    const theme = useAppTheme();

    return (
      <View className="mb-4 w-full">
        {label && (
          <Text
            className="mb-2 text-base font-semibold"
            style={{ color: theme.text }}
          >
            {label}
          </Text>
        )}
        <View
          className="flex-row items-center rounded-xl border-2 px-4"
          style={{ borderColor: error ? theme.danger : theme.border }}
        >
          {icon && <View className="mr-3">{icon}</View>}
          {prefix && <View className="mr-2">{prefix}</View>}
          <TextInput
            ref={ref}
            placeholder={placeholder}
            placeholderTextColor={theme.muted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            editable={editable}
            maxLength={maxLength}
            autoFocus={autoFocus}
            style={{
              color: theme.text,
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
            style={{ color: theme.danger }}
          >
            {error}
          </Text>
        )}
      </View>
    );
  },
);
