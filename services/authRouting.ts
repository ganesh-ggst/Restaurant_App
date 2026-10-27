export type ManagerDestination =
  | "/(manager)/floor"
  | "/(manager)/operations";

export type AuthDestination =
  | ManagerDestination
  | "/(admin)"
  | "/(home)/(tabs)";

export function normalizeManagerType(managerType?: string | null): string {
  return managerType?.trim().toLowerCase().replace(/[^a-z]/g, "") || "";
}

export function isKnownManagerType(managerType?: string | null): boolean {
  const normalized = normalizeManagerType(managerType);
  return (
    normalized.includes("floor") ||
    normalized.includes("operation") ||
    normalized.includes("ops")
  );
}

export function getManagerDestination(
  managerType?: string | null,
): ManagerDestination {
  return normalizeManagerType(managerType).includes("floor")
    ? "/(manager)/floor"
    : "/(manager)/operations";
}

export function getAuthDestination(
  role: string,
  managerType?: string | null,
): AuthDestination {
  const normalizedRole = role.trim().toLowerCase();
  switch (normalizedRole) {
    case "admin":
      return "/(admin)";
    case "manager":
      return getManagerDestination(managerType);
    case "user":
    case "waiter":
    default:
      return "/(home)/(tabs)";
  }
}
