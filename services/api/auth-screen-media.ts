import axios, { isAxiosError } from "axios";

import type { AdminAuthScreen } from "./admin-profile";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ActiveAuthScreenMedia {
  id: string;
  url: string;
  isActive: boolean;
  mediaType: "image" | "video";
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  "",
);

function mediaTypeForUrl(url: string): "image" | "video" {
  const pathname = url.split(/[?#]/, 1)[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v)$/.test(pathname) ? "video" : "image";
}

export const authScreenMediaApi = {
  async getActive(
    screen: AdminAuthScreen,
    branchId?: string,
  ): Promise<ActiveAuthScreenMedia | null> {
    if (!API_BASE_URL) {
      throw new Error(
        "API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
      );
    }

    const screenPath = screen === "splash" ? "splash-screen" : "login-screen";
    try {
      const response = await axios.get<
        ApiEnvelope<
          | ActiveAuthScreenMedia
          | ActiveAuthScreenMedia[]
          | { url?: string; id?: string; isActive?: boolean }
        >
      >(`${API_BASE_URL}/api/users/storefront-display/${screenPath}`, {
        ...(branchId?.trim() ? { params: { branchId: branchId.trim() } } : {}),
        timeout: 15_000,
      });

      if (!response.data?.success) {
        if (/no active .*screen found/i.test(response.data?.message ?? "")) {
          return null;
        }
        throw new Error(
          response.data?.message || "Unable to load storefront screen media.",
        );
      }

      const items = Array.isArray(response.data.data)
        ? response.data.data
        : response.data.data
          ? [response.data.data]
          : [];
      const media = items.find((item) => item.isActive) ?? items[0];
      if (!media?.url) return null;

      return {
        id: media.id ?? `${screen}-${branchId?.trim() || "global"}`,
        url: media.url,
        isActive: media.isActive !== false,
        mediaType: screen === "splash" ? "video" : mediaTypeForUrl(media.url),
      };
    } catch (error) {
      if (error instanceof Error && !isAxiosError(error)) throw error;
      if (isAxiosError<ApiEnvelope<unknown>>(error)) {
        const message = error.response?.data?.message;
        if (/no active .*screen found/i.test(message ?? "")) return null;
        if (message) throw new Error(message);
        if (error.response) {
          throw new Error(
            `The server returned an error (${error.response.status}).`,
          );
        }
        if (error.code === "ECONNABORTED") {
          throw new Error(
            "Loading screen media took too long. Please try again.",
          );
        }
      }
      throw new Error("Unable to reach the server while loading screen media.");
    }
  },
};
