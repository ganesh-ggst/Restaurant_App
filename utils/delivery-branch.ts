import type { CustomerBranch } from "../services/api/customer";
import type { CustomerAddress } from "../services/api/profile";

export const MAX_DELIVERY_DISTANCE_KM = 5;
type DeliveryAddressLocation = Partial<
  Pick<CustomerAddress, "_id" | "lat" | "lng">
> & { id?: string };

export type DeliveryBranchUnavailableReason =
  | "inactive"
  | "distance-unavailable"
  | "outside-delivery-area"
  | "offline";

export function getDeliveryBranchDistanceKm(
  branch: CustomerBranch,
  address: DeliveryAddressLocation | null | undefined,
): number | null {
  const addressId = address?.id || address?._id;
  if (
    addressId &&
    branch.distanceAddressId === addressId &&
    branch.distanceKm !== null &&
    branch.distanceKm !== undefined &&
    branch.distanceKm !== ""
  ) {
    const reportedDistance = Number(branch.distanceKm);
    if (Number.isFinite(reportedDistance) && reportedDistance >= 0) {
      return reportedDistance;
    }
  }

  const branchLatitude = branch.location?.lat;
  const branchLongitude = branch.location?.lng;
  const addressLatitude = address?.lat;
  const addressLongitude = address?.lng;
  if (
    typeof branchLatitude !== "number" ||
    typeof branchLongitude !== "number" ||
    typeof addressLatitude !== "number" ||
    typeof addressLongitude !== "number" ||
    !Number.isFinite(branchLatitude) ||
    !Number.isFinite(branchLongitude) ||
    !Number.isFinite(addressLatitude) ||
    !Number.isFinite(addressLongitude)
  ) {
    return null;
  }

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(addressLatitude - branchLatitude);
  const longitudeDifference = toRadians(addressLongitude - branchLongitude);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(branchLatitude)) *
      Math.cos(toRadians(addressLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getDeliveryBranchUnavailableReason(
  branch: CustomerBranch,
  address: DeliveryAddressLocation | null | undefined,
): DeliveryBranchUnavailableReason | null {
  if (!branch.isActive) return "inactive";

  const distance = getDeliveryBranchDistanceKm(branch, address);
  if (distance === null) return "distance-unavailable";
  if (distance > MAX_DELIVERY_DISTANCE_KM) return "outside-delivery-area";
  if (branch.isOnline === false) return "offline";
  return null;
}

export function isDeliveryBranchEligible(
  branch: CustomerBranch,
  address: DeliveryAddressLocation | null | undefined,
): boolean {
  return getDeliveryBranchUnavailableReason(branch, address) === null;
}
