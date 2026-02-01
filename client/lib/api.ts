// API functions for dashboard data

import { Proof, AccessLog, PendingRequest, DocType } from "@/types";

const MOCK_DELAY = 300;

// Mock data
const mockProofs: Proof[] = [
  {
    id: "proof_1",
    docType: "PAN",
    purpose: "Tax filing verification",
    requester: "tax.gov.in",
    expires: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days
    status: "active",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    zkProofHash: "0x7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
  },
  {
    id: "proof_2",
    docType: "Aadhaar",
    purpose: "Health card application",
    requester: "health.gov.in",
    expires: new Date(Date.now() + 86400000).toISOString(), // 1 day
    status: "active",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    zkProofHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  },
  {
    id: "proof_3",
    docType: "Passport",
    purpose: "KYC verification",
    requester: "bank.example.com",
    expires: new Date(Date.now() - 86400000).toISOString(), // Expired
    status: "expired",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    zkProofHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
  },
];

const mockAccessLogs: AccessLog[] = [
  {
    id: "log_1",
    domain: "tax.gov.in",
    action: "verified",
    docType: "PAN",
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    details: { verifier: "Income Tax Department", status: "success" },
  },
  {
    id: "log_2",
    domain: "health.gov.in",
    action: "verified",
    docType: "Aadhaar",
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
    details: { verifier: "Health Ministry", status: "success" },
  },
  {
    id: "log_3",
    domain: "digilocker.gov.in",
    action: "onboard",
    docType: "Aadhaar",
    timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 min ago
    details: { action: "Document onboarded", hash: "0x..." },
  },
  {
    id: "log_4",
    domain: "bank.example.com",
    action: "revoked",
    docType: "Passport",
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    details: { reason: "User initiated revocation" },
  },
  {
    id: "log_5",
    domain: "insurance.co.in",
    action: "requested",
    docType: "PAN",
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    details: { purpose: "Insurance claim processing" },
  },
];

const mockPendingRequests: PendingRequest[] = [];

// API functions
export async function getProofs(): Promise<Proof[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
  return [...mockProofs];
}

export async function getAccessLogs(
  filter: "all" | "today" | "week" = "all"
): Promise<AccessLog[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  const now = Date.now();
  const dayMs = 86400000;

  return mockAccessLogs.filter((log) => {
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

export async function getPendingRequests(): Promise<PendingRequest[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
  return [...mockPendingRequests];
}

export async function revokeProof(
  proofId: string
): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  const proof = mockProofs.find((p) => p.id === proofId);
  if (!proof) {
    return { success: false, message: "Proof not found" };
  }

  proof.status = "revoked";
  return { success: true, message: "Proof revoked successfully" };
}

export async function revokeAllProofs(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));

  let count = 0;
  mockProofs.forEach((proof) => {
    if (proof.status === "active") {
      proof.status = "revoked";
      count++;
    }
  });

  return {
    success: true,
    message: `Revoked ${count} active proofs`,
    count,
  };
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
