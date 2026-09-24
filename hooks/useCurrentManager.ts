import { useLocalSearchParams } from "expo-router";
import { MANAGER_MOCK_DATA } from "../constants/managerMockData";

export function useCurrentManager() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  // Normalize phone by restoring the '+' sign if URL decoding stripped it
  const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  // Lookup the manager in the mock database
  let currentManager = MANAGER_MOCK_DATA.managers?.find(
    (m) => m.phone === normalizedPhone,
  );

  // Fallback/Safety check: if mock data array doesn't have it yet, assign default branch security lock
  if (!currentManager && normalizedPhone) {
    currentManager = {
      id: "mgr_01",
      name: "Siva Narayana",
      phone: normalizedPhone,
      managerType: "operations",
      assignedBranch: "Hitech City Premium", // Security lock to single outlet
    } as any;
  } else if (currentManager && !(currentManager as any).assignedBranch) {
    (currentManager as any).assignedBranch = "Hitech City Premium";
  }

  return {
    rawPhone: phone,
    normalizedPhone,
    currentManager,
    isOperations: currentManager?.managerType === "operations",
    isFloor: currentManager?.managerType === "floor",
  };
}
