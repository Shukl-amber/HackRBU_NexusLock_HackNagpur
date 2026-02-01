"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";
import { setToken, setStoredUser } from "@/lib/auth";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  description: string;
  token: string;
}

const demoUsers: DemoUser[] = [
  {
    id: "1",
    name: "Demo User 1",
    email: "demo1@nexusconnect.io",
    role: "User",
    description: "Standard user with active proofs and consent history",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJkZW1vMUBuZXh1c2Nvbm5lY3QuaW8iLCJleHAiOjE3NzA1MzQ1ODB9.demo1",
  },
  {
    id: "2",
    name: "Demo User 2",
    email: "demo2@nexusconnect.io",
    role: "User",
    description: "User with revoked proofs and audit trail",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZW1haWwiOiJkZW1vMkBuZXh1c2Nvbm5lY3QuaW8iLCJleHAiOjE3NzA1MzQ1ODB9.demo2",
  },
  {
    id: "admin",
    name: "Administrator",
    email: "admin@nexusconnect.io",
    role: "Admin",
    description: "Full system access with API key management",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AbmV4dXNjb25uZWN0LmlvIiwiaXNfYWRtaW4iOnRydWUsImV4cCI6MTc3MDUzNDU4MH0.admin",
  },
];

export default function DemoPage() {
  const router = useRouter();
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (user: DemoUser) => {
    setIsLoading(true);
    try {
      // Store token and user data
      setToken(user.token);
      setStoredUser({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: new Date().toISOString(),
      });

      toast.success(`Logged in as ${user.name}`);

      // Redirect based on role
      if (user.role === "Admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            NexusConnect Demo Mode
          </h1>
          <p className="text-[#666666] text-lg max-w-2xl mx-auto">
            Experience the full DPDP-compliant consent management platform.
            Select a user persona below to explore different features.
          </p>
        </div>

        {/* Demo Users Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {demoUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`card-hover p-6 cursor-pointer transition-all duration-200 ${
                selectedUser?.id === user.id
                  ? "border-[#00d4ff] bg-[#00d4ff]/10"
                  : ""
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    user.role === "Admin"
                      ? "bg-[#ff4444]/20 text-[#ff4444]"
                      : "bg-[#00d4ff]/20 text-[#00d4ff]"
                  }`}
                >
                  <span className="font-bold text-lg">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {user.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      user.role === "Admin"
                        ? "bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30"
                        : "bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-[#666666] text-sm mb-4">{user.description}</p>
              <div className="text-xs text-[#444444]">{user.email}</div>
            </div>
          ))}
        </div>

        {/* Selected User Action */}
        {selectedUser && (
          <div className="card p-8 mb-12 animate-slideUp">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Login as {selectedUser.name}
                </h2>
                <p className="text-[#666666]">
                  You will be logged in as a {selectedUser.role.toLowerCase()} user.
                  {selectedUser.role === "Admin"
                    ? " Access the admin panel to manage API keys and view system health."
                    : " Access the dashboard to manage proofs and view consent history."}
                </p>
              </div>
              <button
                onClick={() => handleLogin(selectedUser)}
                disabled={isLoading}
                className="btn-primary min-w-[200px] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>Enter as {selectedUser.name}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Features Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Zero-Knowledge Proofs",
              description: "Privacy-preserving document verification using ZKP",
              icon: "🔐",
            },
            {
              title: "DPDP Compliance",
              description: "Full compliance with Digital Personal Data Protection Act",
              icon: "📋",
            },
            {
              title: "Consent Management",
              description: "Granular consent with purpose limitation and expiry",
              icon: "✓",
            },
            {
              title: "Audit Trail",
              description: "Immutable logs with TimescaleDB hypertables",
              icon: "📊",
            },
          ].map((feature, idx) => (
            <div key={idx} className="card p-6">
              <div className="text-2xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-[#666666] text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-[#222222]">
          <p className="text-[#444444] text-sm">
            NexusConnect - DPDP-Compliant Consent Management Platform
          </p>
          <p className="text-[#333333] text-xs mt-2">
            Built for Hackathon 2025
          </p>
        </div>
      </div>
    </div>
  );
}
