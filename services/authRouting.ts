export function getAuthDestination(role: string): string {
  switch (role) {
    case "admin":
      return "/(admin)";
    case "manager":
      return "/(manager)/floor";
    case "user":
    case "waiter":
    default:
      return "/(home)";
  }
}
