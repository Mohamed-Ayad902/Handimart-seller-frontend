import type { Icon } from "@phosphor-icons/react";
import { Bell, ChatsCircle, Gear, House, Lifebuoy, Package, Rocket, Star, Storefront, Tag, Target, Wallet } from "@phosphor-icons/react";

export type BadgeKey = "pendingOrders" | "pendingRequests" | "awaitingReviews";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  badge?: BadgeKey;
  /** Not built on the web yet: listed so sellers know it's coming, but not a link. */
  soon?: boolean;
}

/** Sidebar groups (handover §7.2), worded like the app's tabs. */
export const NAV: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/", label: "الرئيسية", icon: House },
      { href: "/orders", label: "الطلبات", icon: Package, badge: "pendingOrders" },
      { href: "/requests", label: "طلبات تفصيل", icon: ChatsCircle, badge: "pendingRequests", soon: true },
      { href: "/products", label: "المنتجات", icon: Storefront },
    ],
  },
  {
    title: "الترويج",
    items: [
      { href: "/promotions/discounts", label: "الخصومات", icon: Tag, soon: true },
      { href: "/promotions/boost", label: "روّج متجرك", icon: Rocket, soon: true },
    ],
  },
  {
    title: "الشغل والفلوس",
    items: [
      { href: "/wallet", label: "المحفظة", icon: Wallet },
      { href: "/reviews", label: "التقييمات", icon: Star, badge: "awaitingReviews", soon: true },
      { href: "/goals", label: "الأهداف", icon: Target, soon: true },
    ],
  },
  {
    title: "الحساب",
    items: [
      { href: "/notifications", label: "الإشعارات", icon: Bell, soon: true },
      { href: "/support", label: "الدعم", icon: Lifebuoy, soon: true },
      { href: "/store", label: "متجري", icon: Gear },
    ],
  },
];

/** Phone tab bar: the built destinations, then "more" opens the full list. */
export const TABS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/orders", label: "الطلبات", icon: Package, badge: "pendingOrders" },
  { href: "/products", label: "المنتجات", icon: Storefront },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
