import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/auth";
import { isLocalAdminStore } from "@/lib/repositories/admin";

export const metadata: Metadata = {
  title: { default: "Admin — SØRKYST", template: "%s — SØRKYST Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <AdminShell
      actor={session.actor}
      authenticated={session.authenticated}
      localStore={isLocalAdminStore()}
    >
      {children}
    </AdminShell>
  );
}
