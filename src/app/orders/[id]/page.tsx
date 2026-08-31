"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { addOrderNote, deleteOrderNote, fetchOrderById, fetchOrderNotes, fetchOrderStatusCounts, fetchOrderWeight, fetchShiprocketStatus, fetchTekipostStatus, previewShiprocket, previewTekipost, updateOrderAddress, updateOrderStatus } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { canDeleteOrderNote, canEditOrderStatus, canEditOrderUserDetail, canSendToShiprocket, canSendToTekipost, canViewOrder, canViewOrderNotes, canViewOrderWeight, canViewProfileLink, canViewSpeedPost } from "@/src/lib/permissions";

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
}

interface FeeLine {
  id: number;
  name: string;
  total: string;
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
  customer_id: number;
  billing: Address;
  shipping: Address;
  payment_method: string;
  payment_method_title: string;
  customer_ip_address: string;
  customer_note: string;
  line_items: LineItem[];
  fee_lines: FeeLine[];
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
  const [isFetchingTekipostStatus, setIsFetchingTekipostStatus] = useState(false);
  const [isFetchingShiprocketStatus, setIsFetchingShiprocketStatus] = useState(false);
  const [orderAction, setOrderAction] = useState("");
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

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

  const handleAddNote = async () => {
    if (!token || !order || !newNoteContent.trim()) return;
    try {
      setIsAddingNote(true);
      const res = await addOrderNote(token, order.id, newNoteContent.trim(), newNoteType);
      if (res.success) {
        setNotes((prev) => [res.note, ...prev]);
        setNewNoteContent("");
        setNewNoteType("");
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
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to delete order note", "error");
    } finally {
      setDeletingNoteId(null);
    }
  };

  useEffect(() => {
    if (ready && profile && !canView) {
      router.push("/orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile, canView]);

  useEffect(() => {
    if (!ready || !token || !orderId) return;
    loadOrder(token);
    loadNotes(token);
    fetchOrderStatusCounts(token).then((res) => {
      if (res.success) setStatusList(res.statusList || []);
    }).catch(() => {});

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

  const getOrderMeta = (key: string) => order?.meta_data.find((m) => m.key === key)?.value || "";
  const shiprocketStatus = getOrderMeta("shiprocket_status") === "Sent" ? "Sent" : "Not Sent";
  const tekipostStatus = getOrderMeta("tekipost_status") === "Sent" ? "Sent" : "Not Sent";

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
                  <h3 className="text-sm font-bold text-gray-900 font-sans">Order #{order.id} details</h3>
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

                      {order.customer_note && (
                        <div className="pt-3 border-t border-gray-100 text-xs font-sans">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Customer provided note</div>
                          <div className="text-gray-700">{order.customer_note}</div>
                        </div>
                      )}
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
                            {order.line_items.map((li) => (
                              <tr key={li.id}>
                                <td className="py-2.5 px-4 font-sans text-gray-900 font-medium">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={li.image || "/logo.svg"}
                                      alt={li.name}
                                      className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }}
                                    />
                                    <span>{li.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 font-sans text-gray-600">{li.category || "—"}</td>
                                <td className="py-2.5 px-4 font-sans text-gray-600">{li.sku || "—"}</td>
                                <td className="py-2.5 px-4 font-sans text-gray-700 text-right">{order.currency_symbol}{parseFloat(li.price).toFixed(2)}</td>
                                <td className="py-2.5 px-4 font-sans text-gray-700 text-right">× {li.quantity}</td>
                                <td className="py-2.5 px-4 font-sans text-gray-900 font-semibold text-right">{order.currency_symbol}{parseFloat(li.total).toFixed(2)}</td>
                              </tr>
                            ))}
                            {order.fee_lines.map((f) => (
                              <tr key={f.id}>
                                <td className="py-2.5 px-4 font-sans text-gray-500" colSpan={5}>{f.name}</td>
                                <td className="py-2.5 px-4 font-sans text-gray-700 text-right">{order.currency_symbol}{parseFloat(f.total).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-500 font-sans">Items subtotal</td>
                              <td className="py-2 px-4 text-right text-gray-700 font-sans">{order.currency_symbol}{itemsSubtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="py-2 px-4 text-right text-gray-500 font-sans">Fees</td>
                              <td className="py-2 px-4 text-right text-gray-700 font-sans">{order.currency_symbol}{feesTotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="py-2.5 px-4 text-right text-gray-900 font-bold font-sans">Order Total</td>
                              <td className="py-2.5 px-4 text-right text-gray-900 font-bold font-sans">{order.currency_symbol}{parseFloat(order.total).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
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
                                className={`rounded px-3 py-2 text-xs font-sans ${
                                  note.is_customer_note
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
          </div>
        </main>
      </div>
    </div>
  );
}
