import * as SecureStore from "expo-secure-store";

export type ThemePreference = "light" | "dark" | "system";

const THEME_PREFERENCE_KEY = "theme-preference";

export async function loadThemePreference(): Promise<ThemePreference> {
  const preference = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);
  if (preference === "light" || preference === "dark" || preference === "system") {
    return preference;
  }

  if (preference !== null) {
    await SecureStore.deleteItemAsync(THEME_PREFERENCE_KEY);
  }

  return "system";
}

export async function saveThemePreference(
  preference: ThemePreference,
): Promise<void> {
  await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
}
