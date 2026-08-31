import type { Route } from "next";

export interface NavItem {
  href: Route;
  label: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/slik-fungerer-det", label: "Slik fungerer det" },
  { href: "/produktene", label: "Produktene" },
  { href: "/fortjeneste", label: "Fortjeneste" },
  { href: "/for-klubber", label: "For klubber" },
];

export const ACCOUNT_NAV: NavItem = { href: "/logg-inn", label: "Logg inn" };

export const PRIMARY_CTA = { href: "/bestill" as Route, label: "Bestill dugnad" };

export const FOOTER_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Dugnad",
    items: [
      { href: "/slik-fungerer-det", label: "Slik fungerer det" },
      { href: "/fortjeneste", label: "Fortjeneste" },
      { href: "/for-klubber", label: "For klubber" },
    ],
  },
  {
    title: "Produkt",
    items: [
      { href: "/produktene", label: "Produktene" },
      { href: "/bestill", label: "Bestill dugnad" },
    ],
  },
  {
    title: "SØRKYST",
    items: [
      { href: "/start-dugnad", label: "Spør oss først" },
      { href: "/kontakt", label: "Kontakt oss" },
      { href: "/logg-inn", label: "Logg inn" },
    ],
  },
];

export const COMPANY = {
  name: "SØRKYST",
  /** Who a club actually reaches when they call or write. */
  contactName: "Espen Sørensen",
  email: "hei@sorkyst.no",
  phone: "+47 941 63 536",
  city: "Kristiansand",
} as const;
