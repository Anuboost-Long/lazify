/**
 * A single legal document (privacy policy, terms, licenses). Kept as
 * structured data so one view can render any of them consistently.
 *
 * NOTE: The body text is intentionally English-only. Legal copy should be
 * reviewed and translated by a person, not machine-localized through the i18n
 * pipeline, so only the document title flows through translation keys.
 */
import type { UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export interface LegalDocumentSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  /** URL slug, e.g. "privacy-policy". */
  slug: string;
  /** Header icon name. */
  icon: UiIconName;
  /** i18n key path for the localized title (from settings translations). */
  titleKey: string;
  /** Human-readable effective date. */
  effectiveDate: string;
  /** One or two sentences shown under the title. */
  summary: string;
  sections: LegalDocumentSection[];
}
