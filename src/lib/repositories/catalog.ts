import "server-only";

import { DEMO_PRODUCTS } from "@/lib/data/demo";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

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
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (!error && data) return data.map(mapProduct);
    if (error) console.error("Supabase products query failed:", error.message);
  }
  return DEMO_PRODUCTS.filter((product) => product.active);
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await listProducts();
  return products.find((product) => product.id === id) ?? null;
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
