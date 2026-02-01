// JWT Authentication utilities

import { User, LoginRequest, SignupRequest, AuthResponse } from "@/types";

const TOKEN_KEY = "consent_vault_token";
const USER_KEY = "consent_vault_user";

// Token management
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
};

// User management
export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeStoredUser = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
};

// Clear all auth data
export const clearAuth = (): void => {
  removeToken();
  removeStoredUser();
};

// Mock API calls (replace with real API endpoints)
const MOCK_DELAY = 800;

// Simulated user database (for demo purposes)
const mockUsers: Map<string, { user: User; password: string }> = new Map();

export const loginUser = async (data: LoginRequest): Promise<AuthResponse> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  // Check if user exists in mock database
  const stored = mockUsers.get(data.email);
  
  if (!stored) {
    return {
      success: false,
      message: "User not found. Please sign up first.",
    };
  }

  if (stored.password !== data.password) {
    return {
      success: false,
      message: "Invalid password. Please try again.",
    };
  }

  // Generate mock JWT token
  const token = `jwt_${btoa(JSON.stringify({ userId: stored.user.id, email: data.email, exp: Date.now() + 86400000 }))}`;

  return {
    success: true,
    message: "Login successful!",
    user: stored.user,
    token,
  };
};

export const signupUser = async (data: SignupRequest): Promise<AuthResponse> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  // Check if user already exists
  if (mockUsers.has(data.email)) {
    return {
      success: false,
      message: "User already exists. Please login instead.",
    };
  }

  // Create new user
  const newUser: User = {
    id: `user_${Date.now()}`,
    email: data.email,
    name: data.name,
    createdAt: new Date().toISOString(),
  };

  // Store in mock database
  mockUsers.set(data.email, { user: newUser, password: data.password });

  // Generate mock JWT token
  const token = `jwt_${btoa(JSON.stringify({ userId: newUser.id, email: data.email, exp: Date.now() + 86400000 }))}`;

  return {
    success: true,
    message: "Account created successfully!",
    user: newUser,
    token,
  };
};

export const validateToken = async (): Promise<AuthResponse> => {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return {
      success: false,
      message: "No valid session found.",
    };
  }

  // In a real app, validate token with backend
  // For now, just check if token format is valid
  try {
    const payload = JSON.parse(atob(token.replace("jwt_", "")));
    if (payload.exp < Date.now()) {
      clearAuth();
      return {
        success: false,
        message: "Session expired. Please login again.",
      };
    }
    return {
      success: true,
      message: "Session valid.",
      user,
      token,
    };
  } catch {
    clearAuth();
    return {
      success: false,
      message: "Invalid session. Please login again.",
    };
  }
};
