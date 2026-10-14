import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
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
  managerIds?: (string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    managerType?: string;
  })[];
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
  branchId?: string | { _id: string; name?: string };
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

export interface CreateCustomerOrderInput {
  branchId: string;
  fulfillmentType: "delivery" | "takeaway" | "dine-in";
  addressId?: string;
  paymentMethod: "online";
  status: "pending" | "rejected";
  paymentStatus: "paid" | "rejected";
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
  authenticated = false,
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
      throw new Error(response.data?.message || "The API request failed.");
    }
    return response.data.data;
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

export const customerApi = {
  async getMenuItems(
    stock?: "all" | "in_stock" | "out_of_stock",
    branchId?: string,
  ): Promise<CustomerMenuItem[]> {
    const query = new URLSearchParams();
    if (branchId) query.set("branchId", branchId);
    if (stock) query.set("stock", stock);
    const queryString = query.toString();

    return requireArray(
      await request<CustomerMenuItem[]>(
        "GET",
        `/menu-items${queryString ? `?${queryString}` : ""}`,
      ),
      "The server did not return menu items.",
    );
  },

  async voiceSearch(query: string): Promise<CustomerMenuItem[]> {
    return requireArray(
      await request<CustomerMenuItem[]>("POST", "/menu-items/voice-search", {
        query,
      }),
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
    await request("DELETE", `/favorites/${encode(menuItemId)}`, undefined, true);
  },

  async getCart(): Promise<CustomerCart> {
    return requireData(
      await request<CustomerCart>("GET", "/cart", undefined, true),
      "The server did not return your cart.",
    );
  },

  async addCartItem(item: CustomerCartItemInput): Promise<void> {
    await request("POST", "/cart/items", item, true);
  },

  async updateCartItem(
    itemId: string,
    quantity: number,
  ): Promise<void> {
    await request(
      "PATCH",
      `/cart/items/${encode(itemId)}`,
      { quantity },
      true,
    );
  },

  async removeCartItem(itemId: string): Promise<void> {
    await request(
      "DELETE",
      `/cart/items/${encode(itemId)}`,
      undefined,
      true,
    );
  },

  async applyCartCoupon(code: string): Promise<void> {
    await request("POST", "/cart/coupon", { code }, true);
  },

  async removeCartCoupon(): Promise<void> {
    await request("DELETE", "/cart/coupon", undefined, true);
  },

  async clearCart(): Promise<void> {
    await request("DELETE", "/cart", undefined, true);
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
      await request<CustomerOrder>("GET", `/orders/${encode(id)}`, undefined, true),
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

  async createOrder(
    input: CreateCustomerOrderInput,
  ): Promise<CustomerOrder> {
    return requireData(
      await request<CustomerOrder>("POST", "/orders", input, true),
      "The server did not return the created order.",
    );
  },
};
