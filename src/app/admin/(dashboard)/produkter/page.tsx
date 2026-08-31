import { AdminPage, InternalTag, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { unitEconomics } from "@/lib/admin/economics";
import { listAdminProducts } from "@/lib/repositories/admin";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { Product } from "@/types";
import { saveProductAction } from "../actions";

export const metadata = { title: "Produkter" };

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-ink";
const label = "text-eyebrow text-ink-muted";

const TONES: Product["placeholderTone"][] = ["sand", "stone", "clay", "sage", "ink"];

function ProductForm({ product }: { product?: Product }) {
  const isNew = !product;

  return (
    <form action={saveProductAction} className="grid gap-4 lg:grid-cols-3">
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`name-${product?.id ?? "new"}`}>Navn</label>
        <input id={`name-${product?.id ?? "new"}`} name="name" defaultValue={product?.name ?? ""} className={field} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`sku-${product?.id ?? "new"}`}>SKU</label>
        <input id={`sku-${product?.id ?? "new"}`} name="sku" defaultValue={product?.sku ?? ""} className={field} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`sizeMl-${product?.id ?? "new"}`}>Størrelse (ml)</label>
        <input id={`sizeMl-${product?.id ?? "new"}`} name="sizeMl" inputMode="numeric" defaultValue={product?.sizeMl ?? ""} className={field} />
      </div>

      <div className="flex flex-col gap-1.5 lg:col-span-3">
        <label className={label} htmlFor={`description-${product?.id ?? "new"}`}>Beskrivelse</label>
        <textarea id={`description-${product?.id ?? "new"}`} name="description" rows={2} defaultValue={product?.description ?? ""} className={field} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`consumerPrice-${product?.id ?? "new"}`}>Utsalgspris</label>
        <input id={`consumerPrice-${product?.id ?? "new"}`} name="consumerPrice" inputMode="decimal" defaultValue={product?.consumerPrice ?? 200} className={field} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`defaultPartnerPrice-${product?.id ?? "new"}`}>Standard innkjøpspris</label>
        <input id={`defaultPartnerPrice-${product?.id ?? "new"}`} name="defaultPartnerPrice" inputMode="decimal" defaultValue={product?.defaultPartnerPrice ?? 120} className={field} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`vatRate-${product?.id ?? "new"}`}>Mva.-sats</label>
        <input id={`vatRate-${product?.id ?? "new"}`} name="vatRate" inputMode="decimal" defaultValue={product?.vatRate ?? 0.25} className={field} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <label className={label} htmlFor={`landedCostExVat-${product?.id ?? "new"}`}>
            Innkjøpskost eks. mva.
          </label>
          <InternalTag />
        </span>
        <input id={`landedCostExVat-${product?.id ?? "new"}`} name="landedCostExVat" inputMode="decimal" defaultValue={product?.landedCostExVat ?? ""} className={field} placeholder="Ikke satt" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`imageUrl-${product?.id ?? "new"}`}>Bilde-URL</label>
        <input id={`imageUrl-${product?.id ?? "new"}`} name="imageUrl" defaultValue={product?.imageUrl ?? ""} className={field} placeholder="https://…" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`tagline-${product?.id ?? "new"}`}>Ingress</label>
        <input id={`tagline-${product?.id ?? "new"}`} name="tagline" defaultValue={product?.tagline ?? ""} className={field} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`placeholderTone-${product?.id ?? "new"}`}>Plassholderfarge</label>
        <select id={`placeholderTone-${product?.id ?? "new"}`} name="placeholderTone" defaultValue={product?.placeholderTone ?? "sand"} className={field}>
          {TONES.map((tone) => (
            <option key={tone} value={tone}>{tone}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor={`sortOrder-${product?.id ?? "new"}`}>Sortering</label>
        <input id={`sortOrder-${product?.id ?? "new"}`} name="sortOrder" inputMode="numeric" defaultValue={product?.sortOrder ?? 0} className={field} />
      </div>

      <div className="flex items-end gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-[#16150f]" />
          Aktivt
        </label>
        <Button type="submit" size="sm">{isNew ? "Opprett" : "Lagre"}</Button>
      </div>
    </form>
  );
}

export default async function ProductsPage() {
  const products = await listAdminProducts();

  return (
    <AdminPage
      title="Produkter"
      lead="Priser, mva. og intern innkjøpskost. Marginen regnes ut automatisk."
    >
      <Panel padding={false}>
        <Table minWidth="68rem">
          <thead>
            <tr>
              <Th>Produkt</Th>
              <Th>SKU</Th>
              <Th align="right">Utsalg</Th>
              <Th align="right">Innkjøp klubb</Th>
              <Th align="right">Klubbens margin</Th>
              <Th align="right">Margin %</Th>
              <Th align="right">Vår kost</Th>
              <Th align="right">Vår bruttomargin</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const margin = product.consumerPrice - product.defaultPartnerPrice;
              const internal = unitEconomics(product, {
                consumerPrice: product.consumerPrice,
                organizationPrice: product.defaultPartnerPrice,
                organizationMargin: margin,
              });

              return (
                <tr key={product.id}>
                  <Td>
                    <span className="text-ink">{product.name}</span>
                    {product.sizeMl ? (
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {formatNumber(product.sizeMl)} ml
                      </span>
                    ) : null}
                  </Td>
                  <Td>{product.sku}</Td>
                  <Td align="right">{formatCurrency(product.consumerPrice)}</Td>
                  <Td align="right">{formatCurrency(product.defaultPartnerPrice)}</Td>
                  <Td align="right">{formatCurrency(margin)}</Td>
                  <Td align="right">
                    {product.consumerPrice > 0
                      ? formatPercent(margin / product.consumerPrice)
                      : "—"}
                  </Td>
                  <Td align="right">
                    {internal.landedCostExVat == null
                      ? "—"
                      : formatCurrency(internal.landedCostExVat)}
                  </Td>
                  <Td align="right">
                    {internal.grossMargin == null
                      ? "—"
                      : formatPercent(internal.grossMargin, 1)}
                  </Td>
                  <Td>
                    <StatusBadge
                      label={product.active ? "Aktivt" : "Deaktivert"}
                      tone={product.active ? "positive" : "muted"}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      {products.map((product) => (
        <Panel
          key={product.id}
          title={`Rediger ${product.name}`}
          description="Fjern haken for å deaktivere produktet."
        >
          <ProductForm product={product} />
        </Panel>
      ))}

      <Panel title="Nytt produkt">
        <ProductForm />
      </Panel>
    </AdminPage>
  );
}
