"use client";

import { useEffect } from "react";
import type { Analytics } from "firebase/analytics";
import { firebaseConfig } from "./config";
import { firebaseApp } from "./firebase";

/**
 * Firebase Analytics for the web, mirroring the app's `IAnalyticsManager`: the same event names
 * and params, so web and app sellers land in the same funnels. Ids, enums and amounts only:
 * never names, phone numbers, addresses or free text.
 */
type Mod = typeof import("firebase/analytics");
let ready: Promise<{ a: Analytics; mod: Mod } | null> | null = null;

function load() {
  if (typeof window === "undefined" || !firebaseConfig?.measurementId) return Promise.resolve(null);
  ready ??= (async () => {
    const mod = await import("firebase/analytics");
    if (!(await mod.isSupported())) return null;
    const app = await firebaseApp();
    if (!app) return null;
    const a = mod.getAnalytics(app);
    // Every report says it came from the seller website, next to the app's account_type = seller.
    mod.setUserProperties(a, { account_type: "seller", platform: "web", app_env: process.env.NEXT_PUBLIC_APP_ENV ?? null });
    return { a, mod };
  })().catch(() => null);
  return ready;
}

/** Event names from the app's `AnalyticsEvent`, plus web-only ones marked as such. */
export const E = {
  SIGN_UP: "sign_up",
  REGISTRATION_SUBMITTED: "registration_submitted",
  /** Web: a rejected application sent back for review. */
  REGISTRATION_RESUBMITTED: "registration_resubmitted",
  LOGIN: "login",
  LOGOUT: "logout",
  FORGOT_PASSWORD_USED: "forgot_password_used",
  ACCOUNT_DELETION_REQUESTED: "account_deletion_requested",
  ACCOUNT_REACTIVATED: "account_reactivated",
  PRODUCT_CREATION_STARTED: "product_creation_started",
  PRODUCT_CREATION_SUCCESS: "product_creation_success",
  PRODUCT_RESUBMITTED: "product_resubmitted",
  PRODUCT_ACTIVATED: "product_activated",
  PRODUCT_DEACTIVATED: "product_deactivated",
  PRODUCT_STOCK_UPDATED: "product_stock_updated",
  ORDER_DETAILS_OPENED: "order_details_opened",
  ORDER_STATUS_CHANGED: "order_status_changed",
  HOME_PENDING_ORDER_CLICKED: "home_pending_order_clicked",
  HOME_BANNER_CLICKED: "home_banner_clicked",
  WALLET_SCREEN_OPENED: "wallet_screen_opened",
  PAYOUT_REQUESTED: "payout_requested",
  DISCOUNT_CREATED: "discount_created",
  BOOST_SCREEN_OPENED: "boost_screen_opened",
  BOOST_TARGET_SELECTED: "boost_target_selected",
  BOOST_PLAN_CLICKED: "boost_plan_clicked",
  BOOST_PAYMENT_INITIATED: "boost_payment_initiated",
  BOOST_PURCHASE_SUCCESS: "boost_purchase_success",
  BOOST_PURCHASE_FAILED: "boost_purchase_failed",
  SUPPORT_MESSAGE_SENT: "support_message_sent",
  CUSTOM_REQUEST_OFFER_SENT: "custom_request_offer_sent",
  CUSTOM_REQUEST_DECLINED: "custom_request_declined",
  SELLER_GOAL_VIEWED: "seller_goal_viewed",
  SELLER_GOAL_COMPLETED: "seller_goal_completed",
  NOTIFICATION_OPENED: "notification_opened",
  NOTIFICATION_PERMISSION: "notification_permission",
  SCREEN_VIEW: "screen_view",
  EXCEPTION: "exception",
} as const;

export type Params = Record<string, string | number | boolean | null | undefined>;

/** GA4 keeps parameter values to 100 characters. */
function clean(params: Params = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "string" ? v.slice(0, 100) : v;
  }
  return out;
}

export function track(name: string, params?: Params) {
  void load().then((x) => x && x.mod.logEvent(x.a, name, clean(params)));
}

/** Ties later events to this seller's opaque id (the app's `SellerSession.identify`); null on logout. */
export function identifyAnalytics(id: string | null) {
  void load().then((x) => x && x.mod.setUserId(x.a, id));
}

export function setAnalyticsProperty(key: string, value: string | null) {
  void load().then((x) => x && x.mod.setUserProperties(x.a, { [key]: value }));
}

/** Logs `name` once `work` succeeds (the app logs only what the server confirmed), passing the result through. */
export function tracked<T>(work: Promise<T>, name: string, params?: Params | ((result: T) => Params)): Promise<T> {
  return work.then((result) => {
    track(name, typeof params === "function" ? params(result) : params);
    return result;
  });
}

/** Logs `name` once when a screen opens (the app logs these from its view models' init). */
export function useTrackOpen(name: string) {
  useEffect(() => track(name), [name]);
}
