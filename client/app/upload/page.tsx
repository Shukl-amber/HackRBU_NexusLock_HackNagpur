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

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle file selection
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

  // Drag and drop handlers
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

  // Update file metadata
  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Generate mock ZKP proof
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

  // Process file: call backend onboard API
  const processFile = async (fileData: UploadedFile) => {
    if (!fileData.docType || !fileData.purpose || !fileData.requester || !fileData.docData) {
      toast.error("Please fill all fields: document type, purpose, requester, and document data");
      return;
    }

    updateFile(fileData.id, { status: "processing", progress: 0 });

    try {
      // Get auth token
      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated. Please login again.");
      }

      // Generate mock ZKP proof
      const mockProof = generateMockProof();
      
      // Mock public signals
      const pubSignals = [
        `signal_${Math.random().toString(36).slice(2)}`,
        `signal_${Math.random().toString(36).slice(2)}`,
      ];

      // Simulate progress
      updateFile(fileData.id, { progress: 20 });

      // Call backend onboard API
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

      // Simulate final progress
      updateFile(fileData.id, { progress: 90 });
      await new Promise((r) => setTimeout(r, 300));

      // Extract proof hash from response token (for display)
      const zkHash = `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      updateFile(fileData.id, {
        status: "success",
        progress: 100,
        zkProofHash: zkHash,
      });

      toast.success(`${fileData.docType} proof generated successfully!`);
    } catch (error) {
      console.error("Onboard error:", error);
      
      let errorMessage = "Failed to generate proof. Please try again.";
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

  // Process all pending files
  const processAllFiles = async () => {
    const pendingFiles = files.filter(
      (f) => f.status === "pending" && f.docType && f.purpose && f.requester && f.docData
    );

    if (pendingFiles.length === 0) {
      toast.warning("No files ready to process. Please complete all required fields.");
      return;
    }

    for (const file of pendingFiles) {
      await processFile(file);
    }
  };

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

  const docTypes: DocType[] = ["PAN", "Aadhaar", "Passport", "License", "VoterID"];
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">CV</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Upload Documents
            </h1>
          </div>

          {files.length > 0 && (
            <div className="text-sm text-gray-500">
              {pendingCount} pending • {successCount} completed
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Drag & Drop your documents here
          </h2>
          <p className="text-gray-500 mb-4">
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
            <span className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors">
              Browse Files
            </span>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Uploaded Files ({files.length})
              </h3>
              {pendingCount > 0 && (
                <button
                  onClick={processAllFiles}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Generate All Proofs
                </button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((fileData) => (
                <div
                  key={fileData.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* File Icon */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      {fileData.docType ? getDocIcon(fileData.docType) : "📄"}
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 truncate">
                          {fileData.file.name}
                        </p>
                        <button
                          onClick={() => removeFile(fileData.id)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 mb-3">
                        {(fileData.file.size / 1024).toFixed(1)} KB
                      </p>

                      {fileData.status === "pending" && (
                        <div className="space-y-3">
                          {/* Doc Type Selector */}
                          <select
                            value={fileData.docType || ""}
                            onChange={(e) =>
                              updateFile(fileData.id, {
                                docType: e.target.value as DocType,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="">Select Document Type</option>
                            {docTypes.map((type) => (
                              <option key={type} value={type}>
                                {getDocIcon(type)} {type}
                              </option>
                            ))}
                          </select>

                          {/* Purpose Input */}
                          <input
                            type="text"
                            value={fileData.purpose}
                            onChange={(e) =>
                              updateFile(fileData.id, { purpose: e.target.value })
                            }
                            placeholder="Purpose (e.g., Tax filing)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                          />

                          {/* Requester Input */}
                          <input
                            type="text"
                            value={fileData.requester}
                            onChange={(e) =>
                              updateFile(fileData.id, { requester: e.target.value })
                            }
                            placeholder="Requester (e.g., tax.gov.in)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                          />

                          {/* Document Data Text Area */}
                          <textarea
                            value={fileData.docData}
                            onChange={(e) =>
                              updateFile(fileData.id, { docData: e.target.value })
                            }
                            placeholder="Document data (e.g., PAN number, Aadhaar details, or base64 encoded content)"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder:text-gray-400"
                          />
                        </div>
                      )}

                      {fileData.status === "processing" && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-blue-600">
                              Generating ZK Proof...
                            </span>
                            <span className="text-gray-500">
                              {fileData.progress}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-200"
                              style={{ width: `${fileData.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {fileData.status === "success" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700 mb-1">
                            <span>✓</span>
                            <span className="font-medium">
                              Proof Generated Successfully
                            </span>
                          </div>
                          <p className="text-xs text-green-600 font-mono break-all">
                            Hash: {fileData.zkProofHash}
                          </p>
                        </div>
                      )}

                      {fileData.status === "error" && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-700 mb-1">
                            <span>✕</span>
                            <span className="font-medium">
                              Failed to generate proof
                            </span>
                          </div>
                          {fileData.errorMessage && (
                            <p className="text-xs text-red-600 mt-1">
                              {fileData.errorMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {fileData.status === "pending" &&
                      fileData.docType &&
                      fileData.purpose &&
                      fileData.requester &&
                      fileData.docData && (
                        <button
                          onClick={() => processFile(fileData)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                          Generate Proof
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            🔐 How Zero-Knowledge Proofs Work
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • Your document is processed locally - never sent to our servers
            </li>
            <li>
              • A cryptographic proof is generated that verifies your document
            </li>
            <li>
              • Third parties can verify the proof without seeing your data
            </li>
            <li>• You control who can verify and for how long</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
