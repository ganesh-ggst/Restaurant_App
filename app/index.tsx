import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This will be handled by the RootLayoutNav component
    router.replace("(auth)/login" as any);
  }, []);

  return null;
}
