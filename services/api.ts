// For Android Emulator use: "http://10.0.2.2:3000/api"
// For iOS Simulator use: "http://localhost:3000/api"
// For Physical Device use your computer's IP: "http://192.168.1.9:3000/api"
const API_URL = "http://192.168.1.9:3000/api";

export const api = {
  checkUserExists: async (phone: string) => {
    try {
      const response = await fetch(`${API_URL}/users/${phone}`);
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("Error checking user:", error);
      throw error;
    }
  },

  // Added this missing function to fix the TypeScript errors!
  getUserByPhone: async (phone: string) => {
    try {
      const response = await fetch(`${API_URL}/users/${phone}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching user:", error);
      throw error;
    }
  },

  createUser: async (phone: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, firstName, lastName }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
};
