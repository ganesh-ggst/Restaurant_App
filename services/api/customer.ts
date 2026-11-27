import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";
import { getFriendlyErrorMessage } from "../../utils/friendly-error";
import {
  clearAccountPersistentCache,
  getAccountCacheScope,
  getPersistentCache,
  invalidatePersistentCache,
} from "./persistent-cache";

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
  marketingBadgeLabel?: string;
  customTag?: string;
  customTagEnabled?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  prepTimeMinutes?: number;
  deliveryEstimateMinutes?: number;
  estimatedDeliveryRange?: string;
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
  distanceKm?: number | string;
  distanceAddressId?: string;
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
    deliverySpeed?: string;
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

export type DeliverySpeed = "eco_saver" | "standard" | "express";

export function getDeliverySpeed(value: unknown): DeliverySpeed | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.includes("ecosaver")) return "eco_saver";
  if (normalized.includes("standard")) return "standard";
  if (normalized.includes("express")) return "express";
  return null;
}

export interface CustomerOrder {
  _id: string;
  orderNumber: string;
  branchId?: string | CustomerBranch;
  addressId?: string | { _id?: string; id?: string };
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
  orderReview?: {
    id?: string;
    rating: number;
    comment?: string;
    status?: string;
  } | null;
  hasOrderReview?: boolean;
  canReviewOrder?: boolean;
  canEditOrderReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerOrderReview {
  id?: string;
  orderId: string;
  orderNumber?: string;
  rating: number;
  comment: string;
  itemCount?: number;
}

interface CustomerOrderReviewResponse {
  orderReview: CustomerOrderReview;
}

export type CartFulfillmentType = "delivery" | "takeaway" | "dine-in";

export type CustomerCartContext =
  | {
      branchId: string;
      fulfillmentType: "delivery";
      addressId: string;
    }
  | {
      branchId: string;
      fulfillmentType: "takeaway" | "dine-in";
      addressId?: string;
    };

export type CustomerCartItemInput = CustomerCartContext & {
  menuItemId: string;
  quantity: number;
  selectedCustomizations: CustomerCustomizationSelection[];
};

type CustomerCartApiContext = Omit<CustomerCartContext, "fulfillmentType"> & {
  fulfillmentType: "delivery" | "takeaway" | "dine_in";
};

function toCustomerCartApiContext(
  context: CustomerCartContext,
): CustomerCartApiContext {
  return {
    ...context,
    fulfillmentType:
      context.fulfillmentType === "dine-in"
        ? "dine_in"
        : context.fulfillmentType,
  };
}

export interface CustomerCustomizationSelection {
  groupId: string;
  optionIds: string[];
}

export interface CustomerMenuItemsQuery {
  stock?: "all" | "in_stock" | "out_of_stock";
  branchId?: string;
  address?: string;
  fulfillmentType?: "delivery" | "takeaway" | "dine-in";
  search?: string;
  categoryId?: string;
  foodType?: string;
  isBestseller?: boolean;
  isHot?: boolean;
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

function isMissingDineInSessionMessage(message: string | undefined): boolean {
  return /no active .*session|session not found|reservation has expired/i.test(
    message || "",
  );
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
  authenticated = false,
  allowMissingSession = false,
): Promise<T | undefined> {
  if (!API_BASE_URL) {
    throw new Error(
      getFriendlyErrorMessage(
        "API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
      ),
    );
  }

  const accessToken = await authApi.getAccessToken();
  if (authenticated && !accessToken) {
    throw new Error(
      getFriendlyErrorMessage("Your login session is missing."),
    );
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
        isMissingDineInSessionMessage(response.data?.message)
      ) {
        return undefined;
      }
      throw new Error(
        getFriendlyErrorMessage(
          formatApiError(
          response.data?.message || "The API request failed.",
          response.data?.errors,
          ),
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
          isMissingDineInSessionMessage(message))
      ) {
        return undefined;
      }
      if (message) {
        throw new Error(
          getFriendlyErrorMessage(formatApiError(message, responseData.errors)),
        );
      }
      if (error.response?.status === 401) {
        throw new Error(
          getFriendlyErrorMessage("Your login session has expired."),
        );
      }
      if (error.response) {
        throw new Error(
          getFriendlyErrorMessage(
            `The server returned an error (${error.response.status}).`,
          ),
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new Error(
          getFriendlyErrorMessage("The server took too long to respond."),
        );
      }
      throw new Error(
        getFriendlyErrorMessage(
          "Unable to reach the server. Check EXPO_PUBLIC_API_URL and try again.",
        ),
      );
    }
    throw error instanceof Error
      ? new Error(getFriendlyErrorMessage(error))
      : new Error(getFriendlyErrorMessage("The API request failed."));
  }
}

function requireData<T>(data: T | undefined, message: string): T {
  if (data === undefined || data === null) {
    throw new Error(getFriendlyErrorMessage(message));
  }
  return data;
}

function requireArray<T>(data: T[] | undefined, message: string): T[] {
  const result = requireData(data, message);
  if (!Array.isArray(result)) throw new Error(message);
  return result;
}

const encode = (value: string) => encodeURIComponent(value);

function getCartCacheResource(context: CustomerCartContext): string {
  const apiContext = toCustomerCartApiContext(context);
  return [
    "cart",
    encode(apiContext.branchId),
    apiContext.fulfillmentType,
    encode(apiContext.addressId || ""),
  ].join(":");
}

async function getAccountCacheKey(resource: string): Promise<string> {
  const token = await authApi.getAccessToken();
  if (!token) {
    throw new Error(getFriendlyErrorMessage("Your login session is missing."));
  }
  const identity = (await authApi.getCacheUserId()) || token;
  return `customer:${getAccountCacheScope(identity)}:${resource}`;
}

async function invalidateCartCache(
  context: CustomerCartContext,
): Promise<void> {
  await invalidateAccountCache(getCartCacheResource(context));
}

async function invalidateBranchCartCaches(branchId: string): Promise<void> {
  const token = await authApi.getAccessToken();
  const identity = (await authApi.getCacheUserId()) || token;
  if (!identity) return;
  try {
    await clearAccountPersistentCache(identity, `cart:${encode(branchId)}:`);
  } catch (error) {
    console.warn("Unable to invalidate the cart cache.", error);
  }
}

async function requestCart(
  context: CustomerCartContext,
): Promise<CustomerCart> {
  const apiContext = toCustomerCartApiContext(context);
  const query = new URLSearchParams({
    branchId: apiContext.branchId,
    fulfillmentType: apiContext.fulfillmentType,
  });
  if (apiContext.addressId) query.set("addressId", apiContext.addressId);
  return requireData(
    await request<CustomerCart>(
      "GET",
      `/cart?${query.toString()}`,
      undefined,
      true,
    ),
    "The server did not return your cart.",
  );
}

async function invalidateAccountCache(resource: string): Promise<void> {
  try {
    const key = await getAccountCacheKey(resource);
    await invalidatePersistentCache(key);
  } catch (error) {
    console.warn(`Unable to invalidate the ${resource} cache.`, error);
  }
}

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
      throw new Error(
        getFriendlyErrorMessage(
          "The server returned an invalid available-tables response.",
        ),
      );
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
      throw new Error(
        getFriendlyErrorMessage("The server returned an invalid dine-in session."),
      );
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
      throw new Error(
        getFriendlyErrorMessage("The server returned an invalid dine-in session."),
      );
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
      throw new Error(
        getFriendlyErrorMessage("The server returned an invalid dine-in session."),
      );
    }
    return result;
  },

  async closeDineInSession(sessionId: string): Promise<void> {
    await request<void>(
      "POST",
      "/dine-in/close",
      { sessionId },
      true,
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
    filters: CustomerMenuItemsQuery = {},
    forceRefresh = false,
    onUpdate?: (items: CustomerMenuItem[]) => void,
  ): Promise<CustomerMenuItem[]> {
    const query = new URLSearchParams();
    if (filters.branchId) query.set("branchId", filters.branchId);
    if (filters.address) query.set("address", filters.address);
    if (filters.fulfillmentType) {
      query.set("fulfillmentType", filters.fulfillmentType);
    }
    if (filters.search?.trim()) query.set("search", filters.search.trim());
    if (filters.categoryId) query.set("categoryId", filters.categoryId);
    if (filters.foodType) query.set("foodType", filters.foodType);
    if (filters.stock) query.set("stock", filters.stock);
    if (filters.isBestseller !== undefined) {
      query.set("isBestseller", String(filters.isBestseller));
    }
    if (filters.isHot !== undefined) query.set("isHot", String(filters.isHot));
    const queryString = query.toString();
    const loadMenuItems = async () =>
      requireArray(
        await request<CustomerMenuItem[]>(
          "GET",
          `/menu-items${queryString ? `?${queryString}` : ""}`,
        ),
        "The server did not return menu items.",
      );

    if (filters.search?.trim()) return loadMenuItems();
    return getPersistentCache(
      `customer:menu:${queryString || "all"}`,
      60 * 1000,
      forceRefresh,
      loadMenuItems,
      onUpdate,
      true,
    );
  },

  async voiceSearch(
    query: string,
    branchId: string,
    address: string,
    fulfillmentType: "delivery" | "takeaway" | "dine-in",
  ): Promise<CustomerMenuItem[]> {
    const result = requireData(
      await request<{
        query: string;
        count: number;
        items: CustomerMenuItem[];
      }>(
        "POST",
        "/menu-items/voice-search",
        { query, branchId, address, fulfillmentType },
      ),
      "The server did not return voice-search results.",
    );
    return requireArray(
      result.items,
      "The server did not return voice-search results.",
    );
  },

  async getCategories(
    forceRefresh = false,
    onUpdate?: (categories: CustomerCategory[]) => void,
  ): Promise<CustomerCategory[]> {
    return getPersistentCache(
      "customer:categories",
      24 * 60 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerCategory[]>("GET", "/categories"),
          "The server did not return menu categories.",
        ),
      onUpdate,
      true,
    );
  },

  async getCategoryItems(
    id: string,
    branchId?: string,
    forceRefresh = false,
    onUpdate?: (items: CustomerMenuItem[]) => void,
  ): Promise<CustomerMenuItem[]> {
    const query = branchId ? `?branchId=${encode(branchId)}` : "";
    return getPersistentCache(
      `customer:category-items:${encode(id)}:${encode(branchId || "all")}`,
      60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerMenuItem[]>(
            "GET",
            `/categories/${encode(id)}/items${query}`,
          ),
          "The server did not return items for this category.",
        ),
      onUpdate,
      true,
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

  async getBranches(
    forceRefresh = false,
    onUpdate?: (branches: CustomerBranch[]) => void,
  ): Promise<CustomerBranch[]> {
    return getPersistentCache(
      "customer:branches",
      10 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerBranch[]>("GET", "/branches"),
          "The server did not return branches.",
        ),
      onUpdate,
      true,
    );
  },

  async getNearbyBranches(
    addressId: string,
    forceRefresh = false,
    onUpdate?: (branches: CustomerBranch[]) => void,
  ): Promise<CustomerBranch[]> {
    return getPersistentCache(
      `customer:nearby-branches:${encode(addressId)}`,
      10 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerBranch[]>(
            "GET",
            `/branches/nearby?addressId=${encode(addressId)}`,
          ),
          "The server did not return nearby branches.",
        ),
      onUpdate,
      true,
    );
  },

  async getOffers(
    forceRefresh = false,
    onUpdate?: (offers: CustomerOffer[]) => void,
  ): Promise<CustomerOffer[]> {
    return getPersistentCache(
      "customer:offers",
      15 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerOffer[]>("GET", "/offers"),
          "The server did not return offers.",
        ),
      onUpdate,
      true,
    );
  },

  async getOffer(id: string): Promise<CustomerOffer> {
    return requireData(
      await request<CustomerOffer>("GET", `/offers/${encode(id)}`),
      "The server did not return this offer.",
    );
  },

  async getFeaturedReels(
    branchId: string,
    forceRefresh = false,
    onUpdate?: (reels: CustomerFeaturedReel[]) => void,
  ): Promise<CustomerFeaturedReel[]> {
    return getPersistentCache(
      `customer:featured-reels:${encode(branchId)}`,
      60 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerFeaturedReel[]>(
            "GET",
            `/featured-reels?branchId=${encode(branchId)}`,
          ),
          "The server did not return featured reels.",
        ),
      onUpdate,
      true,
    );
  },

  async getFavorites(
    forceRefresh = false,
    onUpdate?: (favorites: unknown[]) => void,
  ): Promise<unknown[]> {
    const cacheKey = await getAccountCacheKey("favorites");
    return getPersistentCache(
      cacheKey,
      5 * 60 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<unknown[]>("GET", "/favorites", undefined, true),
          "The server did not return favorites.",
        ),
      onUpdate,
      true,
    );
  },

  async addFavorite(menuItemId: string): Promise<void> {
    await request("POST", `/favorites/${encode(menuItemId)}`, undefined, true);
    await invalidateAccountCache("favorites");
  },

  async removeFavorite(menuItemId: string): Promise<void> {
    await request(
      "DELETE",
      `/favorites/${encode(menuItemId)}`,
      undefined,
      true,
    );
    await invalidateAccountCache("favorites");
  },

  async getCart(context: CustomerCartContext): Promise<CustomerCart> {
    return requestCart(context);
  },

  async getCachedCart(
    context: CustomerCartContext,
    forceRefresh = false,
    onUpdate?: (cart: CustomerCart) => void,
  ): Promise<CustomerCart> {
    const cacheKey = await getAccountCacheKey(
      getCartCacheResource(context),
    );
    return getPersistentCache(
      cacheKey,
      30 * 1000,
      forceRefresh,
      () => requestCart(context),
      onUpdate,
      true,
    );
  },

  async updateCartDeliveryOption(
    {
      branchId,
      deliverySpeed,
    }: { branchId: string; deliverySpeed: DeliverySpeed },
  ): Promise<void> {
    await request(
      "PATCH",
      "/cart/delivery-option",
      { branchId, deliverySpeed },
      true,
    );
    await invalidateBranchCartCaches(branchId);
  },

  async addCartItem(item: CustomerCartItemInput): Promise<void> {
    await request(
      "POST",
      "/cart/items",
      { ...item, ...toCustomerCartApiContext(item) },
      true,
    );
    await invalidateCartCache(item);
  },

  async addCrossSellCartItem(
    item: Pick<CustomerCartItemInput, "menuItemId" | "quantity"> &
      CustomerCartContext,
  ): Promise<void> {
    const apiContext = toCustomerCartApiContext(item);
    await request(
      "POST",
      "/cart/items",
      { ...item, ...apiContext, selectedCustomizations: [] },
      true,
    );
    await invalidateCartCache(item);
  },

  async updateCartItem(
    itemId: string,
    quantity: number,
    context: CustomerCartContext,
  ): Promise<void> {
    const apiContext = toCustomerCartApiContext(context);
    const query = new URLSearchParams({
      branchId: apiContext.branchId,
      fulfillmentType: apiContext.fulfillmentType,
    });
    if (apiContext.addressId) query.set("addressId", apiContext.addressId);
    await request(
      "PATCH",
      `/cart/items/${encode(itemId)}?${query.toString()}`,
      { quantity },
      true,
    );
    await invalidateCartCache(context);
  },

  async removeCartItem(
    itemId: string,
    context: CustomerCartContext,
  ): Promise<void> {
    const apiContext = toCustomerCartApiContext(context);
    const query = new URLSearchParams({
      branchId: apiContext.branchId,
      fulfillmentType: apiContext.fulfillmentType,
    });
    if (apiContext.addressId) query.set("addressId", apiContext.addressId);
    await request(
      "DELETE",
      `/cart/items/${encode(itemId)}?${query.toString()}`,
      undefined,
      true,
    );
    await invalidateCartCache(context);
  },

  async applyCartCoupon(
    code: string,
    context: CustomerCartContext,
  ): Promise<void> {
    const apiContext = toCustomerCartApiContext(context);
    await request(
      "POST",
      "/cart/coupon",
      {
        ...apiContext,
        code,
      },
      true,
    );
    await invalidateCartCache(context);
  },

  async removeCartCoupon(context: CustomerCartContext): Promise<void> {
    const apiContext = toCustomerCartApiContext(context);
    const query = new URLSearchParams({
      branchId: apiContext.branchId,
      fulfillmentType: apiContext.fulfillmentType,
    });
    if (apiContext.addressId) query.set("addressId", apiContext.addressId);
    await request(
      "DELETE",
      `/cart/coupon?${query.toString()}`,
      undefined,
      true,
    );
    await invalidateCartCache(context);
  },

  async clearCart(context: CustomerCartContext): Promise<void> {
    const apiContext = toCustomerCartApiContext(context);
    const query = new URLSearchParams({
      branchId: apiContext.branchId,
      fulfillmentType: apiContext.fulfillmentType,
    });
    if (apiContext.addressId) query.set("addressId", apiContext.addressId);
    await request(
      "DELETE",
      `/cart?${query.toString()}`,
      undefined,
      true,
    );
    await invalidateCartCache(context);
  },

  async previewCheckout(input: CheckoutPreviewInput): Promise<unknown> {
    return requireData(
      await request("POST", "/checkout/preview", input, true),
      "The server did not return a checkout preview.",
    );
  },

  async getOrders(
    forceRefresh = false,
    onUpdate?: (orders: CustomerOrder[]) => void,
  ): Promise<CustomerOrder[]> {
    const cacheKey = await getAccountCacheKey("orders");
    return getPersistentCache(
      cacheKey,
      30 * 1000,
      forceRefresh,
      async () =>
        requireArray(
          await request<CustomerOrder[]>("GET", "/orders", undefined, true),
          "The server did not return your orders.",
        ),
      onUpdate,
      true,
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

  async createOrderReview(
    orderId: string,
    rating: number,
    comment: string,
  ): Promise<CustomerOrderReview> {
    const response = requireData(
      await request<CustomerOrderReviewResponse>(
        "POST",
        `/reviews/orders/${encode(orderId)}`,
        { rating, comment },
        true,
      ),
      "The server did not return the submitted order review.",
    );
    return requireData(
      response.orderReview,
      "The server did not return the submitted order review.",
    );
  },

  async updateOrderReview(
    orderId: string,
    rating: number,
    comment: string,
  ): Promise<CustomerOrderReview> {
    const response = requireData(
      await request<CustomerOrderReviewResponse>(
        "PATCH",
        `/reviews/orders/${encode(orderId)}`,
        { rating, comment },
        true,
      ),
      "The server did not return the updated order review.",
    );
    return requireData(
      response.orderReview,
      "The server did not return the updated order review.",
    );
  },

  async cancelOrder(id: string): Promise<void> {
    await request("PATCH", `/orders/${encode(id)}/cancel`, {}, true);
    await invalidateAccountCache("orders");
  },

  async deleteOrder(id: string): Promise<void> {
    await request("DELETE", `/orders/${encode(id)}`, undefined, true);
    await invalidateAccountCache("orders");
  },

  async reorder(id: string): Promise<unknown> {
    return requireData(
      await request("POST", `/orders/${encode(id)}/reorder`, {}, true),
      "The server did not return the reordered items.",
    );
  },

  async createOrder(input: CreateCustomerOrderInput): Promise<CustomerOrder> {
    const order = requireData(
      await request<CustomerOrder>("POST", "/orders", input, true),
      "The server did not return the created order.",
    );
    await invalidateAccountCache("orders");
    return order;
  },
};
