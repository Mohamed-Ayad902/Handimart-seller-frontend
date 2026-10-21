/**
 * The Firebase web app of the HandiMart project (the one the mobile apps report to). These are
 * public identifiers, not secrets: they only say where the browser sends analytics, crash
 * reports and push registrations. Leave them unset and the site runs without any of that.
 */
const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
};

export const firebaseConfig =
  env.apiKey && env.projectId && env.appId
    ? {
        apiKey: env.apiKey,
        projectId: env.projectId,
        appId: env.appId,
        authDomain: `${env.projectId}.firebaseapp.com`,
        messagingSenderId: env.messagingSenderId,
        measurementId: env.measurementId,
      }
    : null;

/** Web push needs the project's Web Push certificate key as well (Cloud Messaging settings). */
export const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() || null;
