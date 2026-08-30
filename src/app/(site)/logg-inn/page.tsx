import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/forms/LoginForm";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Logg inn",
  description: "Logg inn i klubbportalen for å følge dugnaden, bestillinger og oppgjør.",
};

export default function LoginPage() {
  return (
    <section className="py-16 sm:py-24">
      <Container width="narrow">
        <div className="mx-auto flex max-w-md flex-col gap-8">
          <div className="flex flex-col items-start gap-5">
            <Logo size="lg" />
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
              Klubbportalen
            </h1>
            <p className="text-base leading-relaxed text-ink-muted">
              Følg dugnaden, se bestillinger og hold oversikt over fortjenesten.
              Vi sender en innloggingslenke på e-post — ingen passord å huske.
            </p>
          </div>

          <LoginForm />

          <p className="text-sm text-ink-muted">
            Ikke kommet i gang ennå?{" "}
            <Link
              href="/start-dugnad"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Start en dugnad
            </Link>
            .
          </p>
        </div>
      </Container>
    </section>
  );
}
