import "server-only";

/**
 * The only backend endpoints the browser may reach through the proxy route, with the methods
 * allowed on each (handover §7.4: the seller scope of the API, nothing else). Admin, customer
 * and internal endpoints are refused here whatever the client asks. The backend still checks
 * the SELLER role and ownership on every one of them: this list only narrows what is reachable.
 */
const ID = "[0-9a-fA-F-]{36}";
const rules: Array<[string, RegExp]> = [
  // Account
  ["GET", /^\/auth\/seller\/me$/],
  ["POST", /^\/auth\/seller\/(request-otp|confirm-otp|resubmit)$/],
  ["POST", /^\/auth\/seller\/account\/(request-deletion|reactivate)$/],
  ["POST", /^\/auth\/seller\/(personal-info|documents|store-info)$/],

  // Store profile
  ["PUT", /^\/seller\/profile\/(payout-method|vacation-mode)$/],
  ["POST", /^\/seller\/profile\/store-info$/],

  // Home
  ["GET", /^\/seller\/home\/(stats|top-products|banners)$/],

  // Orders
  ["GET", /^\/seller\/orders$/],
  ["PATCH", new RegExp(`^/seller/orders/${ID}/status$`)],

  // Products
  ["GET", /^\/seller\/products\/my-products$/],
  ["POST", /^\/seller\/products$/],
  ["PUT", new RegExp(`^/seller/products/${ID}$`)],
  ["DELETE", new RegExp(`^/seller/products/${ID}/images/${ID}$`)],
  ["PATCH", new RegExp(`^/seller/products/${ID}/(stock|activate|deactivate)$`)],
  ["PATCH", /^\/seller\/products\/capacity$/],

  // Selling price suggestion
  ["POST", /^\/seller\/pricing\/suggest$/],
  ["POST", new RegExp(`^/seller/pricing/suggestions/${ID}/accept$`)],

  // Discounts
  ["GET", /^\/seller\/discounts$/],
  ["POST", /^\/seller\/discounts$/],
  ["GET", new RegExp(`^/seller/discounts/(${ID}|product/${ID})$`)],
  ["PUT", new RegExp(`^/seller/discounts/${ID}$`)],
  ["DELETE", new RegExp(`^/seller/discounts/${ID}$`)],
  ["PATCH", new RegExp(`^/seller/discounts/${ID}/(activate|deactivate)$`)],

  // Finance
  ["GET", /^\/seller\/finance\/(wallet|ledgers|earnings-chart|payouts\/requests)$/],
  ["POST", /^\/seller\/finance\/payouts\/request$/],

  // Boost
  ["GET", /^\/seller\/boost\/(plans|campaigns)$/],
  ["POST", /^\/seller\/boost\/purchase$/],

  // Reviews
  ["GET", /^\/seller\/reviews(\/summary)?$/],
  ["GET", new RegExp(`^/seller/reviews/${ID}$`)],
  ["GET", new RegExp(`^/seller/products/${ID}/reviews$`)],
  ["PUT", new RegExp(`^/seller/reviews/${ID}/reply$`)],
  ["DELETE", new RegExp(`^/seller/reviews/${ID}/reply$`)],
  ["POST", new RegExp(`^/seller/reviews/${ID}/report$`)],

  // Custom requests
  ["GET", /^\/seller\/custom-requests(\/pending-count)?$/],
  ["GET", new RegExp(`^/seller/custom-requests/${ID}$`)],
  ["POST", new RegExp(`^/seller/custom-requests/${ID}/(ask|offer|decline)$`)],

  // Goals
  ["GET", /^\/seller\/goals$/],
  ["POST", new RegExp(`^/seller/goals/rewards/${ID}/seen$`)],

  // Support
  ["GET", /^\/seller\/support\/conversations$/],
  ["POST", /^\/seller\/support\/conversations$/],
  ["GET", new RegExp(`^/seller/support/conversations/${ID}/messages$`)],
  ["POST", new RegExp(`^/seller/support/conversations/${ID}/(messages|read)$`)],

  // Notifications (the proxy forces audience=SELLER on these)
  ["GET", /^\/notifications(\/unread-count)?$/],
  ["PATCH", new RegExp(`^/notifications/(${ID}/read|read-all)$`)],
  // This browser's push registration (web push through Firebase Cloud Messaging)
  ["POST", /^\/notifications\/device-token$/],
  ["DELETE", /^\/notifications\/device-token$/],

  // Shared reference data
  ["GET", /^\/categories(\/tree)?$/],
  ["GET", new RegExp(`^/categories/${ID}$`)],
  ["GET", /^\/regions$/],
  ["GET", new RegExp(`^/regions/${ID}/children$`)],
  ["GET", /^\/legal\/[A-Z_]{2,40}$/],
];

export function isAllowed(method: string, path: string): boolean {
  return rules.some(([m, re]) => m === method && re.test(path));
}

/** Notification endpoints serve both apps; the seller site only ever asks for seller ones. */
export function forcedQuery(path: string): Record<string, string> | null {
  return path.startsWith("/notifications") ? { audience: "SELLER" } : null;
}
