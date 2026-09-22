import { useRouter } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../../hooks/useAppTheme";
import { Button } from "./Button";

interface ErrorScreenProps {
  message: string;
  description?: string;
}

export function ErrorScreen({ message, description }: ErrorScreenProps) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <SafeAreaView
      className="flex-1 justify-center items-center px-6"
      style={{ backgroundColor: theme.bg }}
    >
      <Text className="text-6xl mb-4">🛑</Text>
      <Text
        className="text-xl font-bold mb-2 text-center"
        style={{ color: theme.text }}
      >
        {message}
      </Text>
      {description && (
        <Text
          className="text-sm text-center mb-6"
          style={{ color: theme.muted }}
        >
          {description}
        </Text>
      )}
      <Button
        title="Go Back to Dashboard"
        onPress={() => router.back()}
        className="w-full py-3"
      />
    </SafeAreaView>
  );
}
