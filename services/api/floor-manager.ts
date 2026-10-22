import axios, { isAxiosError } from "axios";

import { authApi } from "./auth";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface FloorManagerDashboard {
  generatedAt: string;
  branch: {
    _id: string;
    name: string;
    code?: string;
  };
  checkIn: {
    isCheckedIn: boolean;
  };
  tables: {
    total: number;
    available: number;
    occupied: number;
  };
  waiters: {
    total: number;
    available: number;
    busy: number;
    offDuty: number;
  };
  sessions: {
    active: number;
  };
  serviceRequests: {
    pending: number;
  };
  orders: {
    pending: number;
    accepted: number;
    preparing: number;
    ready: number;
    completedToday: number;
  };
}

export interface FloorManagerWaiter {
  _id: string;
  name: string;
  status: string;
  assignedTableId?: string | { _id: string; tableNumber?: number } | null;
  assignedTableIds?: string[];
  isActive?: boolean;
}

export interface FloorManagerTable {
  _id: string;
  tableNumber: number;
  capacity: number;
  status: string;
  customersSeated?: number;
  isBlocked?: boolean;
  assignedWaiterId?:
    | string
    | Pick<FloorManagerWaiter, "_id" | "name" | "status">
    | null;
  isActive?: boolean;
}

export interface FloorManagerTableDetails {
  table: FloorManagerTable;
  session: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
}

export interface FloorManagerSessionDetails extends Record<string, unknown> {
  firstName?: string;
  lastName?: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
  customer?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface FloorManagerLiveState {
  generatedAt: string;
  dashboard: FloorManagerDashboard;
  tables: FloorManagerTable[];
  waiters: FloorManagerWaiter[];
  sessions: Record<string, unknown>[];
  serviceRequests: Record<string, unknown>[];
  orders: Record<string, unknown>[];
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
const BASE_PATH = "/api/dine-in/manager";

async function request<T>(
  method: "GET" | "PATCH",
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
      url: `${API_BASE_URL}${BASE_PATH}${path}`,
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

export const floorManagerApi = {
  async getDashboard(): Promise<FloorManagerDashboard> {
    const data = requireData(
      await request<FloorManagerDashboard>("GET", "/dashboard"),
      "The server did not return the floor manager dashboard.",
    );
    if (!data.checkIn || !data.tables || !data.waiters || !data.orders) {
      throw new Error("The server returned an invalid floor manager dashboard.");
    }
    return data;
  },

  async getLiveState(): Promise<FloorManagerLiveState> {
    const data = requireData(
      await request<FloorManagerLiveState>("GET", "/live-state"),
      "The server did not return the floor manager live state.",
    );
    if (
      !data.dashboard ||
      !Array.isArray(data.tables) ||
      !Array.isArray(data.waiters) ||
      !Array.isArray(data.sessions) ||
      !Array.isArray(data.serviceRequests) ||
      !Array.isArray(data.orders)
    ) {
      throw new Error("The server returned an invalid floor manager live state.");
    }
    return data;
  },

  async getSessions(): Promise<Record<string, unknown>[]> {
    const data = requireData(
      await request<Record<string, unknown>[]>("GET", "/sessions"),
      "The server did not return floor manager sessions.",
    );
    if (!Array.isArray(data)) {
      throw new Error("The server returned an invalid floor manager sessions response.");
    }
    return data;
  },

  async getTableDetails(id: string): Promise<FloorManagerTableDetails> {
    const data = requireData(
      await request<FloorManagerTableDetails>(
        "GET",
        `/tables/${encodeURIComponent(id)}`,
      ),
      "The server did not return table details.",
    );
    if (!data.table || !Array.isArray(data.orders)) {
      throw new Error("The server returned invalid table details.");
    }
    return data;
  },

  async getSessionDetails(
    sessionId: string,
  ): Promise<FloorManagerSessionDetails> {
    const data = requireData(
      await request<FloorManagerSessionDetails>(
        "GET",
        `/sessions/${encodeURIComponent(sessionId)}`,
      ),
      "The server did not return session details.",
    );
    if (typeof data !== "object") {
      throw new Error("The server returned invalid session details.");
    }
    return data;
  },

  async updateTable(
    id: string,
    changes: {
      tableNumber?: number;
      capacity?: number;
      isActive?: boolean;
      status?: "available" | "active" | "billed";
      customersSeated?: number;
    },
  ): Promise<void> {
    await request(
      "PATCH",
      `/tables/${encodeURIComponent(id)}`,
      changes,
    );
  },

  async getTableBill(id: string): Promise<Record<string, unknown>> {
    const data = requireData(
      await request<Record<string, unknown>>(
        "GET",
        `/tables/${encodeURIComponent(id)}/bill`,
      ),
      "The server did not return the table bill.",
    );
    return data;
  },

  async setCheckInStatus(isCheckedIn: boolean): Promise<void> {
    await request<{ isCheckedIn?: boolean }>(
      "PATCH",
      "/check-in-status",
      { isCheckedIn },
    );
  },
};

export function hasRunningOrders(
  dashboard: FloorManagerDashboard,
  orders: Record<string, unknown>[],
): boolean {
  const counts = dashboard.orders;
  if (
    counts.pending > 0 ||
    counts.accepted > 0 ||
    counts.preparing > 0 ||
    counts.ready > 0
  ) {
    return true;
  }

  const completedStatuses = new Set([
    "completed",
    "cancelled",
    "canceled",
    "served",
  ]);
  return orders.some((order) => {
    const status =
      typeof order.status === "string"
        ? order.status.toLowerCase()
        : typeof order.orderStatus === "string"
          ? order.orderStatus.toLowerCase()
          : "";
    return !completedStatuses.has(status);
  });
}
