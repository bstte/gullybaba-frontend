import type { CustomerProfile } from "@/src/store/authSlice";

// Order section ke saare permission flags "access_orders" meta_data entry ke andar aate hain
// (e.g. woocommerce, edit_order_status, wc-processing, ...). Ye WooCommerce customer profile
// (gullybaba_admin_profile) se aata hai, admin (login) object se nahi. Naye access_* keys
// yahan add hote jayenge jaise-jaise sections wire hote hain.
export const ORDER_SECTION_KEY = "woocommerce";
export const EDIT_USER_DETAIL_KEY = "edit_user_detail";
export const EDIT_ORDER_STATUS_KEY = "edit_order_status";
export const SEND_TO_SHIPROCKET_KEY = "send_to_shiprocket";
export const SEND_TO_TEKIPOST_KEY = "send_to_tekipost";
export const SEND_TO_DTDC_KEY = "send_to_dtdc";
export const SPEED_POST_KEY = "speed_post";
export const ORDER_WEIGHT_KEY = "order_weight";
export const ORDER_NOTE_KEY = "order_note";
export const DELETE_NOTE_KEY = "delete_note";
export const VIEW_ORDER_KEY = "view_order";
export const PROFILE_LINK_KEY = "profile_link";
export const DOWNLOADABLE_PRODUCT_KEY = "downloadable_product";
export const REFUND_BUTTON_KEY = "refund-button";

// Abandoned Cart section keys
export const ABANDONED_CART_KEY = "abandoned_cart";
export const WC_ABANDONED_CART_META_KEY = "access_abandoned_cart";
export const WC_ABANDONED_CART_KEY = "abandoned-carts";

// Contact Forms section keys
export const CONTACT_FORM_META_KEY = "access_contact_form";
export const CONTACT_FORM_KEY = "cfdb7-list.php";

// Downloads section keys
export const DOWNLOADS_META_KEY = "access_downloads";
export const DOWNLOADS_MENU_KEY = "downloads-menu";
export const DOWNLOADS_COD_ORDERS_KEY = "downloads-cod-orders";
export const DOWNLOADS_ABANDONED_CARTS_KEY = "downloads-abandoned-carts";
export const DOWNLOADS_ABANDONED_CARTS_LITE_KEY = "downloads-abandoned-carts-lite";
export const DOWNLOADS_ORDERS_KEY = "downloads-orders";

export function getMetaValue(profile: CustomerProfile | null | undefined, key: string): string[] {
  const entry = profile?.meta_data?.find((m) => m.key === key);
  if (!entry || !entry.value) return [];
  if (Array.isArray(entry.value)) return entry.value.map(String);
  if (typeof entry.value === "string") {
    try {
      const parsed = JSON.parse(entry.value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [entry.value];
    }
  }
  return [];
}

// Administrator role ko sab access_orders flags par unconditional access milta hai,
// meta_data me flag set ho ya na ho.
export function isAdministrator(profile: CustomerProfile | null | undefined): boolean {
  return profile?.role === "administrator";
}

function hasOrdersFlag(profile: CustomerProfile | null | undefined, key: string): boolean {
  return isAdministrator(profile) || getMetaValue(profile, "access_orders").includes(key);
}

export function hasOrdersAccess(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, ORDER_SECTION_KEY);
}

// Normal Abandoned Carts: access_orders me "abandoned_cart" check karta hai
export function hasAbandonedCartAccess(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, ABANDONED_CART_KEY);
}

// WC Abandoned Carts: access_abandoned_cart meta key me "abandoned-carts" check karta hai
export function hasWcAbandonedCartAccess(profile: CustomerProfile | null | undefined): boolean {
  if (isAdministrator(profile)) return true;
  const values = getMetaValue(profile, WC_ABANDONED_CART_META_KEY);
  return (
    values.includes(WC_ABANDONED_CART_KEY) ||
    values.includes("abandoned_cart") ||
    values.includes("abandoned-cart")
  );
}

// Contact Forms: access_contact_form meta key me "cfdb7-list.php" check karta hai
export function hasContactFormAccess(profile: CustomerProfile | null | undefined): boolean {
  if (isAdministrator(profile)) return true;
  const values = getMetaValue(profile, CONTACT_FORM_META_KEY);
  return values.includes(CONTACT_FORM_KEY);
}

// Downloads: access_downloads meta key check karta hai
export function hasDownloadsFlag(profile: CustomerProfile | null | undefined, flag: string): boolean {
  if (isAdministrator(profile)) return true;
  const values = getMetaValue(profile, DOWNLOADS_META_KEY);
  return values.includes(flag);
}

export function hasDownloadsAccess(profile: CustomerProfile | null | undefined): boolean {
  return hasDownloadsFlag(profile, DOWNLOADS_MENU_KEY);
}

export function canViewDownloadTab(profile: CustomerProfile | null | undefined, tabKey: string): boolean {
  return hasDownloadsFlag(profile, tabKey);
}

