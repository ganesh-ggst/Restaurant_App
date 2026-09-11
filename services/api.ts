import axios from "axios";
import { MOCK_USER } from "../constants/mockData";

// =========================================================================
// 🛑 THE MASTER SWITCH
// Set to 'false' for local Frontend UI testing (uses mock data).
// Set to 'true' when the Backend team gives you the API URL.
// =========================================================================
const USE_REAL_BACKEND = false;
const BASE_URL = "http://192.168.1.15:5000/api/auth"; // Change to real IP later

export const api = {
  // 1. Send OTP
  sendOtp: async (phone: string) => {
    if (USE_REAL_BACKEND) {
      const response = await axios.post(`${BASE_URL}/send-otp`, { phone });
      return response.data;
    } else {
      // MOCK LOGIC
      console.log(`[MOCK API] Sent OTP 123456 to ${phone}`);
      return new Promise((resolve) =>
        setTimeout(() => resolve({ success: true }), 500),
      );
    }
  },

  // 2. Verify OTP
  verifyOtp: async (phone: string, otp: string) => {
    if (USE_REAL_BACKEND) {
      const response = await axios.post(`${BASE_URL}/verify-otp`, {
        phone,
        otp,
      });
      return response.data;
    } else {
      // MOCK LOGIC: Accept 123456 for testing
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (otp === "123456") {
            // Check if user exists in mock data
            const isExisting = Array.isArray(MOCK_USER)
              ? MOCK_USER.some((u: any) => u.phone_number === phone)
              : false;

            resolve({
              success: true,
              token: "mock_jwt_token_123",
              user: {
                phone_number: phone,
                role: "user", // Treating everyone as user for now
                isNewUser: !isExisting,
              },
            });
          } else {
            reject(new Error("Invalid code. Please try again."));
          }
        }, 600);
      });
    }
  },

  // 3. Complete Profile
  completeProfile: async (
    phone: string,
    firstName: string,
    lastName: string,
  ) => {
    if (USE_REAL_BACKEND) {
      const response = await axios.post(`${BASE_URL}/complete-profile`, {
        phone,
        firstName,
        lastName,
      });
      return response.data;
    } else {
      // MOCK LOGIC
      console.log(`[MOCK API] Profile saved for ${firstName} ${lastName}`);
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 500);
      });
    }
  },

  // 4. Get User Profile Data
  getUserByPhone: async (phone: string) => {
    if (USE_REAL_BACKEND) {
      const response = await axios.get(`${BASE_URL}/user/${phone}`);
      return response.data;
    } else {
      // MOCK LOGIC
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            exists: true,
            user: {
              phone_number: phone,
              first_name: phone === "+910000000000" ? "Guest" : "Siva",
              last_name: phone === "+910000000000" ? "" : "Narayana",
              role: "user",
            },
          });
        }, 400);
      });
    }
  },
};
