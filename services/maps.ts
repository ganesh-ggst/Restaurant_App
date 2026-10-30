import Constants from "expo-constants";
import { Platform } from "react-native";

export function isAndroidMapsApiKeyConfigured(): boolean {
  return (
    Platform.OS !== "android" ||
    Constants.expoConfig?.extra?.androidMapsApiKeyConfigured === true
  );
}
