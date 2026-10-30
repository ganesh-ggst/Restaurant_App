import Constants from "expo-constants";
import { Platform } from "react-native";

export function isMapSelectionSupported(): boolean {
  return (
    Platform.OS !== "android" ||
    Constants.expoGoConfig !== null ||
    Constants.expoConfig?.extra?.androidMapsApiKeyConfigured === true
  );
}

export function isGoogleMapsApiKeyConfigured(): boolean {
  if (Platform.OS === "android") {
    return (
      Constants.expoGoConfig === null &&
      Constants.expoConfig?.extra?.androidMapsApiKeyConfigured === true
    );
  }
  if (Platform.OS === "ios") {
    return Constants.expoConfig?.extra?.iosMapsApiKeyConfigured === true;
  }
  return false;
}
