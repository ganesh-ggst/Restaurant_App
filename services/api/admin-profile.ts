import axios, { isAxiosError } from "axios";
import * as FileSystem from "expo-file-system/legacy";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export interface AdminProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "admin";
  branchId: string | null;
  isActive: boolean;
  avatarUrl: string;
  isProfileCompleted: boolean;
}

export interface AdminProfileResponse {
  admin: AdminProfile;
  store: Record<string, unknown> | null;
}

export interface AdminPerson {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string | null;
  role?: string;
  managerType?: string;
  branchId?: string;
  isActive?: boolean;
  isCheckIn?: boolean;
  avatarUrl?: string;
  isProfileCompleted?: boolean;
  assignmentId?: string;
  assignedTables?: AdminTable[];
  availableTables?: AdminTable[];
  relatedWaiters?: AdminWaiter[];
  availableWaiters?: AdminWaiter[];
  [key: string]: unknown;
}

export interface AdminTable {
  id: string;
  tableNumber: number;
  capacity?: number;
  status?: string;
  isActive?: boolean;
  managerId?: string | null;
  tableStatus?: {
    status?: string;
    managerId?: string | null;
    assignedWaiterId?: string | null;
    assignedWaiter?: AdminWaiter | null;
    manager?: { id: string; name?: string } | null;
  } | null;
}

export interface AdminWaiter {
  id: string;
  name: string;
  normalizedName?: string;
  status?: string;
  isActive?: boolean;
  branchId?: string;
  managerId?: string | null;
  isAssignedToManager?: boolean;
  manager?: { id: string; name: string; managerType: string } | null;
  assignedTableId?: string | null;
  waiterStatus?: {
    tableId?: string | null;
    managerId?: string | null;
    manager?: { id: string; name?: string; managerType?: string } | null;
    status?: string;
  } | null;
}

export interface AdminRevenueNotification {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  heading: string;
  amount: number;
  currency: string;
  amountFormatted: string;
  description: string;
  period: {
    unit: string;
    label: string;
    startAt: string;
    endAt: string;
  };
  time: string;
  displayTime: string;
  action: {
    type: string;
    label: string;
  };
  isRead: boolean;
  readAt: string | null;
  branch: {
    id: string;
    name: string;
  };
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotificationPage {
  notifications: AdminRevenueNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
  notificationTypes: string[];
}

export interface AdminDashboardBranch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  address: string;
  city: string;
  area: string;
  state: string;
  phone: string;
  location: { lat: number; lng: number };
  openingTime: string;
  closingTime: string;
}

export interface AdminDashboardData {
  branch: AdminDashboardBranch;
  stats: {
    todayRevenue: number;
    todayOrderCount: number;
    monthlySales: number;
    monthlyOrderCount: number;
    yearlyRevenue: number;
    fiscalYear: string;
    yearOverYearChangePercentage: number | null;
    activeManagers: number;
    activeWaiters: number;
  };
  weeklyRevenueTrend: {
    weekStartsOn: string;
    days: { day: string; date: string; revenue: number }[];
    peakDay: { day: string; date: string; revenue: number };
    averageDailyRevenue: number;
  };
  salesDistribution: {
    period: string;
    totalRevenue: number;
    items: {
      fulfillmentType: string;
      label: string;
      revenue: number;
      percentage: number;
      orderCount: number;
    }[];
  };
  revenueDefinition: {
    includedOrderStatuses: string[];
    timeZone: string;
    monthlyPeriod: string;
    yearlyPeriod: string;
  };
}

export interface AdminTodayLiveRevenue {
  branch: { id: string; name: string; code: string; isActive: boolean };
  period: { start: string; end: string; timeZone: string };
  totalCollectedToday: number;
  baseStorefrontRevenue: number;
  realizedOrderCount: number;
  liveOrderCount: number;
  transactions: {
    id: string;
    orderId?: string;
    orderNumber?: string;
    label: string;
    fulfillmentType?: string;
    status: string;
    paymentStatus?: string;
    amount: number;
    createdAt?: string;
    badge: string;
  }[];
}

