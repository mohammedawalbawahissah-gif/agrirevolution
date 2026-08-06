import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiClient
      .get<User>("/accounts/me/")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user_role", res.data.role);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_role");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string): Promise<User> {
    const { data } = await apiClient.post("/accounts/token/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);

    const meRes = await apiClient.get<User>("/accounts/me/");
    localStorage.setItem("user_role", meRes.data.role);
    setUser(meRes.data);
    return meRes.data;
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    setUser(null);
  }

  async function refreshUser(): Promise<void> {
    const { data } = await apiClient.get<User>("/accounts/me/");
    setUser(data);
    localStorage.setItem("user_role", data.role);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
