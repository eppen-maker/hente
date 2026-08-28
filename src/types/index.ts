/**
 * Domain model for the SØR° fundraising platform.
 *
 * These types describe the shape of the data that will eventually live in
 * Postgres (via Supabase). Until the CRM is built, the same types back the
 * locally seeded demo data in `src/lib/data`.
 */

export type Currency = "NOK";

export type UUID = string;

export type ISODateString = string;

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A volume tier lowers the organization's purchase price from a given
 * quantity and up. Tiers are resolved from the highest matching
 * `minQuantity`, so they can be listed in any order.
 */
export interface PricingTier {
  /** Inclusive lower bound, in number of products. */
  minQuantity: number;
  /** Organization purchase price per product, incl. VAT. */
  organizationPrice: number;
  label?: string;
}

/**
 * Pricing is deliberately a first-class entity: a price list can be attached
 * to a product, to an organization, or to a single campaign. Nothing in the
 * UI is allowed to hardcode amounts — everything reads from here.
 */
export interface Pricing {
  id: UUID;
  name: string;
  currency: Currency;
  /** Recommended price the end customer pays, incl. VAT. */
  consumerPrice: number;
  /** Price the organization pays SØR°, incl. VAT. */
  organizationPrice: number;
  /** Norwegian VAT rate used to derive net figures, e.g. 0.25. */
  vatRate: number;
  /** Smallest order SØR° accepts for this price list. */
  minimumQuantity: number;
  /** Optional volume discounts. */
  tiers?: PricingTier[];
  validFrom?: ISODateString;
  validTo?: ISODateString;
}

/** The derived, ready-to-display economics for one product at one volume. */
export interface PricingBreakdown {
  currency: Currency;
  consumerPrice: number;
  organizationPrice: number;
  /** consumerPrice − organizationPrice */
  organizationMargin: number;
  /** organizationMargin / consumerPrice */
  marginRate: number;
  vatRate: number;
  /** The tier that produced `organizationPrice`, when one applied. */
  appliedTier?: PricingTier;
}

/* -------------------------------------------------------------------------- */
/* Product                                                                     */
/* -------------------------------------------------------------------------- */

export type ProductCategory =
  | "refill"
  | "starter-kit"
  | "accessory"
  | "bundle";

export interface ProductVariant {
  id: UUID;
  name: string;
  /** e.g. "500 ml" */
  size: string;
  scent?: string;
}

export interface Product {
  id: UUID;
  slug: string;
  name: string;
  /** Short editorial line used on cards. */
  tagline: string;
  description: string;
  category: ProductCategory;
  /** Pricing id, resolved through `src/lib/config/pricing.ts`. */
  pricingId: UUID;
  variants: ProductVariant[];
  ingredientsHighlight?: string[];
  /** Image is optional until real product photography is supplied. */
  imageUrl?: string;
  /** Tailwind-friendly tint used by the placeholder visual. */
  placeholderTone: "sand" | "stone" | "clay" | "sage" | "ink";
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/* Organization                                                                */
/* -------------------------------------------------------------------------- */

export type OrganizationType =
  | "sports-club"
  | "team"
  | "association"
  | "school"
  | "corps"
  | "other";

export interface OrganizationContact {
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface Organization {
  id: UUID;
  slug: string;
  name: string;
  type: OrganizationType;
  /** Norwegian organisasjonsnummer, 9 digits. */
  organizationNumber?: string;
  city?: string;
  /** Number of members expected to take part in a dugnad. */
  participantCount: number;
  contact: OrganizationContact;
  /** Overrides the default price list when a special agreement exists. */
  pricingId?: UUID;
  createdAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* Campaign                                                                    */
/* -------------------------------------------------------------------------- */

export type CampaignStatus =
  | "draft"
  | "planned"
  | "active"
  | "completed"
  | "cancelled";

export type CampaignGoalMode = "products-per-participant" | "profit-goal";

export interface FundraisingCampaign {
  id: UUID;
  organizationId: UUID;
  name: string;
  status: CampaignStatus;
  goalMode: CampaignGoalMode;
  participantCount: number;
  /** Set when goalMode is "products-per-participant". */
  productsPerParticipant?: number;
  /** Set when goalMode is "profit-goal", in whole NOK. */
  profitGoal?: number;
  /** Planned total volume, after rounding up per participant. */
  plannedProducts: number;
  pricingId: UUID;
  startsAt?: ISODateString;
  endsAt?: ISODateString;
  createdAt: ISODateString;
}

/** Everything the calculator derives for a campaign, in one object. */
export interface CampaignProjection {
  participants: number;
  productsPerParticipant: number;
  totalProducts: number;
  /** Total the organization keeps. */
  organizationProfit: number;
  /** What end customers pay in total. */
  totalConsumerSales: number;
  /** What the organization pays SØR°. */
  totalOrganizationCost: number;
  profitPerProduct: number;
  profitPerParticipant: number;
  pricing: PricingBreakdown;
  /** True when rounding up per participant lifted the volume above the goal. */
  roundedUp: boolean;
  /** The profit goal the projection was built from, when in profit-goal mode. */
  profitGoal?: number;
}

/* -------------------------------------------------------------------------- */
/* Order                                                                       */
/* -------------------------------------------------------------------------- */

export type OrderStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "in-production"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "cancelled";

export interface OrderLine {
  id: UUID;
  productId: UUID;
  variantId?: UUID;
  quantity: number;
  /** Snapshot of the price at the time of ordering. */
  unitOrganizationPrice: number;
  unitConsumerPrice: number;
}

export interface DeliveryAddress {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface Order {
  id: UUID;
  organizationId: UUID;
  campaignId?: UUID;
  status: OrderStatus;
  lines: OrderLine[];
  currency: Currency;
  /** Sum of lines × unitOrganizationPrice, incl. VAT. */
  totalOrganizationCost: number;
  /** Sum of lines × unitConsumerPrice, incl. VAT. */
  totalConsumerValue: number;
  /** totalConsumerValue − totalOrganizationCost */
  expectedProfit: number;
  deliveryAddress?: DeliveryAddress;
  requestedDeliveryDate?: ISODateString;
  note?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* Lead — the public "Start en dugnad" enquiry                                 */
/* -------------------------------------------------------------------------- */

export interface CampaignLead {
  id: UUID;
  organizationName: string;
  organizationType: OrganizationType;
  contactName: string;
  email: string;
  phone?: string;
  city?: string;
  participantCount: number;
  /** Carried over from the calculator, so sales sees the same numbers. */
  productsPerParticipant?: number;
  profitGoal?: number;
  estimatedProducts?: number;
  estimatedProfit?: number;
  message?: string;
  source: "calculator" | "homepage" | "contact" | "unknown";
  createdAt: ISODateString;
}
