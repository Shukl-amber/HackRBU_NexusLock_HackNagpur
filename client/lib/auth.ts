// JWT Authentication utilities

import axios from "axios";
import { User, LoginRequest, SignupRequest, AuthResponse } from "@/types";

const TOKEN_KEY = "nexus_connect_token";
const USER_KEY = "nexus_connect_user";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Token management
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  console.log("getToken called, token exists:", !!token);
  return token;
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  console.log("setToken called, storing token");
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

export const loginUser = async (data: LoginRequest): Promise<AuthResponse> => {
  try {
    console.log("Login attempt:", data);
    console.log("API_URL:", API_URL);
    
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, data);
    
    console.log("Login response:", response.data);
    
    const { access_token, user } = response.data;
    
    setToken(access_token);
    setStoredUser(user);
    
    return {
      success: true,
      message: "Login successful!",
      user,
      token: access_token,
    };
  } catch (error) {
    console.error("Login error:", error);
    
     if (axios.isAxiosError(error) && error.response) {
       console.error("Error response:", error.response.data);
       return {
         success: false,
         message: error.response.data?.detail || error.response.data?.message || "Invalid credentials. Please try again.",
       };
     }
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

export const signupUser = async (data: SignupRequest): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/signup`, data);
    
    const { access_token, user } = response.data;
    
    // Store token and user in localStorage
    setToken(access_token);
    setStoredUser(user);
    
    return {
      success: true,
      message: "Account created successfully!",
      user,
      token: access_token,
    };
  } catch (error) {
     if (axios.isAxiosError(error) && error.response) {
       return {
         success: false,
         message: error.response.data?.detail || error.response.data?.message || "Signup failed. Please try again.",
       };
     }
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

export const validateToken = async (): Promise<AuthResponse> => {
  const token = getToken();
  
  if (!token) {
    return {
      success: false,
      message: "No valid session found.",
    };
  }

  try {
    const response = await axios.get(`${API_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const user = response.data;
    setStoredUser(user);
    
    return {
      success: true,
      message: "Session valid.",
      user,
      token,
    };
  } catch (error) {
    clearAuth();
    return {
      success: false,
      message: "Invalid session. Please login again.",
    };
  }
};
