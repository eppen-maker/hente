export type UserRole = "SORKYST_ADMIN" | "CLUB_ADMIN" | "TEAM_ADMIN" | "SELLER";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "PICKUP" | "COMPLETED";
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
export type PickupStatus = "NOT_READY" | "READY" | "PICKED_UP";
export type DeliveryStatus = "NOT_DELIVERED" | "DELIVERED";

export interface Profile {
  id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  organisation_number: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  season: string | null;
  active: boolean;
}

export interface Campaign {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  sales_target_quantity: number;
  sales_target_amount: number;
  retail_price_inc_vat: number;
  club_earning_per_unit: number;
  vat_rate_bp: number;
  status: CampaignStatus;
  leaderboard_enabled: boolean;
  pickup_location: string | null;
  pickup_date: string | null;
  closed_at: string | null;
}

export interface Seller {
  id: string;
  campaign_id: string;
  team_id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  seller_code: string;
  sales_target: number;
  active: boolean;
}

export interface Order {
  id: string;
  campaign_id: string;
  club_id: string;
  team_id: string;
  seller_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  quantity: number;
  unit_price_inc_vat: number;
  gross_amount: number;
  club_earning_amount: number;
  sorkyst_amount_inc_vat: number;
  vat_amount: number;
  sorkyst_revenue_ex_vat: number;
  vat_rate_bp: number;
  payment_provider: string;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
}

export interface SellerPickup {
  id: string;
  campaign_id: string;
  seller_id: string;
  expected_quantity: number;
  actual_quantity: number | null;
  status: PickupStatus;
  pickup_code: string;
  picked_up_at: string | null;
  confirmed_by: string | null;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  seller_id: string;
  status: DeliveryStatus;
  delivered_at: string | null;
}

export const sellerFullName = (s: Pick<Seller, "first_name" | "last_name">) => `${s.first_name} ${s.last_name}`.trim();
export const profileFullName = (p: Pick<Profile, "first_name" | "last_name">) => `${p.first_name} ${p.last_name}`.trim();
