"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchAbandonedCarts, updateAbandonedCartNote } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";

interface AbandonedCart {
  id: string;
  phone: string;
  notes: string;
  product: string;
  created_at: string;
}

export default function AbandonedCartsPage() {
  const { token, ready } = useAuthGuard();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter fields
  const [searchQuery, setSearchQuery] = useState("");
  const [productType, setProductType] = useState("all");

  const limit = 20;

  const loadData = async (
    token: string,
    pageNum: number,
    searchVal: string,
    prodTypeVal: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchAbandonedCarts(
        token,
        pageNum,
        limit,
        searchVal,
        prodTypeVal
      );
      if (res.success) {
        setCarts(res.carts);
        setNoteDrafts(
          Object.fromEntries(res.carts.map((cart: AbandonedCart) => [cart.id, cart.notes === "—" ? "" : cart.notes]))
        );
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.total || 0);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load abandoned carts", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token) return;
    loadData(token, currentPage, searchQuery, productType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, currentPage, productType]);

  const triggerApplyFilters = () => {
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, searchQuery, productType);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setProductType("all");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, "", "all");
  };

  const handleSaveNote = async (cartId: string) => {
    if (!token) return;
    const draft = noteDrafts[cartId] ?? "";
    try {
      setSavingNoteId(cartId);
      const res = await updateAbandonedCartNote(token, cartId, draft);
      if (res.success) {
        setCarts((prev) => prev.map((c) => (c.id === cartId ? { ...c, notes: draft || "—" } : c)));
        showNotification("Note saved", "success");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to save note", "error");
    } finally {
      setSavingNoteId(null);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
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
            <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-xs font-medium flex items-center gap-2 animate-bounce ${notification.type === "success"
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
              <h2 className="text-base font-bold text-gray-900 font-sans">Abandoned Carts</h2>
              <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 font-sans">
                Live Monitor
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
            {/* Left side: Search Phone/Notes */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search by phone or notes..."
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

            {/* Right side: Product Type Filter */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap font-medium font-sans">Product Type:</span>
                <select
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">All Products</option>
                  <option value="Book">Book</option>
                  <option value="Assignment">Assignment</option>
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
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading carts...</span>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold w-20">ID</th>
                      <th className="py-3.5 px-4 font-bold">Phone</th>
                      <th className="py-3.5 px-4 font-bold">Product</th>
                      <th className="py-3.5 px-4 font-bold">Created At</th>

                      <th className="py-3.5 px-4 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {carts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                            <span className="font-sans font-medium text-gray-500">No abandoned carts found matching the current filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      carts.map((cart) => (
                        <tr key={cart.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-gray-600">
                            #{cart.id}
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-sans font-semibold">
                            {cart.phone}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans border ${cart.product.toLowerCase() === "book"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : "bg-teal-50 text-teal-700 border-teal-100"
                              }`}>
                              {cart.product}
                            </span>
                          </td>
                     
                          <td className="py-3 px-4 text-gray-400 font-sans">
                            {new Date(cart.created_at).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                               <td className="py-3 px-4 text-gray-600 font-sans">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={noteDrafts[cart.id] ?? ""}
                                onChange={(e) =>
                                  setNoteDrafts((prev) => ({ ...prev, [cart.id]: e.target.value }))
                                }
                                placeholder="Add a note..."
                                className="w-40 px-2 py-1 bg-gray-50 border border-gray-250 rounded text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
                              />
                              <button
                                onClick={() => handleSaveNote(cart.id)}
                                disabled={savingNoteId === cart.id}
                                className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 disabled:opacity-50 px-3 py-1 rounded shadow-xs transition-colors font-sans whitespace-nowrap"
                              >
                                {savingNoteId === cart.id ? "Saving..." : "Save"}
                              </button>
                            </div>
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
              Showing <span className="font-semibold text-gray-900">{carts.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> abandoned carts
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
