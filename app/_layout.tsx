import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import "../global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup =
      segments[0] === "(auth)" || (segments[0] as string) === "(auth)";

    // DEVELOPMENT MODE: Bypass Clerk auth checks
    // In production, uncomment these lines and remove the development bypass:
    // if (isSignedIn && inAuthGroup) {
    //   router.replace("(home)" as any);
    // } else if (!isSignedIn && !inAuthGroup) {
    //   router.replace("(auth)/login" as any);
    // }

    SplashScreen.hideAsync();
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: bgColor,
        },
      }}
    >
      <Stack.Screen name="(auth)" options={{}} />
      <Stack.Screen name="(home)" options={{}} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootLayoutNav />
    </ClerkProvider>
  );
}
