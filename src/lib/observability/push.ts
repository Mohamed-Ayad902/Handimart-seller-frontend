"use client";

import { send } from "@/lib/client/api";
import { E, track } from "./analytics";
import { crash } from "./crash";
import { firebaseConfig, vapidKey } from "./config";
import { firebaseApp } from "./firebase";

/**
 * Browser push for new orders, requests and messages, so a seller who only uses the website
 * still hears about them (the app's FCM registration, `SyncFcmTokenUC`). The browser's FCM token
 * is registered with the backend as a WEB device of the SELLER app, and `public/push-sw.js`
 * shows what arrives while the site is closed.
 */
const TOKEN_KEY = "hm-push-token";
/** Set when the seller switched pushes off here; the browser's permission itself can't be taken back by a page. */
const OFF_KEY = "hm-push-off";
const SW_URL = "/push-sw.js";

export type PushState = "unsupported" | "default" | "granted" | "denied";

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** For `useSyncExternalStore`: told when the seller switches pushes on or off here. */
export function subscribePush(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function pushState(): PushState {
  if (typeof window === "undefined" || !firebaseConfig?.messagingSenderId || !vapidKey) return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission as PushState;
}

function remember(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the token is registered again next visit */
  }
}

function remembered() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setOff(off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, "1");
    else localStorage.removeItem(OFF_KEY);
  } catch {
    /* private mode */
  }
}

/** Whether this browser gets pushes now: permission given and not switched off here. */
export function pushOn(): boolean {
  if (pushState() !== "granted") return false;
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Gets this browser's token and hands it to the backend. Needs permission already granted. */
async function register(): Promise<boolean> {
  const app = await firebaseApp();
  const mod = await import("firebase/messaging");
  if (!app || !(await mod.isSupported())) return false;
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  const token = await mod.getToken(mod.getMessaging(app), { vapidKey: vapidKey!, serviceWorkerRegistration: registration });
  if (!token) return false;
  await send<null>("/api/bff/notifications/device-token", { method: "POST", body: { deviceToken: token, deviceType: "WEB", app: "SELLER" } });
  remember(token);
  return true;
}

/** Asks for permission (call from a click) and registers. Resolves to the resulting state. */
export async function enablePush(): Promise<PushState> {
  if (pushState() === "unsupported") return "unsupported";
  setOff(false);
  const answer = await Notification.requestPermission();
  track(E.NOTIFICATION_PERMISSION, { granted: answer === "granted", source: "web" });
  changed();
  if (answer !== "granted") return answer as PushState;
  try {
    await register();
  } catch (error) {
    crash.log("push: register failed");
    crash.recordNonFatal(error);
  }
  return "granted";
}

/** On each signed-in visit: keep the backend's token current when permission was given before. */
export function syncPush() {
  if (!pushOn()) return;
  register().catch(() => crash.log("push: sync failed"));
}

/** On logout: this browser stops getting the seller's pushes. Never blocks signing out. */
export async function disablePush() {
  const token = remembered();
  remember(null);
  if (!token) return;
  try {
    await send<null>("/api/bff/notifications/device-token", { method: "DELETE", body: { deviceToken: token } });
    const app = await firebaseApp();
    if (app) await import("firebase/messaging").then((m) => m.deleteToken(m.getMessaging(app)));
  } catch {
    /* the backend drops tokens FCM reports dead */
  }
}

/** The seller's own switch: stop pushes on this browser, and keep them off on later visits. */
export async function turnOffPush() {
  setOff(true);
  changed();
  await disablePush();
}

/** While a tab is open, pushes arrive here instead of as a system notification. */
export async function onForegroundPush(handler: (title: string, body: string) => void): Promise<() => void> {
  if (!pushOn()) return () => {};
  const app = await firebaseApp();
  const mod = await import("firebase/messaging");
  if (!app || !(await mod.isSupported())) return () => {};
  return mod.onMessage(mod.getMessaging(app), (payload) => handler(payload.notification?.title ?? "", payload.notification?.body ?? ""));
}
