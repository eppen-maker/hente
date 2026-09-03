import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { getSessionUser, homePathForRole } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Logg inn" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next || homePathForRole(user.profile.role));

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-5 py-16">
      <div className="w-full max-w-sm">
        <Logo size="lg" />
        <h1 className="display mt-10 text-2xl">Logg inn</h1>
        <p className="mt-2 text-sm text-navy-400">For selgere, klubbadministratorer og SØRKYST.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
