import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

function formatApiError(message: string, errors: unknown): string {
  if (!errors) return message;
  if (typeof errors === "string") return `${message}: ${errors}`;
  if (!Array.isArray(errors)) return message;

  const details = errors
    .map((error) => {
      if (typeof error === "string") return error;
      if (error && typeof error === "object") {
        const entry = error as Record<string, unknown>;
        return [entry.field, entry.message].filter(Boolean).join(": ");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");

  return details ? `${message}\n${details}` : message;
}

export interface CustomerMenuItem {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  categoryId: string | { _id: string; name?: string };
  branchId?: string | null;
  branchIds?: string[];
  foodType?: string;
  price: number;
  compareAtPrice?: number;
  discountLabel?: string;
  marketingTag?: string;
  customTag?: string;
  customTagEnabled?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  prepTimeMinutes?: number;
  deliveryEstimateMinutes?: number;
  availableQuantity?: number;
  isBestseller?: boolean;
  isHot?: boolean;
  isAvailable: boolean;
  customizationGroups?: {
    _id?: string;
    name: string;
    selectionType: "single" | "multiple";
    minSelections: number;
    maxSelections: number;
    options: {
      _id?: string;
      name: string;
      price: number;
      isAvailable: boolean;
    }[];
  }[];
}

export interface CustomerCrossSell {
  _id?: string;
  id?: string;
  menuItem?: string | CustomerMenuItem;
  item?: string | CustomerMenuItem;
  menuItemId?: string | CustomerMenuItem;
}

export interface CustomerCategory {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  branchId?: string | null;
  icon?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive: boolean;
}

export interface CustomerBranch {
  _id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  area?: string;
  isActive: boolean;
  isOnline?: boolean;
  location?: { lat: number; lng: number };
  restaurantCharges?: {
    packaging?: number;
    platform?: number;
    delivery?: number;
  };
  restaurantChargeOptions?: {
    packaging: number;
    platform: number;
    delivery: number;
    description?: string;
    isActive: boolean;
  }[];
  taxDetails?: {
    gstPercentage?: number;
    cgstPercentage?: number;
    sgstPercentage?: number;
  };
  taxDetailOptions?: {
    gstPercentage: number;
    cgstPercentage?: number;
    sgstPercentage?: number;
    isActive: boolean;
  }[];
  wifiConnections?: {
    name: string;
    password: string;
    isActive: boolean;
  }[];
  managerIds?: (
    | string
    | {
        _id: string;
        firstName?: string;
        lastName?: string;
        managerType?: string;
      }
  )[];
  deliveryOptions?: {
    _id?: string;
    name: string;
    price: number;
    description?: string;
    estimatedTimeRange?: string;
    isActive: boolean;
  }[];
  restaurantNames?: { name: string; isActive: boolean }[];
  storeAddresses?: { address: string; isActive: boolean }[];
  storefrontDisplay?: {
    greetings?: { text: string; isActive: boolean }[];
    searchPlaceholders?: { text: string; isActive: boolean }[];
    emptyStates?: {
      title: string;
      description: string;
      isActive: boolean;
    }[];
  };
}

export interface CustomerOffer {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  code: string;
  branchId?: string | null;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  freeItemName?: string;
  freeItemMenuItemId?: string | null;
  applicableMenuItemIds?: string[];
  applicableItemCount?: number;
  appliesToAllItems?: boolean;
  validFrom?: string;
  validUntil?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface CustomerFeaturedReel {
  _id: string;
  branchId?: string | { _id?: string; id?: string; name?: string } | null;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive: boolean;
}

export interface CustomerCartItem {
  _id: string;
  menuItemId: string | CustomerMenuItem;
  name?: string;
  imageUrl?: string;
  unitPrice?: number;
  quantity: number;
  selectedCustomizations?: unknown[];
  itemTotal?: number;
}

export interface CustomerCart {
  _id?: string;
  fulfillmentType?: "delivery" | "takeaway" | "dine-in";
  branchId?: string;
  deliveryOptionId?: string | null;
  items: CustomerCartItem[];
  pricing?: {
    subtotal?: number;
    discount?: number;
    packagingFee?: number;
    platformFee?: number;
    deliveryFee?: number;
    taxableAmount?: number;
    tax?: number;
    taxPercentage?: number;
    total?: number;
    coupon?: unknown;
  };
  availableOffers?: CustomerOffer[];
}

export interface CustomerOrder {
  _id: string;
  orderNumber: string;
  branchId?: string | CustomerBranch;
  dineInSessionId?: string | null;
  items: {
    menuItemId: string;
    name: string;
    imageUrl?: string;
    unitPrice: number;
    quantity: number;
    customizations?: unknown[];
    selectedCustomizations?: unknown[];
    itemTotal?: number;
  }[];
  fulfillmentType: string;
  subtotal?: number;
  discount?: number;
  packagingFee?: number;
  platformFee?: number;
  deliveryFee?: number;
  tax?: number;
  taxPercentage?: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: string;
  statusHistory?: {
    status: string;
    note?: string;
    changedAt?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCartItemInput {
  menuItemId: string;
  quantity: number;
  selectedCustomizations: CustomerCustomizationSelection[];
  branchId: string;
}

export interface CustomerCustomizationSelection {
  groupId: string;
  optionIds: string[];
}

export interface CheckoutPreviewInput {
  branchId: string;
  fulfillmentType: "delivery" | "takeaway" | "dine-in";
  addressId?: string;
  offerCode?: string;
}

export type CreateCustomerOrderInput =
  | {
      branchId: string;
      fulfillmentType: "dine_in";
    }
  | {
      branchId: string;
      fulfillmentType: "delivery" | "takeaway";
  addressId?: string;
  subtotal?: number;
  discount?: number;
  packagingFee?: number;
  platformFee?: number;
  deliveryFee?: number;
  taxableAmount?: number;
  tax?: number;
  taxPercentage?: number;
  total?: number;
  tipAmount: number;
  specialInstructions: string;
  paymentMethod: "online";
  status: "pending" | "rejected";
  paymentStatus: "pending" | "paid" | "rejected";
    };

export interface CustomerDineInSession {
  _id: string;
  branchId: string;
  tableNumber: number;
  tableId?: string | { _id: string; tableNumber?: number };
  status?: string;
  assignedWaiterName?: string;
}

export interface CustomerDineInTable {
  id: string;
  branchId: string;
  tableNumber: number;
  capacity: number;
  status: string;
  operationalStatus: string;
  isAvailable: boolean;
}

export interface CustomerDineInWaiter {
  tableNumber: number;
  waiterName: string;
}

export interface CustomerDineInWifiConnection {
  id: string;
  name: string;
  password: string;
}

export interface CustomerDineInBill {
  sessionId: string;
  tableNumber: number;
  assignedWaiterName?: string;
  orders: {
    _id: string;
    orderNumber?: string;
    items: {
      name: string;
      quantity: number;
      itemTotal: number;
      unitPrice?: number;
    }[];
  }[];
  coupons: unknown[];
  pricing: {
    subtotal: number;
    discount: number;
    packagingFee: number;
    platformFee: number;
    deliveryFee: number;
    taxableAmount: number;
    tax: number;
    taxPercentage: number | null;
    taxRates: unknown[];
    total: number;
    paidTotal: number;
    amountDue: number;
  };
  paymentStatus: string;
  canPay: boolean;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  "",
);
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
  authenticated = false,
  allowMissingSession = false,
): Promise<T | undefined> {
  if (!API_BASE_URL) {
    throw new Error(
      "API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
    );
  }

  const accessToken = await authApi.getAccessToken();
  if (authenticated && !accessToken) {
    throw new Error("Your login session is missing. Please sign in again.");
  }

  try {
    const response = await axios.request<ApiEnvelope<T>>({
      method,
      url: `${API_BASE_URL}/api${path}`,
      data: body,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!response.data?.success) {
      if (
        allowMissingSession &&
        /no active .*session|session not found/i.test(response.data?.message || "")
      ) {
        return undefined;
      }
      throw new Error(
        formatApiError(
          response.data?.message || "The API request failed.",
          response.data?.errors,
        ),
      );
    }
    return response.data.data;
  } catch (error) {
    if (isAxiosError<ApiEnvelope<unknown>>(error)) {
      const responseData = error.response?.data;
      const message = responseData?.message;
      if (
        allowMissingSession &&
        (error.response?.status === 404 ||
          /no active .*session|session not found/i.test(message || ""))
      ) {
        return undefined;
      }
      if (message) throw new Error(formatApiError(message, responseData.errors));
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

export const customerApi = {
  async getAvailableDineInTables(
    branchId: string,
  ): Promise<CustomerDineInTable[]> {
    const result = requireData(
      await request<{
        branchId: string;
        total: number;
        tables: CustomerDineInTable[];
      }>(
        "GET",
        `/dine-in/available-tables?branchId=${encode(branchId)}`,
        undefined,
        true,
      ),
      "The server did not return available dine-in tables.",
    );
    if (!Array.isArray(result.tables)) {
      throw new Error("The server returned an invalid available-tables response.");
    }
    return result.tables;
  },

  async takeDineInTable(
    branchId: string,
    tableNumber: number,
  ): Promise<CustomerDineInSession> {
    const result = requireData(
      await request<CustomerDineInSession | { session: CustomerDineInSession }>(
        "POST",
        "/dine-in/take-table",
        { branchId, tableNumber },
        true,
      ),
      "The server did not return the dine-in session.",
    );
    const session = "session" in result ? result.session : result;
    if (!session?._id || typeof session.tableNumber !== "number") {
      throw new Error("The server returned an invalid dine-in session.");
    }
    return session;
  },

  async changeDineInTable(
    branchId: string,
    tableNumber: number,
  ): Promise<CustomerDineInSession> {
    const result = requireData(
      await request<
        CustomerDineInSession | { session: CustomerDineInSession }
      >("POST", "/dine-in/change-table", { branchId, tableNumber }, true),
      "The server did not return the updated dine-in session.",
    );
    const session = "session" in result ? result.session : result;
    if (!session?._id || typeof session.tableNumber !== "number") {
      throw new Error("The server returned an invalid dine-in session.");
    }
    return session;
  },

  async getDineInSession(): Promise<CustomerDineInSession | null> {
    const result = await request<CustomerDineInSession | null>(
      "GET",
      "/dine-in/session",
      undefined,
      true,
      true,
    );
    if (result == null) return null;
    if (!result._id || typeof result.tableNumber !== "number") {
      throw new Error("The server returned an invalid dine-in session.");
    }
    return result;
  },

  async closeDineInSession(sessionId: string): Promise<void> {
    await request<void>(
      "POST",
      "/dine-in/close",
      { sessionId },
      true,
    );
  },

  async getDineInWaiter(): Promise<CustomerDineInWaiter> {
    return requireData(
      await request<CustomerDineInWaiter>(
        "GET",
        "/dine-in/waiter",
        undefined,
        true,
      ),
      "The server did not return waiter details.",
    );
  },

  async getDineInServiceRequests(): Promise<unknown[]> {
    return requireArray(
      await request<unknown[]>(
        "GET",
        "/dine-in/service-requests",
        undefined,
        true,
      ),
      "The server did not return service requests.",
    );
  },

  async createDineInServiceRequest(
    sessionId: string,
    type: "water" | "waiter",
  ): Promise<void> {
    await request<void>(
      "POST",
      "/dine-in/service-request",
      { sessionId, type },
      true,
    );
  },

  async getDineInWifi(): Promise<CustomerDineInWifiConnection[]> {
    const result = requireData(
      await request<{ wifiConnections: CustomerDineInWifiConnection[] }>(
        "GET",
        "/dine-in/wifi",
        undefined,
        true,
      ),
      "The server did not return Wi-Fi details.",
    );
    return requireArray(
      result.wifiConnections,
      "The server did not return Wi-Fi details.",
    );
  },

  async getDineInBill(): Promise<CustomerDineInBill> {
    return requireData(
      await request<CustomerDineInBill>(
        "GET",
        "/dine-in/session/bill",
        undefined,
        true,
      ),
      "The server did not return the dine-in bill.",
    );
  },

  async getMenuItems(
    stock?: "all" | "in_stock" | "out_of_stock",
    branchId?: string,
    addressId?: string,
    fulfillmentType?: "delivery" | "takeaway" | "dine-in",
  ): Promise<CustomerMenuItem[]> {
    const query = new URLSearchParams();
    if (branchId) query.set("branchId", branchId);
    if (stock) query.set("stock", stock);
    if (addressId) query.set("addressId", addressId);
    if (fulfillmentType) query.set("fulfillmentType", fulfillmentType);
    const queryString = query.toString();

    return requireArray(
      await request<CustomerMenuItem[]>(
        "GET",
        `/menu-items${queryString ? `?${queryString}` : ""}`,
      ),
      "The server did not return menu items.",
    );
  },

  async voiceSearch(
    query: string,
    branchId: string,
    address: string,
  ): Promise<CustomerMenuItem[]> {
    return requireArray(
      await request<CustomerMenuItem[]>(
        "POST",
        "/menu-items/voice-search",
        { query, branchId, address },
      ),
      "The server did not return voice-search results.",
    );
  },

  async getCategories(): Promise<CustomerCategory[]> {
    return requireArray(
      await request<CustomerCategory[]>("GET", "/categories"),
      "The server did not return menu categories.",
    );
  },

  async getCategoryItems(id: string): Promise<CustomerMenuItem[]> {
    return requireArray(
      await request<CustomerMenuItem[]>(
        "GET",
        `/categories/${encode(id)}/items`,
      ),
      "The server did not return items for this category.",
    );
  },

  async getCategoryCrossSells(id: string): Promise<CustomerCrossSell[]> {
    return requireArray(
      await request<CustomerCrossSell[]>(
        "GET",
        `/categories/${encode(id)}/cross-sells`,
      ),
      "The server did not return cross-sell items for this category.",
    );
  },

  async getBranches(): Promise<CustomerBranch[]> {
    return requireArray(
      await request<CustomerBranch[]>("GET", "/branches"),
      "The server did not return branches.",
    );
  },

  async getNearbyBranches(lat: number, lng: number): Promise<CustomerBranch[]> {
    return requireArray(
      await request<CustomerBranch[]>(
        "GET",
        `/branches/nearby?lat=${encode(String(lat))}&lng=${encode(String(lng))}`,
      ),
      "The server did not return nearby branches.",
    );
  },

  async getOffers(): Promise<CustomerOffer[]> {
    return requireArray(
      await request<CustomerOffer[]>("GET", "/offers"),
      "The server did not return offers.",
    );
  },

  async getOffer(id: string): Promise<CustomerOffer> {
    return requireData(
      await request<CustomerOffer>("GET", `/offers/${encode(id)}`),
      "The server did not return this offer.",
    );
  },

  async getFeaturedReels(): Promise<CustomerFeaturedReel[]> {
    return requireArray(
      await request<CustomerFeaturedReel[]>("GET", "/featured-reels"),
      "The server did not return featured reels.",
    );
  },

  async getFavorites(): Promise<unknown[]> {
    return requireArray(
      await request<unknown[]>("GET", "/favorites", undefined, true),
      "The server did not return favorites.",
    );
  },

  async addFavorite(menuItemId: string): Promise<void> {
    await request("POST", `/favorites/${encode(menuItemId)}`, undefined, true);
  },

  async removeFavorite(menuItemId: string): Promise<void> {
    await request(
      "DELETE",
      `/favorites/${encode(menuItemId)}`,
      undefined,
      true,
    );
  },

  async getCart(branchId: string): Promise<CustomerCart> {
    return requireData(
      await request<CustomerCart>(
        "GET",
        `/cart?branchId=${encode(branchId)}`,
        undefined,
        true,
      ),
      "The server did not return your cart.",
    );
  },

  async updateCartDeliveryOption(
    deliveryOptionId: string,
    branchId: string,
  ): Promise<void> {
    await request(
      "PATCH",
      "/cart/delivery-option",
      { deliveryOptionId, branchId },
      true,
    );
  },

  async addCartItem(item: CustomerCartItemInput): Promise<void> {
    await request("POST", "/cart/items", item, true);
  },

  async addCrossSellCartItem(
    item: Pick<CustomerCartItemInput, "menuItemId" | "quantity">,
  ): Promise<void> {
    await request("POST", "/cart/items", item, true);
  },

  async updateCartItem(
    itemId: string,
    quantity: number,
    branchId: string,
  ): Promise<void> {
    await request(
      "PATCH",
      `/cart/items/${encode(itemId)}?branchId=${encode(branchId)}`,
      { quantity },
      true,
    );
  },

  async removeCartItem(itemId: string, branchId: string): Promise<void> {
    await request(
      "DELETE",
      `/cart/items/${encode(itemId)}?branchId=${encode(branchId)}`,
      undefined,
      true,
    );
  },

  async applyCartCoupon(code: string, branchId: string): Promise<void> {
    await request("POST", "/cart/coupon", { code, branchId }, true);
  },

  async removeCartCoupon(branchId: string): Promise<void> {
    await request(
      "DELETE",
      `/cart/coupon?branchId=${encode(branchId)}`,
      undefined,
      true,
    );
  },

  async clearCart(branchId: string): Promise<void> {
    await request(
      "DELETE",
      `/cart?branchId=${encode(branchId)}`,
      undefined,
      true,
    );
  },

  async previewCheckout(input: CheckoutPreviewInput): Promise<unknown> {
    return requireData(
      await request("POST", "/checkout/preview", input, true),
      "The server did not return a checkout preview.",
    );
  },

  async getOrders(): Promise<CustomerOrder[]> {
    return requireArray(
      await request<CustomerOrder[]>("GET", "/orders", undefined, true),
      "The server did not return your orders.",
    );
  },

  async getOrder(id: string): Promise<CustomerOrder> {
    return requireData(
      await request<CustomerOrder>(
        "GET",
        `/orders/${encode(id)}`,
        undefined,
        true,
      ),
      "The server did not return this order.",
    );
  },

  async getOrderTracking(id: string): Promise<unknown> {
    return requireData(
      await request("GET", `/orders/${encode(id)}/tracking`, undefined, true),
      "The server did not return order tracking details.",
    );
  },

  async cancelOrder(id: string): Promise<void> {
    await request("PATCH", `/orders/${encode(id)}/cancel`, {}, true);
  },

  async reorder(id: string): Promise<unknown> {
    return requireData(
      await request("POST", `/orders/${encode(id)}/reorder`, {}, true),
      "The server did not return the reordered items.",
    );
  },

  async createOrder(input: CreateCustomerOrderInput): Promise<CustomerOrder> {
    return requireData(
      await request<CustomerOrder>("POST", "/orders", input, true),
      "The server did not return the created order.",
    );
  },
};
