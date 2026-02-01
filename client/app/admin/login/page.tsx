"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { useToast } from "@/lib/toast-context";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAdminAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({ 
        username: trimmedUsername, 
        password: trimmedPassword 
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Authentication failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-cyan">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Admin Access</h1>
          <p className="text-gray-400">NexusConnect Administration Portal</p>
        </div>

        <div className="card-hover p-8">
          <h2 className="text-xl font-semibold text-gray-100 text-center mb-6">
            Administrator Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="input-dark"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-dark"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Access Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-center text-gray-500 text-sm flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Restricted access for authorized personnel only
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          © 2025 NexusConnect. All rights reserved.
        </p>
      </div>
    </div>
  );
}
