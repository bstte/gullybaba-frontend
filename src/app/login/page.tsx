"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { hydrate, loadAuthFromStorage, loginUser } from "@/src/store/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, status } = useAppSelector((state) => state.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (token) {
      router.push("/dashboard");
      return;
    }
    const stored = loadAuthFromStorage();
    if (stored) {
      dispatch(hydrate(stored));
      router.push("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await dispatch(loginUser({ username, password })).unwrap();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 text-gray-900 font-sans p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="GullyBaba Logo" className="h-12 w-auto object-contain" />
        </div>
        <div className="text-center mb-8">

          <p className="text-gray-500 text-xs mt-1 font-medium">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm text-gray-900 transition-colors"
              placeholder="Username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm text-gray-900 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div id="login-error" className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-gray-950 hover:bg-gray-800 text-white font-medium rounded-md transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
