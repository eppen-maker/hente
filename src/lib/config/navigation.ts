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

export const PRIMARY_CTA = { href: "/start-dugnad" as Route, label: "Start en dugnad" };

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
      { href: "/start-dugnad", label: "Start en dugnad" },
    ],
  },
  {
    title: "SØR°",
    items: [
      { href: "/kontakt", label: "Kontakt oss" },
      { href: "/logg-inn", label: "Logg inn" },
    ],
  },
];

export const COMPANY = {
  name: "SØR°",
  email: "hei@sor.no",
  phone: "+47 38 00 00 00",
  city: "Kristiansand",
} as const;
