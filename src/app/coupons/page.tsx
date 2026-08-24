"use client";

import { useEffect, useState } from "react";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchCoupons } from "@/src/services/api";

interface Coupon {
  id: number;
  code: string;
  amount: string;
  status: string;
  discount_type: string;
  description: string;
  date_expires: string | null;
  usage_count: number;
  usage_limit: number | null;
  minimum_amount: string;
  maximum_amount: string;
  date_created: string;
}

export default function CouponsPage() {
  const { token, ready } = useAuthGuard();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter fields
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const limit = 20;

  const loadData = async (
    token: string,
    pageNum: number,
    searchVal: string,
    statusVal: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchCoupons(
        token,
        pageNum,
        limit,
        searchVal,
        statusVal
      );
      if (res.success) {
        setCoupons(res.coupons);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.total || 0);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load coupons", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token) return;
    loadData(token, currentPage, searchQuery, selectedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, currentPage, selectedStatus]);

  const triggerApplyFilters = () => {
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, searchQuery, selectedStatus);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, "", "all");
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Helper format discount types
  const formatDiscountType = (type: string) => {
    switch (type) {
      case "percent":
        return "Percentage discount";
      case "fixed_cart":
        return "Fixed cart discount";
      case "fixed_product":
        return "Fixed product discount";
      default:
        return type;
    }
  };

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
            <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-xs font-medium flex items-center gap-2 animate-bounce ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-gray-200 py-3.5 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900 font-sans">Coupons</h2>
              <button className="text-[10px] font-bold text-[#E31E24] hover:bg-red-50 border border-[#E31E24] px-2 py-0.5 rounded transition-colors font-sans">
                Add coupon
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
            {/* Left side: Search Coupon Code */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search coupon code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerApplyFilters()}
                className="w-full sm:w-64 pl-3 pr-3 py-1.5 bg-gray-50 border border-gray-250 rounded text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
              />
              <button
                onClick={triggerApplyFilters}
                className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 px-4 py-1.5 rounded shadow-xs transition-colors font-sans whitespace-nowrap"
              >
                Search
              </button>
            </div>

            {/* Right side: Status Filter */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap font-medium font-sans">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="publish">Publish</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-250 hover:bg-gray-50 px-3 py-1 rounded transition-colors font-sans"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto relative min-h-[300px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading coupons...</span>
                    </div>
                  </div>
                )}
                
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold">Code</th>
                      <th className="py-3.5 px-4 font-bold">Coupon Type</th>
                      <th className="py-3.5 px-4 font-bold">Coupon Amount</th>
                      <th className="py-3.5 px-4 font-bold">Description</th>
                      <th className="py-3.5 px-4 font-bold">Expiry Date</th>
                      <th className="py-3.5 px-4 font-bold">Usage / Limit</th>
                      <th className="py-3.5 px-4 font-bold">Min Spend</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21a.75.75 0 01-1.28.53l-2.22-2.22-2.22 2.22a.75.75 0 01-1.06 0l-2.22-2.22-2.22 2.22a.75.75 0 01-1.28-.53V4.757c0-.52.263-1 .693-1.28A17.756 17.756 0 0112 2.25c2.787 0 5.426.634 7.787 1.777.43.28.693.76.693 1.28z" />
                            </svg>
                            <span className="font-sans font-medium text-gray-500">No coupons found matching the current filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#E31E24] font-sans">
                            {coupon.code}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-sans">
                            {formatDiscountType(coupon.discount_type)}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900 font-sans">
                            {coupon.discount_type === "percent" ? `${parseFloat(coupon.amount)}%` : `₹${parseFloat(coupon.amount).toFixed(2)}`}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-sans max-w-[200px] truncate" title={coupon.description}>
                            {coupon.description}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-sans">
                            {coupon.date_expires ? new Date(coupon.date_expires).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            }) : "Never"}
                          </td>
                          <td className="py-3 px-4 font-sans text-gray-600">
                            {coupon.usage_count} / {coupon.usage_limit || "∞"}
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-semibold font-sans">
                            ₹{parseFloat(coupon.minimum_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-sans border ${
                              coupon.status === "publish" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}>
                              {coupon.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-sans">
                            {new Date(coupon.date_created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="bg-white border-t border-gray-200 py-3.5 px-6 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-500 font-sans font-medium">
              Showing <span className="font-semibold text-gray-900">{coupons.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> coupons
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 border border-gray-250 px-3 py-1.5 rounded shadow-xs transition-colors font-sans"
              >
                Previous
              </button>
              
              <span className="text-xs text-gray-600 font-medium font-sans px-2">
                Page <strong className="text-gray-900 font-bold">{currentPage}</strong> of <strong className="text-gray-900 font-bold">{totalPages}</strong>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 border border-gray-250 px-3 py-1.5 rounded shadow-xs transition-colors font-sans"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
