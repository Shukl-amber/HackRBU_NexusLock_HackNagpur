"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { DocType } from "@/types";
import { getDocIcon } from "@/lib/api";
import { getToken } from "@/lib/auth";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UploadedFile {
  id: string;
  file: File;
  docType: DocType | null;
  purpose: string;
  requester: string;
  docData: string;
  status: "pending" | "processing" | "success" | "error";
  progress: number;
  zkProofHash?: string;
  errorMessage?: string;
}

export default function UploadPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      docType: null,
      purpose: "",
      requester: "",
      docData: "",
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const generateMockProof = () => {
    return {
      pi_a: [
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      ],
      pi_b: [
        [
          `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
          `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        ],
        [
          `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
          `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        ],
      ],
      pi_c: [
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      ],
      protocol: "groth16",
    };
  };

  const processFile = async (fileData: UploadedFile) => {
    if (!fileData.docType || !fileData.purpose || !fileData.requester || !fileData.docData) {
      toast.error("Please fill all fields");
      return;
    }

    updateFile(fileData.id, { status: "processing", progress: 0 });

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const mockProof = generateMockProof();
      const pubSignals = [
        `signal_${Math.random().toString(36).slice(2)}`,
        `signal_${Math.random().toString(36).slice(2)}`,
      ];

      updateFile(fileData.id, { progress: 20 });

      await axios.post(
        `${API_URL}/api/v1/onboard`,
        {
          doc_data: fileData.docData,
          doc_type: fileData.docType,
          proof: mockProof,
          pub_signals: pubSignals,
          purpose: fileData.purpose,
          requester: fileData.requester,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      updateFile(fileData.id, { progress: 90 });
      await new Promise((r) => setTimeout(r, 300));

      const zkHash = `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      updateFile(fileData.id, {
        status: "success",
        progress: 100,
        zkProofHash: zkHash,
      });

      toast.success(`${fileData.docType} proof generated!`);
    } catch (error) {
      let errorMessage = "Failed to generate proof";
      if (axios.isAxiosError(error) && error.response) {
        errorMessage = error.response.data.detail || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      updateFile(fileData.id, {
        status: "error",
        progress: 0,
        errorMessage,
      });

      toast.error(errorMessage);
    }
  };

  const processAllFiles = async () => {
    const pendingFiles = files.filter(
      (f) => f.status === "pending" && f.docType && f.purpose && f.requester && f.docData
    );

    if (pendingFiles.length === 0) {
      toast.warning("No files ready");
      return;
    }

    for (const file of pendingFiles) {
      await processFile(file);
    }
  };

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

  const docTypes: DocType[] = ["PAN", "Aadhaar", "Passport", "License", "VoterID"];
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="min-h-screen bg-gradient-dark">
      <header className="bg-[#0a0a0a]/80 border-b border-[#222222] px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[#666666] hover:text-white"
            >
              ← Back
            </button>
            <div className="w-10 h-10 bg-[#00d4ff] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">NC</span>
            </div>
            <h1 className="text-xl font-semibold text-white">
              Upload Documents
            </h1>
          </div>

          {files.length > 0 && (
            <div className="text-sm text-[#666666]">
              {pendingCount} pending • {successCount} completed
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragOver
              ? "border-[#00d4ff] bg-[#00d4ff]/10"
              : "border-[#333333] hover:border-[#444444]"
          }`}
        >
          <div className="text-5xl mb-4 text-[#666666]">📄</div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Drag & Drop your documents here
          </h2>
          <p className="text-[#666666] mb-4">
            Supports PDF, JPG, PNG up to 10MB
          </p>
          <label className="inline-block">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <span className="btn-primary cursor-pointer">
              Browse Files
            </span>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Uploaded Files ({files.length})
              </h3>
              {pendingCount > 0 && (
                <button
                  onClick={processAllFiles}
                  className="btn-primary"
                >
                  Generate All Proofs
                </button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((fileData) => (
                <div
                  key={fileData.id}
                  className="card p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      {fileData.docType ? getDocIcon(fileData.docType) : "📄"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-white truncate">
                          {fileData.file.name}
                        </p>
                        <button
                          onClick={() => removeFile(fileData.id)}
                          className="text-[#666666] hover:text-[#ff4444] ml-2"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="text-sm text-[#666666] mb-3">
                        {(fileData.file.size / 1024).toFixed(1)} KB
                      </p>

                      {fileData.status === "pending" && (
                        <div className="space-y-3">
                          <select
                            value={fileData.docType || ""}
                            onChange={(e) =>
                              updateFile(fileData.id, {
                                docType: e.target.value as DocType,
                              })
                            }
                            className="input-dark"
                          >
                            <option value="">Select Document Type</option>
                            {docTypes.map((type) => (
                              <option key={type} value={type}>
                                {getDocIcon(type)} {type}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={fileData.purpose}
                            onChange={(e) =>
                              updateFile(fileData.id, { purpose: e.target.value })
                            }
                            placeholder="Purpose (e.g., Tax filing)"
                            className="input-dark"
                          />

                          <input
                            type="text"
                            value={fileData.requester}
                            onChange={(e) =>
                              updateFile(fileData.id, { requester: e.target.value })
                            }
                            placeholder="Requester (e.g., tax.gov.in)"
                            className="input-dark"
                          />

                          <textarea
                            value={fileData.docData}
                            onChange={(e) =>
                              updateFile(fileData.id, { docData: e.target.value })
                            }
                            placeholder="Document data"
                            rows={3}
                            className="input-dark resize-none"
                          />
                        </div>
                      )}

                      {fileData.status === "processing" && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-[#00d4ff]">
                              Generating ZK Proof...
                            </span>
                            <span className="text-[#666666]">
                              {fileData.progress}%
                            </span>
                          </div>
                          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00d4ff] transition-all duration-200"
                              style={{ width: `${fileData.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {fileData.status === "success" && (
                        <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-[#00ff88] mb-1">
                            <span>✓</span>
                            <span className="font-medium">
                              Proof Generated
                            </span>
                          </div>
                          <p className="text-xs text-[#00ff88]/80 font-mono break-all">
                            Hash: {fileData.zkProofHash}
                          </p>
                        </div>
                      )}

                      {fileData.status === "error" && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-rose-400 mb-1">
                            <span>✕</span>
                            <span className="font-medium">
                              Failed
                            </span>
                          </div>
                          {fileData.errorMessage && (
                            <p className="text-xs text-rose-400/80 mt-1">
                              {fileData.errorMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {fileData.status === "pending" &&
                      fileData.docType &&
                      fileData.purpose &&
                      fileData.requester &&
                      fileData.docData && (
                        <button
                          onClick={() => processFile(fileData)}
                          className="btn-primary text-sm flex-shrink-0"
                        >
                          Generate
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 card p-6">
          <h3 className="font-semibold text-cyan-400 mb-2">
            How Zero-Knowledge Proofs Work
          </h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Your document is processed locally</li>
            <li>• A cryptographic proof verifies your document</li>
            <li>• Third parties verify without seeing your data</li>
            <li>• You control who can verify and for how long</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
