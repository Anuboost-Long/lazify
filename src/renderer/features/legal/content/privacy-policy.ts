import { translation } from "@renderer/i18n/translation";
import type { LegalDocument } from "./types";

/**
 * Template privacy policy for Lazify, a local-first desktop developer tool.
 * Bracketed [PLACEHOLDERS] must be filled in, and the whole document should be
 * reviewed by qualified legal counsel before you rely on it. It is not legal
 * advice.
 */
export const privacyPolicy: LegalDocument = {
  slug: "privacy-policy",
  icon: "check-circle",
  titleKey: translation.Settings.PrivacyPolicy,
  effectiveDate: "24 July 2026",
  summary:
    "This Privacy Policy explains what information Lazify handles, where it stays, and the limited cases in which it leaves your device. Lazify is a local-first desktop application: most of your data never leaves your computer.",
  sections: [
    {
      heading: "1. Who we are",
      blocks: [
        {
          kind: "paragraph",
          text: 'Lazify (the "App") is a desktop developer workflow tool provided by Anuboost-Long ("we", "us", or "our"). This policy covers the App and does not cover any third-party service you choose to connect to it. You can reach us at kimlongly57@gmail.com.',
        },
      ],
    },
    {
      heading: "2. Information the App handles",
      blocks: [
        {
          kind: "paragraph",
          text: "The App is designed to run locally on your machine. The information it works with falls into the following categories:",
        },
        {
          kind: "list",
          items: [
            "Project and file data: the source files, directories, git metadata, and terminal output in the projects you open. This is read from and written to your local disk and is not transmitted to us.",
            "Application settings: your preferences such as theme, language, and layout, stored locally on your device.",
            "AI agent content: when you use an AI coding agent feature, the prompts, code, and context you submit are sent to the third-party AI provider that powers that feature so it can generate a response. See Section 4.",
            "Diagnostic information: if enabled, non-identifying technical logs used to diagnose crashes or errors. [Describe your actual telemetry here, or state that the App collects none.]",
          ],
        },
      ],
    },
    {
      heading: "3. How we use information",
      blocks: [
        {
          kind: "paragraph",
          text: "Information is used only to operate the features you invoke: opening and editing projects, running commands, generating AI assistance, and remembering your preferences. We do not sell your personal information, and we do not use your project files or AI content for advertising.",
        },
      ],
    },
    {
      heading: "4. Third-party AI and other services",
      blocks: [
        {
          kind: "paragraph",
          text: "Some features rely on third-party services that you enable or authenticate with. When you use an AI agent, the content you provide is transmitted to the applicable AI provider (for example, [AI PROVIDER NAME]) under that provider's own terms and privacy policy. We do not control how those providers process data, and you should review their policies before submitting sensitive code or information.",
        },
        {
          kind: "paragraph",
          text: "Similarly, package registries, git remotes, and any other network services you connect to receive whatever data you direct the App to send them, subject to their own terms.",
        },
      ],
    },
    {
      heading: "5. Where your data is stored",
      blocks: [
        {
          kind: "paragraph",
          text: "Project files, settings, and locally cached data reside on your device under your control. We do not maintain a copy of your projects on our servers. Data sent to third-party services is stored by those services according to their policies.",
        },
      ],
    },
    {
      heading: "6. Security",
      blocks: [
        {
          kind: "paragraph",
          text: "We take reasonable measures to protect the App, but no software is perfectly secure. Because your data primarily lives on your own device, keeping your operating system, credentials, and this App up to date is an important part of protecting it.",
        },
      ],
    },
    {
      heading: "7. Children's privacy",
      blocks: [
        {
          kind: "paragraph",
          text: "The App is intended for developers and is not directed to children under the age of [MINIMUM AGE]. We do not knowingly collect personal information from children.",
        },
      ],
    },
    {
      heading: "8. Your rights",
      blocks: [
        {
          kind: "paragraph",
          text: "Depending on where you live, you may have rights to access, correct, or delete personal information. Because most data stays on your device, you can exercise many of these rights directly by managing your local files and settings. For anything else, contact us at kimlongly57@gmail.com.",
        },
      ],
    },
    {
      heading: "9. Changes to this policy",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update this policy from time to time. When we do, we will revise the effective date above and, where appropriate, provide additional notice within the App.",
        },
      ],
    },
    {
      heading: "10. Contact",
      blocks: [
        {
          kind: "paragraph",
          text: "Questions about this policy can be sent to Anuboost-Long at kimlongly57@gmail.com.",
        },
      ],
    },
  ],
};
