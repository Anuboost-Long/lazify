import { translation } from "@renderer/i18n/translation";
import type { LegalDocument } from "./types";

/**
 * Template terms of service for Lazify. Bracketed [PLACEHOLDERS] must be filled
 * in, and the document should be reviewed by qualified legal counsel before you
 * rely on it. It is not legal advice.
 */
export const termsOfService: LegalDocument = {
  slug: "terms-of-service",
  icon: "journal-page",
  titleKey: translation.Settings.TermsOfService,
  effectiveDate: "24 July 2026",
  summary:
    "These Terms of Service govern your use of Lazify. By installing or using the App, you agree to them. Please read them carefully, especially the disclaimers and limitation of liability.",
  sections: [
    {
      heading: "1. Acceptance of these terms",
      blocks: [
        {
          kind: "paragraph",
          text: 'These Terms of Service (the "Terms") are a binding agreement between you and Anuboost-Long ("we", "us", or "our") regarding the Lazify desktop application (the "App"). If you do not agree to these Terms, do not install or use the App.',
        },
      ],
    },
    {
      heading: "2. License to use the App",
      blocks: [
        {
          kind: "paragraph",
          text: "Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable license to install and use the App for your development work. We reserve all rights not expressly granted.",
        },
      ],
    },
    {
      heading: "3. Acceptable use",
      blocks: [
        {
          kind: "paragraph",
          text: "You agree not to:",
        },
        {
          kind: "list",
          items: [
            "Use the App to build, distribute, or operate anything unlawful or that infringes the rights of others.",
            "Reverse engineer, decompile, or attempt to extract source code from the App except to the extent this restriction is prohibited by applicable law or permitted by an applicable open-source license.",
            "Remove or obscure any proprietary notices in the App.",
            "Use the App to violate the terms of any third-party service you connect to it.",
          ],
        },
      ],
    },
    {
      heading: "4. Third-party services",
      blocks: [
        {
          kind: "paragraph",
          text: "The App can connect to third-party services, including AI providers, package registries, and git remotes. Your use of those services is governed by their own terms and privacy policies. We are not responsible for third-party services and do not endorse them.",
        },
      ],
    },
    {
      heading: "5. AI-generated output",
      blocks: [
        {
          kind: "paragraph",
          text: "Features that generate code, text, or other output using AI may produce inaccurate, insecure, or unexpected results. You are responsible for reviewing, testing, and validating any AI-generated output before using it. We make no warranty that AI output is correct, fit for a particular purpose, or free of third-party rights, and you use it at your own risk.",
        },
      ],
    },
    {
      heading: "6. Your content and projects",
      blocks: [
        {
          kind: "paragraph",
          text: "You retain all rights to the projects and content you create or edit with the App. We claim no ownership over your code. You are solely responsible for your content and for maintaining backups.",
        },
      ],
    },
    {
      heading: "7. Intellectual property",
      blocks: [
        {
          kind: "paragraph",
          text: 'The App, excluding open-source components licensed separately (see the "Open Source Licenses" document), and all related trademarks and logos are owned by us or our licensors and are protected by law.',
        },
      ],
    },
    {
      heading: "8. Disclaimer of warranties",
      blocks: [
        {
          kind: "paragraph",
          text: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.',
        },
      ],
    },
    {
      heading: "9. Limitation of liability",
      blocks: [
        {
          kind: "paragraph",
          text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, OR BUSINESS, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE APP WILL NOT EXCEED [AMOUNT, e.g. the greater of the amount you paid for the App in the prior twelve months or USD 50].",
        },
      ],
    },
    {
      heading: "10. Indemnification",
      blocks: [
        {
          kind: "paragraph",
          text: "You agree to indemnify and hold us harmless from any claims, losses, or expenses arising out of your use of the App, your content, or your violation of these Terms or applicable law.",
        },
      ],
    },
    {
      heading: "11. Termination",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms remain in effect while you use the App. We may suspend or terminate the license if you breach these Terms. You may stop using the App at any time by uninstalling it. Sections that by their nature should survive termination will survive.",
        },
      ],
    },
    {
      heading: "12. Governing law and disputes",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are governed by the laws of [JURISDICTION], without regard to its conflict-of-laws rules. Any dispute will be resolved in the courts located in [VENUE], unless applicable law requires otherwise.",
        },
      ],
    },
    {
      heading: "13. Changes to these terms",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update these Terms from time to time. When we do, we will revise the effective date above. Your continued use of the App after changes take effect constitutes acceptance of the revised Terms.",
        },
      ],
    },
    {
      heading: "14. Contact",
      blocks: [
        {
          kind: "paragraph",
          text: "Questions about these Terms can be sent to Anuboost-Long at kimlongly57@gmail.com.",
        },
      ],
    },
  ],
};
