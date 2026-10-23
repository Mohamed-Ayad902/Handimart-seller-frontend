"use client";

import type { FirebaseApp } from "firebase/app";
import { firebaseConfig } from "./config";

let app: Promise<FirebaseApp | null> | null = null;

/** The Firebase app, loaded on first use so pages that never report anything don't pay for it. */
export function firebaseApp(): Promise<FirebaseApp | null> {
  if (typeof window === "undefined" || !firebaseConfig) return Promise.resolve(null);
  app ??= import("firebase/app")
    .then(({ getApps, initializeApp }) => getApps()[0] ?? initializeApp(firebaseConfig!))
    .catch(() => null);
  return app;
}
