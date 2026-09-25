"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { getDefaultAllowedRoute } from "@/src/lib/permissions";

export default function RootPage() {
  const router = useRouter();
  const { ready, profile, token } = useAuthGuard();

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/login");
    } else {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, token, profile, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white text-gray-500 font-sans">
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Redirecting...</span>
      </div>
    </div>
  );
}
