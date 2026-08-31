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
export const SPEED_POST_KEY = "speed_post";
export const ORDER_WEIGHT_KEY = "order_weight";
export const ORDER_NOTE_KEY = "order_note";
export const DELETE_NOTE_KEY = "delete_note";
export const VIEW_ORDER_KEY = "view_order";
export const PROFILE_LINK_KEY = "profile_link";

function getMetaValue(profile: CustomerProfile | null | undefined, key: string): string[] {
  const entry = profile?.meta_data?.find((m) => m.key === key);
  return Array.isArray(entry?.value) ? entry.value : [];
}

export function hasOrdersAccess(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(ORDER_SECTION_KEY);
}

// Gates the billing/shipping edit pencil on the order detail page.
export function canEditOrderUserDetail(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(EDIT_USER_DETAIL_KEY);
}

// Gates the ability to change an order's Status dropdown.
export function canEditOrderStatus(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(EDIT_ORDER_STATUS_KEY);
}

// Gates the "Send to Shiprocket" button.
export function canSendToShiprocket(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(SEND_TO_SHIPROCKET_KEY);
}

// Gates the "Send to Tekipost" button.
export function canSendToTekipost(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(SEND_TO_TEKIPOST_KEY);
}

// Gates the Speed Post Details section.
export function canViewSpeedPost(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(SPEED_POST_KEY);
}

// Gates the Weight (kg) field.
export function canViewOrderWeight(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(ORDER_WEIGHT_KEY);
}

// Gates the Order notes section (viewing/adding notes).
export function canViewOrderNotes(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(ORDER_NOTE_KEY);
}

// Gates the "Delete note" action on an individual order note.
export function canDeleteOrderNote(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(DELETE_NOTE_KEY);
}

// Gates opening an order's detail ("edit order") page from the orders list.
export function canViewOrder(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(VIEW_ORDER_KEY);
}

// Gates the "Profile →" link next to the Customer field on the order detail page.
export function canViewProfileLink(profile: CustomerProfile | null | undefined): boolean {
  return getMetaValue(profile, "access_orders").includes(PROFILE_LINK_KEY);
}

// Gates a status tab/filter on the orders list page (wc-processing, wc-completed, ...).
export function canViewOrderStatus(profile: CustomerProfile | null | undefined, statusValue: string): boolean {
  return getMetaValue(profile, "access_orders").includes(`wc-${statusValue}`);
}
