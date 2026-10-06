import { authApi } from "./api/auth";
import { profileApi } from "./api/profile";

export const api = {
  ...authApi,
  ...profileApi,
};
