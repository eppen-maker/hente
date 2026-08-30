/**
 * Domain model for the SØR° fundraising platform.
 *
 * These types are the TypeScript mirror of the Postgres schema in
 * `supabase/migrations`. Rows come back snake_cased from Supabase and are
 * mapped to these camelCase shapes in `src/lib/repositories`.
 */

export type Currency = "NOK";
export type UUID = string;
export type ISODateString = string;
/** Date without a time component, e.g. "2026-09-21". */
export type DateString = string;

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A volume tier lowers the organization's purchase price from a given
 * quantity and up. Tiers are resolved from the highest matching
 * `minQuantity`, so they can be listed in any order.
 */
export interface PricingTier {
  minQuantity: number;
  /** Upper bound, inclusive. `null` means "and up". */
  maxQuantity?: number | null;
  /** Organization purchase price per product, incl. VAT. */
  organizationPrice: number;
  label?: string;
}

/** A named price list. Attachable to a product, organization or campaign. */
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
  minimumQuantity: number;
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
  /** True when the price came from a campaign agreement rather than a default. */
  fromCampaignAgreement?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Products                                                                    */
/* -------------------------------------------------------------------------- */

/** A sellable product — the `products` table. */
export interface Product {
  id: UUID;
  name: string;
  sku: string;
  description?: string | null;
  sizeMl?: number | null;
  consumerPrice: number;
  defaultPartnerPrice: number;
  vatRate: number;
  active: boolean;
  /** Presentation only. */
  tagline?: string | null;
  imageUrl?: string | null;
  placeholderTone: PlaceholderTone;
  sortOrder: number;
  /**
   * INTERNAL ONLY — SØR°'s own landed cost per unit, ex VAT.
   * Never send this to a public page or a public API response.
   */
  landedCostExVat?: number | null;
  createdAt?: ISODateString;
}

/** A product with the internal cost stripped, for anything public-facing. */
export type PublicProduct = Omit<Product, "landedCostExVat">;

export type PlaceholderTone = "sand" | "stone" | "clay" | "sage" | "ink";

export type ProductCategory = "refill" | "starter-kit" | "accessory" | "bundle";

export interface ProductVariant {
  id: UUID;
  name: string;
  /** e.g. "500 ml" */
  size: string;
  scent?: string;
}

/**
 * Editorial catalogue entry used by the marketing pages. Separate from
 * `Product` on purpose: this carries copy and imagery, not order economics.
 */
