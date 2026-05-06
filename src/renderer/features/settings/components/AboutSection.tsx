import { ApplicationInfoSection } from "./ApplicationInfoSection";
import { LegalSection } from "./LegalSection";

export function AboutSection() {
  return (
    <div className="flex flex-col gap-8">
      <ApplicationInfoSection />
      <LegalSection />
    </div>
  );
}
