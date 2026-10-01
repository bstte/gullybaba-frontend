"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { addOrderNote, deleteOrderNote, fetchOrderById, fetchOrderDownloadLogs, fetchOrderDownloads, fetchOrderNotes, fetchOrderStatusCounts, fetchOrderWeight, fetchShiprocketStatus, fetchTekipostStatus, grantOrderDownloadAccess, previewShiprocket, previewTekipost, refundOrder, revokeOrderDownloadAccess, searchDownloadableProducts, sendToDtdc, updateOrder, updateOrderAddress, updateOrderStatus } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { canDeleteOrderNote, canEditOrderStatus, canEditOrderUserDetail, canRefundOrder, canSendToDtdc, canSendToShiprocket, canSendToTekipost, canViewDownloadableProduct, canViewOrder, canViewOrderNotes, canViewOrderWeight, canViewProfileLink, canViewSpeedPost } from "@/src/lib/permissions";

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

function formatNoteDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timePart = d
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
    return `${datePart} at ${timePart}`;
  } catch {
    return dateStr;
  }
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
  code?: string;
  category: string;
  image: string | null;
  medium?: string;
  language?: string;
  variation_id?: number;
  session?: string;
  type?: string;
  demand?: string;
  enrollment_no?: string;
  payment_type?: string;
  product_id?: number;
  meta_data?: { id: number; key: string; value: string }[];
}

