"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AdminAuthProvider } from "@/lib/admin-auth-context";
import { ToastProvider } from "@/lib/toast-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
