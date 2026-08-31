import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { adminPassword } from "@/lib/admin/auth";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passwordMatches,
} from "@/lib/admin/session";

export const metadata = { title: "Logg inn", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = typeof params.neste === "string" ? params.neste : "/admin";
  const failed = params.feil === "1";

  async function signIn(formData: FormData) {
    "use server";

    const { cookies } = await import("next/headers");
    const password = adminPassword();
    const supplied = String(formData.get("password") ?? "");
    const target = String(formData.get("next") ?? "/admin");
    // Only ever return to a path inside the admin area.
    const safeTarget = target.startsWith("/admin") ? target : "/admin";

    if (!(await passwordMatches(supplied, password))) {
      redirect(
        `/admin/logg-inn?feil=1&neste=${encodeURIComponent(safeTarget)}` as never,
      );
    }

    const store = await cookies();
    store.set(ADMIN_COOKIE, await createSessionToken(password), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    redirect(safeTarget as never);
  }

  return (
    <section className="grid min-h-dvh place-items-center bg-canvas-deep py-16">
      <Container width="narrow">
        <div className="mx-auto flex max-w-sm flex-col gap-8">
          <div className="flex flex-col items-start gap-4">
            <Logo size="lg" />
            <h1 className="font-display text-2xl leading-tight text-ink">Adminområdet</h1>
            <p className="text-sm leading-relaxed text-ink-muted">
              Bestillinger, dugnader og kundedata. Kun for SØRKYST.
            </p>
          </div>

          <form
            action={signIn}
            className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-soft"
          >
            <input type="hidden" name="next" value={next} />
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-eyebrow text-ink-muted">
                Passord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                className="w-full rounded-lg border border-line bg-canvas px-4 py-3 text-[0.95rem] text-ink outline-none focus:border-ink"
              />
            </div>

            {failed ? (
              <p role="alert" className="text-sm text-[#8a3a2a]">
                Feil passord.
              </p>
            ) : null}

            <Button type="submit" size="lg">
              Logg inn
            </Button>
          </form>
        </div>
      </Container>
    </section>
  );
}
