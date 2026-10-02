import { useLocalSearchParams, usePathname } from "expo-router";
import {
  MANAGER_MOCK_DATA,
  MANAGER_PHONES,
} from "../constants/managerMockData";

export function useCurrentManager() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const pathname = usePathname();

  const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  let currentManager = MANAGER_MOCK_DATA.managers?.find(
    (m: any) =>
      m.phone === normalizedPhone ||
      m.phoneNumber === normalizedPhone ||
      m.mobile === normalizedPhone ||
      m.id === normalizedPhone,
  );

  if (!currentManager) {
    const isFloorRoute = pathname?.includes("floor");
    const isAdminRoute = pathname?.includes("admin");
    const targetType = isAdminRoute
      ? "admin"
      : isFloorRoute
        ? "floor"
        : "operations";

    currentManager = MANAGER_MOCK_DATA.managers?.find(
      (m: any) =>
        m.managerType?.toLowerCase() === targetType ||
        m.role?.toLowerCase() === targetType,
    );
  }

  if (!currentManager) {
    currentManager = MANAGER_MOCK_DATA.managers?.[0];
  }

  return {
    rawPhone: phone,
    normalizedPhone:
      normalizedPhone ||
      currentManager?.phone ||
      MANAGER_PHONES.admin ||
      MANAGER_PHONES.ops_1,
    currentManager,
    isAdmin:
      currentManager?.role === "admin" ||
      currentManager?.managerType === "admin",
    isOperations: currentManager?.managerType === "operations",
    isFloor: currentManager?.managerType === "floor",
  };
}
