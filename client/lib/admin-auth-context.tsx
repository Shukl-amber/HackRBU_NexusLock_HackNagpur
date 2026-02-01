"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AdminUser,
  AdminLoginRequest,
  AdminAuthResponse,
  loginAdmin,
  validateAdminToken,
  setAdminToken,
  setStoredAdminUser,
  clearAdminAuth,
} from "./admin-auth";

interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AdminAuthContextType extends AdminAuthState {
  login: (data: AdminLoginRequest) => Promise<AdminAuthResponse>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const result = await validateAdminToken();
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setTokenState(result.token);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (data: AdminLoginRequest): Promise<AdminAuthResponse> => {
    const result = await loginAdmin(data);
    if (result.success && result.user && result.token) {
      setUser(result.user);
      setTokenState(result.token);
      setAdminToken(result.token);
      setStoredAdminUser(result.user);
      router.push("/admin/dashboard");
    }
    return result;
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    clearAdminAuth();
    router.push("/admin/login");
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
