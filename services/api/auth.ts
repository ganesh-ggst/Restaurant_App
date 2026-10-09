import axios, { isAxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  managerType?: string | null;
  avatarUrl: string;
  isProfileCompleted: boolean;
  isActive: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface OtpData {
  otpExpiresInSeconds: number;
  resendAvailableInSeconds: number;
  user: AuthUser;
  signupToken?: string;
  devOtp?: string;
}

export interface VerifyOtpData {
  user: AuthUser;
  signupToken?: string;
  accessToken?: string;
}

export interface CompleteProfileData {
  user: AuthUser;
  accessToken: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
const SIGNUP_TOKEN_KEY = "restaurant.signupToken";
const ACCESS_TOKEN_KEY = "restaurant.accessToken";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const nationalNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  if (!/^\d{10}$/.test(nationalNumber)) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  return nationalNumber;
}

function getAuthUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error(
      "Auth API is not configured. Set EXPO_PUBLIC_API_URL to your backend server origin.",
    );
  }

  return `${API_BASE_URL}/api/auth/${path}`;
}

async function getStoredToken(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredToken(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof sessionStorage === "undefined") {
      throw new Error("Browser session storage is unavailable.");
    }
    sessionStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredToken(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function getRequestError(error: unknown): Error {
  if (isAxiosError<ApiEnvelope<unknown>>(error)) {
    const message = error.response?.data?.message;
    if (message) {
      return new Error(message);
    }

    if (error.code === "ECONNABORTED") {
      return new Error("The auth server took too long to respond. Please try again.");
    }

    return new Error(
      "Unable to reach the auth server. Check EXPO_PUBLIC_API_URL and try again.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("The auth request failed. Please try again.");
}

async function post<T>(
  path: string,
  body: Record<string, string>,
): Promise<ApiEnvelope<T>> {
  try {
    const response = await axios.post<ApiEnvelope<T>>(
      getAuthUrl(path),
      body,
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "The auth request failed.");
    }

    return response.data;
  } catch (error) {
    throw getRequestError(error);
  }
}

function requireUser<T extends { user?: AuthUser }>(
  data: T,
  message: string,
): asserts data is T & { user: AuthUser } {
  if (!data.user) {
    throw new Error(message);
  }
}

export const authApi = {
  async sendOtp(phone: string): Promise<OtpData> {
    const response = await post<OtpData>("send-otp", {
      phone: normalizePhone(phone),
    });
    if (response.data.signupToken) {
      await setStoredToken(SIGNUP_TOKEN_KEY, response.data.signupToken);
    } else {
      await deleteStoredToken(SIGNUP_TOKEN_KEY);
    }
    return response.data;
  },

  async resendOtp(phone: string): Promise<OtpData> {
    const phoneWithCountryCode = `91${normalizePhone(phone)}`;
    const response = await post<OtpData>("resend-otp", {
      phone: phoneWithCountryCode,
    });
    return response.data;
  },

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpData> {
    const response = await post<VerifyOtpData>("verify-otp", {
      phone: normalizePhone(phone),
      otp,
    });
    const data = response.data;
    requireUser(data, "The auth server did not return user details.");

    if (!data.user.isProfileCompleted) {
      if (!data.signupToken) {
        throw new Error("The auth server did not return a signup token.");
      }
      await deleteStoredToken(ACCESS_TOKEN_KEY);
      await setStoredToken(SIGNUP_TOKEN_KEY, data.signupToken);
    } else {
      if (!data.accessToken) {
        throw new Error("The auth server did not return an access token.");
      }
      await deleteStoredToken(SIGNUP_TOKEN_KEY);
      await setStoredToken(ACCESS_TOKEN_KEY, data.accessToken);
    }

    return data;
  },

  async completeProfile(
    firstName: string,
    lastName: string,
  ): Promise<CompleteProfileData> {
    const signupToken = await getStoredToken(SIGNUP_TOKEN_KEY);
    if (!signupToken) {
      throw new Error("Your signup session has expired. Please verify your number again.");
    }

    const response = await post<CompleteProfileData>("complete-profile", {
      signupToken,
      firstName,
      lastName,
    });
    const data = response.data;
    requireUser(data, "The auth server did not return the completed profile.");

    if (!data.accessToken) {
      throw new Error("The auth server did not return an access token.");
    }

    await setStoredToken(ACCESS_TOKEN_KEY, data.accessToken);
    await deleteStoredToken(SIGNUP_TOKEN_KEY);
    return data;
  },

  async abandonSignup(): Promise<void> {
    const signupToken = await getStoredToken(SIGNUP_TOKEN_KEY);
    if (!signupToken) {
      throw new Error(
        "Cannot cancel this signup because the send-otp response did not include a signupToken.",
      );
    }

    await post<unknown>("abandon-signup", { signupToken });
    await deleteStoredToken(SIGNUP_TOKEN_KEY);
  },

  async getAccessToken(): Promise<string | null> {
    return getStoredToken(ACCESS_TOKEN_KEY);
  },

  async clearLocalSession(): Promise<void> {
    await deleteStoredToken(ACCESS_TOKEN_KEY);
    await deleteStoredToken(SIGNUP_TOKEN_KEY);
  },

  async logout(): Promise<void> {
    const accessToken = await getStoredToken(ACCESS_TOKEN_KEY);
    let signOutError: Error | undefined;

    try {
      if (accessToken) {
        const response = await axios.post<ApiEnvelope<{ signedOut: boolean }>>(
          getAuthUrl("signout"),
          {},
          {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.data?.success || !response.data.data?.signedOut) {
          if (
            response.data?.message ===
            "Authentication session has ended. Please sign in again"
          ) {
            return;
          }
          throw new Error(
            response.data?.message || "The server could not sign you out.",
          );
        }
      }
    } catch (error) {
      if (
        isAxiosError<ApiEnvelope<unknown>>(error) &&
        error.response?.data?.message ===
          "Authentication session has ended. Please sign in again"
      ) {
        return;
      }
      signOutError = getRequestError(error);
    } finally {
      await authApi.clearLocalSession();
    }

    if (signOutError) {
      throw signOutError;
    }
  },
};
