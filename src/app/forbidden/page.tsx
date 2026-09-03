import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Ingen tilgang" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sand px-6 text-center">
      <Logo />
      <h1 className="display text-3xl">Ingen tilgang</h1>
      <p className="max-w-md text-navy-500">
        Kontoen din har ikke tilgang til dette området. Ta kontakt med klubben din eller SØRKYST hvis du mener dette er feil.
      </p>
      <ButtonLink href="/">Til forsiden</ButtonLink>
    </div>
  );
}
