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

// Abandoned Cart section keys
export const ABANDONED_CART_KEY = "abandoned_cart";
export const WC_ABANDONED_CART_META_KEY = "access_abandoned_cart";
export const WC_ABANDONED_CART_KEY = "abandoned-carts";

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

// Login ke baad ya default navigation me pehle allowed section par bhejta hai:
// 1. Agar orders allow hai to /orders
// 2. Agar abandoned cart allow hai to /abandoned-carts
// 3. Agar wc abandoned cart allow hai to /wc-abandoned-carts
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
  return hasOrdersFlag(profile, `wc-${statusValue}`);
}

// Gates the "Downloadable product permissions" section on the order detail page.
export function canViewDownloadableProduct(profile: CustomerProfile | null | undefined): boolean {
  return hasOrdersFlag(profile, DOWNLOADABLE_PRODUCT_KEY);
}

