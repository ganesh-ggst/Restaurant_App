import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  managerType: string | null;
  branchId: string | null;
  assignedTables?: string[];
  assignedWaiters?: string[];
  avatarUrl: string;
  isProfileCompleted: boolean;
  isActive: boolean;
}

export interface CustomerAddress {
  _id: string;
  userId: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressInput {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface CustomerNotification {
  _id?: string;
  id?: string;
  title?: string;
  subject?: string;
  message?: string;
  body?: string;
  description?: string;
  desc?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  timestamp?: string;
}

export interface NotificationPage {
  notifications: CustomerNotification[];
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
let cachedUserProfile: UserProfile | null = null;
let cachedUserProfileToken: string | null = null;
let userProfileRequest: Promise<UserProfile> | null = null;

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
      url: `${API_BASE_URL}/api${path}`,
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
      if (message) {
        throw new Error(message);
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

function requireData<T>(
  data: T | undefined,
  message: string,
): T {
  if (data === undefined || data === null) {
    throw new Error(message);
  }
  return data;
}

export const profileApi = {
  async getMyProfile(): Promise<UserProfile> {
    const token = await authApi.getAccessToken();
    if (!token) {
      throw new Error("Your login session is missing. Please sign in again.");
    }
    if (token !== cachedUserProfileToken) {
      cachedUserProfile = null;
      userProfileRequest = null;
      cachedUserProfileToken = token;
    }
    if (cachedUserProfile) return cachedUserProfile;
    if (userProfileRequest) return userProfileRequest;

    userProfileRequest = request<UserProfile>("GET", "/users/me")
      .then((profile) =>
        requireData(profile, "The server did not return your profile."),
      )
      .then((profile) => {
        if (cachedUserProfileToken === token) cachedUserProfile = profile;
        return profile;
      })
      .finally(() => {
        userProfileRequest = null;
      });
    return userProfileRequest;
  },

  async updateMyProfile(
    firstName: string,
    lastName: string,
  ): Promise<UserProfile> {
    await request("PATCH", "/users/me", { firstName, lastName });
    cachedUserProfile = null;
    return profileApi.getMyProfile();
  },

  async getAddresses(): Promise<CustomerAddress[]> {
    const addresses = requireData(
      await request<CustomerAddress[]>("GET", "/addresses"),
      "The server did not return your addresses.",
    );
    if (!Array.isArray(addresses)) {
      throw new Error("The server returned an invalid addresses response.");
    }
    return addresses;
  },

  async getAddress(id: string): Promise<CustomerAddress> {
    return requireData(
      await request<CustomerAddress>("GET", `/addresses/${encodeURIComponent(id)}`),
      "The server did not return this address.",
    );
  },

  async createAddress(address: AddressInput): Promise<void> {
    await request("POST", "/addresses", { ...address });
  },

  async updateAddress(
    id: string,
    address: Partial<AddressInput>,
  ): Promise<void> {
    await request(
      "PATCH",
      `/addresses/${encodeURIComponent(id)}`,
      address,
    );
  },

  async deleteAddress(id: string): Promise<void> {
    await request("DELETE", `/addresses/${encodeURIComponent(id)}`);
  },

  async setDefaultAddress(id: string): Promise<void> {
    await request(
      "PATCH",
      `/addresses/${encodeURIComponent(id)}/default`,
    );
  },

  async getNotifications(
    page = 1,
    limit = 20,
  ): Promise<NotificationPage> {
    const data = requireData(
      await request<NotificationPage>(
        "GET",
        `/notifications?page=${page}&limit=${limit}`,
      ),
      "The server did not return your notifications.",
    );
    if (!Array.isArray(data.notifications)) {
      throw new Error("The server returned an invalid notifications response.");
    }
    return data;
  },

  async markAllNotificationsRead(): Promise<void> {
    await request("PATCH", "/notifications/read-all");
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(
      "PATCH",
      `/notifications/${encodeURIComponent(id)}/read`,
    );
  },

  async deleteNotification(id: string): Promise<void> {
    await request("DELETE", `/notifications/${encodeURIComponent(id)}`);
  },
};
