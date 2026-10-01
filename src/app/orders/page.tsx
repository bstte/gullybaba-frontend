"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchOrderCategories, fetchOrderMonths, fetchOrders, fetchOrderStatusCounts, updateOrderStatus } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import {
  canViewOrder,
  canViewOrderStatus,
  canViewHandwrittenScanCopy,
  canViewHandwrittenHardCopy,
  canViewSpeedPostFilter,
  canViewAssignmentNotAvailable,
  hasOrdersAccess,
  getDefaultAllowedRoute,
  isAdministrator,
} from "@/src/lib/permissions";

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
  delivered_by?: string;
  updated_by?: string;
  display_name?: string;
  shipping_method?: string;
  shipping_lines?: Array<{
    id?: number;
    method_title?: string;
    method_id?: string;
    total?: string;
  }>;
  is_same_day_delivery?: boolean;
}

export default function OrdersPage() {
  const { token, ready, profile } = useAuthGuard();
  const router = useRouter();
  const canView = canViewOrder(profile);
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearchText, setCategorySearchText] = useState("");
  const [paymentMethodInput, setPaymentMethodInput] = useState("");
  const [appliedPaymentMethod, setAppliedPaymentMethod] = useState("");
  const [demandTypeInput, setDemandTypeInput] = useState("");
  const [appliedDemandType, setAppliedDemandType] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("0");

  // Selected status action per row
  const [rowStatusActions, setRowStatusActions] = useState<Record<number, string>>({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<Record<number, boolean>>({});

  // Order statuses, driven live by the status column in the orders table
  const [statusList, setStatusList] = useState<{ value: string; label: string }[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  const limit = 20;

  // Table horizontal scroll (top synchronized scrollbar)
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(1400);

  useEffect(() => {
    const updateMetrics = () => {
      if (tableContainerRef.current) {
        setTableScrollWidth(tableContainerRef.current.scrollWidth);
      }
    };
    updateMetrics();
    const timer = setTimeout(updateMetrics, 200);
    window.addEventListener("resize", updateMetrics);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && tableContainerRef.current) {
      ro = new ResizeObserver(updateMetrics);
      ro.observe(tableContainerRef.current);
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateMetrics);
      if (ro) ro.disconnect();
    };
  }, [orders]);

  const handleTableScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      const scrollLeft = tableContainerRef.current.scrollLeft;
      if (Math.abs(topScrollRef.current.scrollLeft - scrollLeft) > 1) {
        topScrollRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const handleTopScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      const scrollLeft = topScrollRef.current.scrollLeft;
      if (Math.abs(tableContainerRef.current.scrollLeft - scrollLeft) > 1) {
        tableContainerRef.current.scrollLeft = scrollLeft;
      }
    }
  };

  const loadStatusCounts = async (token: string) => {
    try {
      const res = await fetchOrderStatusCounts(token);
      if (res.success) {
        setStatusList(res.statusList || []);
        setStatusCounts(res.counts || {});
        setTotalOrdersCount(res.total || 0);
      }
    } catch (err: any) {
      // Non-critical for the page to function; tabs simply stay empty on failure.
    }
  };

  const loadData = async (
    token: string,
    pageNum: number,
    statusVal: string,
    searchVal: string,
    startD: string,
    endD: string,
    catQ: string,
    payM: string = appliedPaymentMethod,
    demandVal: string = appliedDemandType,
    silent: boolean = false
  ) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetchOrders(
        token,
        pageNum,
        limit,
        searchVal,
        statusVal,
        startD,
        endD,
        catQ,
        payM,
        demandVal
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
      if (!silent) showNotification(err.message || "Failed to load orders", "error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !profile) return;
    if (!hasOrdersAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasOrdersAccess(profile)) return;
    loadData(token, currentPage, selectedStatus, searchQuery, startDate, endDate, selectedCategories.join(","), appliedPaymentMethod, appliedDemandType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, profile, currentPage, selectedStatus, appliedPaymentMethod, appliedDemandType]);

  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasOrdersAccess(profile)) return;
    loadStatusCounts(token);
    fetchOrderCategories(token).then((res) => {
      if (res.success) setCategoryOptions(res.categories || []);
    }).catch(() => {});
    fetchOrderMonths(token).then((res) => {
      if (res.success) setMonthOptions(res.months || []);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, profile]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Converts a "YYYYMM" month value into its first/last calendar day, for the existing
  // start_date/end_date range filter (no separate backend month param needed).
  const monthToDateRange = (month: string): { start: string; end: string } => {
    if (!month || month === "0") return { start: "", end: "" };
    const year = parseInt(month.slice(0, 4), 10);
    const mon = parseInt(month.slice(4, 6), 10);
    const start = `${year}-${String(mon).padStart(2, "0")}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  };

  const handleApplyMonthFilter = () => {
    const { start, end } = monthToDateRange(selectedMonth);
    setStartDate(start);
    setEndDate(end);
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, selectedStatus, searchQuery, start, end, selectedCategories.join(","), appliedPaymentMethod, appliedDemandType);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const removeCategory = (category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category));
  };

  const filteredCategoryOptions = categoryOptions.filter((c) =>
    c.toLowerCase().includes(categorySearchText.toLowerCase())
  );

  const triggerApplyFilters = () => {
    setAppliedPaymentMethod(paymentMethodInput);
    setAppliedDemandType(demandTypeInput);
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, selectedStatus, searchQuery, startDate, endDate, selectedCategories.join(","), paymentMethodInput, demandTypeInput);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedMonth("0");
    setSelectedCategories([]);
    setCategorySearchText("");
    setPaymentMethodInput("");
    setAppliedPaymentMethod("");
    setDemandTypeInput("");
    setAppliedDemandType("");
    setSearchQuery("");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, selectedStatus, "", "", "", "", "", "");
  };

  const handleStatusChangeSubmit = async (orderId: number) => {
    if (!token) return;

    const newStatus = rowStatusActions[orderId];
    if (!newStatus) return;

    const existingOrder = orders.find((o) => o.id === orderId);
    const prevStatus = existingOrder?.status || "";
    const prevRowAction = rowStatusActions[orderId];

    // If status hasn't changed, no action needed
    if (prevStatus.toLowerCase() === newStatus.toLowerCase()) return;

    const currentUserName =
      `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
      profile?.username ||
      "";

    try {
      setIsUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));

      // 1. Instant Optimistic UI Update: reflect new status and updater immediately
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: newStatus,
              display_name: currentUserName || o.display_name,
              updated_by: currentUserName || o.updated_by,
            };
          }
          return o;
        })
      );

      // 2. Fast API status change call
      const res = await updateOrderStatus(token, orderId, newStatus);
      if (res.success) {
        showNotification(`Order #${orderId} status changed to ${newStatus} successfully!`, "success");

        // 3. Parallel background refresh of tab counts and table data silently (no full-table spinner)
        loadStatusCounts(token);
        loadData(
          token,
          currentPage,
          selectedStatus,
          searchQuery,
          startDate,
          endDate,
          selectedCategories.join(","),
          appliedPaymentMethod,
          appliedDemandType,
          true
        );
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      if (existingOrder) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: prevStatus } : o))
        );
        setRowStatusActions((prev) => ({ ...prev, [orderId]: prevRowAction }));
      }
      showNotification(err.message || `Failed to update status for order #${orderId}`, "error");
    } finally {
      setIsUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Helper status color styling
  const getStatusBadge = (status: string) => {
    const normalized = (status || "").toLowerCase().replace(/^wc-/, "");
    if (normalized === "completed") {
      return {
        cls: "bg-emerald-50 border-emerald-200/80 text-emerald-700",
        dot: "bg-emerald-500",
      };
    }
    if (normalized === "processing") {
      return {
        cls: "bg-blue-50 border-blue-200/80 text-blue-700",
        dot: "bg-blue-500",
      };
    }
    if (normalized === "pending" || normalized === "pending payment") {
      return {
        cls: "bg-amber-50 border-amber-200/80 text-amber-700",
        dot: "bg-amber-500",
      };
    }
    if (normalized === "on-hold" || normalized === "on hold") {
      return {
        cls: "bg-slate-100 border-slate-200 text-slate-700",
        dot: "bg-slate-400",
      };
    }
    if (normalized === "failed" || normalized === "cancelled") {
      return {
        cls: "bg-rose-50 border-rose-200/80 text-rose-700",
        dot: "bg-rose-500",
      };
    }
    if (normalized === "refunded") {
      return {
        cls: "bg-purple-50 border-purple-200/80 text-purple-700",
        dot: "bg-purple-500",
      };
    }
    return {
      cls: "bg-slate-50 border-slate-200 text-slate-700",
      dot: "bg-slate-400",
    };
  };

  // Tabs: "All" plus every status that actually has orders and is permitted (wc-<status> in access_orders), in canonical order
  const permittedTabs = statusList
    .filter((s) => (statusCounts[s.value] || 0) > 0 && canViewOrderStatus(profile, s.value))
    .map((s) => ({ label: s.label, value: s.value, count: statusCounts[s.value] }));

  const permittedTotalCount = isAdministrator(profile)
    ? totalOrdersCount
    : permittedTabs.reduce((acc, tab) => acc + (tab.count || 0), 0);

  const regularStatusTabs = permittedTabs.filter((t) => t.value !== "trash");
  const trashTab = permittedTabs.find((t) => t.value === "trash") || (statusCounts["trash"] > 0 ? { label: "Trash", value: "trash", count: statusCounts["trash"] } : null);

  const specialFilterTabs: { label: string; value: string; count?: number }[] = [
    ...(canViewHandwrittenScanCopy(profile)
      ? [{ label: "Handwritten Scan Copy", value: "handwritten-scan-copy" }]
      : []),
    ...(canViewHandwrittenHardCopy(profile)
      ? [{ label: "Handwritten Hard Copy Via Courier", value: "handwritten-hard-copy-via-courier" }]
      : []),
    ...(canViewAssignmentNotAvailable(profile)
      ? [{ label: "Assignment Not Available", value: "assignment-not-available" }]
      : []),
    ...(canViewSpeedPostFilter(profile)
      ? [{ label: "Speed Post", value: "speed-post" }]
      : []),
  ];

  const statusTabs: { label: string; value: string; count?: number }[] = [
    { label: "All", value: "all", count: permittedTotalCount },
    ...regularStatusTabs,
    ...specialFilterTabs,
    ...(trashTab ? [trashTab] : []),
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50/70 text-slate-900 font-sans overflow-hidden">
      {/* Top Header */}
      <Header />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic page content */}
        <main className="flex-1 flex flex-col bg-slate-50/70 overflow-hidden relative">

          {/* Toast Notification */}
          {notification && (
            <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 animate-bounce backdrop-blur-md ${
              notification.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : "bg-rose-50/95 border-rose-200 text-rose-800"
            }`}>
              <span className={`w-2 h-2 rounded-full ${notification.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-slate-200/80 py-4 px-6 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">Orders Management</h2>
                <p className="text-[11px] text-slate-500 font-medium">Track, manage and process customer orders</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 font-mono">
                Total: <strong className="text-slate-800">{totalOrdersCount.toLocaleString("en-IN")}</strong>
              </span>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            {/* Status Tabs */}
            <div className="bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-6 py-2.5 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max">
                {statusTabs.map((tab) => {
                  const isActive = selectedStatus === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setSelectedStatus(tab.value);
                        setCurrentPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 bg-white border border-slate-200/70"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200/50"
                          }`}
                        >
                          {tab.count.toLocaleString("en-IN")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modern Filters Area */}
            <div className="p-6 pb-2">
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col gap-4">
                {/* Row 1: Search & Month Selector */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left: Month quick filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="appearance-none bg-slate-50 hover:bg-white border border-slate-200/90 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-700 font-sans outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] transition-all cursor-pointer"
                      >
                        <option value="0">All dates</option>
                        {monthOptions.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <svg className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <button
                      onClick={handleApplyMonthFilter}
                      className="text-xs font-semibold text-[#E31E24] bg-red-50 hover:bg-red-100/80 border border-red-200/80 px-3 py-1.5 rounded-lg transition-colors font-sans whitespace-nowrap cursor-pointer"
                    >
                      Apply Month
                    </button>
                  </div>

                  {/* Right: Search Input + Category dropdown + Search CTA */}
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                      <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by order ID, name, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && triggerApplyFilters()}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200/90 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] transition-all font-sans"
                      />
                    </div>
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                      className="bg-slate-50 hover:bg-white border border-slate-200/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] transition-all"
                    >
                      <option value="all">All Fields</option>
                      <option value="id">Order ID</option>
                      <option value="email">Email</option>
                    </select>
                    <button
                      onClick={triggerApplyFilters}
                      className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 px-4 py-1.5 rounded-lg shadow-xs transition-colors font-sans whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Advanced filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                  {/* Date range filter */}
                  <div className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Date Range</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 min-w-0 bg-white border border-slate-200 px-2 py-1 text-xs rounded-md outline-none focus:border-[#E31E24] font-sans"
                      />
                      <span className="text-slate-400 text-xs shrink-0">—</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 min-w-0 bg-white border border-slate-200 px-2 py-1 text-xs rounded-md outline-none focus:border-[#E31E24] font-sans"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={triggerApplyFilters}
                        className="text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-md shadow-2xs font-sans cursor-pointer"
                      >
                        Apply
                      </button>
                      <button
                        onClick={clearFilters}
                        className="text-[11px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 px-3 py-1 rounded-md shadow-2xs font-sans cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Category Filter</span>
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 bg-red-50 text-[#E31E24] border border-red-200 text-[10px] font-sans px-2 py-0.5 rounded-md"
                          >
                            <button
                              type="button"
                              onClick={() => removeCategory(cat)}
                              className="text-red-400 hover:text-red-700 font-bold leading-none cursor-pointer"
                            >
                              ×
                            </button>
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="relative w-full" ref={categoryDropdownRef}>
                        <input
                          type="text"
                          placeholder="Filter by Category"
                          value={categorySearchText}
                          onChange={(e) => setCategorySearchText(e.target.value)}
                          onFocus={() => setIsCategoryDropdownOpen(true)}
                          className="w-full bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-md outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans"
                        />
                        {isCategoryDropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                            {filteredCategoryOptions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-400 font-sans">No categories found.</div>
                            ) : (
                              filteredCategoryOptions.map((cat) => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategory(cat)}
                                    className={`w-full text-left px-3 py-1.5 text-xs font-sans transition-colors flex items-center gap-2 ${
                                      isSelected
                                        ? "bg-red-50 text-[#E31E24] font-semibold"
                                        : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <span className={`w-3 h-3 rounded-sm border shrink-0 ${isSelected ? "bg-[#E31E24] border-[#E31E24]" : "border-slate-300"}`} />
                                    {cat}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={triggerApplyFilters}
                        className="text-[11px] font-semibold text-[#E31E24] bg-white border border-red-200 hover:bg-red-50 px-3 py-1 rounded-md transition-colors font-sans whitespace-nowrap cursor-pointer"
                      >
                        Filter
                      </button>
                    </div>
                  </div>

                  {/* Payment Type Filter */}
                  <div className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Payment Type</span>
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-md outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans"
                    >
                      <option value="">Payment Type (All)</option>
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="prepaid">Prepaid</option>
                    </select>
                    <button
                      onClick={triggerApplyFilters}
                      className="text-[11px] font-semibold text-[#E31E24] bg-white border border-red-200 hover:bg-red-50 px-3 py-1 rounded-md transition-colors font-sans whitespace-nowrap self-start cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>

                  {/* Demand Type Filter */}
                  {(canViewHandwrittenScanCopy(profile) ||
                    canViewHandwrittenHardCopy(profile) ||
                    canViewAssignmentNotAvailable(profile)) && (
                    <div className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Demand Type</span>
                      <select
                        name="demand_type_filter"
                        id="demand_type_filter"
                        value={demandTypeInput}
                        onChange={(e) => setDemandTypeInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-2.5 py-1 text-xs rounded-md outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans"
                      >
                        <option value="">Select Demand Type</option>
                        {canViewHandwrittenScanCopy(profile) && (
                          <option value="Handwritten Scan Copy">Handwritten Scan Copy</option>
                        )}
                        {canViewHandwrittenHardCopy(profile) && (
                          <option value="Handwritten Hard Copy Via Courier">Handwritten Hard Copy Via Courier</option>
                        )}
                        {canViewAssignmentNotAvailable(profile) && (
                          <option value="1">Not Available</option>
                        )}
                      </select>
                      <button
                        onClick={triggerApplyFilters}
                        className="text-[11px] font-semibold text-[#E31E24] bg-white border border-red-200 hover:bg-red-50 px-3 py-1 rounded-md transition-colors font-sans whitespace-nowrap self-start cursor-pointer"
                      >
                        Filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Table Area */}
            <div className="p-6 pt-3 flex-1 flex flex-col">
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
                {/* Synchronized Top Scrollbar Track */}
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="overflow-x-auto overflow-y-hidden w-full bg-white border-b border-slate-200"
                  title="Horizontal Scrollbar"
                >
                  <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
                </div>

                <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative min-h-[320px] flex-1">
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
                      <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <svg className="animate-spin h-4 w-4 text-[#E31E24]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 font-sans">Loading orders...</span>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/95 sticky top-0 z-10 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider backdrop-blur-xs">
                        <th className="py-3 px-4 font-bold min-w-[200px]">Order & Customer</th>
                        <th className="py-3 px-4 font-bold whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 font-bold whitespace-nowrap">Total</th>
                        <th className="py-3 px-4 font-bold min-w-[180px]">Category</th>
                        <th className="py-3 px-4 font-bold min-w-[180px]">Contact</th>
                        <th className="py-3 px-4 font-bold w-[130px] whitespace-nowrap">Status Change</th>
                        <th className="py-3 px-4 font-bold whitespace-nowrap">Delivered By</th>
                        <th className="py-3 px-4 font-bold min-w-[160px]">Updated By</th>
                        <th className="py-3 px-4 font-bold whitespace-nowrap text-right w-[90px] pr-6">Origin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2.5">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                                </svg>
                              </div>
                              <span className="font-sans font-medium text-slate-500 text-xs">No orders found matching the current filters.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => {
                          const isSameDay = Boolean(
                            order.is_same_day_delivery ||
                            /same\s*day/i.test(order.shipping_method || "") ||
                            order.shipping_lines?.some((sl) => /same\s*day/i.test(sl.method_title || sl.method_id || ""))
                          );
                          const badge = getStatusBadge(order.status);

                          return (
                            <tr
                              key={order.id}
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-4 font-sans min-w-[200px]">
                                <div className="flex flex-col items-start gap-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[#E31E24] font-bold group-hover:underline">
                                      #{order.id}
                                    </span>
                                    <span className="text-slate-800 font-semibold">
                                      {order.billing.first_name} {order.billing.last_name}
                                    </span>
                                  </div>
                                  {isSameDay && (
                                    <div className="mt-1">
                                      <span
                                        style={{ animation: "sameDayBlink 1s infinite" }}
                                        className="animate-same-day-blink inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                                      >
                                        <span className="text-amber-500 text-[10px] leading-none">⚡</span>
                                        <span>Same Day Delivery</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex flex-col items-start gap-1">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border font-sans uppercase tracking-wide ${badge.cls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                    <span>{order.status}</span>
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-sans whitespace-nowrap">
                                    {order.date_created ? new Date(order.date_created).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    }) : "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-900 font-bold font-mono text-xs whitespace-nowrap">
                                ₹{parseFloat(order.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-sans min-w-[180px] break-words whitespace-normal leading-snug">
                                {order.categories || "—"}
                              </td>
                              <td className="py-3 px-4 font-sans min-w-[180px]">
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-slate-800 font-mono text-xs font-medium">{order.billing.phone || "—"}</span>
                                  <span className="text-slate-400 text-[11px] lowercase break-all">{order.billing.email || "—"}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 w-[130px]" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-col items-stretch gap-1 w-[120px]">
                                  <select
                                    value={rowStatusActions[order.id] || order.status}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setRowStatusActions(prev => ({ ...prev, [order.id]: val }));
                                    }}
                                    className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] text-slate-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]"
                                  >
                                    {statusList.map((s) => (
                                      <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleStatusChangeSubmit(order.id)}
                                    disabled={isUpdatingStatus[order.id]}
                                    className="w-full text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 py-1 rounded-md transition-colors font-sans whitespace-nowrap shadow-2xs text-center flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    {isUpdatingStatus[order.id] ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Saving...</span>
                                      </>
                                    ) : (
                                      "Change"
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans whitespace-nowrap">
                                {order.delivered_by ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-sans uppercase tracking-wide ${
                                      order.delivered_by === "Shiprocket"
                                        ? "bg-purple-50 text-purple-700 border-purple-200/80"
                                        : order.delivered_by === "TekiPost"
                                        ? "bg-blue-50 text-blue-700 border-blue-200/80"
                                        : order.delivered_by === "DTDC"
                                        ? "bg-red-50 text-red-700 border-red-200/80"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {order.delivered_by}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-sans min-w-[160px]">
                                {order.display_name || order.updated_by ? (
                                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {order.display_name || order.updated_by}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-sans whitespace-nowrap text-right w-[90px] pr-6">{order.origin || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="bg-slate-50/70 border-t border-slate-200/80 py-3.5 px-6 flex items-center justify-between shrink-0">
                  <div className="text-xs text-slate-500 font-sans font-medium">
                    Showing <span className="font-semibold text-slate-900">{orders.length}</span> of <span className="font-semibold text-slate-900">{totalItems.toLocaleString("en-IN")}</span> orders
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <span>‹</span>
                      <span>Previous</span>
                    </button>

                    <span className="text-xs text-slate-600 font-medium font-sans px-2">
                      Page <strong className="text-slate-900 font-bold">{currentPage}</strong> of <strong className="text-slate-900 font-bold">{totalPages}</strong>
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <span>Next</span>
                      <span>›</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
