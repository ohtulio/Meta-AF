import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "alto_forno_auth_phone";

export const authStorage = {
  getPhone: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(AUTH_KEY);
    } catch {
      return null;
    }
  },

  setPhone: async (phone: string): Promise<void> => {
    await AsyncStorage.setItem(AUTH_KEY, phone);
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_KEY);
  },

  isLoggedIn: async (): Promise<boolean> => {
    try {
      const phone = await AsyncStorage.getItem(AUTH_KEY);
      return phone !== null && phone.length > 0;
    } catch {
      return false;
    }
  },
};
