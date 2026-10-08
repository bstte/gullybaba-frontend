"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import {
  fetchExportCategories,
  fetchExportStatesAndCities,
  getExportDownloadUrl,
} from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { hasExportAccess, getDefaultAllowedRoute } from "@/src/lib/permissions";

const EXPORT_TABS = [
  { id: "export-products", label: "Export Products" },
  { id: "export-orders", label: "Export Orders" },
  { id: "export-orders-by-state-and-city", label: "Export Orders by State and City" },
  { id: "export-question-papers", label: "Export Question Papers" },
  { id: "export-posts", label: "Export Posts" },
];

const DEFAULT_CATEGORIES = [
  "All Categories",
  "IGNOU Help Books",
  "IGNOU CBCS Help Books",
  "IGNOU Solved Assignments",
  "IGNOU CBCS Solved Assignments",
  "Projects",
  "IGNOU Customized Projects - Prepared for You",
  "Combo",
];

const STATES_OPTIONS = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "DD", name: "Daman and Diu" },
  { code: "DH", name: "Dādra and Nagar Haveli and Damān and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "DN", name: "Dadra and Nagar Haveli" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "HR", name: "Haryana" },
  { code: "JH", name: "Jharkhand" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MH", name: "Maharashtra" },
  { code: "ML", name: "Meghalaya" },
  { code: "MN", name: "Manipur" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "PY", name: "Pondicherry (Puducherry)" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TS", name: "Telangana" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

const DEFAULT_CITIES = [
  "Agra", "Arwal/Bihar", "BALANGIR", "Bangalore", "Bathinda", "Bhagalpur",
  "Bhubaneswar", "Buxar", "CHENNAI", "Delhi", "Hajipur", "Haldia", "Haldwani",
  "Hojai", "HOSHIARPUR", "IDUKKI", "Indirapuram, Abhay khamd II", "Jaipur",
  "Jamnagar", "Jhajjar", "Karimganj", "Khagaria", "kolkata", "Lucknow", "nellore",
  "New delhi", "Noida", "North goa", "North West Delhi", "Others", "Patna",
  "Ranchi", "Rangareddy district", "Samastipur", "Silvassa", "Sonipat",
  "South Delhi", "Suratgarh", "UDAIPUR"
];

export default function ExportPage() {
  const router = useRouter();
  const { token, ready, profile } = useAuthGuard();
  const [activeTab, setActiveTab] = useState("export-products");

  // Tab 1: Export Products state
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  // Tab 2: Export Orders state
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");

  // Tab 3: Export Orders by State & City state
  const [citiesList, setCitiesList] = useState<string[]>(DEFAULT_CITIES);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [stateCityFromDate, setStateCityFromDate] = useState("");
  const [stateCityToDate, setStateCityToDate] = useState("");

  // Loading & Notifications
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Permission Guard: Agar access_export me custom-product-export nahi hai to redirect
  useEffect(() => {
    if (!ready || !profile) return;
    if (!hasExportAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  // Load Categories & State-City data from API if available
  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasExportAccess(profile)) return;

    fetchExportCategories(token)
      .then((res) => {
        if (res && res.success && Array.isArray(res.categories) && res.categories.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch(() => {
        // Fallback to default categories
      });

    fetchExportStatesAndCities(token)
      .then((res) => {
        if (res && res.success) {
          if (Array.isArray(res.cities) && res.cities.length > 0) {
            const combined = Array.from(new Set([...DEFAULT_CITIES, ...res.cities]));
            setCitiesList(combined);
          }
        }
      })
      .catch(() => {
        // Fallback to default cities
      });
  }, [ready, token]);

  // Handle Export Products submission
  const handleExportProducts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsExporting(true);
    showNotification("Generating Products CSV export...", "success");

    const downloadUrl = getExportDownloadUrl(token, {
      type: "products",
      category: selectedCategory,
    });
    window.open(downloadUrl, "_blank");
    setTimeout(() => setIsExporting(false), 2000);
  };

  // Handle Export Orders submission
  const handleExportOrders = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!orderStartDate || !orderEndDate) {
      showNotification("Please select both start date and end date", "error");
      return;
    }
    setIsExporting(true);
    showNotification("Generating Orders CSV export...", "success");

    const downloadUrl = getExportDownloadUrl(token, {
      type: "orders",
      start_date: orderStartDate,
      end_date: orderEndDate,
    });
    window.open(downloadUrl, "_blank");
    setTimeout(() => setIsExporting(false), 2000);
  };

  // Handle Export Orders by State & City submission
  const handleExportOrdersByStateCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedState && !selectedCity) {
      showNotification("Please select a state or city", "error");
      return;
    }
    setIsExporting(true);
    showNotification("Filtering & generating Orders CSV export...", "success");

    const params: Record<string, string> = {
      type: "orders-by-state-city",
    };
    if (selectedState) params.state = selectedState;
    if (selectedCity) params.city = selectedCity;
    if (stateCityFromDate) params.from_date = stateCityFromDate;
    if (stateCityToDate) params.to_date = stateCityToDate;

    const downloadUrl = getExportDownloadUrl(token, params);
    window.open(downloadUrl, "_blank");
    setTimeout(() => setIsExporting(false), 2000);
  };

  // Handle direct export (Question Papers or Posts)
  const handleDirectExport = (type: "question-papers" | "posts") => {
    if (!token) return;
    setIsExporting(true);
    const label = type === "question-papers" ? "Question Papers" : "Posts";
    showNotification(`Downloading ${label} CSV export...`, "success");

    const downloadUrl = getExportDownloadUrl(token, { type });
    window.open(downloadUrl, "_blank");
    setTimeout(() => setIsExporting(false), 2000);
  };

  if (!ready || (profile && !hasExportAccess(profile))) {
    return (
      <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-gray-500 font-medium">Loading...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 font-sans tracking-tight">
                  Export
                </h1>
                <p className="text-[11px] text-gray-500 font-sans">
                  Export products, orders, question papers, and posts to CSV
                </p>
              </div>
            </div>
          </div>

          {/* Sub-navigation tabs matching WordPress Admin menu */}
          <div className="bg-white border-b border-gray-200 px-6 pt-2 flex items-center gap-1 overflow-x-auto shrink-0">
            {EXPORT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-[#E31E24] text-[#E31E24] bg-red-50/50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6 max-w-4xl">
              {/* TAB 1: EXPORT PRODUCTS */}
              {activeTab === "export-products" && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-150">
                    Export Products
                  </h2>
                  <form onSubmit={handleExportProducts} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Parent Category:
                      </label>
                      <select
                        size={8}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full max-w-lg border border-gray-300 rounded-md p-2 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white shadow-xs"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat} className="py-1 px-2 hover:bg-gray-100 rounded">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>{isExporting ? "Exporting..." : "Export Products to CSV"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: EXPORT ORDERS */}
              {activeTab === "export-orders" && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-150">
                    Export Orders
                  </h2>
                  <form onSubmit={handleExportOrders} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Start Date:
                        </label>
                        <input
                          type="date"
                          value={orderStartDate}
                          onChange={(e) => setOrderStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          End Date:
                        </label>
                        <input
                          type="date"
                          value={orderEndDate}
                          onChange={(e) => setOrderEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span>{isExporting ? "Exporting..." : "Export Orders to CSV"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: EXPORT ORDERS BY STATE AND CITY */}
              {activeTab === "export-orders-by-state-and-city" && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-150">
                    Export Orders by State and City
                  </h2>
                  <form onSubmit={handleExportOrdersByStateCity} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                      <div>
                        <label htmlFor="billing_state" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Select State:
                        </label>
                        <select
                          name="billing_state"
                          id="billing_state"
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white cursor-pointer"
                        >
                          <option value="">Select a state</option>
                          {STATES_OPTIONS.map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="billing_city" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Select City:
                        </label>
                        <select
                          name="billing_city"
                          id="billing_city"
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white cursor-pointer"
                        >
                          <option value="">Select a city</option>
                          {citiesList.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                      <div>
                        <label htmlFor="from_date" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          From Date: <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="date"
                          id="from_date"
                          name="from_date"
                          value={stateCityFromDate}
                          onChange={(e) => setStateCityFromDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="to_date" className="block text-xs font-semibold text-gray-700 mb-1.5">
                          To Date: <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="date"
                          id="to_date"
                          name="to_date"
                          value={stateCityToDate}
                          onChange={(e) => setStateCityToDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isExporting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                        </svg>
                        <span>{isExporting ? "Filtering..." : "Filter Orders"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: EXPORT QUESTION PAPERS */}
              {activeTab === "export-question-papers" && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 pb-2 border-b border-gray-150">
                    Export Question Papers
                  </h2>
                  <p className="text-xs text-gray-500 mb-6">
                    Click the button below to download the latest Question Papers dataset in CSV format.
                  </p>

                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 mb-1">Question Papers Database</h3>
                    <p className="text-[11px] text-gray-500 mb-4">
                      Direct CSV export for all Question Papers
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDirectExport("question-papers")}
                      disabled={isExporting}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>{isExporting ? "Exporting..." : "Download Question Papers CSV"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: EXPORT POSTS */}
              {activeTab === "export-posts" && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 pb-2 border-b border-gray-150">
                    Export Posts
                  </h2>
                  <p className="text-xs text-gray-500 mb-6">
                    Click the button below to download all Posts and Blog entries in CSV format.
                  </p>

                  <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 mb-1">Posts & Blog Database</h3>
                    <p className="text-[11px] text-gray-500 mb-4">
                      Direct CSV export for all published posts
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDirectExport("posts")}
                      disabled={isExporting}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#E31E24] hover:bg-[#c9191e] active:scale-95 text-white text-xs font-semibold rounded-md shadow-xs transition-all cursor-pointer disabled:opacity-60"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>{isExporting ? "Exporting..." : "Download Posts CSV"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
