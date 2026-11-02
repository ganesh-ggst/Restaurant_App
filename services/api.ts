import { authApi } from "./api/auth";
import {
  adminDashboardApi,
  adminMapsApi,
  adminNotificationsApi,
  adminProfileApi,
} from "./api/admin-profile";
import { profileApi } from "./api/profile";
import { customerApi } from "./api/customer";

export const api = {
  ...authApi,
  ...adminDashboardApi,
  ...adminMapsApi,
  ...adminProfileApi,
  ...adminNotificationsApi,
  ...profileApi,
  ...customerApi,
};
