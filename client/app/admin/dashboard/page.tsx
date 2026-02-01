"use client";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { useToast } from "@/lib/toast-context";
import { useRouter } from "next/navigation";
import { ApiKey, getApiKeys, createApiKey } from "@/lib/admin-auth";

export default function AdminDashboardPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDomain, setNewKeyDomain] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { user, logout, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login");
      return;
    }

    if (isAuthenticated) {
      loadApiKeys();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const keys = await getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyName.trim() || !newKeyDomain.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      const newKey = await createApiKey({
        name: newKeyName.trim(),
        domain: newKeyDomain.trim(),
      });

      setCreatedKey(newKey.key);
      toast.success("API key created!");
      
      setNewKeyName("");
      setNewKeyDomain("");
      
      await loadApiKeys();
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-white text-lg flex items-center gap-3">
          <span className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <nav className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-gray-100 font-semibold">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">NexusConnect Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-100 text-sm font-medium">{user?.username}</p>
              <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">API Key Management</h2>
          <p className="text-gray-400">Manage API keys for third-party integrations</p>
        </div>

        {createdKey && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-emerald-400 font-semibold mb-1">API Key Created!</h3>
                <p className="text-gray-400 text-sm mb-3">
                  Save this key securely. You won&apos;t see it again.
                </p>
                <div className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-2">
                  <code className="text-emerald-400 text-sm flex-1 font-mono break-all">{createdKey}</code>
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded text-sm transition-colors flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mb-6 btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New API Key
          </button>
        ) : (
          <div className="mb-6 card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-100 font-semibold text-lg">Create New API Key</h3>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKeyName("");
                  setNewKeyDomain("");
                }}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateApiKey} className="space-y-4">
              <div>
                <label htmlFor="keyName" className="block text-sm font-medium text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  id="keyName"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                  className="input-dark"
                  required
                />
              </div>
              <div>
                <label htmlFor="keyDomain" className="block text-sm font-medium text-gray-300 mb-2">
                  Domain
                </label>
                <input
                  id="keyDomain"
                  type="text"
                  value={newKeyDomain}
                  onChange={(e) => setNewKeyDomain(e.target.value)}
                  placeholder="e.g., example.com"
                  className="input-dark"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create API Key"
                )}
              </button>
            </form>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h3 className="text-gray-100 font-semibold">Existing API Keys</h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p className="text-gray-400 mb-1">No API keys found</p>
              <p className="text-gray-500 text-sm">Create your first API key</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {apiKeys.map((key) => (
                <div key={key.id} className="px-6 py-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-gray-100 font-medium">{key.name}</h4>
                        <span
                          className={`badge ${
                            key.is_active
                              ? "badge-success"
                              : "badge-danger"
                          }`}
                        >
                          {key.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          {key.domain}
                        </p>
                        <p className="text-gray-500 text-sm">
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
