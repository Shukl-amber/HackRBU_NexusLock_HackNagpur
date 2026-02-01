"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getProofs,
  getAccessLogs,
  getPendingRequests,
  revokeProof,
  revokeAllProofs,
  getDocIcon,
  getActionIcon,
  formatTime,
  formatDateTime,
  exportToCSV,
  downloadCSV,
} from "@/lib/api";
import { Proof, AccessLog, PendingRequest } from "@/types";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Data state
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Filter state
  const [logFilter, setLogFilter] = useState<"all" | "today" | "week">("all");

  // Modal state
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proofsData, logsData, requestsData] = await Promise.all([
        getProofs(),
        getAccessLogs(logFilter),
        getPendingRequests(),
      ]);
      setProofs(proofsData);
      setAccessLogs(logsData);
      setPendingRequests(requestsData);
      setLastSync(new Date());
    } catch {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [logFilter, toast]);

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Handlers
  const handleRevoke = async (proofId: string) => {
    const result = await revokeProof(proofId);
    if (result.success) {
      setProofs((prev) =>
        prev.map((p) => (p.id === proofId ? { ...p, status: "revoked" } : p))
      );
      toast.success("Proof revoked successfully");
    } else {
      toast.error(result.message);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Are you sure you want to revoke all active proofs?")) return;
    const result = await revokeAllProofs();
    if (result.success) {
      setProofs((prev) =>
        prev.map((p) => (p.status === "active" ? { ...p, status: "revoked" } : p))
      );
      toast.success(result.message);
    } else {
      toast.error("Failed to revoke proofs");
    }
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(proofs);
    downloadCSV(csv, `consent-vault-proofs-${Date.now()}.csv`);
    toast.success("Proofs exported to CSV");
  };

  const activeProofs = proofs.filter((p) => p.status === "active");

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">CV</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  ConsentVault Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  Last sync: {formatTime(lastSync.toISOString())}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/upload")}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Upload Document
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={activeProofs.length === 0}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke All Active
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {user?.name || user?.email}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* SECTION 2: ACTIVE PROOFS (40% height - Most Important) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Proofs{" "}
              <span className="text-sm font-normal text-gray-500">
                ({activeProofs.length} active)
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : proofs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No proofs yet. Upload your first document!
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doc Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {proofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xl mr-2">
                          {getDocIcon(proof.docType)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {proof.docType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {proof.purpose}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {proof.requester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(proof.expires)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={proof.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {proof.status === "active" && (
                          <button
                            onClick={() => handleRevoke(proof.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 3: ACCESS LOGS (30% height) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Access{" "}
              <span className="text-sm font-normal text-gray-500">
                ({accessLogs.length} events)
              </span>
            </h2>
            <div className="flex gap-2">
              {(["all", "today", "week"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    logFilter === filter
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "today"
                    ? "Today"
                    : "This Week"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No access logs for this period
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.domain}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.action} {log.docType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {formatTime(log.timestamp)}
                    </span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 4: PENDING REQUESTS (20% height) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Requests{" "}
              <span className="text-sm font-normal text-gray-500">
                ({pendingRequests.length})
              </span>
            </h2>
            <button
              onClick={fetchData}
              className="text-sm text-blue-600 hover:underline"
            >
              Refresh
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No new consent requests waiting
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{getDocIcon(req.docType)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.requester}
                      </p>
                      <p className="text-xs text-gray-500">{req.purpose}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                      Approve
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* DETAILS MODAL */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Access Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Domain</span>
                <span className="text-sm font-medium">{selectedLog.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Action</span>
                <span className="text-sm font-medium">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Document</span>
                <span className="text-sm font-medium">{selectedLog.docType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Time</span>
                <span className="text-sm font-medium">
                  {formatDateTime(selectedLog.timestamp)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Full Details</p>
                <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: Proof["status"] }) {
  const styles = {
    active: "bg-green-100 text-green-800",
    expired: "bg-yellow-100 text-yellow-800",
    revoked: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
