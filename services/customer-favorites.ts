import { customerApi } from "./api/customer";

function getFavoriteMenuItemId(favorite: unknown): string | null {
  if (typeof favorite === "string") return favorite;
  if (!favorite || typeof favorite !== "object") return null;

  const record = favorite as {
    _id?: unknown;
    menuItemId?: unknown;
  };
  if (typeof record.menuItemId === "string") return record.menuItemId;
  if (
    record.menuItemId &&
    typeof record.menuItemId === "object" &&
    "_id" in record.menuItemId &&
    typeof record.menuItemId._id === "string"
  ) {
    return record.menuItemId._id;
  }
  return typeof record._id === "string" ? record._id : null;
}

export async function addFavoriteIfMissing(menuItemId: string): Promise<void> {
  const favorites = await customerApi.getFavorites(true);
  if (
    favorites.some(
      (favorite) => getFavoriteMenuItemId(favorite) === menuItemId,
    )
  ) {
    return;
  }

  await customerApi.addFavorite(menuItemId);
}
