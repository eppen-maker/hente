import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

import { readSeeded } from "./store";

/**
 * Columns a public query may read. Deliberately excludes
 * `landed_cost_ex_vat` — the internal cost never leaves the CRM.
 */
export const PUBLIC_PRODUCT_COLUMNS =
  "id, name, sku, description, size_ml, consumer_price, default_partner_price, " +
  "vat_rate, active, tagline, placeholder_tone, sort_order, image_url";

/** Maps a `products` row to the domain shape. */
export function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    description: (row.description as string | null) ?? null,
    sizeMl: row.size_ml == null ? null : Number(row.size_ml),
    consumerPrice: Number(row.consumer_price),
    defaultPartnerPrice: Number(row.default_partner_price),
    vatRate: Number(row.vat_rate),
    active: Boolean(row.active),
    tagline: (row.tagline as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    placeholderTone: (row.placeholder_tone as Product["placeholderTone"]) ?? "sand",
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: (row.created_at as string | undefined) ?? undefined,
  };
}

export async function listProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select(PUBLIC_PRODUCT_COLUMNS)
      .eq("active", true)
      .order("sort_order", { ascending: true });

    // The column list is composed at runtime, so supabase-js cannot infer the
    // row shape; the mapper validates every field it reads.
    if (!error && data) return (data as unknown as Record<string, unknown>[]).map(mapProduct);
    if (error) console.error("Supabase products query failed:", error.message);
  }

  const rows = await readSeeded("products");
  return rows
    .filter((product) => product.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await listProducts();
  return products.find((product) => product.id === id) ?? null;
}

/**
 * Our own landed cost for one product, read on its own.
 *
 * `PUBLIC_PRODUCT_COLUMNS` deliberately omits this column, so the few callers
 * that legitimately need it ask here instead of widening the public query.
 * INTERNAL ONLY: never put the result in an API response or a rendered page.
 */
export async function getLandedCostExVat(productId: string): Promise<number | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select("landed_cost_ex_vat")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.error("Supabase landed cost query failed:", error.message);
      return null;
    }
    const cost = (data as { landed_cost_ex_vat?: unknown } | null)?.landed_cost_ex_vat;
    return cost == null ? null : Number(cost);
  }

  const rows = await readSeeded("products");
  return rows.find((product) => product.id === productId)?.landedCostExVat ?? null;
}

/**
 * Strips the internal landed cost. Use this for anything that crosses to the
 * browser on a public page.
 */
export function toPublicProduct(product: Product): Product {
  const copy: Product = { ...product };
  delete copy.landedCostExVat;
  return copy;
}

/** The product a campaign sells when nothing more specific is configured. */
export async function getDefaultProduct(): Promise<Product> {
  const products = await listProducts();
  const first = products[0];
  if (!first) {
    throw new Error(
      "Ingen aktive produkter funnet. Kjør migrasjonene, eller sjekk src/lib/data/demo.",
    );
  }
  return first;
}
