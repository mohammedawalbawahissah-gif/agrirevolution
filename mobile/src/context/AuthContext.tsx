import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterPayload {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  community: string;
  district: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const token = await SecureStore.getItemAsync("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get<User>("/accounts/me/");
      setUser(data);
    } catch {
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("refresh_token");
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<User> {
    const { data } = await apiClient.post("/accounts/token/", { username, password });
    await SecureStore.setItemAsync("access_token", data.access);
    await SecureStore.setItemAsync("refresh_token", data.refresh);

    const meRes = await apiClient.get<User>("/accounts/me/");
    setUser(meRes.data);
    return meRes.data;
  }

  async function register(payload: RegisterPayload): Promise<void> {
    // Mobile registration is always the farmer role — dealers/buyers register via the web portal.
    await apiClient.post("/accounts/register/", { ...payload, role: "farmer" });
  }

  async function logout(): Promise<void> {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
