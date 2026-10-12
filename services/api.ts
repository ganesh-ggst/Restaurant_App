import { authApi } from "./api/auth";
import {
  adminDashboardApi,
  adminNotificationsApi,
  adminProfileApi,
} from "./api/admin-profile";
import { profileApi } from "./api/profile";
import { customerApi } from "./api/customer";

export const api = {
  ...authApi,
  ...adminDashboardApi,
  ...adminProfileApi,
  ...adminNotificationsApi,
  ...profileApi,
  ...customerApi,
};
