import { ApplicationInfoSection } from "./ApplicationInfoSection";
import { LegalSection } from "./LegalSection";
import { UpdateSection } from "./UpdateSection";

export function AboutSection() {
  return (
    <div className="flex flex-col gap-8">
      <ApplicationInfoSection />
      <UpdateSection />
      <LegalSection />
    </div>
  );
}
