import { FundraisingCalculator } from "@/components/calculator/FundraisingCalculator";
import { Section, SectionHeading } from "@/components/ui/Section";

interface CalculatorSectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  tone?: "canvas" | "deep" | "sand";
  showVolumeOptions?: boolean;
}

export function CalculatorSection({
  id = "kalkulator",
  eyebrow = "Kalkulator",
  title = "Hva kan klubben deres tjene?",
  lead = "Sett inn antall deltakere og se resultatet med én gang. Velg om dere regner fra innsats eller fra et mål.",
  tone = "canvas",
  showVolumeOptions = true,
}: CalculatorSectionProps) {
  return (
    <Section id={id} tone={tone} spacing="lg" width="wide">
      <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />
      <FundraisingCalculator className="mt-12" showVolumeOptions={showVolumeOptions} />
    </Section>
  );
}