export interface AdminMonthlySales {
  branch: { id: string; name: string; code: string };
  period: { start: string; end: string; label: string };
  totalMonthToDateRevenue: number;
  totalOrderCount: number;
  weeks: {
    week: number;
    start: string;
    end: string;
    label: string;
    revenue: number;
    orderCount: number;
    status: string;
  }[];
}

export interface AdminYearlyRevenue {
  branch: { id: string; name: string; code: string };
  fiscalYear: string;
  totalFiscalYearRevenue: number;
  totalOrderCount: number;
  quarters: {
    quarter: string;
    label: string;
    start: string;
    end: string;
    revenue: number;
    orderCount: number;
    growthPercentage: number | null;
    status: string;
  }[];
}

export interface AdminWeeklyTrend {
  branch: { id: string; name: string; code: string };
  weekStartsOn: string;
  days: {
    day: string;
    date: string;
    isLiveDay: boolean;
    dineInRevenue: number;
    takeawayRevenue: number;
    deliveryRevenue: number;
    totalRevenue: number;
    orderCount: number;
  }[];
  peakDay: {
    day: string;
    date: string;
    isLiveDay: boolean;
    dineInRevenue: number;
    takeawayRevenue: number;
    deliveryRevenue: number;
    totalRevenue: number;
    orderCount: number;
  };
}

export interface AdminSalesDistribution {
  branch: { id: string; name: string; code: string };
  period: string;
  totalRevenue: number;
  totalOrderCount: number;
  items: {
    fulfillmentType: string;
    label: string;
    revenue: number;
    percentage: number;
    orderCount: number;
    volume?: number;
  }[];
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

let localAdminAvatar: { adminId: string; uri: string } | null = null;
let cacheAccessToken: string | null = null;
const cache = new Map<string, unknown>();
const requestsInFlight = new Map<string, Promise<unknown>>();

async function readCached<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const accessToken = await authApi.getAccessToken();
  if (!accessToken) {
    throw new Error("Your login session is missing. Please sign in again.");
  }
  if (cacheAccessToken !== accessToken) {
    cache.clear();
    requestsInFlight.clear();
    cacheAccessToken = accessToken;
  }

  if (cache.has(key)) {
    return cache.get(key) as T;
  }

  const pending = requestsInFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = load()
    .then((value) => {
      if (cacheAccessToken === accessToken) cache.set(key, value);
      return value;
    })
    .finally(() => {
      if (requestsInFlight.get(key) === request) {
        requestsInFlight.delete(key);
      }
    });
  requestsInFlight.set(key, request);
  return request;
}

function invalidate(...keys: string[]): void {
  keys.forEach((key) => {
    cache.delete(key);
    requestsInFlight.delete(key);
  });
}

function invalidatePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      requestsInFlight.delete(key);
    }
  }
  for (const key of requestsInFlight.keys()) {
    if (key.startsWith(prefix)) requestsInFlight.delete(key);
  }
}

