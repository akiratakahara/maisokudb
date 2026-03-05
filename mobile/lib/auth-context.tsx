import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, User } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("token");
      if (stored && token) {
        setUser(JSON.parse(stored));
        setLoading(false);
        return;
      }
    } catch {
      // AsyncStorage読み込み失敗 → ゲストユーザーにフォールバック
    }

    // ゲストユーザーとして自動ログイン
    const guestUser: User = {
      id: "guest",
      email: "guest@maisoku.app",
      name: "ゲスト",
      plan: "free",
    };
    setUser(guestUser);
    setLoading(false);

    try {
      await AsyncStorage.setItem("user", JSON.stringify(guestUser));
      await AsyncStorage.setItem("token", "guest-token");
    } catch {
      // ストレージ保存失敗は無視
    }
  }

  async function login(email: string, password: string) {
    const res = await api.login({ email, password });
    setUser(res.user);
    try {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.user));
    } catch {
      // ストレージ保存失敗は無視
    }
  }

  async function register(email: string, password: string, name: string) {
    const res = await api.register({ email, password, name });
    setUser(res.user);
    try {
      await AsyncStorage.setItem("token", res.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.user));
    } catch {
      // ストレージ保存失敗は無視
    }
  }

  async function logout() {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch {
      // ストレージ削除失敗は無視
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
