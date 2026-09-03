import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/guards";
import { listClubs } from "@/lib/data/admin";
import { adminNav } from "../nav";
import { CreateClubForm } from "./CreateClubForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klubber" };

export default async function AdminClubsPage() {
  const user = await requireRole(["SORKYST_ADMIN"], "/admin/clubs");
  const clubs = await listClubs();

  return (
    <AppShell user={user} nav={adminNav} active="/admin/clubs" title="Klubber" subtitle={`${clubs.length} registrert`}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Alle klubber" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left">
                  {["Klubb", "Sted", "Lag", "Dugnader", "Status"].map((head) => (
                    <th key={head} className="label px-5 py-2.5 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {clubs.map((club) => (
                  <tr key={club.id} className="hover:bg-sand-200/60">
                    <td className="px-5 py-3">
                      <Link href={`/admin/clubs/${club.id}`} className="font-medium text-navy-900 hover:underline">
                        {club.name}
                      </Link>
                      <span className="ml-2 text-xs text-navy-300">/{club.slug}</span>
                    </td>
                    <td className="px-5 py-3 text-navy-500">{club.city ?? "—"}</td>
                    <td className="tabular px-5 py-3">{club.teamCount}</td>
                    <td className="tabular px-5 py-3">{club.campaignCount}</td>
                    <td className="px-5 py-3">
                      {club.active ? <Badge variant="positive">Aktiv</Badge> : <Badge>Inaktiv</Badge>}
                    </td>
                  </tr>
                ))}
                {!clubs.length ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-navy-400">
                      Ingen klubber registrert ennå.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ny klubb" />
          <CreateClubForm />
        </Card>
      </div>
    </AppShell>
  );
}
