import type { Icon } from "@phosphor-icons/react";
import { Bell, ChatsCircle, Gear, Lifebuoy, Package, Star, Storefront, Target, Wallet } from "@phosphor-icons/react";
import type { AppNotification } from "@/lib/types";

const ID = /^[0-9a-fA-F-]{36}$/;

/** Older servers send no target: derive it from the type, as Core `NotificationTarget.of` does. */
function targetOf(n: AppNotification): string {
  if (n.target && n.target !== "NONE") return n.target;
  const t = n.type;
  if (t === "CUSTOMER_REVIEW_REQUEST") return "ORDER";
  if (t.includes("REVIEW") && t !== "PRODUCT_IN_REVIEW" && t !== "SELLER_IN_REVIEW") return "REVIEW";
  if (t.startsWith("RETURN_") || t.startsWith("ORDER_") || t.startsWith("SELLER_ORDER_") || t === "NEW_ORDER_RECEIVED" || t === "HIGH_VALUE_ORDER_ALERT") return "ORDER";
  if (t.startsWith("PRODUCT_")) return "PRODUCT";
  if (t.startsWith("PAYOUT_") || t === "WALLET_UPDATE" || t === "PAYMENT_CONFIRMED" || t === "BOOST_ACTIVATED") return "WALLET";
  if (t === "SUPPORT_REPLY_RECEIVED" || t === "NEW_SUPPORT_MESSAGE") return "SUPPORT";
  if (t.startsWith("CUSTOM_REQUEST_") || t.startsWith("SELLER_CUSTOM_REQUEST_")) return "CUSTOM_REQUEST";
  if (t === "SELLER_REWARD_UNLOCKED") return "GOALS";
  if (t.startsWith("SELLER_")) return "ACCOUNT";
  return "NONE";
}

/** Where opening a notification goes on the web (app `NotificationDeepLinkBus`). Null: nowhere to go. */
export function notificationLink(n: AppNotification): { href: string | null; icon: Icon } {
  const ref = n.referenceId && ID.test(n.referenceId) ? n.referenceId : null;
  switch (targetOf(n)) {
    case "ORDER":
      return { href: ref ? `/orders?open=${ref}` : "/orders", icon: Package };
    case "PRODUCT":
      return { href: ref ? `/products/${ref}` : "/products", icon: Storefront };
    case "WALLET":
      return { href: "/wallet", icon: Wallet };
    case "SUPPORT":
      return { href: ref ? `/support/${ref}` : "/support", icon: Lifebuoy };
    case "CUSTOM_REQUEST":
      return { href: ref ? `/requests/${ref}` : "/requests", icon: ChatsCircle };
    case "REVIEW":
      return { href: "/reviews", icon: Star };
    case "GOALS":
      return { href: "/goals", icon: Target };
    case "ACCOUNT":
      return { href: "/store", icon: Gear };
    default:
      return { href: null, icon: Bell };
  }
}