function formatApiError(message: string, errors: unknown): string {
  if (!errors) return message;
  if (typeof errors === "string") return `${message}: ${errors}`;
  if (Array.isArray(errors)) {
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
  if (typeof errors === "object") {
    return message;
  }
  return message;
}

export function getLocalAdminAvatarUri(adminId: string): string | null {
  return localAdminAvatar?.adminId === adminId ? localAdminAvatar.uri : null;
}

export function setLocalAdminAvatarUri(adminId: string, uri: string): void {
  localAdminAvatar = { adminId, uri };
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  apiPath = "/api/admin/profile",
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
      url: `${API_BASE_URL}${apiPath}${path}`,
      data: body,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const isEmptySuccessfulDelete =
      method === "DELETE" &&
      response.status >= 200 &&
      response.status < 300 &&
      (response.data === undefined || response.data === null);
    if (!response.data?.success && !isEmptySuccessfulDelete) {
      throw new Error(response.data?.message || "The API request failed.");
    }

    return response.data.data;
  } catch (error) {
    if (isAxiosError<ApiEnvelope<unknown>>(error)) {
      const responseData = error.response?.data;
      const message = responseData?.message;
      if (message) {
        throw new Error(formatApiError(message, responseData.errors));
      }
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
  if (data === undefined || data === null) {
    throw new Error(message);
  }
  return data;
}

function requireArray<T>(data: T[] | undefined, message: string): T[] {
  const result = requireData(data, message);
  if (!Array.isArray(result)) {
    throw new Error(message);
  }
  return result;
}

const encode = (value: string) => encodeURIComponent(value);
const storeDetailSectionSlugs: Record<string, string> = {
  restaurantNames: "restaurant-names",
  addresses: "addresses",
  taxDetails: "tax-details",
  restaurantCharges: "restaurant-charges",
  wifiConnections: "wifi-connections",
  deliveryOptions: "delivery-options",
};
const storeDetailSectionSlug = (section: string) => {
  const slug = storeDetailSectionSlugs[section];
  if (!slug) throw new Error(`Unsupported store-detail section: ${section}`);
  return slug;
};
const storeDetailSectionPath = (section: string) =>
  `/${storeDetailSectionSlug(section)}`;
const storefrontSectionSlugs: Record<string, string> = {
  greetings: "greetings",
  searchPlaceholders: "search-placeholders",
  featuredContents: "featured-content",
  emptyStates: "empty-states",
  celebrationEmojis: "celebration-emojis",
};
const storefrontSectionSlug = (section: string) => {
  const slug = storefrontSectionSlugs[section];
  if (!slug) throw new Error(`Unsupported storefront section: ${section}`);
  return slug;
};
const storefrontSectionPath = (section: string) =>
  `/${storefrontSectionSlug(section)}`;

export const adminProfileApi = {
  async getProfile(forceRefresh = false): Promise<AdminProfileResponse> {
    if (forceRefresh) invalidate("profile");
    const data = requireData(
      await readCached("profile", () =>
        request<AdminProfileResponse>("GET", ""),
      ),
      "The server did not return the admin profile.",
    );
    if (!data.admin) {
      throw new Error("The server returned an invalid admin profile.");
    }
    return data;
  },

  async updatePersonalInfo(
    firstName: string,
    lastName: string,
  ): Promise<AdminProfile> {
    await request("PATCH", "/personal", {
      name: [firstName, lastName].filter(Boolean).join(" "),
      firstName,
      lastName,
    });
    invalidate("profile");
    return (await adminProfileApi.getProfile()).admin;
  },

  async getStoreDetails(forceRefresh = false): Promise<Record<string, unknown>> {
    if (forceRefresh) invalidate("store-details");
    return requireData(
      await readCached("store-details", () =>
        request<Record<string, unknown>>("GET", "/store-details"),
      ),
      "The server did not return store details.",
    );
  },

  async getStoreDetailSection<T = Record<string, unknown>>(
    section: string,
    forceRefresh = false,
  ): Promise<T> {
    const cacheKey = `store-detail:${section}`;
    if (forceRefresh) invalidate("store-details", cacheKey);
    return requireData(
      await readCached(cacheKey, () =>
        request<T>("GET", `/store-details${storeDetailSectionPath(section)}`),
      ),
      "The server did not return this store-detail section.",
    );
  },

  async createStoreDetail(
    section: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", "/store-details", {
      section: storeDetailSectionSlug(section),
      data,
    });
    invalidate("store-details", `store-detail:${section}`);
  },

  async createStoreAddressFromCoordinates(
    lat: number,
    lng: number,
  ): Promise<void> {
    await request(
      "POST",
      "/store-details/addresses/from-coordinates",
      { lat: String(lat), lng: String(lng) },
    );
    invalidate("store-details", "store-detail:addresses");
  },

  async updateStoreDetail(
    section: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/store-details${storeDetailSectionPath(section)}/${encode(id)}`,
      { ...body, section: storeDetailSectionSlug(section) },
    );
    invalidate("store-details", `store-detail:${section}`);
  },

  async deleteStoreDetail(section: string, id: string): Promise<void> {
    await request(
      "DELETE",
      `/store-details${storeDetailSectionPath(section)}/${encode(id)}`,
    );
    invalidate("store-details", `store-detail:${section}`);
  },

  async setStoreDetailActive(
    section: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await adminProfileApi.updateStoreDetail(section, id, { isActive });
  },

  async getStorefrontDisplay(
    forceRefresh = false,
  ): Promise<Record<string, unknown>> {
    if (forceRefresh) invalidate("storefront-display");
    return requireData(
      await readCached("storefront-display", () =>
        request<Record<string, unknown>>("GET", "/storefront-display"),
      ),
      "The server did not return storefront display settings.",
    );
  },

  async getStorefrontSection<T = Record<string, unknown>>(
    section: string,
    forceRefresh = false,
  ): Promise<T> {
    const cacheKey = `storefront-section:${section}`;
    if (forceRefresh) invalidate("storefront-display", cacheKey);
    return requireData(
      await readCached(cacheKey, () =>
        request<T>("GET", `/storefront-display${storefrontSectionPath(section)}`),
      ),
      "The server did not return this storefront section.",
    );
  },

  async createStorefrontItem(
    section: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", "/storefront-display", {
      section: storefrontSectionSlug(section),
      data,
    });
    invalidate("storefront-display", `storefront-section:${section}`);
  },

  async updateStorefrontItem(
    section: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/storefront-display${storefrontSectionPath(section)}/${encode(id)}`,
      { ...body, section: storefrontSectionSlug(section) },
    );
    invalidate("storefront-display", `storefront-section:${section}`);
  },

  async deleteStorefrontItem(section: string, id: string): Promise<void> {
    await request(
      "DELETE",
      `/storefront-display${storefrontSectionPath(section)}/${encode(id)}`,
    );
    invalidate("storefront-display", `storefront-section:${section}`);
  },

  async setStorefrontItemActive(
    section: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await adminProfileApi.updateStorefrontItem(section, id, { isActive });
  },

  async getAdmins(): Promise<AdminPerson[]> {
    return requireArray(
      await readCached("admins", () => request<AdminPerson[]>("GET", "/admins")),
      "The server did not return admins.",
    );
  },

  async createAdmin(
    firstName: string,
    lastName: string,
    phone: string,
    isActive: boolean,
  ): Promise<void> {
    const name = [firstName, lastName].filter(Boolean).join(" ");
    await request("POST", "/admins", {
      name,
      firstName,
      lastName,
      phone,
      isActive,
    });
    invalidate("admins", "admin-dashboard");

    if (!isActive) {
      const admins = requireArray(
        await request<AdminPerson[]>("GET", "/admins"),
        "The admin was created, but the server did not return the admins list.",
      );
      const createdAdmin = admins.find(
        (admin) =>
          admin.phone?.replace(/\D/g, "").slice(-10) ===
          phone.replace(/\D/g, "").slice(-10),
      );

      if (!createdAdmin) {
        throw new Error(
          "The admin was created, but could not be found to set the account inactive.",
        );
      }

      if (createdAdmin.isActive !== false) {
        await request("PATCH", `/admins/${encode(createdAdmin.id)}`, {
          isActive: false,
        });
      }
      invalidate("admins", "admin-dashboard");
    }
  },

  async updateAdmin(id: string, body: Record<string, unknown>): Promise<void> {
    await request("PATCH", `/admins/${encode(id)}`, body);
    invalidate("admins", "admin-dashboard");
  },

  async deleteAdmin(id: string): Promise<void> {
    await request("DELETE", `/admins/${encode(id)}`);
    invalidate("admins", "admin-dashboard");
  },

  async getManagers(forceRefresh = false): Promise<AdminPerson[]> {
    if (forceRefresh) {
      invalidate("managers");
    }
    return requireArray(
      await readCached("managers", () =>
        request<AdminPerson[]>("GET", "/managers"),
      ),
      "The server did not return managers.",
    );
  },

  async createManager(body: Record<string, unknown>): Promise<void> {
    await request("POST", "/managers", body);
    invalidate("managers", "admin-dashboard", "tables");
  },

  async updateManager(
    id: string,
    body: {
      name: string;
      phone: string;
      managerType: string;
      isActive: boolean;
      tableIds: string[];
      waiterIds: string[];
    },
  ): Promise<void> {
    await request("PATCH", `/managers/${encode(id)}`, body);
    invalidate("managers", "admin-dashboard", "tables", "waiters");
  },

  async deleteManager(id: string): Promise<void> {
    await request("DELETE", `/managers/${encode(id)}`);
    invalidate("managers", "admin-dashboard", "tables");
  },

  async getWaiters(forceRefresh = false): Promise<AdminWaiter[]> {
    if (forceRefresh) {
      invalidate("waiters");
    }
    return requireArray(
      await readCached("waiters", () =>
        request<AdminWaiter[]>("GET", "/waiters"),
      ),
      "The server did not return waiters.",
    );
  },

  async getTables(forceRefresh = false): Promise<AdminTable[]> {
    if (forceRefresh) invalidate("tables");
    return requireData(
      await readCached("tables", async () => {
        const data = requireData(
          await request<AdminTable[] | { tables: AdminTable[] }>(
            "GET",
            "/tables",
          ),
          "The server did not return tables.",
        );
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.tables)) return data.tables;
        throw new Error("The server returned an invalid tables response.");
      }),
      "The server did not return tables.",
    );
  },

  async createTable(body: {
    tableNumber: number;
    capacity: number;
  }): Promise<AdminTable | undefined> {
    const data = await request<
      | AdminTable
      | { table?: AdminTable; tables?: AdminTable[] }
    >("POST", "/tables", body);
    invalidate("tables");
    if (!data) return undefined;
    if ("id" in data && typeof data.id === "string") return data;
    if ("table" in data && data.table && typeof data.table.id === "string") {
      return data.table;
    }
    if (
      "tables" in data &&
      data.tables?.[0] &&
      typeof data.tables[0].id === "string"
    ) {
      return data.tables[0];
    }
    return undefined;
  },

  async updateTable(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("PATCH", `/tables/${encode(id)}`, body);
    invalidate("tables");
  },

  async deleteTable(id: string): Promise<void> {
    await request("DELETE", `/tables/${encode(id)}`);
    invalidate("tables");
  },

  async downloadTableQr(id: string): Promise<string> {
    const accessToken = await authApi.getAccessToken();
    if (!accessToken) {
      throw new Error("Your login session is missing. Please sign in again.");
    }

    const path = `${FileSystem.documentDirectory ?? "file://"}table-qr-${encodeURIComponent(id)}.png`;
    const url = `${API_BASE_URL}/api/admin/profile/tables/${encode(id)}/qr`;

    const { uri } = await FileSystem.downloadAsync(url, path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!uri) {
      throw new Error("The QR image could not be downloaded.");
    }
    return uri;
  },

  async getAvailableTables(): Promise<AdminTable[]> {
    const data = requireData(
      await request<
        AdminTable[] | { tables?: AdminTable[]; availableTables?: AdminTable[] }
      >("GET", "/available-tables"),
      "The server did not return available tables.",
    );
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.availableTables)) return data.availableTables;
    if (Array.isArray(data.tables)) return data.tables;
    throw new Error("The server returned an invalid available-tables response.");
  },

  async createWaiter(name: string): Promise<void> {
    await request("POST", "/waiters", { name });
    invalidate("waiters", "admin-dashboard", "tables");
  },

  async updateWaiter(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("PATCH", `/waiters/${encode(id)}`, body);
    invalidate("waiters", "admin-dashboard", "tables");
  },

  async deleteWaiter(id: string): Promise<void> {
    await request("DELETE", `/waiters/${encode(id)}`);
    invalidate("waiters", "admin-dashboard", "tables");
  },
};

