import Constants from "expo-constants";
import * as Location from "expo-location";
import { requestCameraPermissionsAsync } from "expo-image-picker";
import * as MediaLibrary from "expo-media-library/legacy";
import * as SecureStore from "expo-secure-store";
import { PermissionsAndroid, Platform } from "react-native";

import { getSpeechRecognitionPackage } from "./speech-recognition";

type NotificationsModule = typeof import("expo-notifications");

const FLOW_COMPLETE_KEY = "restaurant.initialPermissions.complete";
const ATTEMPTED_KEY_PREFIX = "restaurant.initialPermissions.attempted.";

export interface InitialPermissionResult {
  label: string;
  status: "granted" | "denied" | "notRequired" | "error";
  error?: string;
}

type PermissionStatus = { granted: boolean };
type PermissionName =
  | "location"
  | "notifications"
  | "calling"
  | "camera"
  | "mediaLibrary"
  | "speechRecognition";

function getNotificationsModule(): NotificationsModule | null {
  if (Constants.expoGoConfig) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as NotificationsModule;
}

function attemptedKey(permission: PermissionName): string {
  return `${ATTEMPTED_KEY_PREFIX}${permission}`;
}

async function wasAttempted(permission: PermissionName): Promise<boolean> {
  return (
    (await SecureStore.getItemAsync(attemptedKey(permission))) === "true"
  );
}

async function markAttempted(permission: PermissionName): Promise<void> {
  await SecureStore.setItemAsync(attemptedKey(permission), "true");
}

async function requestPermissionOnce(
  permission: PermissionName,
  label: string,
  requestPermission: () => Promise<PermissionStatus>,
): Promise<InitialPermissionResult> {
  if (await wasAttempted(permission)) {
    return { label, status: "denied" };
  }

  await markAttempted(permission);
  const requestedPermission = await requestPermission();
  return {
    label,
    status: requestedPermission.granted ? "granted" : "denied",
  };
}

async function requestCallPermissionOnce(): Promise<InitialPermissionResult> {
  const label = "Direct calling";
  if (Platform.OS !== "android" || Constants.expoGoConfig) {
    return { label, status: "notRequired" };
  }

  if (await wasAttempted("calling")) {
    return { label, status: "denied" };
  }

  await markAttempted("calling");
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    {
      title: "Allow direct calls",
      message: "Allow Green Spice to place calls from phone numbers in the app.",
      buttonPositive: "Allow",
      buttonNegative: "Don't allow",
    },
  );
  return {
    label,
    status:
      result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : "denied",
  };
}

export async function hasCompletedInitialPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  return (await SecureStore.getItemAsync(FLOW_COMPLETE_KEY)) === "true";
}

export async function requestInitialPermissions(): Promise<
  InitialPermissionResult[]
> {
  if (Platform.OS === "web") return [];

  const results: InitialPermissionResult[] = [];
  const collect = async (
    label: string,
    request: () => Promise<InitialPermissionResult>,
  ): Promise<void> => {
    try {
      results.push(await request());
    } catch (error) {
      results.push({
        label,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to check or request this permission.",
      });
    }
  };

  await collect("Location", () =>
    requestPermissionOnce(
      "location",
      "Location",
      Location.requestForegroundPermissionsAsync,
    ),
  );

  await collect("Notifications", async () => {
    const notifications = getNotificationsModule();
    if (!notifications) {
      return { label: "Notifications", status: "notRequired" };
    }

    if (Platform.OS === "android") {
      await notifications.setNotificationChannelAsync("default", {
        name: "General",
        importance: notifications.AndroidImportance.DEFAULT,
      });
    }
    return requestPermissionOnce(
      "notifications",
      "Notifications",
      notifications.requestPermissionsAsync,
    );
  });

  await collect("Direct calling", requestCallPermissionOnce);

  await collect("Camera", () =>
    requestPermissionOnce(
      "camera",
      "Camera",
      requestCameraPermissionsAsync,
    ),
  );

  await collect("Saving QR codes to Photos", async () => {
    if (Platform.OS === "android" && Constants.expoGoConfig) {
      return { label: "Saving QR codes to Photos", status: "notRequired" };
    }
    return requestPermissionOnce(
      "mediaLibrary",
      "Saving QR codes to Photos",
      () => MediaLibrary.requestPermissionsAsync(true, ["photo"]),
    );
  });

  const speechRecognition =
    getSpeechRecognitionPackage()?.ExpoSpeechRecognitionModule;
  if (speechRecognition) {
    await collect("Microphone and speech recognition", () =>
      requestPermissionOnce(
        "speechRecognition",
        "Microphone and speech recognition",
        () => speechRecognition.requestPermissionsAsync(),
      ),
    );
  } else {
    results.push({
      label: "Microphone and speech recognition",
      status: "notRequired",
    });
  }

  await SecureStore.setItemAsync(FLOW_COMPLETE_KEY, "true");
  return results;
}
