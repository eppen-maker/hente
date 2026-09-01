import { CalculatorSection } from "@/components/marketing/CalculatorSection";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { EconomicsExample } from "@/components/marketing/EconomicsExample";
import { Hero } from "@/components/marketing/Hero";
import { HoursComparison } from "@/components/marketing/HoursComparison";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { ValuePillars } from "@/components/marketing/ValuePillars";

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* The calculator is the thing people came to play with, so it sits
          directly under the hero rather than three scrolls down. Sand, so it
          separates from the hero's canvas above and the pillars below. */}
      <CalculatorSection tone="sand" />
      <ValuePillars />
      <HoursComparison />
      <HowItWorks tone="deep" />
      <EconomicsExample />
      <ProductShowcase />
      <ClosingCta />
    </>
  );
}