// Login ke baad ya default navigation me pehle allowed section par bhejta hai:
// 1. Agar orders allow hai to /orders
// 2. Agar abandoned cart allow hai to /abandoned-carts
// 3. Agar wc abandoned cart allow hai to /wc-abandoned-carts
// 4. Agar contact forms allow hai to /contact-forms
// 5. Agar downloads allow hai to /downloads
export function getDefaultAllowedRoute(profile: CustomerProfile | null | undefined): string {
  if (hasOrdersAccess(profile)) {
    return "/orders";
  }
  if (hasAbandonedCartAccess(profile)) {
    return "/abandoned-carts";
  }
  if (hasWcAbandonedCartAccess(profile)) {
    return "/wc-abandoned-carts";
  }
  if (hasContactFormAccess(profile)) {
    return "/contact-forms";
  }
  if (hasDownloadsAccess(profile)) {
    return "/downloads";
  }
  return "/orders";
}

// Gates the billing/shipping edit pencil on the order detail page.
export function canEditOrderUserDetail(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, EDIT_USER_DETAIL_KEY);
}

// Gates the ability to change an order's Status dropdown.
export function canEditOrderStatus(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, EDIT_ORDER_STATUS_KEY);
}

// Gates the "Send to Shiprocket" button.
export function canSendToShiprocket(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, SEND_TO_SHIPROCKET_KEY);
}

// Gates the "Send to Tekipost" button.
export function canSendToTekipost(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, SEND_TO_TEKIPOST_KEY);
}

// Gates the "Send to DTDC" button.
export function canSendToDtdc(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, SEND_TO_DTDC_KEY);
}

// Gates the Speed Post Details section.
export function canViewSpeedPost(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, SPEED_POST_KEY);
}

// Gates the Weight (kg) field.
export function canViewOrderWeight(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, ORDER_WEIGHT_KEY);
}

// Gates the Order notes section (viewing/adding notes).
export function canViewOrderNotes(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, ORDER_NOTE_KEY);
}

// Gates the "Delete note" action on an individual order note.
export function canDeleteOrderNote(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, DELETE_NOTE_KEY);
}

// Gates opening an order's detail ("edit order") page from the orders list.
export function canViewOrder(profile: CustomerProfile | null | undefined): boolean {
  // return hasOrdersFlag(profile, VIEW_ORDER_KEY);
  return true;
}

// Gates the "Profile →" link next to the Customer field on the order detail page.
export function canViewProfileLink(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, PROFILE_LINK_KEY);
}

// Gates a status tab/filter on the orders list page (wc-processing, wc-completed, ...).
export function canViewOrderStatus(profile: CustomerProfile | null | undefined, statusValue: string): boolean {
  if (isAdministrator(profile)) return true;
  return hasOrdersFlag(profile, `wc-${statusValue}`) || hasOrdersFlag(profile, statusValue);
}

// Gates the "Downloadable product permissions" section on the order detail page.
export function canViewDownloadableProduct(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, DOWNLOADABLE_PRODUCT_KEY);
}

// Custom Filter Keys from ACF:
// wc-custom-filter-1 -> Handwritten Scan Copy
// wc-custom-filter-2 -> Handwritten Hard Copy Via Courier
// wc-custom-filter-3 -> Speed Post
// wc-custom-filter-4 -> Assignment Not Available
export const HANDWRITTEN_SCAN_COPY_FILTER_KEY = "wc-custom-filter-1";
export const HANDWRITTEN_HARD_COPY_FILTER_KEY = "wc-custom-filter-2";
export const SPEED_POST_CUSTOM_FILTER_KEY = "wc-custom-filter-3";
export const ASSIGNMENT_NOT_AVAILABLE_FILTER_KEY = "wc-custom-filter-4";

// Gates the "Handwritten Scan Copy" filter tab and dropdown option.
export function canViewHandwrittenScanCopy(profile: CustomerProfile | null | undefined): boolean {
  return isAdministrator(profile) || hasOrdersFlag(profile, HANDWRITTEN_SCAN_COPY_FILTER_KEY);
}

// Gates the "Handwritten Hard Copy Via Courier" filter tab and dropdown option.
export function canViewHandwrittenHardCopy(profile: CustomerProfile | null | undefined): boolean {
  return isAdministrator(profile) || hasOrdersFlag(profile, HANDWRITTEN_HARD_COPY_FILTER_KEY);
}

// Gates the "Speed Post" filter tab.
export function canViewSpeedPostFilter(profile: CustomerProfile | null | undefined): boolean {
  return isAdministrator(profile) || hasOrdersFlag(profile, SPEED_POST_CUSTOM_FILTER_KEY);
}

// Gates the "Assignment Not Available" filter tab and dropdown option.
export function canViewAssignmentNotAvailable(profile: CustomerProfile | null | undefined): boolean {
  return isAdministrator(profile) || hasOrdersFlag(profile, ASSIGNMENT_NOT_AVAILABLE_FILTER_KEY);
}

// Gates the "Issue Refund" button on the order detail page.
export function canRefundOrder(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, REFUND_BUTTON_KEY) || hasOrdersFlag(profile, "refund_button");
}

export const canViewRefundButton = canRefundOrder;

