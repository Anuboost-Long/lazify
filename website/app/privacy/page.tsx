import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { privacyPolicy } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Privacy Policy — Lazify",
  description: "How Lazify handles project data, settings, and connected services.",
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyPolicy} />;
}
