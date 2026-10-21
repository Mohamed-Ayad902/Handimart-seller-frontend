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
  fbPage?: string | null;
  instaPage?: string | null;
  website?: string | null;
  location?: StoreLocation | null;
  region?: RegionItem | null;
  regionPath?: RegionItem[] | null;
  categories?: Category[] | null;
  /** Lombok drops the `is` of a primitive boolean, so the JSON key is `boosted`. */
  boosted?: boolean;
  boostActiveUntil?: string | null;
}

export interface StoreLocation {
  city: string | null;
  district: string | null;
  detailedAddress: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RegionItem {
  id: string;
  name: string;
  type: "GOVERNORATE" | "CITY" | "AREA";
  hasChildren: boolean | null;
}

export type PayoutMethod = "INSTAPAY" | "BANK_TRANSFER" | "MOBILE_WALLET";

/** `StoreRequest`: the JSON `body` part of `POST /seller/profile/store-info`. */
export interface StoreRequest {
  name: string;
  description: string;
  fbPage: string | null;
  instaPage: string | null;
  website: string | null;
  location: { city: string; detailedAddress: string };
  categoryIds: string[];
  regionId: string | null;
}

export interface LegalDocument {
  type: "PRIVACY_POLICY" | "TERMS_OF_SERVICE";
  title: string;
  content: string;
  updatedAt: string | null;
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
  payoutMethod: PayoutMethod | null;
  payoutAccountIdentifier: string | null;
}

export type LedgerType = "ESCROW_HOLD" | "ESCROW_CANCELLED" | "EARNING" | "WITHDRAWAL" | "REFUND_DEDUCTION" | "BOOST_FEE";
export type LedgerStatus = "PENDING" | "COMPLETED" | "REJECTED";

/** `WalletLedgerResponse`: one movement on the seller's wallet, newest first. */
export interface LedgerEntry {
  id: string;
  orderId: string | null;
  type: LedgerType | string;
  status: LedgerStatus | string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export type ChartRange = "LAST_7_DAYS" | "TODAY" | "LAST_MONTH" | "CUSTOM";

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

/* ---------------------------------------------------------------- products (ProductResponse) */

export type ProductType = "READY_MADE" | "MADE_TO_ORDER";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProductRejectionReason = "INAPPROPRIATE_CONTENT" | "POOR_IMAGE_QUALITY" | "INCORRECT_CATEGORY" | "PRICING_ERROR" | "COUNTERFEIT_ITEM" | "OTHER";
export type ProductAvailability = "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";
export const SHIPPING_FLAGS = ["FRAGILE", "GLASS_ITEM", "SPECIAL_HANDLING", "REQUIRES_SIGNATURE", "ASSEMBLY_REQUIRED"] as const;
export type ShippingFlag = (typeof SHIPPING_FLAGS)[number];

export interface ProductMedia {
  id: string;
  url: string | null;
  type: "IMAGE" | "VIDEO" | "UNKNOWN";
}

export interface Dimensions {
  weightKg: number | null;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
}

export interface CustomizationValue {
  id?: string;
  value: string;
  additionalPrice: number | null;
  additionalTimeMinutes: number | null;
}

export interface Customization {
  id?: string;
  label: string;
  required: boolean;
  values: CustomizationValue[];
}

export interface PriceChange {
  oldPrice: number;
  newPrice: number;
  changedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  basePrice: number;
  currentPrice: number;
  productType: ProductType;
  approvalStatus: ApprovalStatus;
  /** JSON key is `active` (Lombok getter `isActive()` on a primitive boolean), as the app reads it. */
  active: boolean;
  rejectionReason: ProductRejectionReason | null;
  reviewComment: string | null;
  estimatedDeliveryTimeMinutes: number | null;
  stockQuantity: number | null;
  categoryName: string | null;
  categoryId: string;
  averageRating: number | null;
  totalReviews: number | null;
  media: ProductMedia[];
  customizations: Customization[] | null;
  shippingFlags: ShippingFlag[] | null;
  boosted: boolean;
  boostActiveUntil: string | null;
  totalSold: number | null;
  availability: ProductAvailability | null;
  dimensions: Dimensions | null;
  createdAt: string;
  updatedAt: string | null;
  priceHistory: PriceChange[] | null;
}

/** `ProductRequest`: the JSON `body` part of create and update. */
export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  dimensions: Dimensions;
  productType: ProductType;
  stockQuantity: number;
  preparationTimeMinutes: number;
  shippingFlags: ShippingFlag[];
  attributes: Record<string, string>;
  customizations: Customization[];
}

export interface Category {
  id: string;
  name: string;
  slug: string | null;
  parentId: string | null;
  imageUrl: string | null;
  children: Category[] | null;
  isActive: boolean;
}
