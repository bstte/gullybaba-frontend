"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchOrders, updateOrderStatus } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";

interface Order {
  id: number;
  order_key: string;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  payment_method: string;
  payment_method_title: string;
  categories: string;
  origin: string;
}

export default function OrdersPage() {
  const { token, ready } = useAuthGuard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter values
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");

  // Selected status action per row
  const [rowStatusActions, setRowStatusActions] = useState<Record<number, string>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<Record<number, boolean>>({});

  const limit = 20;

  const loadData = async (
    token: string,
    pageNum: number,
    statusVal: string,
    searchVal: string,
    startD: string,
    endD: string,
    catQ: string,
    payM: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchOrders(
        token,
        pageNum,
        limit,
        searchVal,
        statusVal,
        startD,
        endD,
        catQ,
        payM
      );
      if (res.success) {
        setOrders(res.orders);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.total || 0);

        // Pre-populate status change actions
        const initialActions: Record<number, string> = {};
        res.orders.forEach((o: Order) => {
          initialActions[o.id] = o.status;
        });
        setRowStatusActions(initialActions);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load orders", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token) return;
    loadData(token, currentPage, selectedStatus, searchQuery, startDate, endDate, categoryQuery, paymentMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, currentPage, selectedStatus, paymentMethod]);

  const triggerApplyFilters = () => {
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, selectedStatus, searchQuery, startDate, endDate, categoryQuery, paymentMethod);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setCategoryQuery("");
    setPaymentMethod("all");
    setSearchQuery("");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, selectedStatus, "", "", "", "", "all");
  };

  const handleStatusChangeSubmit = async (orderId: number) => {
    if (!token) return;

    const newStatus = rowStatusActions[orderId];
    if (!newStatus) return;

    try {
      setIsUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      const res = await updateOrderStatus(token, orderId, newStatus);
      if (res.success) {
        showNotification(`Order #${orderId} status changed to ${newStatus} successfully!`, "success");
        // Reload page data
        await loadData(token, currentPage, selectedStatus, searchQuery, startDate, endDate, categoryQuery, paymentMethod);
      }
    } catch (err: any) {
      showNotification(err.message || `Failed to update status for order #${orderId}`, "error");
    } finally {
      setIsUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Helper status color styling
  const getStatusBadgeClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "completed") {
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
    }
    if (normalized === "processing") {
      return "bg-blue-50 border-blue-200 text-blue-800";
    }
    if (normalized === "pending" || normalized === "pending payment") {
      return "bg-amber-50 border-amber-200 text-amber-800";
    }
    if (normalized === "on-hold" || normalized === "on hold") {
      return "bg-gray-100 border-gray-200 text-gray-800";
    }
    if (normalized === "failed" || normalized === "cancelled") {
      return "bg-red-50 border-red-200 text-red-800";
    }
    return "bg-slate-50 border-slate-200 text-slate-800";
  };

  const statusList = [
    { label: "All", value: "all" },
    { label: "Pending payment", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "On hold", value: "on-hold" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
    { label: "Refunded", value: "refunded" },
    { label: "Failed", value: "failed" }
  ];

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
              <h2 className="text-base font-bold text-gray-900 font-sans">Orders</h2>
              {/* <button className="text-[10px] font-bold text-[#E31E24] hover:bg-red-50 border border-[#E31E24] px-2 py-0.5 rounded transition-colors font-sans">
                Add order
              </button> */}
            </div>
          </div>

          {/* Status Quick Links Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 py-2 shrink-0 flex items-center gap-1.5 text-xs overflow-x-auto whitespace-nowrap">
            {statusList.map((tab, idx) => {
              const isActive = selectedStatus === tab.value;
              return (
                <div key={tab.value} className="flex items-center">
                  <button
                    onClick={() => {
                      setSelectedStatus(tab.value);
                      setCurrentPage(1);
                    }}
                    className={`font-semibold transition-colors font-sans text-xs ${isActive
                      ? "text-[#E31E24] border-b-2 border-b-[#E31E24]"
                      : "text-gray-600 hover:text-[#E31E24]"
                      }`}
                  >
                    {tab.label}
                  </button>
                  {idx < statusList.length - 1 && (
                    <span className="text-gray-300 mx-2">|</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Filters Area */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-4 shrink-0 shadow-xs">
            {/* Row 1: Search & Simple dropdowns */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap font-medium font-sans">Bulk actions:</span>
                <select className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 font-sans">
                  <option>Bulk actions</option>
                  <option>Change status to processing</option>
                  <option>Change status to completed</option>
                </select>
                <button className="text-[10px] font-bold border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded transition-colors font-sans">
                  Apply
                </button>
              </div>

              {/* Top-right Search input */}
              <div className="flex items-center gap-2 w-full md:w-auto max-w-md">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && triggerApplyFilters()}
                  className="w-full md:w-48 pl-3 pr-3 py-1 bg-gray-50 border border-gray-250 rounded text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
                />
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 font-sans"
                >
                  <option value="all">All Fields</option>
                  <option value="id">Order ID</option>
                  <option value="email">Email</option>
                </select>
                <button
                  onClick={triggerApplyFilters}
                  className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 px-3 py-1 rounded shadow-xs transition-colors font-sans whitespace-nowrap"
                >
                  Search orders
                </button>
              </div>
            </div>

            {/* Row 2: Advanced filters (Date range, Code, Category, Payment Type) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Date range filter */}
              <div className="border border-gray-200 rounded p-3 bg-gray-50/50 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">Date Range Filter</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-250 px-2 py-1 text-xs rounded outline-none font-sans font-medium"
                  />
                  <span className="text-gray-400 text-xs">—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-250 px-2 py-1 text-xs rounded outline-none font-sans font-medium"
                  />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={triggerApplyFilters}
                    className="text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded shadow-xs font-sans"
                  >
                    Apply
                  </button>
                  <button
                    onClick={clearFilters}
                    className="text-[10px] font-bold text-gray-600 border border-gray-300 hover:bg-gray-100 px-3 py-1 rounded shadow-xs font-sans"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="border border-gray-200 rounded p-3 bg-gray-50/50 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">Category Filter</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Filter by Category"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && triggerApplyFilters()}
                    className="w-full bg-white border border-gray-250 px-2.5 py-1 text-xs rounded outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans"
                  />
                  <button
                    onClick={triggerApplyFilters}
                    className="text-[10px] font-bold text-[#E31E24] border border-[#E31E24] hover:bg-red-50 px-3 py-1 rounded transition-colors font-sans whitespace-nowrap"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Payment Type Filter */}
              <div className="border border-gray-200 rounded p-3 bg-gray-50/50 flex flex-col gap-2.5 justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">Payment Type Filter</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-gray-250 px-2.5 py-1 text-xs text-gray-700 rounded outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">Payment Type (All)</option>
                  <option value="cod">Cash on delivery (COD)</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="bacs">Direct bank transfer</option>
                </select>
              </div>

            </div>
          </div>

          {/* Main Table Area */}
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
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading orders...</span>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 w-4">
                        <input type="checkbox" className="rounded" />
                      </th>
                      <th className="py-3.5 px-4 font-bold">Order</th>
                      <th className="py-3.5 px-4 font-bold">Date</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Total</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Mobile</th>
                      <th className="py-3.5 px-4 font-bold">Email</th>
                      <th className="py-3.5 px-4 font-bold">Status Change</th>
                      <th className="py-3.5 px-4 font-bold">Origin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                            </svg>
                            <span className="font-sans font-medium text-gray-500">No orders found matching the current filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <input type="checkbox" className="rounded" />
                          </td>
                          <td className="py-3 px-4 font-sans text-[#E31E24] font-bold">
                            #{order.id} {order.billing.first_name} {order.billing.last_name}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-sans">
                            {new Date(order.date_created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border font-sans uppercase tracking-wide ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-bold font-sans">
                            ₹{parseFloat(order.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-sans max-w-[150px] truncate" title={order.categories}>
                            {order.categories}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{order.billing.phone || "—"}</td>
                          <td className="py-3 px-4 text-gray-500 font-sans lowercase">{order.billing.email || "—"}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={rowStatusActions[order.id] || order.status}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRowStatusActions(prev => ({ ...prev, [order.id]: val }));
                                }}
                                className="bg-gray-50 border border-gray-250 rounded px-1 py-0.5 text-[10px] text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="on-hold">On hold</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                                <option value="failed">Failed</option>
                              </select>
                              <button
                                onClick={() => handleStatusChangeSubmit(order.id)}
                                disabled={isUpdatingStatus[order.id]}
                                className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-2 py-0.5 rounded transition-colors font-sans whitespace-nowrap shadow-2xs"
                              >
                                {isUpdatingStatus[order.id] ? "..." : "Change"}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-sans">{order.origin}</td>
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
              Showing <span className="font-semibold text-gray-900">{orders.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> orders
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
