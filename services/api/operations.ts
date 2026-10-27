import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface OperationsCategory {
  id: string;
  name: string;
  slug?: string;
  branchId?: string | null;
  icon?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  itemCount?: number;
}

export interface OperationsCategoryDeleteResult {
  id: string;
  deleted: boolean;
  isActive: boolean;
}

export interface OperationsCustomizationOption {
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface OperationsCustomizationGroup {
  _id?: string;
  name: string;
  selectionType: "single" | "multiple";
  minSelections: number;
  maxSelections: number;
  options: OperationsCustomizationOption[];
}

export interface OperationsMenuItem {
  _id: string;
  quickInventoryId?: string;
  pinnedAt?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  categoryId: string | { _id: string; name?: string; icon?: string };
  isCrossSellOnly?: boolean;
  foodType?: string;
  price: number;
  tags?: string[];
  compareAtPrice?: number;
  discountLabel?: string;
  marketingTag?: string;
  customTag?: string;
  customTagEnabled?: boolean;
  prepTimeMinutes?: number;
  availableQuantity?: number;
  isBestseller?: boolean;
  isHot?: boolean;
  isAvailable: boolean;
  customizationGroups?: OperationsCustomizationGroup[];
}

export interface OperationsOffer {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  code: string;
  discountType?: string;
  discountValue?: number;
  isActive: boolean;
  applicableMenuItemIds?: string[];
  applicableItemCount?: number;
  appliesToAllItems?: boolean;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  freeItemName?: string;
  freeItemMenuItemId?: string | null;
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
}

interface ManagerOffersResponse {
  offers: OperationsOffer[];
  summary?: {
    totalOffers: number;
    activeOffers: number;
    inactiveOffers: number;
  };
}

export interface OperationsDashboard {
  branch: {
    _id: string;
    name: string;
    code?: string;
    address?: string;
  };
  checkIn?: {
    isCheckedIn?: boolean;
    isCheckIn?: boolean;
  };
  isCheckedIn?: boolean;
  isCheckIn?: boolean;
  stats: {
    totalItems: number;
    inStockItems: number;
    activeCoupons: number;
    liveOrders: number;
  };
  categories: OperationsCategory[];
  offers: OperationsOffer[];
}

export interface OperationsOrder {
  _id: string;
  orderNumber: string;
  branchId?: string | { _id?: string; id?: string };
  branch?: string | { _id?: string; id?: string };
  status: string;
  fulfillmentType?: string;
  createdAt?: string;
  total?: number;
  items?: {
    name: string;
    quantity: number;
    itemTotal?: number;
  }[];
  userId?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface OperationsManagerAssignment {
  _id: string;
  managerType: string;
  branchId: string;
  isActive: boolean;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    managerType?: string;
    isActive?: boolean;
  };
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  "",
);
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  resource: "operations" | "offers" | "orders" = "operations",
): Promise<T | undefined> {
  if (!API_BASE_URL) {
    throw new Error(
      "API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
    );
  }
  const accessToken = await authApi.getAccessToken();
  if (!accessToken) {
    throw new Error("Your login session is missing. Please sign in again.");
  }

  try {
    const response = await axios.request<ApiEnvelope<T>>({
      method,
      url: `${API_BASE_URL}/api/${resource}${path}`,
      data: body,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const hasSuccessFlag =
      response.data !== null &&
      typeof response.data === "object" &&
      "success" in response.data;
    if (
      (hasSuccessFlag && !response.data.success) ||
      (method === "GET" && !response.data?.success)
    ) {
      throw new Error(response.data?.message || "The API request failed.");
    }
    return response.data?.data;
  } catch (error) {
    if (isAxiosError<ApiEnvelope<unknown>>(error)) {
      const message = error.response?.data?.message;
      if (message) throw new Error(message);
      if (error.response?.status === 401) {
        throw new Error(
          "Your login session has expired. Please sign in again.",
        );
      }
      if (error.response) {
        throw new Error(
          `The server returned an error (${error.response.status}).`,
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new Error(
          "The server took too long to respond. Please try again.",
        );
      }
      throw new Error(
        "Unable to reach the server. Check EXPO_PUBLIC_API_URL and try again.",
      );
    }
    throw error instanceof Error
      ? error
      : new Error("The API request failed. Please try again.");
  }
}

function requireData<T>(data: T | undefined, message: string): T {
  if (data === undefined || data === null) throw new Error(message);
  return data;
}

function requireArray<T>(data: T[] | undefined, message: string): T[] {
  const result = requireData(data, message);
  if (!Array.isArray(result)) throw new Error(message);
  return result;
}

const encode = (value: string) => encodeURIComponent(value);

export const operationsApi = {
  async getDashboard(branchId?: string | null): Promise<OperationsDashboard> {
    const branchQuery = branchId
      ? `?branchId=${encode(branchId)}`
      : "";
    const dashboard = requireData(
      await request<OperationsDashboard>("GET", `/dashboard${branchQuery}`),
      "The server did not return the operations dashboard.",
    );
    const isCheckedIn =
      typeof dashboard.checkIn?.isCheckedIn === "boolean"
        ? dashboard.checkIn.isCheckedIn
        : typeof dashboard.checkIn?.isCheckIn === "boolean"
          ? dashboard.checkIn.isCheckIn
          : typeof dashboard.isCheckedIn === "boolean"
            ? dashboard.isCheckedIn
            : dashboard.isCheckIn;

    return {
      ...dashboard,
      checkIn: {
        ...dashboard.checkIn,
        ...(typeof isCheckedIn === "boolean" ? { isCheckedIn } : {}),
      },
    };
  },

  async getManagers(): Promise<OperationsManagerAssignment[]> {
    return requireArray(
      await request<OperationsManagerAssignment[]>("GET", "/managers"),
      "The server did not return branch managers.",
    );
  },

  async getCategories(): Promise<OperationsCategory[]> {
    return requireArray(
      await request<OperationsCategory[]>("GET", "/categories?status=all"),
      "The server did not return categories.",
    );
  },

  async getActiveOffers(branchId: string): Promise<OperationsOffer[]> {
    return requireArray(
      await request<OperationsOffer[]>(
        "GET",
        `/?branchId=${encode(branchId)}`,
        undefined,
        "offers",
      ),
      "The server did not return active offers.",
    );
  },

  async getManagerOffers(): Promise<OperationsOffer[]> {
    const response = await request<ManagerOffersResponse>(
      "GET",
      "/manager?status=all",
      undefined,
      "offers",
    );
    return requireArray(response?.offers, "The server did not return offers.");
  },

  async createOffer(body: {
    title: string;
    description: string;
    code: string;
    applicableMenuItemIds: string[];
  }): Promise<void> {
    await request("POST", "/", body, "offers");
  },

  async updateOffer(
    id: string,
    body: {
      title: string;
      description: string;
      code: string;
      discountType?: string;
      discountValue?: number;
      applicableMenuItemIds: string[];
    },
  ): Promise<void> {
    await request("PATCH", `/${encode(id)}`, body, "offers");
  },

  async setOfferActive(id: string, isActive: boolean): Promise<void> {
    await request("PATCH", `/${encode(id)}/status`, { isActive }, "offers");
  },

  async deleteOffer(id: string): Promise<void> {
    await request("DELETE", `/${encode(id)}`, undefined, "offers");
  },

  async getCategory(id: string): Promise<{
    category: OperationsCategory;
    menuItems: OperationsMenuItem[];
    crossSellUpsells?: OperationsMenuItem[];
  }> {
    return requireData(
      await request("GET", `/categories/${encode(id)}`),
      "The server did not return this category.",
    );
  },

  async createCategory(body: {
    name: string;
    sortOrder?: number;
    icon?: string;
  }): Promise<void> {
    await request("POST", "/categories", body);
  },

  async updateCategory(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("PATCH", `/categories/${encode(id)}`, body);
  },

  async setCategoryActive(id: string, isActive: boolean): Promise<void> {
    await request("PATCH", `/categories/${encode(id)}/status`, { isActive });
  },

  async deleteCategory(id: string): Promise<OperationsCategoryDeleteResult> {
    return requireData(
      await request<OperationsCategoryDeleteResult>(
        "DELETE",
        `/categories/${encode(id)}`,
      ),
      "The server did not confirm category deletion.",
    );
  },

  async getCategoryItems(id: string): Promise<OperationsMenuItem[]> {
    return requireArray(
      await request<OperationsMenuItem[]>(
        "GET",
        `/categories/${encode(id)}/items`,
      ),
      "The server did not return this category's items.",
    );
  },

  async createCategoryItem(
    categoryId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", `/categories/${encode(categoryId)}/items`, body);
  },

  async createCrossSell(
    categoryId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "POST",
      `/categories/${encode(categoryId)}/cross-sells`,
      body,
    );
  },

  async getCrossSells(id: string): Promise<OperationsMenuItem[]> {
    return requireArray(
      await request<OperationsMenuItem[]>(
        "GET",
        `/categories/${encode(id)}/cross-sells`,
      ),
      "The server did not return cross-sell items.",
    );
  },

  async updateItem(id: string, body: Record<string, unknown>): Promise<void> {
    await request("PATCH", `/items/${encode(id)}`, body);
  },

  async deleteItem(id: string): Promise<void> {
    await request("DELETE", `/items/${encode(id)}`);
  },

  async uploadMenuImages(
    files: { uri: string; fileName: string; mimeType: string }[],
    folder: "menu item" | "cross-sells" | "storefront-display",
  ): Promise<string[]> {
    if (files.length === 0) return [];
    if (!API_BASE_URL) {
      throw new Error(
        "API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
      );
    }
    const accessToken = await authApi.getAccessToken();
    if (!accessToken) {
      throw new Error("Your login session is missing. Please sign in again.");
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append("images", {
        uri: file.uri,
        name: file.fileName,
        type: file.mimeType,
      } as unknown as Blob);
    }
    formData.append("folder", folder);

    try {
      const response = await axios.post<ApiEnvelope<unknown>>(
        `${API_BASE_URL}/api/operations/upload-images`,
        formData,
        {
          timeout: 60_000,
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Image upload failed.");
      }

      const data = response.data.data;
      const objectData =
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)
          : null;
      const possibleUrls =
        typeof data === "string"
          ? [data]
          : Array.isArray(data)
            ? data
            : (objectData?.images ??
              objectData?.imageUrls ??
              objectData?.urls ??
              objectData?.url ??
              objectData?.imageUrl);
      const urls = (
        Array.isArray(possibleUrls)
          ? possibleUrls
          : possibleUrls === undefined
            ? []
            : [possibleUrls]
      )
        .map((value) => {
          if (typeof value === "string") return value;
          if (typeof value !== "object" || value === null) return "";
          const image = value as Record<string, unknown>;
          return image.url ?? image.imageUrl ?? image.secure_url ?? "";
        })
        .filter(
          (url): url is string =>
            typeof url === "string" && /^https?:\/\/\S+$/i.test(url),
        );
      if (urls.length !== files.length) {
        throw new Error(
          "The server did not return a valid URL for every uploaded image.",
        );
      }
      return urls;
    } catch (error) {
      if (isAxiosError<ApiEnvelope<unknown>>(error)) {
        const message = error.response?.data?.message;
        if (message) throw new Error(message);
        if (error.response?.status === 401) {
          throw new Error(
            "Your login session has expired. Please sign in again.",
          );
        }
        if (error.response) {
          throw new Error(
            `The server returned an error (${error.response.status}).`,
          );
        }
        if (error.code === "ECONNABORTED") {
          throw new Error("The image upload timed out. Please try again.");
        }
        throw new Error(
          "Unable to reach the server. Check EXPO_PUBLIC_API_URL and try again.",
        );
      }
      throw error instanceof Error
        ? error
        : new Error("Image upload failed. Please try again.");
    }
  },

  async setItemAvailability(id: string, isAvailable: boolean): Promise<void> {
    await request("PATCH", `/items/${encode(id)}`, { isAvailable });
  },

  async updateCrossSell(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("PATCH", `/cross-sells/${encode(id)}`, body);
  },

  async setCrossSellAvailability(
    id: string,
    isAvailable: boolean,
  ): Promise<void> {
    await request("PATCH", `/cross-sells/${encode(id)}`, { isAvailable });
  },

  async deleteCrossSell(id: string): Promise<void> {
    await request("DELETE", `/cross-sells/${encode(id)}`);
  },

  async getInventoryCandidates(): Promise<OperationsMenuItem[]> {
    return requireArray(
      await request<OperationsMenuItem[]>("GET", "/inventory/candidates"),
      "The server did not return inventory candidates.",
    );
  },

  async getInventory(): Promise<OperationsMenuItem[]> {
    return requireArray(
      await request<OperationsMenuItem[]>("GET", "/inventory"),
      "The server did not return quick inventory.",
    );
  },

  async pinInventoryItem(menuItemId: string): Promise<void> {
    await request("POST", "/inventory/pin", { menuItemId });
  },

  async removeInventoryItem(id: string): Promise<void> {
    await request("DELETE", `/inventory/${encode(id)}`);
  },

  async getAllOrders(): Promise<OperationsOrder[]> {
    const response = await request<
      OperationsOrder[] | { orders: OperationsOrder[] }
    >("GET", "/orders?status=all", undefined, "operations");
    const orders = Array.isArray(response) ? response : response?.orders;
    return requireArray(
      orders,
      "The server did not return a valid orders list.",
    );
  },

  async setManagerCheckInStatus(
    isCheckedIn: boolean,
  ): Promise<void> {
    await request(
      "PATCH",
      "/manager/check-in-status",
      { isCheckedIn },
      "operations",
    );
  },

  async updateOrderStatus(
    id: string,
    status: string,
    note?: string,
  ): Promise<void> {
    await request(
      "PATCH",
      `/orders/${encode(id)}/status`,
      {
        status,
        ...(note ? { note } : {}),
      },
      "operations",
    );
  },
};
