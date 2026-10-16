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

type UserProfileResponse = Omit<
  UserProfile,
  "id" | "firstName" | "lastName" | "phone" | "avatarUrl"
> & {
  id?: unknown;
  _id?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  avatarUrl?: unknown;
  avatar?: unknown;
  profilePicture?: unknown;
  profileImage?: unknown;
};

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

function getAvatarUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const avatar = value as Record<string, unknown>;
  for (const key of ["url", "secure_url", "path", "src", "avatarUrl"]) {
    const url = getAvatarUrl(avatar[key]);
    if (url) return url;
  }
  return "";
}

function normalizeAvatarUrl(value: unknown): string {
  const avatarUrl = getAvatarUrl(value);
  if (!avatarUrl || /^(https?:|data:|blob:)/i.test(avatarUrl)) {
    return avatarUrl;
  }
  if (!API_BASE_URL) return avatarUrl;

  try {
    return new URL(avatarUrl, `${API_BASE_URL}/`).toString();
  } catch {
    return avatarUrl;
  }
}

function normalizeUserProfile(profile: UserProfileResponse): UserProfile {
  const id = profile.id || profile._id;
  if (
    typeof id !== "string" ||
    typeof profile.firstName !== "string" ||
    typeof profile.lastName !== "string" ||
    typeof profile.phone !== "string"
  ) {
    throw new Error("The server returned an invalid profile.");
  }

  return {
    ...profile,
    id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    avatarUrl: normalizeAvatarUrl(
      profile.avatarUrl ||
        profile.avatar ||
        profile.profilePicture ||
        profile.profileImage,
    ),
  };
}

export const profileApi = {
  async getMyProfile(forceRefresh = false): Promise<UserProfile> {
    const token = await authApi.getAccessToken();
    if (!token) {
      throw new Error("Your login session is missing. Please sign in again.");
    }
    if (token !== cachedUserProfileToken) {
      cachedUserProfile = null;
      userProfileRequest = null;
      cachedUserProfileToken = token;
    }
    if (forceRefresh) {
      cachedUserProfile = null;
      userProfileRequest = null;
    }
    if (cachedUserProfile) return cachedUserProfile;
    if (userProfileRequest) return userProfileRequest;

    const profileRequest = request<UserProfileResponse>("GET", "/users/me")
      .then((profile) => {
        const response = requireData(
          profile,
          "The server did not return your profile.",
        );
        return normalizeUserProfile(response);
      })
      .then((profile) => {
        if (
          cachedUserProfileToken === token &&
          userProfileRequest === profileRequest
        ) {
          cachedUserProfile = profile;
        }
        return profile;
      })
      .finally(() => {
        if (userProfileRequest === profileRequest) {
          userProfileRequest = null;
        }
      });
    userProfileRequest = profileRequest;
    return profileRequest;
  },

  async updateMyProfile(
    firstName: string,
    lastName: string,
  ): Promise<UserProfile> {
    await request("PATCH", "/users/me", { firstName, lastName });
    cachedUserProfile = null;
    return profileApi.getMyProfile();
  },

  async uploadMyAvatar(
    uri: string,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
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
    formData.append(
      "avatar",
      { uri, name: fileName, type: mimeType } as unknown as Blob,
    );

    try {
      const response = await axios.patch<
        ApiEnvelope<{
          avatarUrl?: unknown;
          avatar?: unknown;
          user?: UserProfileResponse;
        }>
      >(`${API_BASE_URL}/api/users/me/avatar`, formData, {
        timeout: 60_000,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Avatar upload failed.");
      }

      const data = response.data.data;
      const avatarUrl =
        normalizeAvatarUrl(
          data?.avatarUrl ||
            data?.avatar ||
            data?.user?.avatarUrl ||
            data?.user?.avatar,
        );
      if (!avatarUrl) {
        throw new Error("The server did not return the uploaded avatar URL.");
      }
      if (cachedUserProfile) {
        cachedUserProfile = { ...cachedUserProfile, avatarUrl };
      }
      return avatarUrl;
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
          throw new Error("The avatar upload timed out. Please try again.");
        }
        throw new Error(
          "Unable to reach the server. Check EXPO_PUBLIC_API_URL and try again.",
        );
      }
      throw error instanceof Error
        ? error
        : new Error("Avatar upload failed. Please try again.");
    }
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
