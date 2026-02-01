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

  const [proofs, setProofs] = useState<Proof[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [logFilter, setLogFilter] = useState<"all" | "today" | "week">("all");
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

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
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [logFilter, toast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleRevoke = async (proofId: string) => {
    try {
      const result = await revokeProof(proofId);
      if (result.success) {
        setProofs((prev) =>
          prev.map((p) => (p.id === proofId ? { ...p, status: "revoked" } : p))
        );
        toast.success("Proof revoked");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to revoke proof");
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Revoke all active proofs?")) return;
    try {
      const result = await revokeAllProofs();
      if (result.success) {
        setProofs((prev) =>
          prev.map((p) => (p.status === "active" ? { ...p, status: "revoked" } : p))
        );
        toast.success("All proofs revoked");
      }
    } catch (error) {
      toast.error("Failed to revoke proofs");
    }
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(proofs);
    downloadCSV(csv, `nexus-connect-proofs-${Date.now()}.csv`);
    toast.success("Exported to CSV");
  };

  const activeProofs = proofs.filter((p) => p.status === "active");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#666666]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 border-b border-[#222222] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white">
                  NexusConnect Dashboard
                </h1>
                <p className="text-xs text-[#666666]">
                  Last sync: {formatTime(lastSync.toISOString())}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/upload")}
                className="btn-primary text-sm"
              >
                + Upload Document
              </button>
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={handleRevokeAll}
                disabled={activeProofs.length === 0}
                className="btn-danger text-sm disabled:opacity-50"
              >
                Revoke All
              </button>
              <div className="h-6 w-px bg-[#333333]" />
              <div className="text-right">
                <p className="text-sm text-[#a0a0a0]">
                  {user?.name || user?.email}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-[#00d4ff] hover:text-[#00e5ff]"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-[#666666] text-sm">Active Proofs</p>
            <p className="text-2xl font-bold text-[#00d4ff]">{activeProofs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-[#666666] text-sm">Total Proofs</p>
            <p className="text-2xl font-bold text-white">{proofs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-[#666666] text-sm">Access Events</p>
            <p className="text-2xl font-bold text-[#00ff88]">{accessLogs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-[#666666] text-sm">Pending Requests</p>
            <p className="text-2xl font-bold text-[#ffaa00]">{pendingRequests.length}</p>
          </div>
        </div>

        {/* Active Proofs Section */}
        <section className="card">
          <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Active Proofs
              <span className="text-sm font-normal text-[#666666] ml-2">
                ({activeProofs.length} active)
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : proofs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#666666]">No proofs yet. Upload your first document!</p>
              <button
                onClick={() => router.push("/upload")}
                className="btn-primary mt-4"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Purpose</th>
                    <th>Requester</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proofs.map((proof) => (
                    <tr key={proof.id}>
                      <td className="flex items-center gap-2">
                        <span className="text-xl">{getDocIcon(proof.docType)}</span>
                        <span className="font-medium text-white">{proof.docType}</span>
                      </td>
                      <td>{proof.purpose}</td>
                      <td>{proof.requester}</td>
                      <td>{formatDateTime(proof.expires)}</td>
                      <td>
                        <StatusBadge status={proof.status} />
                      </td>
                      <td className="text-right">
                        {proof.status === "active" && (
                          <button
                            onClick={() => handleRevoke(proof.id)}
                            className="text-[#ff4444] hover:text-[#ff6666] text-sm font-medium"
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

        {/* Access Logs Section */}
        <section className="card">
          <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Access Logs
              <span className="text-sm font-normal text-[#666666] ml-2">
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
                      ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30"
                      : "text-[#666666] hover:bg-[#1a1a1a]"
                  }`}
                >
                  {filter === "all" ? "All" : filter === "today" ? "Today" : "This Week"}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="p-8 text-center text-[#666666]">
              No access logs for this period
            </div>
          ) : (
            <div className="divide-y divide-[#222222]">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a1a]/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center text-lg">
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{log.domain}</p>
                      <p className="text-xs text-[#666666]">
                        {log.action} {log.docType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#666666]">{formatTime(log.timestamp)}</span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-sm text-[#00d4ff] hover:text-[#00e5ff]"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Requests Section */}
        <section className="card">
          <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Pending Requests
              <span className="text-sm font-normal text-[#666666] ml-2">
                ({pendingRequests.length})
              </span>
            </h2>
            <button
              onClick={fetchData}
              className="text-sm text-[#00d4ff] hover:text-[#00e5ff]"
            >
              Refresh
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center text-[#666666]">
              No pending consent requests
            </div>
          ) : (
            <div className="divide-y divide-[#222222]">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{getDocIcon(req.docType)}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{req.requester}</p>
                      <p className="text-xs text-[#666666]">{req.purpose}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-black bg-[#00ff88] rounded-lg hover:bg-[#00ff99]">
                      Approve
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-[#ff4444] border border-[#ff4444]/30 rounded-lg hover:bg-[#ff4444]/10">
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="card max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Access Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#666666] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">Domain</span>
                <span className="text-sm font-medium text-white">{selectedLog.domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">Action</span>
                <span className="text-sm font-medium text-white">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">Document</span>
                <span className="text-sm font-medium text-white">{selectedLog.docType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">Time</span>
                <span className="text-sm font-medium text-white">
                  {formatDateTime(selectedLog.timestamp)}
                </span>
              </div>
              <div className="pt-3 border-t border-[#222222]">
                <p className="text-sm text-[#666666] mb-2">Full Details</p>
                <pre className="bg-[#0a0a0a] p-3 rounded-lg text-xs overflow-auto max-h-40 text-[#a0a0a0]">
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

function StatusBadge({ status }: { status: Proof["status"] }) {
  const styles = {
    active: "badge-success",
    expired: "badge-warning",
    revoked: "badge-danger",
  };

  return (
    <span className={styles[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
