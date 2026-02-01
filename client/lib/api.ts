// API functions for dashboard data

import axios from "axios";
import { Proof, AccessLog, PendingRequest, DocType } from "@/types";
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API functions
export async function getProofs(): Promise<Proof[]> {
  try {
    const response = await axios.get(`${API_URL}/api/v1/dashboard`, {
      headers: getAuthHeaders(),
    });

    return response.data.proofs.map((proof: any) => ({
      id: proof.id,
      docType: proof.docType as DocType,
      purpose: proof.purpose,
      requester: proof.requester,
      expires: proof.expires,
      status: proof.status,
      createdAt: proof.createdAt,
      zkProofHash: proof.zkProofHash,
    }));
  } catch (error) {
    console.error("Failed to fetch proofs:", error);
    throw new Error("Failed to fetch proofs");
  }
}

export async function getAccessLogs(
  filter: "all" | "today" | "week" = "all"
): Promise<AccessLog[]> {
  try {
    const response = await axios.get(`${API_URL}/api/v1/dashboard`, {
      headers: getAuthHeaders(),
    });

    let logs = response.data.logs.map((log: any) => ({
      id: log.proof_id || `log_${Date.now()}`,
      domain: log.details?.requesting_domain || "Unknown",
      action: log.action as AccessLog["action"],
      docType: (log.details?.doc_type || "PAN") as DocType,
      timestamp: log.timestamp,
      details: log.details || {},
    }));

    // Filter logs by timeframe
    const now = Date.now();
    const dayMs = 86400000;

    if (filter !== "all") {
      logs = logs.filter((log: AccessLog) => {
        const logTime = new Date(log.timestamp).getTime();
        if (filter === "today") {
          return now - logTime < dayMs;
        }
        if (filter === "week") {
          return now - logTime < dayMs * 7;
        }
        return true;
      });
    }

    return logs;
  } catch (error) {
    console.error("Failed to fetch access logs:", error);
    throw new Error("Failed to fetch access logs");
  }
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  // No pending requests endpoint yet - return empty array
  return [];
}

export async function revokeProof(
  proofId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await axios.post(
      `${API_URL}/api/v1/revoke`,
      null,
      {
        headers: getAuthHeaders(),
        params: { proof_id: proofId },
      }
    );

    return { success: true, message: "Proof revoked successfully" };
  } catch (error) {
    console.error("Failed to revoke proof:", error);
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        message: error.response.data.detail || "Failed to revoke proof",
      };
    }
    return { success: false, message: "Failed to revoke proof" };
  }
}

export async function revokeAllProofs(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  try {
    // Get all active proofs
    const proofs = await getProofs();
    const activeProofs = proofs.filter((p) => p.status === "active");

    // Revoke each one
    let count = 0;
    for (const proof of activeProofs) {
      const result = await revokeProof(proof.id);
      if (result.success) {
        count++;
      }
    }

    return {
      success: true,
      message: `Revoked ${count} active proofs`,
      count,
    };
  } catch (error) {
    console.error("Failed to revoke all proofs:", error);
    return {
      success: false,
      message: "Failed to revoke all proofs",
      count: 0,
    };
  }
}

export function getDocIcon(docType: DocType): string {
  const icons: Record<DocType, string> = {
    PAN: "🪪",
    Aadhaar: "🆔",
    Passport: "📘",
    License: "🚗",
    VoterID: "🗳️",
  };
  return icons[docType] || "📄";
}

export function getActionIcon(action: AccessLog["action"]): string {
  const icons = {
    verified: "✓",
    onboard: "📥",
    revoked: "🚫",
    requested: "📨",
  };
  return icons[action] || "•";
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function exportToCSV(proofs: Proof[]): string {
  const headers = ["Doc Type", "Purpose", "Requester", "Status", "Expires"];
  const rows = proofs.map((p) => [
    p.docType,
    p.purpose,
    p.requester,
    p.status,
    formatDateTime(p.expires),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
