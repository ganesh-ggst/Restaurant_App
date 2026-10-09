import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ManagerProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: string;
  managerType: string;
  branchId: string | null;
  avatarUrl: string;
  isProfileCompleted: boolean;
  isActive: boolean;
  assignedTables?: string[];
  assignedWaiters?: string[];
}

export interface ManagerProfileResponse {
  manager: ManagerProfile;
  store: Record<string, unknown> | null;
}

export interface ManagedManager {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  managerType: string;
  isActive: boolean;
  branchId?: string | null;
}

export interface ManagerNotification {
  _id?: string;
  id?: string;
  title?: string;
  subject?: string;
  message?: string;
  body?: string;
  description?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  timestamp?: string;
  type?: string;
  category?: string;
  data?: {
    category?: string;
    fulfillmentType?: string;
    audience?: string;
    branchId?: string;
    [key: string]: unknown;
  };
  orderId?: {
    _id: string;
    orderNumber?: string;
    fulfillmentType?: string;
    status?: string;
  } | null;
}

export interface ManagerNotificationPage {
  notifications: ManagerNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
const localManagerAvatars = new Map<string, string>();
let managerListToken: string | null = null;
let managerListCache: ManagedManager[] | null = null;
let managerListRequest: Promise<ManagedManager[]> | null = null;

function invalidateManagerList(): void {
  managerListCache = null;
  managerListRequest = null;
}

export function getLocalManagerAvatarUri(managerId: string): string | null {
  return localManagerAvatars.get(managerId) || null;
}

export function setLocalManagerAvatarUri(managerId: string, uri: string): void {
  localManagerAvatars.set(managerId, uri);
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
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
      url: path.startsWith("/operations/notifications")
        ? `${API_BASE_URL}/api${path}`
        : path.startsWith("/notifications")
        ? `${API_BASE_URL}/api${path}`
        : `${API_BASE_URL}/api/manager-profile${path}`,
      data: body,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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

const encode = (value: string) => encodeURIComponent(value);
const sectionPath = (section: string) => `/${encode(section)}`;

export const managerProfileApi = {
  async getProfile(): Promise<ManagerProfileResponse> {
    const data = requireData(
      await request<ManagerProfileResponse>("GET", "/"),
      "The server did not return the manager profile.",
    );
    if (!data.manager) {
      throw new Error("The server returned an invalid manager profile.");
    }
    return data;
  },

  async updatePersonalInfo(
    firstName: string,
    lastName: string,
  ): Promise<ManagerProfile> {
    const data = requireData(
      await request<{ manager?: ManagerProfile }>("PATCH", "/personal", {
        firstName,
        lastName,
      }),
      "The server did not return the updated manager profile.",
    );
    if (data.manager) return data.manager;
    return (await managerProfileApi.getProfile()).manager;
  },

  async getManagers(forceRefresh = false): Promise<ManagedManager[]> {
    const token = await authApi.getAccessToken();
    if (!token) {
      throw new Error("Your login session is missing. Please sign in again.");
    }
    if (managerListToken !== token) {
      managerListToken = token;
      invalidateManagerList();
    }
    if (forceRefresh) invalidateManagerList();
    if (managerListCache) return managerListCache;
    if (managerListRequest) return managerListRequest;

    const pending = (async () => {
      const data = requireData(
        await request<ManagedManager[] | { managers?: ManagedManager[] }>(
          "GET",
          "/managers",
        ),
        "The server did not return managers.",
      );
      const managers = Array.isArray(data) ? data : data.managers;
      if (!Array.isArray(managers)) {
        throw new Error("The server returned an invalid managers response.");
      }
      if (managerListToken === token) managerListCache = managers;
      return managers;
    })();
    managerListRequest = pending;
    try {
      return await pending;
    } finally {
      if (managerListRequest === pending) managerListRequest = null;
    }
  },

  async createManager(body: Record<string, unknown>): Promise<void> {
    await request("POST", "/managers", body);
    invalidateManagerList();
  },

  async updateManager(
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request("PATCH", `/managers/${encode(id)}`, body);
    invalidateManagerList();
  },

  async deleteManager(id: string): Promise<void> {
    await request("DELETE", `/managers/${encode(id)}`);
    invalidateManagerList();
  },

  async getStoreDetails(): Promise<Record<string, unknown>> {
    return requireData(
      await request<Record<string, unknown>>("GET", "/store-details"),
      "The server did not return store details.",
    );
  },

  async getStoreDetailSection<T = Record<string, unknown>>(
    section: string,
  ): Promise<T> {
    return requireData(
      await request<T>("GET", `/store-details${sectionPath(section)}`),
      "The server did not return this store-detail section.",
    );
  },

  async createStoreDetail(
    section: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", "/store-details", { section, data });
  },

  async updateStoreDetail(
    section: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/store-details${sectionPath(section)}/${encode(id)}`,
      body,
    );
  },

  async deleteStoreDetail(section: string, id: string): Promise<void> {
    await request(
      "DELETE",
      `/store-details${sectionPath(section)}/${encode(id)}`,
    );
  },

  async setStoreDetailActive(
    section: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await request(
      "PATCH",
      `/store-details${sectionPath(section)}/${encode(id)}/${isActive ? "activate" : "deactivate"}`,
    );
  },

  async getStorefrontDisplay(): Promise<Record<string, unknown>> {
    return requireData(
      await request<Record<string, unknown>>("GET", "/storefront-display"),
      "The server did not return storefront display settings.",
    );
  },

  async getStorefrontSection<T = Record<string, unknown>>(
    section: string,
  ): Promise<T> {
    return requireData(
      await request<T>("GET", `/storefront-display${sectionPath(section)}`),
      "The server did not return this storefront section.",
    );
  },

  async createStorefrontItem(
    section: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await request("POST", "/storefront-display", { section, data });
  },

  async updateStorefrontItem(
    section: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/storefront-display${sectionPath(section)}/${encode(id)}`,
      body,
    );
  },

  async deleteStorefrontItem(section: string, id: string): Promise<void> {
    await request(
      "DELETE",
      `/storefront-display${sectionPath(section)}/${encode(id)}`,
    );
  },

  async setStorefrontItemActive(
    section: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await request(
      "PATCH",
      `/storefront-display${sectionPath(section)}/${encode(id)}/${isActive ? "activate" : "deactivate"}`,
    );
  },

  async getNotifications(page = 1, limit = 20): Promise<ManagerNotificationPage> {
    const data = requireData(
      await request<ManagerNotificationPage>(
        "GET",
        `/operations/notifications?page=${page}&limit=${limit}`,
      ),
      "The server did not return manager notifications.",
    );
    if (!Array.isArray(data.notifications)) {
      throw new Error("The server returned an invalid notifications response.");
    }
    return data;
  },

  async markNotificationRead(id: string): Promise<void> {
    await request("PATCH", `/operations/notifications/${encode(id)}/read`);
  },

  async markAllNotificationsRead(): Promise<void> {
    await request("PATCH", "/operations/notifications/read-all");
  },

  async deleteNotification(id: string): Promise<void> {
    await request("DELETE", `/operations/notifications/${encode(id)}`);
  },
};
