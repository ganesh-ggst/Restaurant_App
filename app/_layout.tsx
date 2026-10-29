import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import "../global.css";
import { useAppTheme } from "../hooks/useAppTheme";
import { loadThemePreference } from "../services/theme-preference";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useAppTheme();
  const { setColorScheme } = useColorScheme();
  const [themeRestored, setThemeRestored] = useState(false);

  useEffect(() => {
    let isActive = true;

    const restoreTheme = async () => {
      try {
        const preference = await loadThemePreference();
        if (isActive) setColorScheme(preference);
      } catch (error) {
        console.error("Unable to restore the saved theme preference.", error);
        if (isActive) {
          setColorScheme("system");
          Alert.alert(
            "Theme Could Not Be Restored",
            "The saved theme preference could not be loaded. The app will use your system theme for now.",
          );
        }
      } finally {
        if (isActive) {
          setThemeRestored(true);
          await SplashScreen.hideAsync();
        }
      }
    };

    void restoreTheme();

    return () => {
      isActive = false;
    };
  }, [setColorScheme]);

  if (!themeRestored) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.bg,
        },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(home)" />
    </Stack>
  );
}
