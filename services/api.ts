import { authApi } from "./api/auth";
import {
  adminDashboardApi,
  adminNotificationsApi,
  adminProfileApi,
} from "./api/admin-profile";
import { profileApi } from "./api/profile";

export const api = {
  ...authApi,
  ...adminDashboardApi,
  ...adminProfileApi,
  ...adminNotificationsApi,
  ...profileApi,
};
