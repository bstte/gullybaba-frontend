"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { addOrderNote, deleteOrderNote, fetchOrderById, fetchOrderDownloadLogs, fetchOrderDownloads, fetchOrderNotes, fetchOrderStatusCounts, fetchOrderWeight, fetchShiprocketStatus, fetchTekipostStatus, grantOrderDownloadAccess, previewShiprocket, previewTekipost, revokeOrderDownloadAccess, searchDownloadableProducts, sendToDtdc, updateOrderAddress, updateOrderStatus } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { canDeleteOrderNote, canEditOrderStatus, canEditOrderUserDetail, canSendToDtdc, canSendToShiprocket, canSendToTekipost, canViewOrder, canViewOrderNotes, canViewOrderWeight, canViewProfileLink, canViewSpeedPost } from "@/src/lib/permissions";

interface DownloadItem {
  permission_id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  download_id: string;
  download_name: string;
  file_url: string;
  download_count: number;
  downloads_remaining: string | number;
  access_granted: string;
  access_expires: string | null;
  user_email: string;
}

interface DownloadLogItem {
  download_log_id: number;
  timestamp: string;
  permission_id: number;
  product_id: number;
  product_name: string;
  download_id: string;
  download_name: string;
  file_url: string;
  file_label: string;
  order_id: number;
  user_id: number;
  user_display: string;
  user_ip_address: string;
}

