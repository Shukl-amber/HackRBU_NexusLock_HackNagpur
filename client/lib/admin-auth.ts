// Admin JWT Authentication utilities

import axios from "axios";

const ADMIN_TOKEN_KEY = "consent_vault_admin_token";
const ADMIN_USER_KEY = "consent_vault_admin_user";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AdminUser {
  username: string;
  role: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminAuthResponse {
  success: boolean;
  message: string;
  user?: AdminUser;
  token?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  domain: string;
  created_at: string;
  is_active: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  domain: string;
}

// Token management
export const getAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const removeAdminToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

// User management
export const getStoredAdminUser = (): AdminUser | null => {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(ADMIN_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const setStoredAdminUser = (user: AdminUser): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

export const removeStoredAdminUser = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_USER_KEY);
};

// Clear all admin auth data
export const clearAdminAuth = (): void => {
  removeAdminToken();
  removeStoredAdminUser();
};

export const loginAdmin = async (data: AdminLoginRequest): Promise<AdminAuthResponse> => {
  try {
    console.log("Admin login attempt:", { username: data.username });
    
    const response = await axios.post(`${API_URL}/api/v1/admin/login`, data);
    
    console.log("Admin login response:", response.data);
    
    const { access_token, username, role } = response.data;
    
    const user: AdminUser = { username, role };
    
    setAdminToken(access_token);
    setStoredAdminUser(user);
    
    return {
      success: true,
      message: "Admin login successful!",
      user,
      token: access_token,
    };
  } catch (error) {
    console.error("Admin login error:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error response:", error.response.data);
      return {
        success: false,
        message: error.response.data.detail || "Invalid credentials. Please try again.",
      };
    }
    return {
      success: false,
      message: "Network error. Please check your connection.",
    };
  }
};

export const validateAdminToken = async (): Promise<AdminAuthResponse> => {
  const token = getAdminToken();
  
  if (!token) {
    return {
      success: false,
      message: "No valid admin session found.",
    };
  }

  try {
    // Try to fetch API keys as a way to validate admin token
    await axios.get(`${API_URL}/api/v1/admin/api-keys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const user = getStoredAdminUser();
    if (!user) {
      clearAdminAuth();
      return {
        success: false,
        message: "Invalid admin session.",
      };
    }
    
    return {
      success: true,
      message: "Admin session valid.",
      user,
      token,
    };
  } catch (error) {
    clearAdminAuth();
    return {
      success: false,
      message: "Invalid admin session. Please login again.",
    };
  }
};

// API Key management functions
export const getApiKeys = async (): Promise<ApiKey[]> => {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");

  const response = await axios.get(`${API_URL}/api/v1/admin/api-keys`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.data;
};

export const createApiKey = async (data: CreateApiKeyRequest): Promise<ApiKey> => {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");

  const response = await axios.post(`${API_URL}/api/v1/admin/api-keys`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  return response.data;
};
