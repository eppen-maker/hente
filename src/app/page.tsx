import { brand } from "@/brand/brand.config";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { formatOre } from "@/lib/money";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-sand">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <ButtonLink href="/login" variant="secondary" size="sm">
          Logg inn
        </ButtonLink>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-20">
        <p className="label">Dugnad uten dørsalg av kaker</p>
        <h1 className="display mt-5 max-w-3xl text-4xl leading-[1.05] text-navy-900 sm:text-6xl">
          {brand.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-500">
          {brand.product.description}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/login" size="lg">
            Logg inn
          </ButtonLink>
          <ButtonLink href={`mailto:${brand.supportEmail}`} variant="secondary" size="lg">
            Snakk med oss om dugnad
          </ButtonLink>
        </div>
      </section>

      <section className="border-y border-navy-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-px bg-navy-100 sm:grid-cols-3">
          {[
            { label: "Pris til kunde", value: formatOre(brand.defaults.retailPriceIncVatOre), hint: `${brand.product.volume} refill` },
            { label: "Til laget", value: formatOre(brand.defaults.clubEarningPerUnitOre), hint: "per solgte pose" },
            { label: "Ingen risiko", value: "0 kr", hint: "klubben forskutterer ingenting" },
          ].map((item) => (
            <div key={item.label} className="bg-white px-6 py-8">
              <p className="label">{item.label}</p>
              <p className="display tabular mt-3 text-3xl">{item.value}</p>
              <p className="mt-1 text-sm text-navy-400">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="display text-2xl">Slik fungerer det</h2>
        <ol className="mt-8 grid gap-px bg-navy-100 sm:grid-cols-4">
          {[
            ["01", "Klubben registreres", "Vi oppretter klubb, lag og dugnad med avtalt pris og fortjeneste."],
            ["02", "Selgerne får hver sin lenke", "Personlig salgsside og QR-kode — ingen kontanter, ingen lister."],
            ["03", "Kundene betaler digitalt", "Betaling skjer til SØRKYST. Klubbandelen bokføres per ordre."],
            ["04", "Varene hentes i klubbhuset", "Vi pakker per selger. Utlevering bekreftes i appen."],
          ].map(([step, title, text]) => (
            <li key={step} className="bg-sand px-6 py-8">
              <span className="label">{step}</span>
              <h3 className="mt-3 font-semibold text-navy-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-navy-100 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-navy-400">
          <Logo size="sm" href={null} />
          <span>
            {brand.domain} · {brand.supportEmail}
          </span>
        </div>
      </footer>
    </div>
  );
}
