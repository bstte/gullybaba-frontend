"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchDownloads, getBackendDownloadUrl } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import {
  hasDownloadsAccess,
  canViewDownloadTab,
  getDefaultAllowedRoute,
  DOWNLOADS_COD_ORDERS_KEY,
  DOWNLOADS_ABANDONED_CARTS_KEY,
  DOWNLOADS_ABANDONED_CARTS_LITE_KEY,
  DOWNLOADS_ORDERS_KEY,
} from "@/src/lib/permissions";

interface DownloadItem {
  id: string | number;
  s_no?: number;
  filename: string;
  date: string;
  raw_date?: string;
  file_size?: string;
  download_url: string;
}

// Out of stock ko ignore kiya gaya hai as per requirement
const ALL_CATEGORIES = [
  {
    id: "cod-orders",
    permissionKey: DOWNLOADS_COD_ORDERS_KEY,
    label: "COD Orders",
    icon: "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  },
  {
    id: "abandoned-carts",
    permissionKey: DOWNLOADS_ABANDONED_CARTS_KEY,
    label: "Abandoned Carts",
    icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  },
  {
    id: "abandoned-carts-lite",
    permissionKey: DOWNLOADS_ABANDONED_CARTS_LITE_KEY,
    label: "Abandoned Carts Lite",
    icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 8.25v3.75l2.25 1.5",
  },
  {
    id: "orders",
    permissionKey: DOWNLOADS_ORDERS_KEY,
    label: "Orders",
    icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z",
  },
  {
    id: "out-of-stock-products",
    permissionKey: null, // No permission check: direct show
    label: "Out of Stock Products",
    icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
  },
];

export default function DownloadsPage() {
  const router = useRouter();
  const { token, ready, profile } = useAuthGuard();

  // Filter allowed categories based on user's profile permissions (out of stock directly allowed)
  const allowedCategories = useMemo(() => {
    if (!profile) return [];
    return ALL_CATEGORIES.filter((cat) => {
      if (!cat.permissionKey) return true;
      return canViewDownloadTab(profile, cat.permissionKey);
    });
  }, [profile]);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [wpApiStatus, setWpApiStatus] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Permission Guard: Agar access_downloads me downloads-menu nahi hai to redirect
  useEffect(() => {
    if (!ready || !profile) return;
    if (!hasDownloadsAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  // Set default active tab to first allowed category
  useEffect(() => {
    if (allowedCategories.length > 0) {
      if (!activeCategory || !allowedCategories.some((c) => c.id === activeCategory)) {
        setActiveCategory(allowedCategories[0].id);
      }
    }
  }, [allowedCategories, activeCategory]);

  const loadData = async (authToken: string, category: string, search: string = "") => {
    if (!category) return;
    try {
      setIsLoading(true);
      setWpApiStatus(null);
      const res = await fetchDownloads(authToken, category, search);
      if (res && res.success) {
        setDownloads(res.downloads || []);
      } else {
        setDownloads(res.downloads || []);
        if (res && res.message) {
          setWpApiStatus(res.message);
        }
      }
    } catch (err: any) {
      console.error("Downloads fetch error:", err);
      setWpApiStatus(err.message || "Unable to connect to WordPress downloads API");
      setDownloads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token || !activeCategory) return;
    loadData(token, activeCategory, searchQuery);
  }, [ready, token, activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token && activeCategory) {
      loadData(token, activeCategory, searchQuery);
    }
  };

  const handleDownloadClick = (item: DownloadItem) => {
    if (token) {
      window.open(getBackendDownloadUrl(token, item.filename, activeCategory), "_blank");
    } else {
      window.open(item.download_url, "_blank");
    }
  };

  const currentCategoryObj = allowedCategories.find((c) => c.id === activeCategory) || allowedCategories[0];

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

          {/* Page Top Header */}
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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 font-sans tracking-tight">
                  {currentCategoryObj ? currentCategoryObj.label : "Downloads"}
                </h1>
                <p className="text-[11px] text-gray-500 font-sans">
                  Automated Cron Job Export Files Archive
                </p>
              </div>
              {currentCategoryObj && (
                <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 font-sans ml-1">
                  {downloads.length} {downloads.length === 1 ? "File" : "Files"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => token && activeCategory && loadData(token, activeCategory, searchQuery)}
                disabled={isLoading || !activeCategory}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-250 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                title="Refresh files"
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

          {/* Sub-navigation tabs matching WordPress Admin menu & filtered by permission */}
          {allowedCategories.length > 0 && (
            <div className="bg-white border-b border-gray-200 px-6 pt-2 flex items-center gap-1 overflow-x-auto shrink-0">
              {allowedCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchQuery("");
                    }}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "border-[#E31E24] text-[#E31E24] bg-red-50/50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="w-3.5 h-3.5 shrink-0"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                    </svg>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter & Search Bar */}
          {allowedCategories.length > 0 && (
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
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
                    placeholder="Filter by date or file name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-250 rounded-md text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
                  />
                </div>
                <button
                  type="submit"
                  className="text-xs bg-gray-800 hover:bg-gray-900 text-white font-medium px-3 py-1.5 rounded-md transition-colors"
                >
                  Search
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      if (token && activeCategory) loadData(token, activeCategory, "");
                    }}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </form>

              <div className="text-[11px] text-gray-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Cron files generated automatically by server scheduler</span>
              </div>
            </div>
          )}

          {/* Info notice if WordPress endpoint message */}
          {wpApiStatus && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-amber-900">WordPress API Status</p>
                <p className="mt-0.5">{wpApiStatus}</p>
              </div>
            </div>
          )}

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
                      <span className="text-xs font-semibold text-gray-700">Loading downloads...</span>
                    </div>
                  </div>
                )}

                {allowedCategories.length === 0 && !isLoading ? (
                  <div className="py-16 text-center text-gray-500">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Access Restricted</p>
                    <p className="text-xs text-gray-500 mt-1">
                      You do not have permission to view any download categories.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 w-20 text-center font-bold">S. No.</th>
                        <th className="py-3 px-6 font-bold">Date</th>
                        <th className="py-3 px-6 font-bold">File Name</th>
                        <th className="py-3 px-4 font-bold text-center">Size</th>
                        <th className="py-3 px-6 text-right font-bold w-36">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {downloads.length > 0 ? (
                        downloads.map((item, index) => {
                          return (
                            <tr
                              key={item.filename || index}
                              className="hover:bg-gray-50/80 transition-colors"
                            >
                              <td className="py-3 px-4 text-center font-medium text-gray-600">
                                {item.s_no || index + 1}
                              </td>
                              <td className="py-3 px-6">
                                <div className="flex items-center gap-2 font-medium text-gray-900">
                                  <svg
                                    className="w-3.5 h-3.5 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span>{item.date}</span>
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <span className="font-mono text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                  {item.filename}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-500 font-mono text-[11px]">
                                {item.file_size || "—"}
                              </td>
                              <td className="py-3 px-6 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadClick(item)}
                                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer"
                                  title={`Download ${item.filename}`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                    />
                                  </svg>
                                  <span>Download</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        !isLoading && (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
                                  <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 12h4.5m-4.5 0H7.5m5.25 0h2.25m-7.5-6h7.5m-7.5-3h7.5M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
                                    />
                                  </svg>
                                </div>
                                <p className="text-xs font-semibold text-gray-700">
                                  No files found for {currentCategoryObj ? currentCategoryObj.label : "selected category"}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {searchQuery
                                    ? `No files matching "${searchQuery}". Try a different keyword.`
                                    : "Cron job export files will appear here once generated on the server."}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
