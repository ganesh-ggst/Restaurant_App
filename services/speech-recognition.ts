import Constants from "expo-constants";
import { Platform } from "react-native";

type SpeechRecognitionPackage = typeof import("expo-speech-recognition");

let speechRecognitionPackage: SpeechRecognitionPackage | null | undefined;
let speechRecognitionLoadError: unknown;

export function getSpeechRecognitionPackage():
  | SpeechRecognitionPackage
  | null {
  if (Platform.OS === "web" || Constants.expoGoConfig) return null;
  if (speechRecognitionPackage !== undefined) return speechRecognitionPackage;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loadedPackage = require(
      "expo-speech-recognition",
    ) as SpeechRecognitionPackage;
    if (
      !loadedPackage.ExpoSpeechRecognitionModule ||
      !loadedPackage.useSpeechRecognitionEvent
    ) {
      throw new Error("The speech-recognition native module is unavailable.");
    }
    speechRecognitionPackage = loadedPackage;
  } catch (error) {
    speechRecognitionLoadError = error;
    speechRecognitionPackage = null;
  }

  return speechRecognitionPackage;
}

export function getSpeechRecognitionLoadError(): unknown {
  return speechRecognitionLoadError;
}