function getFileName(url: string): string {
  if (!url) return "";
  try {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch {
    return url;
  }
}

function formatDownloadProductLabel(product: any): string {
  if (!product) return "";
  const idPart = product.product_id ? `#${product.product_id} ` : "";
  const codePart = product.product_code ? `${product.product_code} - ` : "";
  const namePart = product.product_name || "";
  const fileName = product.files?.[0]?.download_name || "";
  const filePart = fileName ? ` (${fileName})` : "";

  return `${idPart}${codePart}${namePart}${filePart}`;
}

interface CalendarPopoverProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

function CalendarPopover({ value, onChange, onClose }: CalendarPopoverProps) {
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  const selectedDateStr = value;
  const isSelected = (day: number) => {
    if (!selectedDateStr) return false;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    return selectedDateStr.startsWith(dStr);
  };

  const selectDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    onChange(dStr);
    onClose();
  };

  const setToday = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(dStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onClose();
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-gray-300 rounded shadow-xl font-sans w-56 text-xs select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-300 px-2 py-1.5 flex items-center justify-between font-bold text-gray-800">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700 text-xs"
          title="Previous Month"
        >
          &#9664;
        </button>
        <span className="text-xs font-bold text-gray-800">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-300 text-gray-700 text-xs"
          title="Next Month"
        >
          &#9654;
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 text-center font-bold text-gray-700 py-1 border-b border-gray-150 text-[11px] bg-gray-50">
        <div>M</div>
        <div>T</div>
        <div>W</div>
        <div>T</div>
        <div>F</div>
        <div>S</div>
        <div>S</div>
      </div>

      {/* Dates grid */}
      <div className="grid grid-cols-7 gap-0.5 p-1 text-center text-xs">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-6" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const currentIsToday = isToday(day);
          const currentIsSelected = isSelected(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => selectDay(day)}
              className={`h-6 w-full flex items-center justify-center rounded text-xs transition-colors ${currentIsSelected
                  ? "bg-[#E31E24] text-white font-bold"
                  : currentIsToday
                    ? "border border-amber-400 bg-amber-50/60 font-bold text-gray-900"
                    : "text-gray-800 hover:bg-gray-100"
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-1.5 flex items-center justify-between bg-gray-50">
        <button
          type="button"
          onClick={setToday}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-xs"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-gray-500 hover:text-red-600 text-[11px] font-medium"
        >
          Never
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-2.5 py-0.5 text-[11px] font-medium text-gray-700 shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface Address {
  first_name: string;
  last_name: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

interface LineItem {
  id: number;
  name: string;
  quantity: number;
  price: string;
  total: string;
  sku: string | null;
  category: string;
  image: string | null;
  medium?: string;
  product_id?: number;
  meta_data?: { id: number; key: string; value: string }[];
}

interface FeeLine {
  id: number;
  name: string;
  total: string;
}

interface ShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
}

interface CouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
}

interface OrderNote {
  id: number;
  content: string;
  date: string;
  author: string;
  is_customer_note: boolean;
  is_system_note: boolean;
}

interface OrderDetail {
  id: number;
  status: string;
  currency_symbol: string;
  date_created: string;
  total: string;
  shipping_total: string;
  discount_total?: string;
  shipping_tax?: string;
  customer_id: number;
  billing: Address;
  shipping: Address;
  payment_method: string;
  payment_method_title: string;
  customer_ip_address: string;
  customer_note: string;
  line_items: LineItem[];
  fee_lines: FeeLine[];
  shipping_lines?: ShippingLine[];
  coupon_lines?: CouponLine[];
  shipping_method?: string;
  is_same_day_delivery?: boolean;
  attribution: {
    origin: string;
    device_type: string;
    session_pages: string;
    referrer: string;
  };
  customer_stats: {
    total_orders: number;
    total_revenue: string;
    average_order_value: string;
  };
  meta_data: { id: number; key: string; value: string }[];
}

export default function OrderDetailPage() {
  const { token, ready, profile } = useAuthGuard();
  const canEditUserDetail = canEditOrderUserDetail(profile);
  const canEditStatus = canEditOrderStatus(profile);
  const canShiprocket = canSendToShiprocket(profile);
  const canTekipost = canSendToTekipost(profile);
  const canDtdc = canSendToDtdc(profile);
  const canSpeedPost = canViewSpeedPost(profile);
  const canWeight = canViewOrderWeight(profile);
  const canNotes = canViewOrderNotes(profile);
  const canDeleteNote = canDeleteOrderNote(profile);
  const canView = canViewOrder(profile);
  const canProfileLink = canViewProfileLink(profile);
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusList, setStatusList] = useState<{ value: string; label: string }[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [billingForm, setBillingForm] = useState<Address | null>(null);
  const [shippingForm, setShippingForm] = useState<Address | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [isLoadingWeight, setIsLoadingWeight] = useState(false);
  const [isSendingTekipost, setIsSendingTekipost] = useState(false);
  const [isSendingShiprocket, setIsSendingShiprocket] = useState(false);
  const [isSendingDtdc, setIsSendingDtdc] = useState(false);
  const [isFetchingTekipostStatus, setIsFetchingTekipostStatus] = useState(false);
  const [isFetchingShiprocketStatus, setIsFetchingShiprocketStatus] = useState(false);
  const [orderAction, setOrderAction] = useState("");
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [isLoadingDownloads, setIsLoadingDownloads] = useState(false);
  const [isDownloadsBoxOpen, setIsDownloadsBoxOpen] = useState(true);
  const [expandedDownloadIds, setExpandedDownloadIds] = useState<Record<number, boolean>>({});
  const [copiedDownloadId, setCopiedDownloadId] = useState<number | null>(null);
  const [accessExpiresMap, setAccessExpiresMap] = useState<Record<number, string>>({});
  const [activeCalendarId, setActiveCalendarId] = useState<number | null>(null);

  // Search & Multi-select State
  const [downloadSearchQuery, setDownloadSearchQuery] = useState("");
  const [isDownloadSearchFocused, setIsDownloadSearchFocused] = useState(false);
  const [isSearchingDownloads, setIsSearchingDownloads] = useState(false);
  const [downloadSearchResults, setDownloadSearchResults] = useState<any[]>([]);
  const [selectedDownloadProducts, setSelectedDownloadProducts] = useState<
    Array<{ product_id: number; product_name: string; display_label: string }>
  >([]);
  const [hoveredSearchResultIndex, setHoveredSearchResultIndex] = useState<number>(-1);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [revokingPermissionId, setRevokingPermissionId] = useState<number | null>(null);
  const [activeReportPermission, setActiveReportPermission] = useState<DownloadItem | null>(null);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadOrder = async (tok: string) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetchOrderById(tok, orderId);
      if (res.success) {
        setOrder(res.order);
        setSelectedStatus(res.order.status);
      }
    } catch (err: any) {
      setLoadError(err.message || "Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async (tok: string) => {
    try {
      setIsLoadingNotes(true);
      const res = await fetchOrderNotes(tok, orderId);
      if (res.success) setNotes(res.notes || []);
    } catch (err: any) {
      console.error("Failed to load order notes:", err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const loadDownloads = async (tok: string) => {
    try {
      setIsLoadingDownloads(true);
      const res = await fetchOrderDownloads(tok, orderId);
      if (res.success && Array.isArray(res.downloads)) {
        setDownloads(res.downloads);
        const initialExpanded: Record<number, boolean> = {};
        const initialDates: Record<number, string> = {};
        res.downloads.forEach((d: DownloadItem) => {
          initialExpanded[d.permission_id] = false;
          initialDates[d.permission_id] = d.access_expires ? d.access_expires.slice(0, 10) : "";
        });
        setExpandedDownloadIds(initialExpanded);
        setAccessExpiresMap(initialDates);
      } else {
        setDownloads([]);
      }
    } catch (err: any) {
      console.error("Failed to load order downloads:", err);
    } finally {
      setIsLoadingDownloads(false);
    }
  };

  const handleCopyLink = async (download: DownloadItem) => {
    try {
      await navigator.clipboard.writeText(download.file_url);
      setCopiedDownloadId(download.permission_id);
      setTimeout(() => setCopiedDownloadId(null), 2000);
    } catch (err) {
      console.error("Failed to copy download link:", err);
    }
  };

  const toggleDownloadItem = (permissionId: number) => {
    setExpandedDownloadIds((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
  };

  // Debounced search for downloadable products
  useEffect(() => {
    const q = downloadSearchQuery.trim();
    if (!token || q.length < 3) {
      setDownloadSearchResults([]);
      setIsSearchingDownloads(false);
      return;
    }

    setIsSearchingDownloads(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchDownloadableProducts(token, q);
        if (res && Array.isArray(res.products)) {
          setDownloadSearchResults(res.products);
        } else {
          setDownloadSearchResults([]);
        }
      } catch (err) {
        console.error("Error searching downloadable products:", err);
        setDownloadSearchResults([]);
      } finally {
        setIsSearchingDownloads(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [downloadSearchQuery, token]);

  // Click outside to close search dropdown & calendar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsDownloadSearchFocused(false);
      }
      if (!target.closest(".calendar-popover-container")) {
        setActiveCalendarId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProduct = (product: any) => {
    const display_label = formatDownloadProductLabel(product);

    if (!selectedDownloadProducts.some((p) => p.product_id === product.product_id)) {
      setSelectedDownloadProducts((prev) => [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          display_label,
        },
      ]);
    }
    setDownloadSearchQuery("");
    setDownloadSearchResults([]);
    setIsDownloadSearchFocused(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveSelectedProduct = (productId: number) => {
    setSelectedDownloadProducts((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const handleGrantAccess = async () => {
    if (!token || !order) return;
    if (selectedDownloadProducts.length === 0) {
      showNotification("Please select at least one downloadable product to grant access.", "error");
      return;
    }

    try {
      setIsGrantingAccess(true);
      const productIds = selectedDownloadProducts.map((p) => p.product_id);
      const res = await grantOrderDownloadAccess(token, order.id, { product_ids: productIds });

      if (res.success) {
        showNotification("Download access granted successfully.", "success");
        setSelectedDownloadProducts([]);
        setDownloadSearchQuery("");
        setDownloadSearchResults([]);
        setIsDownloadSearchFocused(false);
        await loadDownloads(token);
      } else {
        showNotification(res.message || "Failed to grant download access.", "error");
      }
    } catch (err: any) {
      console.error("Error granting download access:", err);
      showNotification(err.message || "Failed to grant download access.", "error");
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRevokeAccess = async (permissionId: number, downloadName: string) => {
    if (!token || !order) return;
    if (!window.confirm(`Are you sure you want to revoke download access for "${downloadName}"?`)) {
      return;
    }

    try {
      setRevokingPermissionId(permissionId);
      const res = await revokeOrderDownloadAccess(token, order.id, { permission_id: permissionId });
      if (res.success) {
        showNotification("Download access revoked successfully.", "success");
        setDownloads((prev) => prev.filter((d) => d.permission_id !== permissionId));
        await loadDownloads(token);
      } else {
        showNotification(res.message || "Failed to revoke download access.", "error");
      }
    } catch (err: any) {
      console.error("Error revoking download access:", err);
      showNotification(err.message || "Failed to revoke download access.", "error");
    } finally {
      setRevokingPermissionId(null);
    }
  };

  const handleOpenReport = async (item: DownloadItem) => {
    if (!token || !order) return;
    setActiveReportPermission(item);
    setIsLoadingLogs(true);
    setLogsError(null);
    setDownloadLogs([]);
    try {
      const res = await fetchOrderDownloadLogs(token, order.id, item.permission_id);
      if (res.success && Array.isArray(res.logs)) {
        setDownloadLogs(res.logs);
      } else {
        setDownloadLogs([]);
        if (res.message) setLogsError(res.message);
      }
    } catch (err: any) {
      console.error("Failed to load download logs:", err);
      setLogsError(err.message || "Failed to load download logs.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleAddNote = async () => {
    if (!token || !order || !newNoteContent.trim()) return;
    try {
      setIsAddingNote(true);
      const res = await addOrderNote(token, order.id, newNoteContent.trim(), newNoteType);
      if (res.success) {
        setNotes((prev) => [res.note, ...prev]);
        setNewNoteContent("");
        setNewNoteType("");
        showNotification("Order note added and synced successfully.", "success");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to add order note", "error");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!token || !order) return;
    try {
      setDeletingNoteId(noteId);
      const res = await deleteOrderNote(token, order.id, noteId);
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showNotification("Order note deleted successfully.", "success");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to delete order note", "error");
    } finally {
      setDeletingNoteId(null);
    }
  };

  // canView check commented out so user can open order details
  // useEffect(() => {
  //   if (ready && profile && !canView) {
  //     router.push("/orders");
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [ready, profile, canView]);

  useEffect(() => {
    if (!ready || !token || !orderId) return;
    loadOrder(token);
    loadNotes(token);
    loadDownloads(token);
    fetchOrderStatusCounts(token).then((res) => {
      if (res.success) setStatusList(res.statusList || []);
    }).catch(() => { });

    setIsLoadingWeight(true);
    fetchOrderWeight(token, orderId).then((res) => {
      if (res.success) {
        setWeight(String(res.total_weight));
        if (res.warnings?.length) console.warn(`[tekipost] weight warnings for order #${orderId}:`, res.warnings);
      }
    }).catch((err) => console.error("Failed to compute order weight:", err))
      .finally(() => setIsLoadingWeight(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, orderId]);

  const handleSendToTekipost = async () => {
    if (!token || !order) return;
    if (!weight || Number(weight) <= 0) {
      showNotification("Enter a valid weight before sending to TekiPost.", "error");
      return;
    }
    try {
      setIsSendingTekipost(true);
      const res = await previewTekipost(token, order.id, Number(weight));
      console.log(`[tekipost] payload for order #${order.id}:`, res.payload);
      console.log(`[tekipost] submission response for order #${order.id}:`, res.submission);
      if (res.warnings?.length) console.warn(`[tekipost] preview warnings for order #${order.id}:`, res.warnings);
      showNotification(res.message || `Order #${order.id} sent to TekiPost successfully.`, "success");
      await loadOrder(token);
    } catch (err: any) {
      showNotification(err.message || "Failed to build TekiPost preview", "error");
    } finally {
      setIsSendingTekipost(false);
    }
  };

  const handleSendToShiprocket = async () => {
    if (!token || !order) return;
    if (!weight || Number(weight) <= 0) {
      showNotification("Enter a valid weight before sending to Shiprocket.", "error");
      return;
    }
    try {
      setIsSendingShiprocket(true);
      const res = await previewShiprocket(token, order.id, Number(weight));
      console.log(`[shiprocket] payload for order #${order.id}:`, res.payload);
      console.log(`[shiprocket] submission response for order #${order.id}:`, res.submission);
      if (res.warnings?.length) console.warn(`[shiprocket] preview warnings for order #${order.id}:`, res.warnings);
      showNotification(res.message || `Order #${order.id} sent to Shiprocket successfully.`, "success");
      await loadOrder(token);
    } catch (err: any) {
      showNotification(err.message || "Failed to build Shiprocket preview", "error");
    } finally {
      setIsSendingShiprocket(false);
    }
  };

  const handleSendToDtdc = async () => {
    if (!token || !order) return;
    if (!weight || Number(weight) <= 0) {
      showNotification("Enter a valid weight before sending to DTDC.", "error");
      return;
    }
    const alreadySent = !!order.meta_data?.find((m) => m.key === "_dtdc_reference_number")?.value || order.meta_data?.find((m) => m.key === "dtdc_status")?.value === "Sent";
    if (alreadySent) {
      showNotification("This order has already been sent to DTDC.", "error");
      return;
    }
    try {
      setIsSendingDtdc(true);
      const res = await sendToDtdc(token, order.id, Number(weight));
      console.log(`[dtdc] submission response for order #${order.id}:`, res);
      if (res.warnings?.length) console.warn(`[dtdc] warnings for order #${order.id}:`, res.warnings);
      showNotification(res.message || `Order #${order.id} sent to DTDC successfully.`, "success");
      await loadOrder(token);
    } catch (err: any) {
      showNotification(err.message || "Failed to send order to DTDC", "error");
    } finally {
      setIsSendingDtdc(false);
    }
  };

  const handleFetchTekipostStatus = async () => {
    if (!token || !order) return;
    try {
      setIsFetchingTekipostStatus(true);
      const res = await fetchTekipostStatus(token, order.id);
      console.log(`[tekipost-status] response for order #${order.id}:`, res);
      showNotification(res.message || "TekiPost status fetched.", "success");
    } catch (err: any) {
      showNotification(err.message || "Failed to fetch TekiPost status", "error");
    } finally {
      setIsFetchingTekipostStatus(false);
    }
  };

  const handleFetchShiprocketStatus = async () => {
    if (!token || !order) return;
    try {
      setIsFetchingShiprocketStatus(true);
      const res = await fetchShiprocketStatus(token, order.id);
      console.log(`[shiprocket-status] response for order #${order.id}:`, res);
      showNotification(res.message || "Shiprocket status fetched.", "success");
    } catch (err: any) {
      showNotification(err.message || "Failed to fetch Shiprocket status", "error");
    } finally {
      setIsFetchingShiprocketStatus(false);
    }
  };

  // Single Update button for the order: saves the status change (if any) together with any
  // billing/shipping edits currently open, then re-fetches the order so the page reflects
  // exactly what's now saved on WordPress/WooCommerce.
  const handleUpdate = async () => {
    if (!token || !order) return;

    const addressPayload: { billing?: Address; shipping?: Address } = {};
    if (isEditingBilling && billingForm) addressPayload.billing = billingForm;
    if (isEditingShipping && shippingForm) addressPayload.shipping = shippingForm;

    const statusChanged = !!selectedStatus && selectedStatus !== order.status;
    const hasAddressChanges = !!(addressPayload.billing || addressPayload.shipping);

    if (!statusChanged && !hasAddressChanges) {
      showNotification("No changes to update.", "error");
      return;
    }

    try {
      setIsSaving(true);
      if (statusChanged) {
        await updateOrderStatus(token, order.id, selectedStatus);
      }
      if (hasAddressChanges) {
        await updateOrderAddress(token, order.id, addressPayload);
      }
      showNotification(`Order #${order.id} updated successfully.`, "success");
      setIsEditingBilling(false);
      setIsEditingShipping(false);
      await loadOrder(token);
    } catch (err: any) {
      showNotification(err.message || "Failed to update order", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const renderAddress = (addr: Address, withEmail: boolean) => {
    const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
    return (
      <div className="text-xs text-gray-700 font-sans leading-relaxed space-y-0.5">
        {name && <div className="font-semibold text-gray-900">{name}</div>}
        {addr.company && <div>{addr.company}</div>}
        {addr.address_1 && <div>{addr.address_1}</div>}
        {addr.address_2 && <div>{addr.address_2}</div>}
        {(addr.city || addr.state || addr.postcode) && (
          <div>{[addr.city, addr.state, addr.postcode].filter(Boolean).join(", ")}</div>
        )}
        {addr.country && <div>{addr.country}</div>}
        {withEmail && addr.email && (
          <div className="pt-1">
            <span className="text-gray-500">Email: </span>
            <a href={`mailto:${addr.email}`} className="text-[#E31E24] hover:underline">{addr.email}</a>
          </div>
        )}
        {addr.phone && (
          <div>
            <span className="text-gray-500">Phone: </span>
            <a href={`tel:${addr.phone}`} className="text-[#E31E24] hover:underline">{addr.phone}</a>
          </div>
        )}
      </div>
    );
  };

  const PencilIcon = () => (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M14.69 2.86a1.5 1.5 0 0 1 2.12 0l.33.33a1.5 1.5 0 0 1 0 2.12L7.5 14.95l-3.2.71.71-3.2 9.68-9.6ZM3.5 16.5h13v1.25h-13V16.5Z" />
    </svg>
  );

  const inputClass = "w-full bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]";
  const fieldLabel = "text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1";

  const renderAddressForm = (form: Address, setForm: (a: Address) => void, withPayment: boolean) => (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className={fieldLabel}>First name</div>
          <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </div>
        <div>
          <div className={fieldLabel}>Last name</div>
          <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div>
        <div className={fieldLabel}>Company</div>
        <input className={inputClass} value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className={fieldLabel}>Address line 1</div>
          <input className={inputClass} value={form.address_1 || ""} onChange={(e) => setForm({ ...form, address_1: e.target.value })} />
        </div>
        <div>
          <div className={fieldLabel}>Address line 2</div>
          <input className={inputClass} value={form.address_2 || ""} onChange={(e) => setForm({ ...form, address_2: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className={fieldLabel}>City</div>
          <input className={inputClass} value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <div className={fieldLabel}>Postcode / ZIP</div>
          <input className={inputClass} value={form.postcode || ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className={fieldLabel}>Country / Region</div>
          <input className={inputClass} value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div>
          <div className={fieldLabel}>State / County</div>
          <input className={inputClass} value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
      </div>
      {withPayment && (
        <div>
          <div className={fieldLabel}>Email address</div>
          <input className={inputClass} value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      )}
      <div>
        <div className={fieldLabel}>Phone</div>
        <input className={inputClass} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      {withPayment && order && (
        <div>
          <div className={fieldLabel}>Payment method</div>
          <div className={inputClass}>{order.payment_method_title || order.payment_method || "—"}</div>
        </div>
      )}
    </div>
  );

  const itemsSubtotal = order?.line_items.reduce((sum, li) => sum + parseFloat(li.total || "0"), 0) ?? 0;
  const feesTotal = order?.fee_lines.reduce((sum, f) => sum + parseFloat(f.total || "0"), 0) ?? 0;
  const shippingTotal = order?.shipping_lines && order.shipping_lines.length > 0
    ? order.shipping_lines.reduce((sum, s) => sum + parseFloat(s.total || "0"), 0)
    : parseFloat(order?.shipping_total || "0");
  const discountTotal = order?.coupon_lines && order.coupon_lines.length > 0
    ? order.coupon_lines.reduce((sum, c) => sum + parseFloat(c.discount || "0"), 0)
    : parseFloat(order?.discount_total || "0");

  const getOrderMeta = (key: string) => order?.meta_data.find((m) => m.key === key)?.value || "";
  const shiprocketStatus = getOrderMeta("shiprocket_status") === "Sent" ? "Sent" : "Not Sent";
  const tekipostStatus = getOrderMeta("tekipost_status") === "Sent" ? "Sent" : "Not Sent";
  const dtdcReference = getOrderMeta("_dtdc_reference_number");
  const isDtdcSent = !!dtdcReference || getOrderMeta("dtdc_status") === "Sent";
  const dtdcStatus = dtdcReference || (isDtdcSent ? "Sent" : "Not Sent");

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
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
              <button
                onClick={() => router.push("/orders")}
                className="text-xs font-semibold text-gray-500 hover:text-[#E31E24] font-sans"
              >
                ← Orders
              </button>
              <h2 className="text-base font-bold text-gray-900 font-sans">Edit order</h2>

            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-xs font-semibold text-gray-500 font-sans">
                Loading order...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-sans rounded p-4">
                {loadError}
              </div>
            )}

            {!isLoading && !loadError && order && (
              <div className="mx-auto space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 font-sans">Order #{order.id} details</h3>
                    {Boolean(
                      order.is_same_day_delivery ||
                      /same\s*day/i.test(order.shipping_method || "") ||
                      order.shipping_lines?.some((s) => /same\s*day/i.test(s.method_title || s.method_id || ""))
                    ) && (
                        <span
                          style={{ animation: "sameDayBlink 1s infinite" }}
                          className="animate-same-day-blink inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-sans bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm"
                        >
                          <span className="text-amber-500 text-[11px] leading-none">⚡</span>
                          <span>Same Day Delivery</span>
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 font-sans mt-1">
                    Payment via {order.payment_method_title || order.payment_method || "—"}.
                    {order.customer_ip_address && ` Customer IP: ${order.customer_ip_address}`}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  {/* Left column */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Order details: General / Billing / Shipping */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr_1fr] divide-y md:divide-y-0 md:divide-x divide-gray-100">
                        {/* General */}
                        <div className="p-4 space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">General</h4>

                          <div>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1">Date created:</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-50 border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans">
                                {new Date(order.date_created).toLocaleDateString("en-CA")}
                              </div>
                              <span className="text-[10px] text-gray-400 font-sans">@</span>
                              <div className="w-14 bg-gray-50 border border-gray-250 rounded px-2 py-1.5 text-xs text-gray-700 font-sans text-center">
                                {new Date(order.date_created).toLocaleTimeString(undefined, { hour: "2-digit", hour12: false })}
                              </div>
                              <span className="text-[10px] text-gray-400 font-sans">:</span>
                              <div className="w-14 bg-gray-50 border border-gray-250 rounded px-2 py-1.5 text-xs text-gray-700 font-sans text-center">
                                {new Date(order.date_created).toLocaleTimeString(undefined, { minute: "2-digit" }).replace(/.*:/, "")}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1">Status:</div>
                            {canEditStatus ? (
                              <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]"
                              >
                                {statusList.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="w-full bg-gray-50 border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans">
                                {statusList.find((s) => s.value === order.status)?.label || order.status}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase font-sans">Customer:</span>
                              <span className="text-[10px] font-sans space-x-2">
                                {canProfileLink && (
                                  <a href={`/users/${order.customer_id}`} className="text-[#E31E24] hover:underline">Profile →</a>
                                )}
                                <a href={`/orders?customer=${order.customer_id}`} className="text-[#E31E24] hover:underline">View other orders →</a>
                              </span>
                            </div>
                            <div className="w-full bg-gray-50 border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans">
                              {order.billing.first_name} {order.billing.last_name} (#{order.customer_id}{order.billing.email ? ` – ${order.billing.email}` : ""})
                            </div>
                          </div>

                          {canWeight && (
                            <div>
                              <div className="text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1">Weight (kg) :</div>
                              <input
                                type="text"
                                value={isLoadingWeight ? "Calculating…" : weight}
                                disabled={isLoadingWeight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] disabled:bg-gray-50 disabled:text-gray-400"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            {canShiprocket && (
                              <button
                                onClick={handleSendToShiprocket}
                                disabled={isSendingShiprocket || isLoadingWeight}
                                className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-3 py-1.5 rounded transition-colors font-sans"
                              >
                                {isSendingShiprocket ? "Building…" : "Send to Shiprocket"}
                              </button>
                            )}
                            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded border font-sans ${shiprocketStatus === "Sent" ? "text-emerald-700 border-emerald-600" : "text-[#E31E24] border-[#E31E24]"}`}>
                              Status: {shiprocketStatus}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-gray-100 space-y-1.5">
                            <div className="text-xs font-sans"><span className="text-gray-500">Shiprocket AWB Code:</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Pickup Date:</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Current Status:</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Courier Name:</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Estimated Delivery Date:</span></div>
                            <div className="text-xs font-sans">
                              <span className="text-gray-500">Shipment Tracking URL: </span>
                              <a href="https://www.shiprocket.in/shipment-tracking/" target="_blank" rel="noopener noreferrer" className="text-[#E31E24] hover:underline">https://www.shiprocket.in/shipment-tracking/</a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={handleFetchShiprocketStatus}
                              disabled={isFetchingShiprocketStatus}
                              className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-3 py-1.5 rounded transition-colors font-sans"
                            >
                              {isFetchingShiprocketStatus ? "Checking…" : "Click to Get Current Status of Shiprocket Details"}
                            </button>
                            <a
                              href={`https://wa.me/91${(order.billing.phone || "").replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded font-sans"
                            >
                              Whatsapp to User
                            </a>
                          </div>

                          {canSpeedPost && (
                            <div className="mt-1 bg-gray-50 border border-gray-200 rounded p-3 space-y-2">
                              <div className="text-xs font-bold text-gray-600 font-sans">Speed Post Details</div>
                              <div>
                                <div className="text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1">Speed Post:</div>
                                <select disabled className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-400 font-sans cursor-not-allowed">
                                  <option>No</option>
                                </select>
                              </div>
                              <div className="text-xs font-sans">
                                <span className="text-gray-500">Speed Post Tracking URL: </span>
                                <a href="https://www.17track.net/en/" target="_blank" rel="noopener noreferrer" className="text-[#E31E24] hover:underline">https://www.17track.net/en/</a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Billing */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Billing</h4>
                            {canEditUserDetail && (
                              <button
                                onClick={() => {
                                  if (!isEditingBilling) setBillingForm({ ...order.billing });
                                  setIsEditingBilling(!isEditingBilling);
                                }}
                                className="text-gray-400 hover:text-[#E31E24]"
                                title="Edit billing address"
                              >
                                <PencilIcon />
                              </button>
                            )}
                          </div>

                          {isEditingBilling && billingForm ? (
                            renderAddressForm(billingForm, setBillingForm, true)
                          ) : (
                            renderAddress(order.billing, true)
                          )}

                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-2">
                              {canTekipost && (
                                <button
                                  onClick={handleSendToTekipost}
                                  disabled={isSendingTekipost || isLoadingWeight}
                                  className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-3 py-1.5 rounded transition-colors font-sans"
                                >
                                  {isSendingTekipost ? "Building…" : "Send to Tekipost"}
                                </button>
                              )}
                              <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded border font-sans ${tekipostStatus === "Sent" ? "text-emerald-700 border-emerald-600" : "text-[#E31E24] border-[#E31E24]"}`}>
                                Status: {tekipostStatus}
                              </span>
                            </div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Tracking No. :</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Courier Name:</span></div>
                            <div className="text-xs font-sans"><span className="text-gray-500">Status:</span></div>
                            <div className="text-xs font-sans">
                              <span className="text-gray-500">Tracking URL: </span>
                              <a href="https://app.tekipost.com/track-order" target="_blank" rel="noopener noreferrer" className="text-[#E31E24] hover:underline">https://app.tekipost.com/track-order</a>
                            </div>
                            <button
                              onClick={handleFetchTekipostStatus}
                              disabled={isFetchingTekipostStatus}
                              className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-3 py-1.5 rounded transition-colors font-sans"
                            >
                              {isFetchingTekipostStatus ? "Checking…" : "Click to Get Current Status of tekipost Details"}
                            </button>
                          </div>
                        </div>

                        {/* Shipping */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Shipping</h4>
                            {canEditUserDetail && (
                              <button
                                onClick={() => {
                                  if (!isEditingShipping) setShippingForm({ ...order.shipping });
                                  setIsEditingShipping(!isEditingShipping);
                                }}
                                className="text-gray-400 hover:text-[#E31E24]"
                                title="Edit shipping address"
                              >
                                <PencilIcon />
                              </button>
                            )}
                          </div>

                          {isEditingShipping && shippingForm ? (
                            renderAddressForm(shippingForm, setShippingForm, false)
                          ) : (
                            renderAddress(order.shipping, false)
                          )}

                          {/* Shipping Method Details */}
                          {order.shipping_lines && order.shipping_lines.length > 0 && (
                            <div className="pt-2.5 border-t border-gray-100 space-y-1.5">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase font-sans">Shipping Method</div>
                              {order.shipping_lines.map((s) => (
                                <div key={s.id} className="text-xs font-sans text-gray-800 flex items-center justify-between bg-gray-50 rounded px-2.5 py-1.5 border border-gray-100">
                                  <div className="flex items-center gap-1.5">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-500 shrink-0">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625h-9.75A1.125 1.125 0 002.25 3.75v10.5" />
                                    </svg>
                                    <span className="font-medium text-gray-900">{s.method_title || "Shipping"}</span>
                                  </div>
                                  {/* <span className="font-semibold text-gray-700">{order.currency_symbol}{parseFloat(s.total || "0").toFixed(2)}</span> */}
                                </div>
                              ))}
                            </div>
                          )}

                          {order.customer_note && (
                            <div className="pt-3 border-t border-gray-100 text-xs font-sans">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Customer provided note</div>
                              <div className="text-gray-700">{order.customer_note}</div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-2">
                              {canDtdc && (
                                <button
                                  onClick={handleSendToDtdc}
                                  disabled={isSendingDtdc || isLoadingWeight || isDtdcSent}
                                  className="text-[10px] font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-gray-300 px-3 py-1.5 rounded transition-colors font-sans"
                                >
                                  {isSendingDtdc ? "Sending…" : "Send to DTDC"}
                                </button>
                              )}
                              <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded border font-sans ${isDtdcSent ? "text-emerald-700 border-emerald-600" : "text-[#E31E24] border-[#E31E24]"}`}>
                                Status: {dtdcStatus}
                              </span>
                            </div>
                            {dtdcReference && (
                              <div className="text-xs font-sans">
                                <span className="text-gray-500">DTDC Ref No.: </span>
                                <span className="font-semibold text-gray-800">{dtdcReference}</span>
                              </div>
                            )}
                            {/* <div className="text-xs font-sans">
                              <span className="text-gray-500">DTDC Tracking URL: </span>
                              <a
                                href={dtdcReference ? `https://track.dtdc.com/ctbs-tracking/customerInterface.tr?submitName=showTrackingDetail&consignmentNo=${dtdcReference}` : "https://track.dtdc.com/"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#E31E24] hover:underline"
                              >
                                https://track.dtdc.com/
                              </a>
                            </div> */}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Line items */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-bold">Item</th>
                              <th className="py-2.5 px-4 font-bold">Category</th>
                              <th className="py-2.5 px-4 font-bold">Code</th>
                              <th className="py-2.5 px-4 font-bold text-right">Price</th>
                              <th className="py-2.5 px-4 font-bold text-right">Qty</th>
                              <th className="py-2.5 px-4 font-bold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.line_items.map((li) => {
                              const medium = li.medium || (() => {
                                const m = li.meta_data?.find((x) => ["Medium", "medium", "pa_languages", "Language"].includes(x.key));
                                if (!m?.value) return "";
                                const s = String(m.value).trim().toLowerCase();
                                if (s === "hindi-medium" || s === "hindi medium" || s === "hindi") return "Hindi";
                                if (s === "english-medium" || s === "english medium" || s === "english") return "English";
                                if (s === "sanskrit-medium" || s === "sanskrit medium" || s === "sanskrit") return "Sanskrit";
                                if (s === "urdu-medium" || s === "urdu medium" || s === "urdu") return "Urdu";
                                return m.value.replace(/-medium$/i, "").replace(/^./, (c) => c.toUpperCase());
                              })();

                              return (
                                <tr key={li.id}>
                                  <td className="py-3 px-4 font-sans text-gray-900 font-medium">
                                    <div className="flex items-start gap-3">
                                      <img
                                        src={li.image || "/logo.svg"}
                                        alt={li.name}
                                        className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0 mt-0.5"
                                        onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }}
                                      />
                                      <div className="flex flex-col gap-1 pb-2">
                                        <span className="text-[#0073aa] hover:underline font-medium leading-snug cursor-pointer">{li.name}</span>
                                        {medium && (
                                          <div className="text-[11px] text-gray-600 font-normal">
                                            <span className="font-bold text-gray-700">Medium:</span> {medium}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-sans text-gray-600 align-top pt-3">{li.category || "—"}</td>
                                  <td className="py-3 px-4 font-sans text-gray-600 align-top pt-3">{li.sku || "—"}</td>
                                  <td className="py-3 px-4 font-sans text-gray-700 text-right align-top pt-3">{order.currency_symbol}{parseFloat(li.price).toFixed(2)}</td>
                                  <td className="py-3 px-4 font-sans text-gray-700 text-right align-top pt-3">× {li.quantity}</td>
                                  <td className="py-3 px-4 font-sans text-gray-900 font-semibold text-right align-top pt-3">{order.currency_symbol}{parseFloat(li.total).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                            {/* Fee lines */}
                            {order.fee_lines.map((f) => (
                              <tr key={f.id} className="bg-gray-50/40">
                                <td className="py-2.5 px-4 font-sans text-gray-700" colSpan={5}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">Fee</span>
                                    <span>{f.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-sans text-gray-700 text-right font-medium">{order.currency_symbol}{parseFloat(f.total).toFixed(2)}</td>
                              </tr>
                            ))}

                            {/* Shipping lines */}
                            {order.shipping_lines?.map((s) => (
                              <tr key={s.id} className="bg-gray-50/40">
                                <td className="py-2.5 px-4 font-sans text-gray-700" colSpan={5}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">Shipping</span>
                                    <span>{s.method_title || "Shipping"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-sans text-gray-700 text-right font-medium">{order.currency_symbol}{parseFloat(s.total || "0").toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-500 font-sans">Items subtotal</td>
                              <td className="py-2 px-4 text-right text-gray-700 font-sans">{order.currency_symbol}{itemsSubtotal.toFixed(2)}</td>
                            </tr>
                            {/* {order.fee_lines.length > 0 && (
                              <tr>
                                <td colSpan={5} className="py-2 px-4 text-right text-gray-500 font-sans">Fees</td>
                                <td className="py-2 px-4 text-right text-gray-700 font-sans">{order.currency_symbol}{feesTotal.toFixed(2)}</td>
                              </tr>
                            )} */}
                            {discountTotal > 0 && (
                              <tr>
                                <td colSpan={5} className="py-2 px-4 text-right text-emerald-600 font-sans">
                                  Discount {order.coupon_lines && order.coupon_lines.length > 0 ? `(${order.coupon_lines.map((c) => c.code).join(", ")})` : ""}
                                </td>
                                <td className="py-2 px-4 text-right text-emerald-600 font-sans">-{order.currency_symbol}{discountTotal.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr>
                              <td colSpan={5} className="py-2.5 px-4 text-right text-gray-900 font-bold font-sans">Order Total</td>
                              <td className="py-2.5 px-4 text-right text-gray-900 font-bold font-sans">{order.currency_symbol}{parseFloat(order.total).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Downloadable product permissions */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-150 bg-gray-50/50 rounded-t-lg">
                        <h4 className="text-xs font-bold text-gray-700 font-sans">Downloadable product permissions</h4>
                        <div className="flex items-center gap-2 text-gray-400">
                          <button
                            type="button"
                            title="Downloadable product permissions allow customers to download digital products purchased in this order."
                            className="w-4 h-4 flex items-center justify-center rounded-full text-[11px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                          >
                            ?
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDownloadsBoxOpen(!isDownloadsBoxOpen)}
                            className="p-0.5 hover:text-gray-600 transition-colors"
                            title={isDownloadsBoxOpen ? "Collapse" : "Expand"}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${isDownloadsBoxOpen ? "" : "rotate-180"}`}>
                              <path d="M10 6l-5 5h10l-5-5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDownloadsBoxOpen(!isDownloadsBoxOpen)}
                            className="p-0.5 hover:text-gray-600 transition-colors"
                            title={isDownloadsBoxOpen ? "Collapse" : "Expand"}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${isDownloadsBoxOpen ? "" : "rotate-180"}`}>
                              <path d="M10 14l5-5H5l5 5z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {isDownloadsBoxOpen && (
                        <div className="p-4 space-y-3 font-sans">
                          {isLoadingDownloads ? (
                            <div className="text-xs text-gray-400 py-3">Loading downloadable permissions…</div>
                          ) : downloads.length === 0 ? (
                            <div className="text-xs text-gray-500 py-2 italic">
                              No downloadable product permissions for this order yet.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {downloads.map((item) => {
                                const isExpanded = Boolean(expandedDownloadIds[item.permission_id]);
                                const fileName = getFileName(item.file_url) || item.download_name;
                                return (
                                  <div
                                    key={item.permission_id}
                                    className="border border-gray-200 rounded bg-white shadow-xs overflow-visible relative"
                                  >
                                    {/* Permission Item Header */}
                                    <div className="bg-gray-50/75 border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-2 rounded-t">
                                      <div
                                        className="text-xs font-bold text-gray-800 font-sans truncate select-none cursor-pointer flex-1"
                                        onClick={() => toggleDownloadItem(item.permission_id)}
                                        title={`#${item.product_id} — ${item.product_name} — ${item.download_name}: ${fileName} — Downloaded ${item.download_count} ${item.download_count === 1 ? "time" : "times"}`}
                                      >
                                        #{item.product_id} — {item.product_name} — {item.download_name}: {fileName} — Downloaded {item.download_count} {item.download_count === 1 ? "time" : "times"}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => toggleDownloadItem(item.permission_id)}
                                          className="text-gray-400 hover:text-gray-600 p-0.5 text-[10px]"
                                          title={isExpanded ? "Collapse item" : "Expand item"}
                                        >
                                          {isExpanded ? "▲" : "▼"}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={revokingPermissionId === item.permission_id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRevokeAccess(item.permission_id, item.download_name || item.product_name);
                                          }}
                                          className={`text-[11px] font-semibold px-3 py-1 rounded transition-colors font-sans flex items-center gap-1 ${revokingPermissionId === item.permission_id
                                              ? "text-gray-400 border border-gray-250 bg-gray-50 cursor-not-allowed"
                                              : "text-[#E31E24] border border-[#E31E24] bg-white hover:bg-red-50 cursor-pointer"
                                            }`}
                                        >
                                          {revokingPermissionId === item.permission_id ? (
                                            <>
                                              <svg className="animate-spin h-3 w-3 text-[#E31E24]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                              </svg>
                                              <span>Revoking...</span>
                                            </>
                                          ) : (
                                            "Revoke access"
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Permission Item Body (when expanded) */}
                                    {isExpanded && (
                                      <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                        <div>
                                          <label className="block text-xs text-gray-600 font-sans mb-1 font-normal">
                                            Downloads remaining
                                          </label>
                                          <input
                                            type="text"
                                            defaultValue={item.downloads_remaining ?? ""}
                                            className="w-full sm:w-28 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-sans outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24]"
                                          />
                                        </div>

                                        <div className="relative z-30 calendar-popover-container">
                                          <label className="block text-xs text-gray-600 font-sans mb-1 font-normal">
                                            Access expires
                                          </label>
                                          <input
                                            type="text"
                                            readOnly
                                            value={accessExpiresMap[item.permission_id] || ""}
                                            placeholder="Never"
                                            onClick={() => setActiveCalendarId(activeCalendarId === item.permission_id ? null : item.permission_id)}
                                            className="w-full sm:w-36 bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-500 font-sans outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] cursor-pointer"
                                          />
                                          {activeCalendarId === item.permission_id && (
                                            <CalendarPopover
                                              value={accessExpiresMap[item.permission_id] || ""}
                                              onChange={(newDate) => {
                                                setAccessExpiresMap((prev) => ({
                                                  ...prev,
                                                  [item.permission_id]: newDate,
                                                }));
                                              }}
                                              onClose={() => setActiveCalendarId(null)}
                                            />
                                          )}
                                        </div>

                                        <div>
                                          <label className="block text-xs text-gray-600 font-sans mb-1 font-normal">
                                            Customer download link
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyLink(item)}
                                            className="text-xs font-semibold text-[#E31E24] border border-[#E31E24] bg-white hover:bg-red-50 px-3.5 py-1.5 rounded transition-colors font-sans"
                                          >
                                            {copiedDownloadId === item.permission_id ? "Copied!" : "Copy link"}
                                          </button>
                                        </div>

                                        <div>
                                          <label className="block text-xs text-gray-600 font-sans mb-1 font-normal">
                                            Customer download log
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenReport(item)}
                                            className="inline-block text-xs font-semibold text-[#E31E24] border border-[#E31E24] bg-white hover:bg-red-50 px-3.5 py-1.5 rounded transition-colors font-sans cursor-pointer"
                                          >
                                            View report
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Search and Grant access row */}
                          <div className="pt-2 border-t border-gray-100 flex items-start gap-2">
                            <div ref={searchContainerRef} className="relative z-30 flex-1 max-w-lg">
                              {/* Multi-select box (tags + input) */}
                              <div
                                onClick={() => searchInputRef.current?.focus()}
                                className="min-h-[36px] p-1.5 flex flex-wrap items-center gap-1.5 border border-gray-300 rounded bg-white cursor-text focus-within:border-[#E31E24] focus-within:ring-1 focus-within:ring-[#E31E24]"
                              >
                                {selectedDownloadProducts.map((p) => (
                                  <span
                                    key={p.product_id}
                                    className="inline-flex items-center gap-1.5 bg-[#f0f0f1] border border-gray-300 text-gray-800 text-xs px-2.5 py-1 rounded font-sans max-w-full"
                                    title={p.display_label}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveSelectedProduct(p.product_id);
                                      }}
                                      className="text-gray-500 hover:text-red-600 font-bold text-sm leading-none"
                                    >
                                      ×
                                    </button>
                                    <span className="truncate max-w-[340px] font-medium">{p.display_label}</span>
                                  </span>
                                ))}
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  value={downloadSearchQuery}
                                  onChange={(e) => setDownloadSearchQuery(e.target.value)}
                                  onFocus={() => setIsDownloadSearchFocused(true)}
                                  placeholder={selectedDownloadProducts.length === 0 ? "Search for a downloadable product..." : ""}
                                  className="flex-1 min-w-[140px] bg-transparent text-xs text-gray-800 placeholder-gray-400 font-sans outline-none px-1 py-0.5"
                                />
                              </div>

                              {/* Dropdown Popover (opens upward above input) */}
                              {isDownloadSearchFocused && (
                                downloadSearchQuery.trim().length < 3 ? (
                                  <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-gray-300 rounded-md shadow-xl z-50 p-3 text-xs text-gray-600 font-sans">
                                    Please enter 3 or more characters
                                  </div>
                                ) : (
                                  <div className="absolute left-0 bottom-full mb-2 w-full sm:min-w-[620px] max-w-3xl max-h-72 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-2xl z-50 font-sans divide-y divide-gray-150">
                                    {isSearchingDownloads ? (
                                      <div className="p-3.5 text-xs text-gray-500 font-sans flex items-center gap-2">
                                        <svg className="animate-spin h-3.5 w-3.5 text-[#E31E24]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                        <span>Searching downloadable products…</span>
                                      </div>
                                    ) : downloadSearchResults.length === 0 ? (
                                      <div className="p-3.5 text-xs text-gray-500 font-sans">No downloadable products found.</div>
                                    ) : (
                                      downloadSearchResults.map((product, idx) => {
                                        const displayLabel = formatDownloadProductLabel(product);
                                        const isHovered = hoveredSearchResultIndex === idx;

                                        return (
                                          <div
                                            key={`${product.product_id}-${idx}`}
                                            onMouseEnter={() => setHoveredSearchResultIndex(idx)}
                                            onClick={() => handleSelectProduct(product)}
                                            className={`px-3.5 py-2.5 text-xs cursor-pointer select-none font-sans transition-colors leading-snug ${isHovered
                                                ? "bg-[#e31e24] text-white"
                                                : "text-gray-800 hover:bg-gray-50"
                                              }`}
                                          >
                                            <div className="font-medium text-xs break-words">
                                              {displayLabel}
                                            </div>
                                            {product.product_categories && (
                                              <div className={`text-[11px] mt-0.5 truncate ${isHovered ? "text-red-100" : "text-gray-400"}`}>
                                                Categories: {product.product_categories}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isGrantingAccess || selectedDownloadProducts.length === 0}
                              onClick={handleGrantAccess}
                              className={`text-xs font-semibold px-3.5 py-2 rounded transition-colors font-sans shrink-0 h-[36px] flex items-center gap-1.5 ${selectedDownloadProducts.length === 0 || isGrantingAccess
                                  ? "text-gray-400 border border-gray-250 bg-gray-50 cursor-not-allowed"
                                  : "text-[#E31E24] border border-[#E31E24] bg-white hover:bg-red-50 cursor-pointer"
                                }`}
                            >
                              {isGrantingAccess && (
                                <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-[#E31E24]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                              )}
                              {isGrantingAccess ? "Granting..." : "Grant access"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Order actions */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 font-sans">Order actions</h4>
                        <div className="flex items-center gap-1 text-gray-400">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10 6l-5 5h10l-5-5z" /></svg>
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10 14l5-5H5l5 5z" /></svg>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={orderAction}
                            onChange={(e) => setOrderAction(e.target.value)}
                            className="flex-1 bg-white border border-gray-250 rounded px-2.5 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]"
                          >
                            <option value="">Choose an action...</option>
                            <option value="send_order_details">Send order details to customer</option>
                            <option value="resend_order_notification">Resend new order notification</option>
                            <option value="regenerate_download_permissions">Regenerate download permissions</option>
                          </select>
                          <button
                            type="button"
                            disabled
                            title="Not available yet"
                            className="shrink-0 w-8 h-8 flex items-center justify-center border border-gray-250 rounded text-gray-300 cursor-not-allowed"
                          >
                            →
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            disabled
                            title="Not available yet"
                            className="text-[11px] font-semibold text-gray-300 font-sans cursor-not-allowed"
                          >
                            Move to Trash
                          </button>
                          <button
                            onClick={handleUpdate}
                            disabled={isSaving}
                            className="text-xs font-bold text-white bg-[#2271b1] hover:bg-[#135e96] disabled:bg-gray-300 px-4 py-2 rounded transition-colors font-sans"
                          >
                            {isSaving ? "Updating…" : "Update"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Customer history</h4>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Total orders</span>
                        <span className="font-semibold text-gray-900">{order.customer_stats.total_orders}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Total revenue</span>
                        <span className="font-semibold text-gray-900">{order.currency_symbol}{parseFloat(order.customer_stats.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Average order value</span>
                        <span className="font-semibold text-gray-900">{order.currency_symbol}{parseFloat(order.customer_stats.average_order_value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>



                    {canNotes && (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Order notes</h4>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase font-sans mb-1 block">Add note</label>
                          <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Add note"
                            className="w-full bg-white border border-gray-250 rounded px-2 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] resize-none"
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={newNoteType}
                            onChange={(e) => setNewNoteType(e.target.value)}
                            className="flex-1 bg-white border border-gray-250 rounded px-2 py-1.5 text-xs text-gray-700 font-sans outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24]"
                          >
                            <option value="">Private note</option>
                            <option value="customer">Note to customer</option>
                          </select>
                          <button
                            onClick={handleAddNote}
                            disabled={isAddingNote || !newNoteContent.trim()}
                            className="text-[10px] font-bold text-[#E31E24] border border-[#E31E24] hover:bg-red-50 disabled:text-gray-300 disabled:border-gray-200 disabled:hover:bg-transparent px-3 py-1.5 rounded transition-colors font-sans shrink-0"
                          >
                            {isAddingNote ? "Adding…" : "Add"}
                          </button>
                        </div>

                        <div className="pt-2 border-t border-gray-100 space-y-2 max-h-96 overflow-y-auto">
                          {isLoadingNotes ? (
                            <div className="text-xs text-gray-400 font-sans">Loading notes…</div>
                          ) : notes.length === 0 ? (
                            <div className="text-xs text-gray-400 font-sans">No order notes available yet.</div>
                          ) : (
                            notes.map((note) => (
                              <div
                                key={note.id}
                                className={`rounded px-3 py-2 text-xs font-sans ${note.is_customer_note
                                  ? "bg-blue-50 border border-blue-100"
                                  : note.is_system_note
                                    ? "bg-purple-50 border border-purple-100"
                                    : "bg-gray-50 border border-gray-150"
                                  }`}
                              >
                                <div className="text-gray-800 whitespace-pre-wrap">{note.content}</div>
                                <div className="mt-1.5 text-[10px] text-gray-500">
                                  {new Date(note.date).toLocaleString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                  {canDeleteNote && (
                                    <>
                                      {" — "}
                                      <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        disabled={deletingNoteId === note.id}
                                        className="text-[#E31E24] hover:underline font-semibold disabled:text-gray-300"
                                      >
                                        {deletingNoteId === note.id ? "Deleting…" : "Delete note"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Order attribution</h4>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Origin</span>
                        <span className="font-medium text-gray-900">{order.attribution.origin || "—"}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Device type</span>
                        <span className="font-medium text-gray-900">{order.attribution.device_type || "—"}</span>
                      </div>
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-gray-500">Session page views</span>
                        <span className="font-medium text-gray-900">{order.attribution.session_pages || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Download Log Report Modal */}
            {activeReportPermission && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden font-sans">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                        Reports &gt; Orders &gt; Customer downloads
                      </div>
                      <h3 className="text-base font-bold text-gray-800">
                        Customer downloads
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#E31E24] border border-red-200 px-2.5 py-0.5 rounded text-xs font-medium">
                          <span>Active filters: Permission ID {activeReportPermission.permission_id}</span>
                          <button
                            type="button"
                            onClick={() => setActiveReportPermission(null)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs leading-none"
                            title="Clear filter"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReportPermission(null)}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-200 transition-colors text-lg leading-none cursor-pointer"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 overflow-y-auto flex-1 bg-white">
                    {isLoadingLogs ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-500 text-xs">
                        <svg className="animate-spin h-6 w-6 text-[#E31E24]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Loading customer download logs…</span>
                      </div>
                    ) : logsError ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs space-y-2">
                        <div className="font-semibold">Notice:</div>
                        <div>{logsError}</div>
                        <div className="text-[11px] text-amber-700">
                          If you have not added the WordPress REST API code yet, please paste the provided snippet into your WordPress plugin to enable live logs.
                        </div>
                      </div>
                    ) : downloadLogs.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 text-xs italic">
                        No download activity recorded yet for Permission #{activeReportPermission.permission_id}.
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                              <th className="p-3">Timestamp</th>
                              <th className="p-3">Product</th>
                              <th className="p-3">File</th>
                              <th className="p-3">Order</th>
                              <th className="p-3">User</th>
                              <th className="p-3">IP address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-150 bg-white">
                            {downloadLogs.map((log) => (
                              <tr key={log.download_log_id} className="hover:bg-gray-50/75 transition-colors">
                                <td className="p-3 text-gray-700 whitespace-nowrap font-mono text-[11px]">
                                  {log.timestamp}
                                </td>
                                <td className="p-3 text-gray-800 font-medium">
                                  {log.product_name || "—"}
                                </td>
                                <td className="p-3 text-gray-600 max-w-xs break-all">
                                  {log.file_label || log.download_name || "—"}
                                </td>
                                <td className="p-3 whitespace-nowrap font-medium text-[#E31E24]">
                                  #{log.order_id}
                                </td>
                                <td className="p-3 text-gray-800">
                                  {log.user_display || "Guest"}
                                </td>
                                <td className="p-3 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                                  {log.user_ip_address || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 text-gray-600 font-semibold border-t border-gray-200 text-[11px]">
                              <th className="p-2.5">Timestamp</th>
                              <th className="p-2.5">Product</th>
                              <th className="p-2.5">File</th>
                              <th className="p-2.5">Order</th>
                              <th className="p-2.5">User</th>
                              <th className="p-2.5 text-right font-normal text-gray-700">
                                {downloadLogs.length} {downloadLogs.length === 1 ? "item" : "items"}
                              </th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {downloadLogs.length > 0 && `${downloadLogs.length} download records found`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveReportPermission(null)}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-350 rounded px-4 py-1.5 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
