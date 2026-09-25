"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchWcAbandonedCarts, updateWcAbandonedCartNote } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { hasWcAbandonedCartAccess, getDefaultAllowedRoute } from "@/src/lib/permissions";

interface WcCartItem {
  name: string;
  attribute: string;
  cost: number;
  tax: number;
  quantity: number;
  product_id: number;
  edit_link: string;
}

interface WcAddress {
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

interface WcAbandonedCart {
  id: string;
  email: string;
  customer: string;
  phone: string;
  order_total: number;
  tax_total: number;
  shipping_charges: number;
  billing: WcAddress;
  shipping: WcAddress;
  items: WcCartItem[];
  items_count: number;
  order_id: number | null;
  order_edit_link: string | null;
  abandoned_date: string;
  status: string;
  notes: string;
}

export default function WcAbandonedCartsPage() {
  const router = useRouter();
  const { token, ready, profile } = useAuthGuard();
  const [carts, setCarts] = useState<WcAbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [detailsCart, setDetailsCart] = useState<WcAbandonedCart | null>(null);
  const [showAddressDetails, setShowAddressDetails] = useState(false);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter fields
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("all");

  const limit = 20;

  const loadData = async (
    token: string,
    pageNum: number,
    searchVal: string,
    statusVal: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchWcAbandonedCarts(
        token,
        pageNum,
        limit,
        searchVal,
        statusVal
      );
      if (res.success) {
        setCarts(res.carts);
        setNoteDrafts(
          Object.fromEntries(res.carts.map((cart: WcAbandonedCart) => [cart.id, cart.notes || ""]))
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
    if (!ready || !profile) return;
    if (!hasWcAbandonedCartAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasWcAbandonedCartAccess(profile)) return;
    loadData(token, currentPage, searchQuery, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, profile, currentPage, status]);

  const triggerApplyFilters = () => {
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, searchQuery, status);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatus("all");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, "", "all");
  };

  const handleSaveNote = async (cartId: string) => {
    if (!token) return;
    const draft = noteDrafts[cartId] ?? "";
    try {
      setSavingNoteId(cartId);
      const res = await updateWcAbandonedCartNote(token, cartId, draft);
      if (res.success) {
        setCarts((prev) => prev.map((c) => (c.id === cartId ? { ...c, notes: draft } : c)));
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

  const openDetails = (cart: WcAbandonedCart) => {
    setShowAddressDetails(false);
    setDetailsCart(cart);
  };

  const statusBadgeClasses = (s: string) => {
    switch (s.toLowerCase()) {
      case "recovered":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "ignored":
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-100";
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
              <h2 className="text-base font-bold text-gray-900 font-sans">WooCommerce Abandoned Carts</h2>
              <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 font-sans">
                Abandon Cart Lite
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
            {/* Left side: Search Email/Customer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search by email or customer..."
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
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">All</option>
                  <option value="Abandoned">Abandoned</option>
                  <option value="Recovered">Recovered</option>
                  <option value="Ignored">Ignored</option>
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
                      <th className="py-3.5 px-4 font-bold">Email</th>
                      <th className="py-3.5 px-4 font-bold">Customer</th>
                      <th className="py-3.5 px-4 font-bold">Order Total</th>
                      <th className="py-3.5 px-4 font-bold">Abandoned Date</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {carts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
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
                        <tr key={cart.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-3 px-4 font-mono font-medium">
                            <button
                              onClick={() => openDetails(cart)}
                              className="text-[#E31E24] hover:underline font-semibold"
                            >
                              #{cart.id}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-sans font-semibold">
                            <div>{cart.email}</div>
                            <button
                              onClick={() => openDetails(cart)}
                              className="text-[11px] font-normal text-[#3582c4] opacity-0 group-hover:opacity-100 hover:underline hover:text-[#E31E24] transition-opacity"
                            >
                              View order
                            </button>
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-sans">
                            {cart.customer}
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-sans font-semibold">
                            ₹{Number(cart.order_total || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-sans">
                            {cart.abandoned_date
                              ? new Date(cart.abandoned_date).toLocaleString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans border ${statusBadgeClasses(cart.status)}`}>
                              {cart.status}
                            </span>
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

      {/* View Details Modal */}
      {detailsCart && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900 font-sans">Cart #{detailsCart.id}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-sans border ${statusBadgeClasses(detailsCart.status)}`}>
                  {detailsCart.status}
                </span>
              </div>
              <button
                onClick={() => setDetailsCart(null)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="px-5 pt-4 shrink-0">
              <table className="w-full border-collapse text-xs font-sans border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-800">Email Address</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-800">Customer Details</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-800">Order Total</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-800">Abandoned Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 align-top text-gray-900">
                      {detailsCart.email || "—"}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top text-gray-900">
                      <div>{detailsCart.customer || "—"}</div>
                      {detailsCart.phone && <div>{detailsCart.phone}</div>}
                      {detailsCart.order_id && detailsCart.order_edit_link && (
                        <a
                          href={detailsCart.order_edit_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3582c4] hover:underline block mt-1"
                        >
                          View Order #{detailsCart.order_id}
                        </a>
                      )}

                      <button
                        onClick={() => setShowAddressDetails((v) => !v)}
                        className="text-[#3582c4] hover:underline block mt-1"
                      >
                        {showAddressDetails ? "Hide Details" : "Show Details"}
                      </button>

                      {showAddressDetails && (
                        <div className="mt-2 space-y-2">
                          <div>
                            <span className="font-bold">Shipping Charges:</span> ₹{Number(detailsCart.shipping_charges || 0).toFixed(2)}
                          </div>
                          {(detailsCart.billing?.address_1 || detailsCart.billing?.city) && (
                            <div>
                              <div className="font-bold">Billing Address:</div>
                              {detailsCart.billing?.company && <div>{detailsCart.billing.company}</div>}
                              {detailsCart.billing?.address_1 && <div>{detailsCart.billing.address_1}</div>}
                              {detailsCart.billing?.address_2 && <div>{detailsCart.billing.address_2}</div>}
                              {detailsCart.billing?.city && <div>{detailsCart.billing.city}</div>}
                              {detailsCart.billing?.state && <div>{detailsCart.billing.state}</div>}
                              {detailsCart.billing?.postcode && <div>{detailsCart.billing.postcode}</div>}
                            </div>
                          )}
                          {(detailsCart.shipping?.address_1 || detailsCart.shipping?.city) && (
                            <div>
                              <div className="font-bold">Shipping Address:</div>
                              {detailsCart.shipping?.company && <div>{detailsCart.shipping.company}</div>}
                              {detailsCart.shipping?.address_1 && <div>{detailsCart.shipping.address_1}</div>}
                              {detailsCart.shipping?.address_2 && <div>{detailsCart.shipping.address_2}</div>}
                              {detailsCart.shipping?.city && <div>{detailsCart.shipping.city}</div>}
                              {detailsCart.shipping?.state && <div>{detailsCart.shipping.state}</div>}
                              {detailsCart.shipping?.postcode && <div>{detailsCart.shipping.postcode}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top text-gray-900">
                      <div>₹{Number(detailsCart.order_total || 0).toFixed(2)}</div>
                      <div>Tax: ₹{Number(detailsCart.tax_total || 0).toFixed(2)}</div>
                      <div>{detailsCart.items_count} item{detailsCart.items_count !== 1 ? "s" : ""}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 align-top text-gray-900">
                      {detailsCart.abandoned_date
                        ? new Date(detailsCart.abandoned_date).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-5 font-bold">Item Name</th>
                    <th className="py-2.5 px-5 font-bold">Item Cost</th>
                    <th className="py-2.5 px-5 font-bold">Item Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailsCart.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400 font-sans">
                        No items found for this cart.
                      </td>
                    </tr>
                  ) : (
                    detailsCart.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-5 text-gray-900 font-sans">
                          {item.edit_link ? (
                            <a
                              href={item.edit_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-[#E31E24] hover:underline"
                            >
                              {item.name}
                            </a>
                          ) : (
                            <div className="font-medium">{item.name}</div>
                          )}
                          {item.attribute && (
                            <div className="text-gray-400 text-[11px]">{item.attribute}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-5 text-gray-700 font-sans">
                          <div>₹{Number(item.cost || 0).toFixed(2)}</div>
                          <div className="text-gray-400 text-[11px]">Tax: ₹{Number(item.tax || 0).toFixed(2)}</div>
                        </td>
                        <td className="py-2.5 px-5 text-gray-700 font-sans">{item.quantity} item{item.quantity > 1 ? "s" : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setDetailsCart(null)}
                className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-250 px-4 py-1.5 rounded shadow-xs transition-colors font-sans"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
