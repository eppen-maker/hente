import { CalculatorSection } from "@/components/marketing/CalculatorSection";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { EconomicsExample } from "@/components/marketing/EconomicsExample";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { ValuePillars } from "@/components/marketing/ValuePillars";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValuePillars />
      <CalculatorSection />
      <HowItWorks tone="deep" />
      <EconomicsExample />
      <ProductShowcase />
      <ClosingCta />
    </>
  );
}
