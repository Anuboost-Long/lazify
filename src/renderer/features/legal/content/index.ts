import { openSourceLicenses } from "./open-source-licenses";
import { privacyPolicy } from "./privacy-policy";
import { termsOfService } from "./terms-of-service";
import type { LegalDocument } from "./types";

/** All legal documents keyed by URL slug. */
export const legalDocuments: Record<string, LegalDocument> = {
  [privacyPolicy.slug]: privacyPolicy,
  [termsOfService.slug]: termsOfService,
  [openSourceLicenses.slug]: openSourceLicenses,
};

export function getLegalDocument(slug: string | undefined): LegalDocument | null {
  if (!slug) {
    return null;
  }
  return legalDocuments[slug] ?? null;
}

export type { LegalDocument } from "./types";
