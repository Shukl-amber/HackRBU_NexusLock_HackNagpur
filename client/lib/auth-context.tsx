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
  User,
  AuthState,
  LoginRequest,
  SignupRequest,
  AuthResponse,
} from "@/types";
import {
  loginUser,
  signupUser,
  validateToken,
  setToken,
  setStoredUser,
  clearAuth,
} from "./auth";

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<AuthResponse>;
  signup: (data: SignupRequest) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const result = await validateToken();
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setTokenState(result.token);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (data: LoginRequest): Promise<AuthResponse> => {
    const result = await loginUser(data);
    if (result.success && result.user && result.token) {
      setUser(result.user);
      setTokenState(result.token);
      setToken(result.token);
      setStoredUser(result.user);
      router.push("/dashboard");
    }
    return result;
  };

  const signup = async (data: SignupRequest): Promise<AuthResponse> => {
    const result = await signupUser(data);
    if (result.success && result.user && result.token) {
      setUser(result.user);
      setTokenState(result.token);
      setToken(result.token);
      setStoredUser(result.user);
      router.push("/dashboard");
    }
    return result;
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    clearAuth();
    router.push("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
