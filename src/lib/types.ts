/**
 * API contracts used by the seller site, ported field for field from the backend DTOs
 * (handimart-backend `develop`). Field names are the backend's; nothing here is invented.
 */

export interface Page<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/* ---------------------------------------------------------------- account (SellerDto) */

export type AccountStatus = "ONBOARDING" | "IN_REVIEW" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type RegistrationStatus =
  | "COMPLETED_BASIC_INFO"
  | "COMPLETED_PERSONAL_INFO"
  | "COMPLETED_DOCUMENTS_INFO"
  | "COMPLETED_STORE_INFO"
  | "REQUESTED_OTP"
  | "COMPLETED_OTP";
export type RejectionReason =
  | "INCOMPLETE_PERSONAL_INFO"
  | "INVALID_DOCUMENTS"
  | "FRAUDULENT_ACTIVITY"
  | "STORE_POLICY_VIOLATION"
  | "LOW_QUALITY_STORE_ASSETS"
  | "OTHER";

export interface SellerUser {
  id: string;
  phone: string;
  email: string | null;
  displayName: string | null;
  profilePicUrl: string | null;
  isMale: boolean | null;
  deletionRequestedAt: string | null;
  accountState: "ACTIVE" | "SCHEDULED_FOR_DELETION" | null;
  deletionScheduledFor: string | null;
}

export interface Store {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  vacationMode: boolean;
  isBoosted?: boolean;
  boostActiveUntil?: string | null;
}

export interface Seller {
  user: SellerUser | null;
  registrationStatus: RegistrationStatus | null;
  store: Store | null;
  accountStatus: AccountStatus | null;
  rejectionReason: RejectionReason | null;
  adminComment: string | null;
  suspensionUntil: string | null;
}

/* ---------------------------------------------------------------- home */

export interface HomeStats {
  totalOrders: number;
  pendingOrders: number;
  storeAverageRating: number | null;
  totalReviews: number;
}

export interface TopProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  unitsSold: number;
  currentPrice: number;
}

export interface Banner {
  id: string;
  mediaUrl: string | null;
  mediaType: "IMAGE" | "VIDEO" | string;
  title: string | null;
  description: string | null;
  actionType: string | null;
  actionUrl: string | null;
}

export interface Wallet {
  availableBalance: number;
  pendingBalance: number;
  commissionDebt: number;
  lifetimeEarnings: number;
  payoutMethod: "INSTAPAY" | "BANK_TRANSFER" | "MOBILE_WALLET" | null;
  payoutAccountIdentifier: string | null;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingCounts: { rating: number; count: number }[];
  withPhotosCount: number;
  awaitingReplyCount: number | null;
}

/* ---------------------------------------------------------------- orders */

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type PaymentMethod = "CASH_ON_DELIVERY" | "CREDIT_CARD" | "WALLET";

export interface ShippingAddress {
  city: string | null;
  district: string | null;
  detailedAddress: string | null;
  regionPath: string | null;
  label: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
}

export interface OrderItem {
  productName: string;
  productSlug: string | null;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
  selectedAttributes: string | null;
  customizationNotes: string | null;
  customRequestId: string | null;
}

export interface SellerOrder {
  id: string;
  customerName: string | null;
  items: OrderItem[];
  itemsSubtotal: number;
  platformCommission: number;
  netEarning: number;
  platformFeeSaved: number | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress | null;
  estimatedDeliveryDays: number | null;
  shippingCompany: string | null;
  trackingNumber: string | null;
  createdAt: string;
  canDecline: boolean;
  canCancel: boolean;
}

/** The four statuses the backend lets a seller set (`OrderService.updateOrderStatusBySeller`). */
export type SellerSettableStatus = "CONFIRMED" | "PREPARING" | "READY_FOR_SHIPPING" | "CANCELLED";

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
}
