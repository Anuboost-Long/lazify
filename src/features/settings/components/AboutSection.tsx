import { ApplicationInfoSection } from "./ApplicationInfoSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { ImportSection } from "./ImportSection";
import { LegalSection } from "./LegalSection";
import { UpdateSection } from "./UpdateSection";

export function AboutSection() {
  return (
    <div className="flex flex-col gap-8">
      <ApplicationInfoSection />
      <UpdateSection />
      <ImportSection />
      <DiagnosticsSection />
      <LegalSection />
    </div>
  );
}