export interface CatalogueProduct {
  id: UUID;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  /** Price list used for the figures shown on the marketing pages. */
  pricingId: UUID;
  variants: ProductVariant[];
  ingredientsHighlight?: string[];
  imageUrl?: string;
  placeholderTone: PlaceholderTone;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/* Organizations                                                               */
/* -------------------------------------------------------------------------- */

export type OrganizationStatus = "lead" | "active" | "inactive";

export type OrganizationType =
  | "sports-club"
  | "team"
  | "association"
  | "school"
  | "corps"
  | "other";

/** The `organizations` table. */
export interface Organization {
  id: UUID;
  name: string;
  organizationNumber?: string | null;
  slug: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  status: OrganizationStatus;
  /** INTERNAL ONLY. */
  internalNotes?: string | null;
  nextAction?: string | null;
  nextActionAt?: DateString | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/** The subset of an organization the public order page is allowed to see. */
export type PublicOrganization = Pick<Organization, "id" | "name" | "slug" | "city">;

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                   */
/* -------------------------------------------------------------------------- */

export type CampaignStatus =
  | "draft"
  | "planned"
  | "active"
  | "ordered"
  | "in_production"
  | "ready_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

/** How a club chose to plan the volume. */
export type CampaignGoalMode = "per-participant" | "profit-goal" | "total-volume";

/** The `campaigns` table. */
export interface Campaign {
  id: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
  participants: number;
  targetProfit?: number | null;
  status: CampaignStatus;
  startDate?: DateString | null;
  orderDeadline?: DateString | null;
  deliveryDate?: DateString | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/** The `campaign_pricing` table — what a specific club agreed to pay. */
export interface CampaignPricing {
  id: UUID;
  campaignId: UUID;
  productId: UUID;
  partnerPrice: number;
  consumerPrice: number;
  /** Generated in the database: consumerPrice − partnerPrice. */
  organizationMargin: number;
}

/** Everything the campaign order page needs, resolved in one query. */
export interface CampaignWithPricing {
  campaign: Campaign;
  organization: PublicOrganization;
  /** The product this campaign sells. */
  product: Product;
  /** Agreed pricing, when the campaign has its own agreement. */
  pricing: CampaignPricing | null;
  /** Optional configured volume tiers. Empty when none are configured. */
  volumeTiers: PricingTier[];
}

/** Everything the calculator derives for a campaign, in one object. */
export interface CampaignProjection {
  participants: number;
  productsPerParticipant: number;
  totalProducts: number;
  organizationProfit: number;
  totalConsumerSales: number;
  totalOrganizationCost: number;
  profitPerProduct: number;
  profitPerParticipant: number;
  pricing: PricingBreakdown;
  /** True when rounding up per participant lifted the volume above the goal. */
  roundedUp: boolean;
  profitGoal?: number;
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

export type OrderStatus =
  | "received"
  | "confirmed"
  | "in_production"
  | "packed"
  | "shipped"
  | "delivered"
  | "invoiced"
  | "cancelled";

/**
 * Invoicing today. A payment provider can be added later by moving this
 * through `pending` → `paid` without touching the order model.
 */
export type PaymentStatus = "not_required" | "pending" | "paid" | "refunded";

/** The `order_items` table. All amounts are snapshots taken at order time. */
export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  quantity: number;
  /** What the organization pays per unit, incl. VAT. */
  unitPrice: number;
  /** Recommended consumer price per unit at order time. */
  consumerPrice: number;
  organizationMargin: number;
  lineTotal: number;
}

/** The `orders` table. */
export interface Order {
  id: UUID;
  organizationId: UUID;
  campaignId?: UUID | null;
  /** Human-readable, e.g. "SOR-2026-0001". Generated in the database. */
  orderNumber: string;
  contactName: string;
  email: string;
  phone?: string | null;
  status: OrderStatus;
  /** Net of VAT. */
  subtotal: number;
  vat: number;
  /** Gross — what the organization is invoiced. */
  total: number;
  /** What the organization expects to keep after selling everything. */
  organizationProfit: number;
  participants: number;
  notes?: string | null;
  requestedDeliveryDate?: DateString | null;
  paymentStatus: PaymentStatus;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
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
  productsPerParticipant?: number;
  profitGoal?: number;
  estimatedProducts?: number;
  estimatedProfit?: number;
  message?: string;
  source: "calculator" | "homepage" | "contact" | "campaign" | "unknown";
  createdAt: ISODateString;
}

/* -------------------------------------------------------------------------- */
/* CRM — internal only                                                         */
/* -------------------------------------------------------------------------- */

/** Pricing agreed with an organization, across all of its campaigns. */
export interface OrganizationPricing {
  id: UUID;
  organizationId: UUID;
  productId: UUID;
  partnerPrice: number;
  consumerPrice: number;
  organizationMargin: number;
  note?: string | null;
}

/** Where an agreed price came from. Shown to admins, never to the public. */
export type PricingSource =
  | "campaign"
  | "organization"
  | "volume"
  | "product-default";

export type DeliveryStatus = "not_planned" | "planned" | "in_transit" | "delivered";

export interface Delivery {
  id: UUID;
  orderId: UUID;
  organizationId: UUID;
  quantity: number;
  requestedDate?: DateString | null;
  confirmedDate?: DateString | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  status: DeliveryStatus;
  trackingReference?: string | null;
  notes?: string | null;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export type ActivityEntityType =
  | "organization"
  | "campaign"
  | "order"
  | "delivery"
  | "product";

export type ActivityKind =
  | "note"
  | "status_change"
  | "created"
  | "updated"
  | "contact";

/** One row per meaningful change. Status changes are written automatically. */
export interface ActivityEntry {
  id: UUID;
  entityType: ActivityEntityType;
  entityId: UUID;
  organizationId?: UUID | null;
  kind: ActivityKind;
  summary: string;
  detail?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  actor: string;
  createdAt: ISODateString;
}

/** Internal unit economics for one product. Admin only. */
export interface InternalUnitEconomics {
  /** Consumer price ex VAT — what the end customer pays, net. */
  consumerPriceExVat: number;
  /** What SØR° invoices the organization, net of VAT. */
  revenueExVat: number;
  /** SØR°'s landed cost per unit, ex VAT. Null when not configured. */
  landedCostExVat: number | null;
  /** revenueExVat − landedCostExVat. Null when the cost is unknown. */
  grossProfitPerUnit: number | null;
  /** grossProfitPerUnit / revenueExVat. */
  grossMargin: number | null;
  /** What the organization keeps per unit, incl. VAT. */
  organizationMargin: number;
}

/** Internal economics aggregated over a set of order lines. */
export interface InternalEconomics {
  units: number;
  revenueExVat: number;
  cogs: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  organizationProfit: number;
  /** True when at least one product is missing a landed cost. */
  incomplete: boolean;
}
