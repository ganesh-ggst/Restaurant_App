import { useLocalSearchParams } from "expo-router";
import { MANAGER_MOCK_DATA } from "../constants/managerMockData";

export function useCurrentManager() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  // Normalize phone by restoring the '+' sign if URL decoding stripped it
  const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  // Lookup the manager in the mock database
  const currentManager = MANAGER_MOCK_DATA.managers.find(
    (m) => m.phone === normalizedPhone,
  );

  return {
    rawPhone: phone,
    normalizedPhone,
    currentManager,
    isOperations: currentManager?.managerType === "operations",
    isFloor: currentManager?.managerType === "floor",
  };
}
