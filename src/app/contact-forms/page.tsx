"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchContactForms } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { hasContactFormAccess, getDefaultAllowedRoute } from "@/src/lib/permissions";

interface ContactFormItem {
  id: number;
  name: string;
  count: number;
  unread_count?: number;
  last_submission_date?: string | null;
}

export default function ContactFormsPage() {
  const router = useRouter();
  const { token, ready, profile } = useAuthGuard();
  const [forms, setForms] = useState<ContactFormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadData = async (authToken: string) => {
    try {
      setIsLoading(true);
      const res = await fetchContactForms(authToken);
      if (res.success) {
        setForms(res.forms || []);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load contact forms", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !profile) return;
    if (!hasContactFormAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasContactFormAccess(profile)) return;
    loadData(token);
  }, [ready, token, profile]);

  const filteredForms = forms.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalSubmissions = forms.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Top Header */}
      <Header />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic page content */}
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
          {/* Toast Notification */}
          {notification && (
            <div
              className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium flex items-center gap-2.5 transition-all ${
                notification.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-gray-200 py-3.5 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E31E24] flex items-center justify-center border border-red-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 font-sans tracking-tight">Contact Forms</h1>
                <p className="text-[11px] text-gray-500 font-sans">
                  Manage CF7 Contact Forms and View Captured Submissions
                </p>
              </div>
              <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 font-sans ml-1">
                {forms.length} {forms.length === 1 ? "Form" : "Forms"}
              </span>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 font-sans">
                {totalSubmissions} Total Submissions
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => token && loadData(token)}
                disabled={isLoading}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-250 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                title="Refresh contact forms"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-600" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <svg
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter forms by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-250 rounded-md text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="text-[11px] text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Click any form row below to open its submissions data</span>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto relative min-h-[300px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-md">
                      <svg className="animate-spin h-4 w-4 text-[#E31E24]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading contact forms...</span>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-6 font-bold w-16">#</th>
                      <th className="py-3 px-6 font-bold">Name</th>
                      <th className="py-3 px-6 font-bold text-center w-36">Submissions Count</th>
                      <th className="py-3 px-6 font-bold text-right w-44">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredForms.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-14 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-600 text-xs">No contact forms found</span>
                            <p className="text-[11px] text-gray-400 max-w-sm">
                              {searchQuery ? "No forms matched your search query." : "No Contact Form 7 forms are currently registered."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredForms.map((form, index) => (
                        <tr
                          key={form.id}
                          onClick={() => router.push(`/contact-forms/${form.id}`)}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-6 font-mono text-gray-400 text-[11px]">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded bg-gray-100 group-hover:bg-red-50 text-gray-500 group-hover:text-[#E31E24] flex items-center justify-center transition-colors shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                                </svg>
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 group-hover:text-[#E31E24] transition-colors text-xs font-sans">
                                  {form.name}
                                </span>
                                {form.last_submission_date && (
                                  <span className="block text-[10px] text-gray-400 font-sans mt-0.5">
                                    Last entry: {form.last_submission_date}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-xs font-mono transition-transform group-hover:scale-105 ${
                                form.count > 0
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-gray-100 text-gray-500 border border-gray-200"
                              }`}
                            >
                              {form.count}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <Link
                              href={`/contact-forms/${form.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E31E24] hover:text-red-700 bg-red-50/50 hover:bg-red-50 border border-red-200/60 px-3 py-1.5 rounded-md transition-colors"
                            >
                              <span>View Data</span>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-gray-50/70 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500 font-sans">
                <span>
                  Showing {filteredForms.length} of {forms.length} {forms.length === 1 ? "form" : "forms"}
                </span>
                <span className="text-[11px] text-gray-400">
                  Contact Form CFDB7 Integration
                </span>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
