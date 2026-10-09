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

export interface OperationsOrdersPage {
  orders: OperationsOrder[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  resource: "operations" | "offers" = "operations",
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
        throw new Error("Your login session has expired. Please sign in again.");
      }
      if (error.response) {
        throw new Error(`The server returned an error (${error.response.status}).`);
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("The server took too long to respond. Please try again.");
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
  async getDashboard(): Promise<OperationsDashboard> {
    return requireData(
      await request<OperationsDashboard>("GET", "/dashboard"),
      "The server did not return the operations dashboard.",
    );
  },

  async getManagers(): Promise<OperationsManagerAssignment[]> {
    return requireArray(
      await request<OperationsManagerAssignment[]>("GET", "/managers"),
      "The server did not return branch managers.",
    );
  },

  async getCategories(): Promise<OperationsCategory[]> {
    return requireArray(
      await request<OperationsCategory[]>("GET", "/categories"),
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
    return requireArray(
      response?.offers,
      "The server did not return offers.",
    );
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
    await request(
      "PATCH",
      `/${encode(id)}/status`,
      { isActive },
      "offers",
    );
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

  async updateCategoryItem(
    categoryId: string,
    itemId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/categories/${encode(categoryId)}/items/${encode(itemId)}`,
      body,
    );
  },

  async createCrossSell(
    categoryId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", `/categories/${encode(categoryId)}/cross-sells`, body);
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

  async getOrdersPage(
    limit = 50,
    skip = 0,
    status = "all",
  ): Promise<OperationsOrdersPage> {
    const page = requireData(
      await request<OperationsOrdersPage>(
        "GET",
        `/orders?status=${encode(status)}&limit=${limit}&skip=${skip}`,
      ),
      "The server did not return operations orders.",
    );
    if (!Array.isArray(page.orders) || !page.pagination) {
      throw new Error("The server returned an invalid operations orders response.");
    }
    return page;
  },

  async getAllOrders(): Promise<OperationsOrder[]> {
    const limit = 50;
    const orders: OperationsOrder[] = [];
    let skip = 0;
    let hasMore = true;
    let pageCount = 0;
    while (hasMore) {
      const page = await operationsApi.getOrdersPage(limit, skip, "all");
      orders.push(...page.orders);
      hasMore = page.pagination.hasMore;
      skip += page.pagination.limit || limit;
      pageCount += 1;
      if (hasMore && pageCount >= 100) {
        throw new Error("The server did not finish paginating operations orders.");
      }
    }
    return orders;
  },

  async updateOrderStatus(
    id: string,
    status: string,
    note?: string,
  ): Promise<void> {
    await request("PATCH", `/orders/${encode(id)}/status`, {
      status,
      ...(note ? { note } : {}),
    });
  },
};