export const adminNotificationsApi = {
  async getAdminNotifications(
    page = 1,
    limit = 20,
    forceRefresh = false,
  ): Promise<AdminNotificationPage> {
    const cacheKey = `admin-notifications:${page}:${limit}`;
    if (forceRefresh) invalidate(cacheKey);
    const data = requireData(
      await readCached(cacheKey, () =>
        request<AdminNotificationPage>(
          "GET",
          `/notifications/?page=${page}&limit=${limit}`,
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return admin notifications.",
    );
    if (
      !Array.isArray(data.notifications) ||
      !data.pagination ||
      typeof data.unreadCount !== "number"
    ) {
      throw new Error("The server returned an invalid notifications response.");
    }
    return data;
  },

  async markAdminNotificationRead(id: string): Promise<void> {
    await request(
      "PATCH",
      `/notifications/${encode(id)}/read`,
      undefined,
      "/api/admin",
    );
    invalidatePrefix("admin-notifications:");
  },

  async markAllAdminNotificationsRead(): Promise<void> {
    await request(
      "PATCH",
      "/notifications/read-all",
      undefined,
      "/api/admin",
    );
    invalidatePrefix("admin-notifications:");
  },

  async deleteAdminNotification(id: string): Promise<void> {
    await request(
      "DELETE",
      `/notifications/${encode(id)}`,
      undefined,
      "/api/admin",
    );
    invalidatePrefix("admin-notifications:");
  },
};

export const adminDashboardApi = {
  async getDashboard(forceRefresh = false): Promise<AdminDashboardData> {
    if (forceRefresh) invalidate("admin-dashboard");
    return requireData(
      await readCached("admin-dashboard", () =>
        request<AdminDashboardData>(
          "GET",
          "/dashboard",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return dashboard data.",
    );
  },

  async setBranchOnlineStatus(
    branchId: string,
    isActive: boolean,
  ): Promise<void> {
    if (!branchId.trim()) {
      throw new Error("A valid branch is required to change online status.");
    }
    await request(
      "PATCH",
      `/branches/${encode(branchId)}/online-status`,
      { isActive },
      "/api/admin",
    );
    invalidate("admin-dashboard");
  },

  async getTodayLiveRevenue(
    forceRefresh = false,
  ): Promise<AdminTodayLiveRevenue> {
    if (forceRefresh) invalidate("admin-today-live-revenue");
    return requireData(
      await readCached("admin-today-live-revenue", () =>
        request<AdminTodayLiveRevenue>(
          "GET",
          "/dashboard/today-live-revenue",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return today's live revenue.",
    );
  },

  async getMonthlySales(forceRefresh = false): Promise<AdminMonthlySales> {
    if (forceRefresh) invalidate("admin-monthly-sales");
    return requireData(
      await readCached("admin-monthly-sales", () =>
        request<AdminMonthlySales>(
          "GET",
          "/dashboard/monthly-sales",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return monthly sales analytics.",
    );
  },

  async getYearlyRevenue(forceRefresh = false): Promise<AdminYearlyRevenue> {
    if (forceRefresh) invalidate("admin-yearly-revenue");
    return requireData(
      await readCached("admin-yearly-revenue", () =>
        request<AdminYearlyRevenue>(
          "GET",
          "/dashboard/yearly-revenue",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return yearly revenue analytics.",
    );
  },

  async getWeeklyTrend(forceRefresh = false): Promise<AdminWeeklyTrend> {
    if (forceRefresh) invalidate("admin-weekly-trend");
    return requireData(
      await readCached("admin-weekly-trend", () =>
        request<AdminWeeklyTrend>(
          "GET",
          "/dashboard/weekly-trend",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return weekly revenue analytics.",
    );
  },

  async getSalesDistribution(
    forceRefresh = false,
  ): Promise<AdminSalesDistribution> {
    if (forceRefresh) invalidate("admin-sales-distribution");
    return requireData(
      await readCached("admin-sales-distribution", () =>
        request<AdminSalesDistribution>(
          "GET",
          "/dashboard/sales-distribution",
          undefined,
          "/api/admin",
        ),
      ),
      "The server did not return sales distribution analytics.",
    );
  },
};
