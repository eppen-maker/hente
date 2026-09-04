import type { NavItem } from "@/components/AppShell";

export const clubNav: NavItem[] = [{ href: "/club", label: "Oversikt" }];

export function campaignNav(campaignId: string): NavItem[] {
  return [
    { href: "/club", label: "Oversikt" },
    { href: `/club/campaigns/${campaignId}`, label: "Dugnad" },
    { href: `/club/tracking/${campaignId}`, label: "Hentestatus" },
    { href: `/club/pickup/${campaignId}`, label: "Utlevering" },
  ];
}
