// User and Auth Types

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

// Toast Types
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

// Dashboard Types
export type DocType = "PAN" | "Aadhaar" | "Passport" | "License" | "VoterID";
export type ProofStatus = "active" | "expired" | "revoked";

export interface Proof {
  id: string;
  docType: DocType;
  purpose: string;
  requester: string;
  expires: string;
  status: ProofStatus;
  createdAt: string;
  zkProofHash?: string;
}

export interface AccessLog {
  id: string;
  domain: string;
  action: "verified" | "onboard" | "revoked" | "requested";
  docType: DocType;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface PendingRequest {
  id: string;
  requester: string;
  docType: DocType;
  purpose: string;
  requestedAt: string;
}