function formatMetaValue(val: string): string {
  if (!val) return "";
  const s = String(val).trim();
  if (s === "type-assignment") return "Type Assignment";
  if (s === "handwritten-hardcopy") return "Handwritten Hard Copy";
  if (s === "handwritten-softcopy") return "Handwritten Soft Copy";
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(s)) {
    return s
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  payment_type?: string;
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
  refunds?: Array<{ id: number; total: number; date_created?: string }>;
  updated_by?: string;
  display_name?: string;
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
  const canDownloadableProduct = canViewDownloadableProduct(profile);
  const canRefund = canRefundOrder(profile);
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
  const [speedPost, setSpeedPost] = useState<string>("no");
  const [initialSpeedPost, setInitialSpeedPost] = useState<string>("no");
  const [speedTrackingId, setSpeedTrackingId] = useState<string>("");
  const [initialSpeedTrackingId, setInitialSpeedTrackingId] = useState<string>("");
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
  const [isFulfillmentBoxOpen, setIsFulfillmentBoxOpen] = useState(true);
  const [activeFulfillmentTab, setActiveFulfillmentTab] = useState<"shiprocket" | "tekipost" | "dtdc" | "speedpost">("shiprocket");
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

  // Refund State
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [refundQty, setRefundQty] = useState<Record<number, number>>({});
  const [refundItemTotal, setRefundItemTotal] = useState<Record<number, number>>({});
  const [restockRefundedItems, setRestockRefundedItems] = useState(true);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

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
        const spMeta = res.order.meta_data?.find((m: any) => m.key === "_speed_post")?.value;
        const spTrack = res.order.meta_data?.find((m: any) => m.key === "_speed_tracking_id")?.value;
        const curSp = spMeta && String(spMeta).toLowerCase() === "yes" ? "yes" : "no";
        const curTrack = spTrack ? String(spTrack) : "";
        setSpeedPost(curSp);
        setInitialSpeedPost(curSp);
        setSpeedTrackingId(curTrack);
        setInitialSpeedTrackingId(curTrack);
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
    if (canDownloadableProduct) {
      loadDownloads(token);
    }
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
    if (tekipostStatus === "Sent") {
      showNotification("This order has already been sent to TekiPost.", "error");
      return;
    }
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
      // Immediately reflect sent status in UI
      setOrder((prev) => {
        if (!prev) return prev;
        const meta = prev.meta_data.filter((m) => m.key !== "tekipost_status");
        meta.push({ id: 0, key: "tekipost_status", value: "Sent" });
        return { ...prev, status: "completed", delivered_by: "TekiPost", meta_data: meta };
      });
      setSelectedStatus("completed");
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
    if (shiprocketStatus === "Sent") {
      showNotification("This order has already been sent to Shiprocket.", "error");
      return;
    }
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
      // Immediately reflect sent status in UI
      setOrder((prev) => {
        if (!prev) return prev;
        const meta = prev.meta_data.filter((m) => m.key !== "shiprocket_status");
        meta.push({ id: 0, key: "shiprocket_status", value: "Sent" });
        return { ...prev, status: "completed", delivered_by: "Shiprocket", meta_data: meta };
      });
      setSelectedStatus("completed");
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
      const returnedRef = res.reference_number || "";
      // Immediately reflect sent status and reference number in UI
      setOrder((prev) => {
        if (!prev) return prev;
        const meta = prev.meta_data.filter((m) => m.key !== "_dtdc_reference_number" && m.key !== "dtdc_status");
        meta.push({ id: 0, key: "dtdc_status", value: "Sent" });
        if (returnedRef) {
          meta.push({ id: 0, key: "_dtdc_reference_number", value: returnedRef });
        }
        return { ...prev, status: "completed", delivered_by: "DTDC", meta_data: meta };
      });
      setSelectedStatus("completed");
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
  // billing/shipping edits and Speed Post changes, then re-fetches the order so the page reflects
  // exactly what's now saved on WordPress/WooCommerce.
  const handleUpdate = async () => {
    if (!token || !order) return;

    const addressPayload: { billing?: Address; shipping?: Address } = {};
    if (isEditingBilling && billingForm) addressPayload.billing = billingForm;
    if (isEditingShipping && shippingForm) addressPayload.shipping = shippingForm;

    const statusChanged = !!selectedStatus && selectedStatus !== order.status;
    const hasAddressChanges = !!(addressPayload.billing || addressPayload.shipping);
    const speedPostChanged = speedPost !== initialSpeedPost || speedTrackingId !== initialSpeedTrackingId;

    if (!statusChanged && !hasAddressChanges && !speedPostChanged) {
      showNotification("No changes to update.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const updatePayload: any = {};
      if (statusChanged) updatePayload.status = selectedStatus;
      if (addressPayload.billing) updatePayload.billing = addressPayload.billing;
      if (addressPayload.shipping) updatePayload.shipping = addressPayload.shipping;
      if (speedPostChanged || speedPost === "yes" || speedTrackingId) {
        updatePayload.meta_data = [
          { key: "_speed_post", value: speedPost },
          { key: "_speed_tracking_id", value: speedTrackingId },
        ];
        updatePayload._speed_post = speedPost;
        updatePayload._speed_tracking_id = speedTrackingId;
      }

      await updateOrder(token, order.id, updatePayload);
      showNotification(`Order #${order.id} updated successfully.`, "success");
      setIsEditingBilling(false);
      setIsEditingShipping(false);
      setInitialSpeedPost(speedPost);
      setInitialSpeedTrackingId(speedTrackingId);
      await loadOrder(token);
    } catch (err: any) {
      showNotification(err.message || "Failed to update order", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleItemRefundQtyChange = (itemId: number, qtyStr: string, itemTotal: number, itemQty: number) => {
    const qty = parseInt(qtyStr, 10);
    const clampedQty = isNaN(qty) ? 0 : Math.max(0, Math.min(qty, itemQty));
    const unitPrice = itemQty > 0 ? itemTotal / itemQty : 0;
    const calculatedTotal = Number((clampedQty * unitPrice).toFixed(2));

    const updatedQty = { ...refundQty, [itemId]: clampedQty };
    const updatedTotals = { ...refundItemTotal, [itemId]: calculatedTotal };

    setRefundQty(updatedQty);
    setRefundItemTotal(updatedTotals);

    const sum = Object.values(updatedTotals).reduce((a, b) => a + (Number(b) || 0), 0);
    setRefundAmount(sum > 0 ? sum.toFixed(2) : "");
  };

  const handleItemRefundTotalChange = (itemId: number, totalStr: string, maxTotal: number) => {
    const total = parseFloat(totalStr);
    const clampedTotal = isNaN(total) ? 0 : Math.max(0, Math.min(total, maxTotal));
    const updatedTotals = { ...refundItemTotal, [itemId]: clampedTotal };
    setRefundItemTotal(updatedTotals);

    const sum = Object.values(updatedTotals).reduce((a, b) => a + (Number(b) || 0), 0);
    setRefundAmount(sum > 0 ? sum.toFixed(2) : "");
  };

  const handleManualRefund = async () => {
    if (!token || !order || !canRefund) return;
    const amt = refundAmount.trim() !== "" ? parseFloat(refundAmount) : totalAvailableToRefund;

    if (isNaN(amt) || amt <= 0) {
      showNotification("Please enter a valid refund amount.", "error");
      return;
    }

    if (amt > totalAvailableToRefund) {
      showNotification(`Refund amount cannot exceed available refund (${order.currency_symbol}${totalAvailableToRefund.toFixed(2)})`, "error");
      return;
    }

    const itemsPayload = Object.entries(refundQty)
      .filter(([_, q]) => q > 0)
      .map(([itemId, qty]) => ({
        id: Number(itemId),
        qty,
        total: refundItemTotal[Number(itemId)] || 0,
      }));

    try {
      setIsProcessingRefund(true);
      const res = await refundOrder(token, order.id, {
        amount: amt,
        reason: refundReason.trim(),
        restock: restockRefundedItems,
        items: itemsPayload,
      });

      if (res.success) {
        showNotification(res.message || "Refund processed successfully!", "success");
        setIsRefundMode(false);
        setRefundQty({});
        setRefundItemTotal({});
        setRefundAmount("");
        setRefundReason("");
        await loadOrder(token);
      } else {
        showNotification(res.message || "Failed to process refund", "error");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to process refund", "error");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const renderAddress = (addr: Address, withEmail: boolean) => {
    const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
    return (
      <div className="text-xs text-gray-700 font-sans leading-relaxed space-y-0.5 break-words">
        {name && <div className="font-semibold text-gray-900 break-words">{name}</div>}
        {addr.company && <div className="break-words">{addr.company}</div>}
        {addr.address_1 && <div className="break-words">{addr.address_1}</div>}
        {addr.address_2 && <div className="break-words">{addr.address_2}</div>}
        {(addr.city || addr.state || addr.postcode) && (
          <div className="break-words">{[addr.city, addr.state, addr.postcode].filter(Boolean).join(", ")}</div>
        )}
        {addr.country && <div>{addr.country}</div>}
        {withEmail && addr.email && (
          <div className="pt-1 break-all">
            <span className="text-gray-500">Email: </span>
            <a href={`mailto:${addr.email}`} className="text-[#E31E24] hover:underline break-all">{addr.email}</a>
          </div>
        )}
        {addr.phone && (
          <div className="break-all">
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

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase().replace(/^wc-/, "");
    if (s === "completed") return { cls: "bg-emerald-50 border-emerald-200/80 text-emerald-700", dot: "bg-emerald-500" };
    if (s === "processing") return { cls: "bg-blue-50 border-blue-200/80 text-blue-700", dot: "bg-blue-500" };
    if (s === "pending" || s === "pending payment") return { cls: "bg-amber-50 border-amber-200/80 text-amber-700", dot: "bg-amber-500" };
    if (s === "on-hold" || s === "on hold") return { cls: "bg-slate-100 border-slate-200 text-slate-700", dot: "bg-slate-400" };
    if (s === "failed" || s === "cancelled") return { cls: "bg-rose-50 border-rose-200/80 text-rose-700", dot: "bg-rose-500" };
    if (s === "refunded") return { cls: "bg-purple-50 border-purple-200/80 text-purple-700", dot: "bg-purple-500" };
    return { cls: "bg-slate-50 border-slate-200 text-slate-700", dot: "bg-slate-400" };
  };

  const inputClass = "w-full bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200/90 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] transition-all";
  const fieldLabel = "text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans mb-1 block";

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
  const totalItemCount = order?.line_items.reduce((sum, li) => sum + (li.quantity || 1), 0) ?? 0;
  const amountAlreadyRefunded = order?.refunds?.reduce((sum, r) => sum + (Number(r.total) || 0), 0) ?? 0;
  const totalAvailableToRefund = Math.max(0, parseFloat(order?.total || "0") - amountAlreadyRefunded);
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
  const dtdcStatus = isDtdcSent ? "Sent" : "Not Sent";
  const itemsPaymentType = order?.line_items.find((li) => li.payment_type)?.payment_type || "";
  const paymentTypeDisplay = order?.payment_type || itemsPaymentType || getOrderMeta("Payment Type") || getOrderMeta("_awcdp_deposits_payment_type");

  const isCodOrder = Boolean(
    (order?.payment_method || "").toLowerCase() === "cod" ||
    (order?.payment_method || "").toLowerCase().startsWith("cod") ||
    /cash\s*on\s*delivery/i.test(order?.payment_method || "") ||
    /cash\s*on\s*delivery/i.test(order?.payment_method_title || "") ||
    /cash\s*on\s*delivery/i.test(String(paymentTypeDisplay || "")) ||
    String(paymentTypeDisplay || "").toLowerCase() === "cod"
  );
  const isPrepaidOrder = Boolean(order && !isCodOrder);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50/70 text-slate-900 font-sans overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col bg-slate-50/70 overflow-hidden relative">
          {notification && (
            <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 animate-bounce backdrop-blur-md ${notification.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
              : "bg-rose-50/95 border-rose-200 text-rose-800"
              }`}>
              <span className={`w-2 h-2 rounded-full ${notification.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-slate-200/80 py-4 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/orders")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-lg transition-colors font-sans cursor-pointer"
              >
                <span>←</span>
                <span>Orders</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">Order #{order ? order.id : ""}</h2>
              {order && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-sans uppercase tracking-wide ${getStatusBadge(order.status).cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(order.status).dot}`}></span>
                  <span>{order.status}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-xs font-semibold text-slate-500 font-sans">
                <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <svg className="animate-spin h-4 w-4 text-[#E31E24]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading order...</span>
                </div>
              </div>
            )}

            {!isLoading && loadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans rounded-xl p-4">
                {loadError}
              </div>
            )}

            {!isLoading && !loadError && order && (
              <div className="mx-auto space-y-4">
                {/* Modern Order Header Banner */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 font-sans tracking-tight">Order #{order.id} Details</h3>
                      {Boolean(
                        order.is_same_day_delivery ||
                        /same\s*day/i.test(order.shipping_method || "") ||
                        order.shipping_lines?.some((s) => /same\s*day/i.test(s.method_title || s.method_id || ""))
                      ) && (
                          <span
                            style={{ animation: "sameDayBlink 1s infinite" }}
                            className="animate-same-day-blink inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                          >
                            <span className="text-amber-500 text-[11px] leading-none">⚡</span>
                            <span>Same Day Delivery</span>
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-sans flex-wrap">
                      <span>Payment via <strong className="text-slate-800 font-medium">{order.payment_method_title || order.payment_method || "—"}</strong></span>
                      {order.customer_ip_address && <span className="text-slate-400">• Customer IP: {order.customer_ip_address}</span>}
                      <span className="text-slate-400">• Created: {new Date(order.date_created).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left md:text-right bg-slate-50 md:bg-transparent p-2.5 md:p-0 rounded-lg border border-slate-100 md:border-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Order Total</div>
                      <div className="text-lg font-bold font-mono text-slate-900">
                        {order.currency_symbol}{parseFloat(order.total || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[1fr_310px] 2xl:grid-cols-[1fr_340px] gap-4 items-start">
                  {/* Left column */}
                  <div className="lg:col-span-2 xl:col-span-1 space-y-4 min-w-0">
                    {/* Order Details: General / Billing / Shipping */}
                    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-[1.3fr_1fr_1fr]">
                        {/* General */}
                        <div className="p-5 space-y-3.5 md:col-span-2 2xl:col-span-1 min-w-0 border-b 2xl:border-b-0 2xl:border-r border-slate-100">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-sans border-b border-slate-100 pb-2.5">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>General Information</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-1 gap-3.5">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">Date Created:</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-sans font-medium">
                                  {new Date(order.date_created).toLocaleDateString("en-CA")}
                                </div>
                                <span className="text-[11px] text-slate-400 font-sans">@</span>
                                <div className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-sans text-center font-medium">
                                  {new Date(order.date_created).toLocaleTimeString(undefined, { hour: "2-digit", hour12: false })}
                                </div>
                                <span className="text-[11px] text-slate-400 font-sans">:</span>
                                <div className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-sans text-center font-medium">
                                  {new Date(order.date_created).toLocaleTimeString(undefined, { minute: "2-digit" }).replace(/.*:/, "")}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">Status:</div>
                              {canEditStatus ? (
                                <select
                                  value={selectedStatus}
                                  onChange={(e) => setSelectedStatus(e.target.value)}
                                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] transition-all cursor-pointer font-medium"
                                >
                                  {statusList.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-sans font-medium">
                                  {statusList.find((s) => s.value === order.status)?.label || order.status}
                                </div>
                              )}
                            </div>

                            <div className="sm:col-span-2 2xl:col-span-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Customer:</span>
                                <div className="text-[11px] font-sans flex items-center gap-2">
                                  {canProfileLink && (
                                    <a href={`/users/${order.customer_id}`} className="text-[#E31E24] hover:underline font-medium">Profile →</a>
                                  )}
                                  <a href={`/orders?customer=${order.customer_id}`} className="text-slate-500 hover:text-[#E31E24] font-medium">Other orders →</a>
                                </div>
                              </div>
                              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-sans font-medium flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {(order.billing.first_name || "U")[0].toUpperCase()}
                                </div>
                                <span className="truncate">
                                  {order.billing.first_name} {order.billing.last_name} (#{order.customer_id}{order.billing.email ? ` – ${order.billing.email}` : ""})
                                </span>
                              </div>
                            </div>

                            <div className={`${canWeight && order.billing.phone ? "sm:col-span-1 2xl:col-span-1" : "sm:col-span-2 2xl:col-span-1"}`}>
                              {canWeight ? (
                                <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">Weight (kg) :</div>
                                  <input
                                    type="text"
                                    value={isLoadingWeight ? "Calculating…" : weight}
                                    disabled={isLoadingWeight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-500/20 focus:border-[#E31E24] disabled:bg-slate-50 disabled:text-slate-400 transition-all font-mono"
                                  />
                                </div>
                              ) : null}
                            </div>

                            {/* WhatsApp Customer Action */}
                            {order.billing.phone && (
                              <div className={`${canWeight ? "sm:col-span-1 2xl:col-span-1 flex flex-col justify-end" : "sm:col-span-2 2xl:col-span-1"}`}>
                                <a
                                  href={`https://wa.me/91${(order.billing.phone || "").replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg font-sans shadow-2xs inline-flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                                  </svg>
                                  <span>WhatsApp Customer</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Billing */}
                        <div className="p-5 space-y-3.5 md:col-span-1 2xl:col-span-1 min-w-0 border-b md:border-b-0 border-r-0 md:border-r border-slate-100">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              <span>Billing Address</span>
                            </div>
                            {canEditUserDetail && (
                              <button
                                onClick={() => {
                                  if (!isEditingBilling) setBillingForm({ ...order.billing });
                                  setIsEditingBilling(!isEditingBilling);
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0"
                                title="Edit billing address"
                              >
                                <PencilIcon />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>

                          {isEditingBilling && billingForm ? (
                            renderAddressForm(billingForm, setBillingForm, true)
                          ) : (
                            renderAddress(order.billing, true)
                          )}
                        </div>

                        {/* Shipping */}
                        <div className="p-5 space-y-3.5 md:col-span-1 2xl:col-span-1 min-w-0">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                              </svg>
                              <span>Shipping Address</span>
                            </div>
                            {canEditUserDetail && (
                              <button
                                onClick={() => {
                                  if (!isEditingShipping) setShippingForm({ ...order.shipping });
                                  setIsEditingShipping(!isEditingShipping);
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0"
                                title="Edit shipping address"
                              >
                                <PencilIcon />
                                <span>Edit</span>
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
                            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                              <div className="text-[10px] font-bold text-slate-400 uppercase font-sans">Shipping Method</div>
                              {order.shipping_lines.map((s) => (
                                <div key={s.id} className="text-xs font-sans text-slate-800 flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200/80">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-500 shrink-0">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625h-9.75A1.125 1.125 0 002.25 3.75v10.5" />
                                    </svg>
                                    <span className="font-semibold text-slate-900 truncate">{s.method_title || "Shipping"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {order.customer_note && (
                            <div className="pt-2.5 border-t border-slate-100 text-xs font-sans">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Note</div>
                              <div className="text-slate-700 bg-amber-50/70 border border-amber-200/70 p-2.5 rounded-lg text-xs leading-relaxed italic break-words">{order.customer_note}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Courier & Shipping Fulfillment Tab Container */}
                    {(canShiprocket || canTekipost || canDtdc || canSpeedPost) && (
                      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E31E24] flex items-center justify-center font-bold text-sm">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800">Courier & Shipping Fulfillment</h3>
                              <p className="text-[11px] text-slate-400 font-sans">Dispatch, tracking status and shipping carrier integrations</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Summary pills */}
                            <div className="hidden sm:flex items-center gap-2">
                              {canShiprocket && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${shiprocketStatus === "Sent" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200"
                                  }`}>
                                  Shiprocket: {shiprocketStatus}
                                </span>
                              )}
                              {canTekipost && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tekipostStatus === "Sent" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200"
                                  }`}>
                                  TekiPost: {tekipostStatus}
                                </span>
                              )}
                              {canDtdc && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isDtdcSent ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-slate-500 bg-slate-50 border-slate-200"
                                  }`}>
                                  DTDC: {dtdcStatus}
                                </span>
                              )}
                              {canSpeedPost && speedPost?.toLowerCase() === "yes" && (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                                  Speed Post: Yes
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsFulfillmentBoxOpen(!isFulfillmentBoxOpen)}
                              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer text-slate-400"
                              title={isFulfillmentBoxOpen ? "Collapse" : "Expand"}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isFulfillmentBoxOpen ? "" : "rotate-180"}`}>
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Body */}
                        {isFulfillmentBoxOpen && (
                          <div className="p-5 space-y-4">
                            {/* Weight Bar (used across all couriers for shipping) */}
                            {/* {canWeight && (
                              <div className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3v18" />
                                    <rect x="4" y="7" width="16" height="12" rx="2" />
                                    <circle cx="12" cy="13" r="2" />
                                  </svg>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">Order Parcel Weight</div>
                                    <div className="text-[11px] text-slate-500 font-sans">Used for courier shipping rates & manifest calculation</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-semibold text-slate-600">Weight (kg):</label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={isLoadingWeight ? "Calculating…" : weight}
                                      disabled={isLoadingWeight}
                                      onChange={(e) => setWeight(e.target.value)}
                                      className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] disabled:bg-slate-100 disabled:text-slate-400 font-mono shadow-2xs text-right font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )} */}

                            {/* Tabs Navigation */}
                            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                              {canShiprocket && (
                                <button
                                  type="button"
                                  onClick={() => setActiveFulfillmentTab("shiprocket")}
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 shrink-0 cursor-pointer ${activeFulfillmentTab === "shiprocket"
                                    ? "bg-[#E31E24] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                >
                                  <span>🚀 Shiprocket</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFulfillmentTab === "shiprocket"
                                    ? "bg-white/20 text-white"
                                    : shiprocketStatus === "Sent" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                    }`}>
                                    {shiprocketStatus}
                                  </span>
                                </button>
                              )}

                              {canTekipost && (
                                <button
                                  type="button"
                                  onClick={() => setActiveFulfillmentTab("tekipost")}
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 shrink-0 cursor-pointer ${activeFulfillmentTab === "tekipost"
                                    ? "bg-[#E31E24] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                >
                                  <span>📦 TekiPost</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFulfillmentTab === "tekipost"
                                    ? "bg-white/20 text-white"
                                    : tekipostStatus === "Sent" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                    }`}>
                                    {tekipostStatus}
                                  </span>
                                </button>
                              )}

                              {canDtdc && (
                                <button
                                  type="button"
                                  onClick={() => setActiveFulfillmentTab("dtdc")}
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 shrink-0 cursor-pointer ${activeFulfillmentTab === "dtdc"
                                    ? "bg-[#E31E24] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                >
                                  <span>🚚 DTDC</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFulfillmentTab === "dtdc"
                                    ? "bg-white/20 text-white"
                                    : isDtdcSent ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                                    }`}>
                                    {dtdcStatus}
                                  </span>
                                </button>
                              )}

                              {canSpeedPost && (
                                <button
                                  type="button"
                                  onClick={() => setActiveFulfillmentTab("speedpost")}
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all flex items-center gap-2 shrink-0 cursor-pointer ${activeFulfillmentTab === "speedpost"
                                    ? "bg-[#E31E24] text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                >
                                  <span>📮 Speed Post</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeFulfillmentTab === "speedpost"
                                    ? "bg-white/20 text-white"
                                    : speedPost?.toLowerCase() === "yes" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                                    }`}>
                                    {speedPost?.toLowerCase() === "yes" ? "Active" : "Off"}
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Tab 1: Shiprocket Content */}
                            {activeFulfillmentTab === "shiprocket" && canShiprocket && (
                              <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSendToShiprocket}
                                      disabled={isSendingShiprocket || isLoadingWeight || shiprocketStatus === "Sent"}
                                      className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-300 px-4 py-2 rounded-lg transition-all shadow-sm shadow-red-500/20 font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                      {isSendingShiprocket ? (
                                        <>
                                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                          <span>Building Order…</span>
                                        </>
                                      ) : (
                                        "Send to Shiprocket"
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleFetchShiprocketStatus}
                                      disabled={isFetchingShiprocketStatus}
                                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-lg transition-colors font-sans cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                                    >
                                      {isFetchingShiprocketStatus ? "Checking Status…" : "Get Shiprocket Status"}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-sans">Current Status:</span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border font-sans ${shiprocketStatus === "Sent" ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-[#E31E24] border-red-200 bg-red-50"
                                      }`}>
                                      {shiprocketStatus}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Shiprocket AWB Code</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup Date</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Courier Name</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estimated Delivery Date</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs sm:col-span-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Shipment Tracking URL</div>
                                    <a
                                      href="https://www.shiprocket.in/shipment-tracking/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#E31E24] hover:underline font-medium break-all flex items-center gap-1"
                                    >
                                      <span>https://www.shiprocket.in/shipment-tracking/</span>
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 2: TekiPost Content */}
                            {activeFulfillmentTab === "tekipost" && canTekipost && (
                              <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSendToTekipost}
                                      disabled={isSendingTekipost || isLoadingWeight || tekipostStatus === "Sent"}
                                      className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-300 px-4 py-2 rounded-lg transition-all shadow-sm shadow-red-500/20 font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                      {isSendingTekipost ? (
                                        <>
                                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                          <span>Building Order…</span>
                                        </>
                                      ) : (
                                        "Send to TekiPost"
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleFetchTekipostStatus}
                                      disabled={isFetchingTekipostStatus}
                                      className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-lg transition-colors font-sans cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                                    >
                                      {isFetchingTekipostStatus ? "Checking Status…" : "Get TekiPost Status"}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-sans">Current Status:</span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border font-sans ${tekipostStatus === "Sent" ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-[#E31E24] border-red-200 bg-red-50"
                                      }`}>
                                      {tekipostStatus}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tracking No.</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Courier Name</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</div>
                                    <div className="text-xs font-semibold text-slate-800 font-mono">—</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs sm:col-span-3">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tracking URL</div>
                                    <a
                                      href="https://app.tekipost.com/track-order"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#E31E24] hover:underline font-medium break-all flex items-center gap-1"
                                    >
                                      <span>https://app.tekipost.com/track-order</span>
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 3: DTDC Content */}
                            {activeFulfillmentTab === "dtdc" && canDtdc && (
                              <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSendToDtdc}
                                      disabled={isSendingDtdc || isLoadingWeight || isDtdcSent}
                                      className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-300 px-4 py-2 rounded-lg transition-all shadow-sm shadow-red-500/20 font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                      {isSendingDtdc ? (
                                        <>
                                          <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                          <span>Sending…</span>
                                        </>
                                      ) : (
                                        "Send to DTDC"
                                      )}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-sans">Current Status:</span>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border font-sans ${isDtdcSent ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-[#E31E24] border-red-200 bg-red-50"
                                      }`}>
                                      {dtdcStatus}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DTDC Reference No.</div>
                                  <div className="text-sm font-bold text-slate-900 font-mono">
                                    {dtdcReference || <span className="text-slate-400 font-normal italic">No reference number generated yet.</span>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 4: Speed Post Content */}
                            {activeFulfillmentTab === "speedpost" && canSpeedPost && (
                              <div className="bg-slate-50/50 border border-slate-200/70 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span>Speed Post Configuration</span>
                                  </div>
                                  <span className={`text-xs font-bold px-3 py-1 rounded-full border font-sans ${speedPost?.toLowerCase() === "yes" ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-slate-500 border-slate-200 bg-slate-50"
                                    }`}>
                                    {speedPost?.toLowerCase() === "yes" ? "Enabled" : "Disabled"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200/80 shadow-2xs">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Speed Post Enabled:</label>
                                    <select
                                      value={speedPost}
                                      onChange={(e) => setSpeedPost(e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] shadow-2xs font-semibold"
                                    >
                                      <option value="no">No</option>
                                      <option value="yes">Yes</option>
                                    </select>
                                  </div>

                                  {speedPost?.toLowerCase() === "yes" && (
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Speed Tracking ID:</label>
                                      <input
                                        type="text"
                                        value={speedTrackingId}
                                        onChange={(e) => setSpeedTrackingId(e.target.value)}
                                        placeholder="Enter Tracking ID (e.g. EM123456789IN)"
                                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] shadow-2xs"
                                      />
                                    </div>
                                  )}
                                </div>

                                {speedPost?.toLowerCase() === "yes" && (
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs text-xs font-sans">
                                    <span className="text-slate-400 font-medium">Tracking Portal URL: </span>
                                    <a
                                      href={speedTrackingId?.trim() ? `https://t.17track.net/en#nums=${encodeURIComponent(speedTrackingId.trim())}` : "https://www.17track.net/en/"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#E31E24] hover:underline font-medium inline-flex items-center gap-1"
                                    >
                                      <span>https://www.17track.net/en/</span>
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Line items */}
                    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E31E24] flex items-center justify-center font-bold text-sm">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m7.5 4.27 9 5.15" />
                              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                              <path d="m3.3 7 8.7 5 8.7-5" />
                              <path d="M12 22V12" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Items Ordered</h3>
                            <p className="text-[11px] text-slate-400 font-sans">{order.line_items.length} {order.line_items.length === 1 ? "item" : "items"} in this order</p>
                          </div>
                        </div>
                        {order.line_items.length > 0 && (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60 font-mono">
                            Subtotal: {order.currency_symbol}{itemsSubtotal.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                              <th className="py-3 px-5 font-semibold">Item & Details</th>
                              <th className="py-3 px-4 font-semibold">Category</th>
                              <th className="py-3 px-4 font-semibold">Code / SKU</th>
                              <th className="py-3 px-4 font-semibold text-right">Price</th>
                              <th className="py-3 px-4 font-semibold text-right">Qty</th>
                              <th className="py-3 px-5 font-semibold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.line_items.map((li) => {
                              const itemCategory = li.category || li.meta_data?.find((x) => (x.key || "").toLowerCase() === "category")?.value || "";
                              const itemCode = li.code || li.sku || li.meta_data?.find((x) => ["code", "sku", "_sku"].includes((x.key || "").toLowerCase()))?.value || "";
                              const itemVariationId = li.variation_id || Number(li.meta_data?.find((x) => x.key === "_variation_id")?.value || 0);
                              const itemSession = li.session || li.meta_data?.find((x) => ["session", "pa_assignment-session", "assignment-session"].includes((x.key || "").toLowerCase()))?.value || "";
                              const itemType = li.type || li.meta_data?.find((x) => ["type", "pa_assignment-type", "assignment-type"].includes((x.key || "").toLowerCase()))?.value || "";
                              const itemDemand = li.demand || li.meta_data?.find((x) => (x.key || "").toLowerCase() === "demand")?.value || "";
                              const itemMedium = li.medium || (() => {
                                const m = li.meta_data?.find((x) => ["medium", "language", "pa_languages", "select medium"].includes((x.key || "").toLowerCase()));
                                if (!m?.value) return li.language || "";
                                const s = String(m.value).trim();
                                const lower = s.toLowerCase();
                                if (lower === "hindi-medium" || lower === "hindi medium" || lower === "hindi") return "Hindi";
                                if (lower === "english-medium" || lower === "english medium" || lower === "english") return "English";
                                if (lower === "sanskrit-medium" || lower === "sanskrit medium" || lower === "sanskrit") return "Sanskrit";
                                if (lower === "urdu-medium" || lower === "urdu medium" || lower === "urdu") return "Urdu";
                                if (lower === "bengali-medium" || lower === "bengali medium" || lower === "bengali") return "Bengali";
                                if (lower === "punjabi-medium" || lower === "punjabi medium" || lower === "punjabi") return "Punjabi";
                                return s.replace(/-medium$/i, "").replace(/^./, (c: string) => c.toUpperCase());
                              })();
                              const itemEnrollment = li.enrollment_no || li.meta_data?.find((x) => (x.key || "").toLowerCase().includes("enrol"))?.value || "";
                              const itemPaymentType = li.payment_type || li.meta_data?.find((x) => (x.key || "").toLowerCase().includes("payment"))?.value || "";

                              const knownKeys = new Set([
                                "category", "code", "sku", "_sku", "_variation_id", "variation_id", "session", "pa_assignment-session",
                                "assignment-session", "type", "pa_assignment-type", "assignment-type", "demand", "language",
                                "medium", "pa_languages", "select medium", "enrollment no.", "enrollment no", "enrolment no", "enrollment_no",
                                "payment type", "payment_type", "_qty", "_line_total", "_line_subtotal", "_line_tax",
                                "_line_tax_data", "_tax_class", "_product_id", "_reduced_stock"
                              ]);
                              const otherMeta = (li.meta_data || []).filter((m) => !knownKeys.has((m.key || "").toLowerCase()));

                              return (
                                <tr key={li.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 px-5 font-sans text-slate-900 font-medium">
                                    <div className="flex items-start gap-3">
                                      <img
                                        src={li.image || "/logo.svg"}
                                        alt={li.name}
                                        className="w-11 h-11 object-cover rounded-lg border border-slate-200/80 shrink-0 mt-0.5 shadow-2xs"
                                        onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }}
                                      />
                                      <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-slate-900 hover:text-[#E31E24] font-semibold text-xs leading-snug cursor-pointer transition-colors">
                                            {li.name}
                                          </span>
                                          {itemVariationId > 0 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
                                              Var #{itemVariationId}
                                            </span>
                                          )}
                                        </div>

                                        {/* Modern chip metadata */}
                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                          {itemMedium && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                                              <span className="text-slate-400 font-normal">Medium:</span> {itemMedium}
                                            </span>
                                          )}
                                          {itemSession && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                                              <span className="text-blue-400 font-normal">Session:</span> {formatMetaValue(itemSession)}
                                            </span>
                                          )}
                                          {itemType && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                                              <span className="text-purple-400 font-normal">Type:</span> {formatMetaValue(itemType)}
                                            </span>
                                          )}
                                          {itemDemand && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                                              <span className="text-amber-400 font-normal">Demand:</span> {itemDemand}
                                            </span>
                                          )}
                                          {itemEnrollment && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
                                              <span className="text-emerald-500 font-normal">Enrollment:</span> {itemEnrollment}
                                            </span>
                                          )}
                                          {itemPaymentType && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 uppercase">
                                              {itemPaymentType}
                                            </span>
                                          )}
                                          {otherMeta.length > 0 && (
                                            otherMeta.map((m) => (
                                              <span key={m.id || m.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
                                                <span className="text-slate-400 font-normal">{m.key}:</span> {m.value}
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-sans text-slate-700 align-top text-xs">
                                    {itemCategory ? (
                                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px] border border-slate-200/50">
                                        {itemCategory}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-600 align-top text-xs">{itemCode || <span className="text-slate-300">—</span>}</td>
                                  <td className="py-3.5 px-4 font-sans text-slate-700 text-right align-top text-xs font-medium">
                                    <div>{order.currency_symbol}{parseFloat(li.price).toFixed(2)}</div>
                                  </td>
                                  <td className="py-3.5 px-4 font-sans text-slate-700 text-right align-top text-xs">
                                    <div className="font-semibold text-slate-800">× {li.quantity}</div>
                                    {isRefundMode && isPrepaidOrder && canRefund && (
                                      <div className="mt-1.5 flex justify-end">
                                        <input
                                          type="number"
                                          min={0}
                                          max={li.quantity}
                                          value={refundQty[li.id] ?? 0}
                                          onChange={(e) => handleItemRefundQtyChange(li.id, e.target.value, parseFloat(li.total), li.quantity)}
                                          className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-mono bg-white shadow-2xs"
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5 font-sans text-slate-900 font-bold text-right align-top text-xs">
                                    <div>{order.currency_symbol}{parseFloat(li.total).toFixed(2)}</div>
                                    {isRefundMode && isPrepaidOrder && canRefund && (
                                      <div className="mt-1.5 flex justify-end">
                                        <input
                                          type="number"
                                          step="any"
                                          min={0}
                                          max={parseFloat(li.total)}
                                          value={refundItemTotal[li.id] ?? 0}
                                          onChange={(e) => handleItemRefundTotalChange(li.id, e.target.value, parseFloat(li.total))}
                                          className="w-20 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-mono bg-white font-normal shadow-2xs"
                                        />
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Fee lines */}
                            {order.fee_lines.map((f) => (
                              <tr key={f.id} className="bg-amber-50/20">
                                <td className="py-2.5 px-5 font-sans text-slate-700" colSpan={5}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">Fee</span>
                                    <span className="font-medium text-slate-800">{f.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-5 font-sans text-slate-800 text-right font-semibold">{order.currency_symbol}{parseFloat(f.total).toFixed(2)}</td>
                              </tr>
                            ))}

                            {/* Shipping lines */}
                            {order.shipping_lines?.map((s) => (
                              <tr key={s.id} className="bg-blue-50/20">
                                <td className="py-2.5 px-5 font-sans text-slate-700" colSpan={5}>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">Shipping</span>
                                    <span className="font-medium text-slate-800">{s.method_title || "Shipping"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-5 font-sans text-slate-800 text-right font-semibold">{order.currency_symbol}{parseFloat(s.total || "0").toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50/50">
                            <tr className="border-t border-slate-200">
                              <td colSpan={5} className="py-2.5 px-5 text-right text-slate-500 font-sans text-xs">Items subtotal</td>
                              <td className="py-2.5 px-5 text-right text-slate-800 font-sans font-medium text-xs">{order.currency_symbol}{itemsSubtotal.toFixed(2)}</td>
                            </tr>
                            {discountTotal > 0 && (
                              <tr>
                                <td colSpan={5} className="py-2 px-5 text-right text-emerald-600 font-sans text-xs font-medium">
                                  Discount {order.coupon_lines && order.coupon_lines.length > 0 ? `(${order.coupon_lines.map((c) => c.code).join(", ")})` : ""}
                                </td>
                                <td className="py-2 px-5 text-right text-emerald-600 font-sans font-semibold text-xs">-{order.currency_symbol}{discountTotal.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-slate-200/80 bg-slate-100/40">
                              <td colSpan={5} className="py-3 px-5 text-right text-slate-900 font-bold font-sans text-sm">Order Total</td>
                              <td className="py-3 px-5 text-right text-slate-900 font-black font-sans text-base">{order.currency_symbol}{parseFloat(order.total).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Refund Area */}
                      {!isRefundMode ? (
                        /* Normal view: Bottom bar with Refund button on the left (only when prepaid & user has refund permission) and notice on the right */
                        <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between bg-slate-50/40">
                          <div>
                            {isPrepaidOrder && canRefund && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRefundMode(true);
                                  setRefundAmount("");
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#E31E24] bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                </svg>
                                Issue Refund
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 font-sans flex items-center gap-1.5 ml-auto">
                            <span className="w-4 h-4 rounded-full bg-slate-200/80 text-slate-500 inline-flex items-center justify-center text-[10px] font-bold">i</span>
                            <span>This order is completed and no longer directly editable.</span>
                          </div>
                        </div>
                      ) : isPrepaidOrder && canRefund ? (
                        /* Expanded Refund Panel (Only accessible for prepaid orders with refund permission) */
                        <div className="border-t border-slate-200 bg-slate-50/70">
                          <div className="p-5 flex flex-col items-end gap-3">
                            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200/60 flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#E31E24]"></span>
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Manual Refund Setup</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-sans">
                                <div className="text-slate-500">
                                  Already refunded: <span className="font-semibold text-slate-800 font-mono">{amountAlreadyRefunded > 0 ? `-${order.currency_symbol}${amountAlreadyRefunded.toFixed(2)}` : `-₹0.00`}</span>
                                </div>
                                <div className="text-slate-500">
                                  Available: <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">{order.currency_symbol}{totalAvailableToRefund.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-sans text-slate-700">
                              <label htmlFor="restock_items" className="text-slate-600 cursor-pointer select-none font-medium">Restock refunded items:</label>
                              <input
                                id="restock_items"
                                type="checkbox"
                                checked={restockRefundedItems}
                                onChange={(e) => setRestockRefundedItems(e.target.checked)}
                                className="accent-[#E31E24] w-4 h-4 cursor-pointer rounded"
                              />
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-600 font-medium">Refund amount:</span>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{order.currency_symbol}</span>
                                <input
                                  type="number"
                                  step="any"
                                  min={0}
                                  max={totalAvailableToRefund}
                                  placeholder="0.00"
                                  value={refundAmount}
                                  onChange={(e) => setRefundAmount(e.target.value)}
                                  className="border border-slate-300 rounded-lg pl-6 pr-3 py-1.5 text-xs text-slate-900 text-right outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] font-mono w-32 bg-white shadow-2xs font-semibold"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-600 font-medium">Reason for refund (optional):</span>
                              <input
                                type="text"
                                placeholder="e.g. Customer return, damaged item..."
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] font-sans w-64 bg-white shadow-2xs"
                              />
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleManualRefund}
                                disabled={isProcessingRefund}
                                className="bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold text-xs px-5 py-2 rounded-lg transition-all shadow-sm shadow-red-500/20 font-sans flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                {isProcessingRefund ? (
                                  <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                    <span>Processing Refund...</span>
                                  </>
                                ) : (
                                  "Refund Manually"
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Left bottom corner Cancel button */}
                          <div className="border-t border-slate-200/80 px-5 py-3 flex items-center justify-between bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                setIsRefundMode(false);
                                setRefundQty({});
                                setRefundItemTotal({});
                                setRefundAmount("");
                                setRefundReason("");
                              }}
                              className="border border-slate-250 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-4 py-1.5 text-xs font-medium font-sans transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <span className="text-[11px] text-slate-400">Items quantities and totals entered above will be recorded in the order log</span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Downloadable product permissions */}
                    {canDownloadableProduct && (
                      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Downloadable Product Permissions
                          </h4>
                          <div className="flex items-center gap-2 text-slate-400">
                            <button
                              type="button"
                              title="Downloadable product permissions allow customers to download digital products purchased in this order."
                              className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-help"
                            >
                              ?
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsDownloadsBoxOpen(!isDownloadsBoxOpen)}
                              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title={isDownloadsBoxOpen ? "Collapse" : "Expand"}
                            >
                              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${isDownloadsBoxOpen ? "" : "rotate-180"}`}>
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
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
                    )}
                  </div>

                  {/* Right column */}
                  <div className="space-y-4 min-w-0">
                    {/* Order actions */}
                    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#E31E24]"></span>
                          Order Actions
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={orderAction}
                            onChange={(e) => setOrderAction(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-sans outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] shadow-2xs"
                          >
                            <option value="">Choose an action...</option>
                            <option value="send_order_details">Send order details to customer</option>
                            <option value="resend_order_notification">Resend new order notification</option>
                            {canDownloadableProduct && (
                              <option value="regenerate_download_permissions">Regenerate download permissions</option>
                            )}
                          </select>
                          <button
                            type="button"
                            disabled
                            title="Action executes on update"
                            className="shrink-0 w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 bg-slate-50 cursor-default"
                          >
                            →
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled
                            title="Not available yet"
                            className="text-xs font-medium text-slate-400 font-sans hover:text-red-600 transition-colors disabled:opacity-50 cursor-not-allowed"
                          >
                            Move to Trash
                          </button>
                          <button
                            onClick={handleUpdate}
                            disabled={isSaving}
                            className="text-xs font-bold text-white bg-[#E31E24] hover:bg-red-700 disabled:bg-slate-300 px-5 py-2 rounded-lg transition-all shadow-sm shadow-red-500/20 active:scale-95 font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {isSaving ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                <span>Updating…</span>
                              </>
                            ) : (
                              "Update Order"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Customer history */}
                    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <polyline points="16 11 18 13 22 9" />
                          </svg>
                          Customer History
                        </h4>
                      </div>
                      <div className="p-4 space-y-2.5 font-sans">
                        <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-3">
                          <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1.5">
                              <span>Total orders</span>
                              <div className="relative group inline-flex items-center">
                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] rounded-full bg-slate-200 text-slate-600 font-bold cursor-help">?</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-52 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 text-center leading-snug pointer-events-none font-normal">
                                  Total number of orders for this customer, excluding cancelled orders, including the current one.
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </span>
                            <span className="text-sm font-bold text-slate-900 font-mono">{order.customer_stats.total_orders}</span>
                          </div>
                        </div>

                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                          <div className="text-[11px] text-emerald-800 flex items-center justify-between font-medium">
                            <span className="flex items-center gap-1.5">
                              <span>Total revenue (LTV)</span>
                              <div className="relative group inline-flex items-center">
                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] rounded-full bg-emerald-200 text-emerald-800 font-bold cursor-help">?</span>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-56 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-50 text-center leading-snug pointer-events-none font-normal">
                                  This is the Customer Lifetime Value, or the total amount you have earned from this customer&apos;s orders.
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </span>
                            <span className="text-sm font-bold text-emerald-900 font-mono">
                              {order.currency_symbol}{parseFloat(order.customer_stats.total_revenue || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                          <div className="text-[11px] text-blue-800 flex items-center justify-between font-medium">
                            <span>Average order value</span>
                            <span className="text-sm font-bold text-blue-900 font-mono">
                              {order.currency_symbol}{parseFloat(order.customer_stats.average_order_value || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order notes */}
                    {canNotes && (
                      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Order Notes
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                            {notes.length}
                          </span>
                        </div>

                        <div className="p-4 space-y-3 font-sans">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Add Note</label>
                            <textarea
                              value={newNoteContent}
                              onChange={(e) => setNewNoteContent(e.target.value)}
                              placeholder="Write a note about this order..."
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] resize-none shadow-2xs placeholder:text-slate-400"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={newNoteType}
                              onChange={(e) => setNewNoteType(e.target.value)}
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-red-100 focus:border-[#E31E24] shadow-2xs"
                            >
                              <option value="">Private note</option>
                              <option value="customer">Note to customer</option>
                            </select>
                            <button
                              onClick={handleAddNote}
                              disabled={isAddingNote || !newNoteContent.trim()}
                              className="text-xs font-semibold text-[#E31E24] border border-red-200 bg-red-50 hover:bg-red-100 disabled:text-slate-400 disabled:border-slate-200 disabled:bg-slate-50 px-3.5 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {isAddingNote ? "Adding…" : "Add Note"}
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {isLoadingNotes ? (
                              <div className="text-xs text-slate-400 py-3 text-center">Loading notes…</div>
                            ) : notes.length === 0 ? (
                              <div className="text-xs text-slate-400 py-3 text-center italic">No order notes recorded yet.</div>
                            ) : (
                              notes.map((note) => {
                                const authorName = (note.author || "").trim();
                                const isGenericAuthor =
                                  !authorName ||
                                  authorName.toLowerCase() === "woocommerce" ||
                                  authorName.toLowerCase() === "system" ||
                                  authorName.toLowerCase() === "wordpress";
                                const displayAuthor = !isGenericAuthor
                                  ? authorName
                                  : /order status changed/i.test(note.content || "") && order?.updated_by
                                    ? order.updated_by
                                    : null;

                                return (
                                  <div
                                    key={note.id}
                                    className={`rounded-lg p-3 text-xs transition-colors ${note.is_customer_note
                                      ? "bg-sky-50/70 border border-sky-200/80 text-sky-950"
                                      : !displayAuthor && (note.is_system_note || isGenericAuthor)
                                        ? "bg-purple-50/60 border border-purple-200/70 text-purple-950"
                                        : "bg-slate-50 border border-slate-200/70 text-slate-800"
                                      }`}
                                  >
                                    <div className="whitespace-pre-wrap leading-relaxed">{note.content}</div>
                                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-1 pt-1.5 border-t border-black/5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          className="font-medium cursor-help"
                                          title={new Date(note.date).toLocaleString()}
                                        >
                                          {formatNoteDate(note.date)}
                                        </span>
                                        {displayAuthor && (
                                          <span className="font-semibold text-slate-700">· {displayAuthor}</span>
                                        )}
                                      </div>
                                      {canDeleteNote && (
                                        <button
                                          onClick={() => handleDeleteNote(note.id)}
                                          disabled={deletingNoteId === note.id}
                                          className="text-red-500 hover:text-red-700 hover:underline cursor-pointer disabled:text-slate-300 font-medium"
                                        >
                                          {deletingNoteId === note.id ? "Deleting…" : "Delete"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order attribution */}
                    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                          Order Attribution
                        </h4>
                      </div>
                      <div className="p-4 space-y-2 text-xs font-sans">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-500">Origin</span>
                          <span className="font-semibold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                            {order.attribution.origin || "Direct / Organic"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-500">Device type</span>
                          <span className="font-semibold text-slate-800 capitalize bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {order.attribution.device_type || "Desktop"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Session page views</span>
                          <span className="font-semibold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                            {order.attribution.session_pages || "—"}
                          </span>
                        </div>
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
