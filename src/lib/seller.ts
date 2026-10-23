import type { Seller } from "./types";

/**
 * The review team's note to the seller. Steps the backend records itself (sign-up finished,
 * resubmitted) carry a message key like "msg.onboarding.complete.review" in the same field,
 * which is not a note, so it is left out.
 */
export function teamComment(seller: Pick<Seller, "adminComment">): string | null {
  const c = seller.adminComment?.trim();
  return c && !/^msg\.[\w.]+$/.test(c) ? c : null;
}
