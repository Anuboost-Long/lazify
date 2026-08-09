export type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  summary: string;
  sections: Array<{
    heading: string;
    blocks: LegalBlock[];
  }>;
}

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  effectiveDate: "24 July 2026",
  summary:
    "This Privacy Policy explains what information Lazify handles, where it stays, and the limited cases in which it leaves your device. Lazify is a local-first desktop application: most of your data never leaves your computer.",
  sections: [
    {
      heading: "1. Who we are",
      blocks: [{ kind: "paragraph", text: 'Lazify (the "App") is a desktop developer workflow tool provided by Anuboost-Long ("we", "us", or "our"). This policy covers the App and does not cover any third-party service you choose to connect to it. You can reach us at kimlongly57@gmail.com.' }],
    },
    {
      heading: "2. Information the App handles",
      blocks: [
        { kind: "paragraph", text: "The App is designed to run locally on your machine. The information it works with falls into the following categories:" },
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
      blocks: [{ kind: "paragraph", text: "Information is used only to operate the features you invoke: opening and editing projects, running commands, generating AI assistance, and remembering your preferences. We do not sell your personal information, and we do not use your project files or AI content for advertising." }],
    },
    {
      heading: "4. Third-party AI and other services",
      blocks: [
        { kind: "paragraph", text: "Some features rely on third-party services that you enable or authenticate with. When you use an AI agent, the content you provide is transmitted to the applicable AI provider (for example, [AI PROVIDER NAME]) under that provider's own terms and privacy policy. We do not control how those providers process data, and you should review their policies before submitting sensitive code or information." },
        { kind: "paragraph", text: "Similarly, package registries, git remotes, and any other network services you connect to receive whatever data you direct the App to send them, subject to their own terms." },
      ],
    },
    {
      heading: "5. Where your data is stored",
      blocks: [{ kind: "paragraph", text: "Project files, settings, and locally cached data reside on your device under your control. We do not maintain a copy of your projects on our servers. Data sent to third-party services is stored by those services according to their policies." }],
    },
    {
      heading: "6. Security",
      blocks: [{ kind: "paragraph", text: "We take reasonable measures to protect the App, but no software is perfectly secure. Because your data primarily lives on your own device, keeping your operating system, credentials, and this App up to date is an important part of protecting it." }],
    },
    {
      heading: "7. Children's privacy",
      blocks: [{ kind: "paragraph", text: "The App is intended for developers and is not directed to children under the age of [MINIMUM AGE]. We do not knowingly collect personal information from children." }],
    },
    {
      heading: "8. Your rights",
      blocks: [{ kind: "paragraph", text: "Depending on where you live, you may have rights to access, correct, or delete personal information. Because most data stays on your device, you can exercise many of these rights directly by managing your local files and settings. For anything else, contact us at kimlongly57@gmail.com." }],
    },
    {
      heading: "9. Changes to this policy",
      blocks: [{ kind: "paragraph", text: "We may update this policy from time to time. When we do, we will revise the effective date above and, where appropriate, provide additional notice within the App." }],
    },
    {
      heading: "10. Contact",
      blocks: [{ kind: "paragraph", text: "Questions about this policy can be sent to Anuboost-Long at kimlongly57@gmail.com." }],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: "Terms and Conditions",
  effectiveDate: "24 July 2026",
  summary:
    "These Terms of Service govern your use of Lazify. By installing or using the App, you agree to them. Please read them carefully, especially the disclaimers and limitation of liability.",
  sections: [
    {
      heading: "1. Acceptance of these terms",
      blocks: [{ kind: "paragraph", text: 'These Terms of Service (the "Terms") are a binding agreement between you and Anuboost-Long ("we", "us", or "our") regarding the Lazify desktop application (the "App"). If you do not agree to these Terms, do not install or use the App.' }],
    },
    {
      heading: "2. License to use the App",
      blocks: [{ kind: "paragraph", text: "Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable license to install and use the App for your development work. We reserve all rights not expressly granted." }],
    },
    {
      heading: "3. Acceptable use",
      blocks: [
        { kind: "paragraph", text: "You agree not to:" },
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
      blocks: [{ kind: "paragraph", text: "The App can connect to third-party services, including AI providers, package registries, and git remotes. Your use of those services is governed by their own terms and privacy policies. We are not responsible for third-party services and do not endorse them." }],
    },
    {
      heading: "5. AI-generated output",
      blocks: [{ kind: "paragraph", text: "Features that generate code, text, or other output using AI may produce inaccurate, insecure, or unexpected results. You are responsible for reviewing, testing, and validating any AI-generated output before using it. We make no warranty that AI output is correct, fit for a particular purpose, or free of third-party rights, and you use it at your own risk." }],
    },
    {
      heading: "6. Your content and projects",
      blocks: [{ kind: "paragraph", text: "You retain all rights to the projects and content you create or edit with the App. We claim no ownership over your code. You are solely responsible for your content and for maintaining backups." }],
    },
    {
      heading: "7. Intellectual property",
      blocks: [{ kind: "paragraph", text: 'The App, excluding open-source components licensed separately (see the "Open Source Licenses" document), and all related trademarks and logos are owned by us or our licensors and are protected by law.' }],
    },
    {
      heading: "8. Disclaimer of warranties",
      blocks: [{ kind: "paragraph", text: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.' }],
    },
    {
      heading: "9. Limitation of liability",
      blocks: [{ kind: "paragraph", text: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, OR BUSINESS, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE APP WILL NOT EXCEED [AMOUNT, e.g. the greater of the amount you paid for the App in the prior twelve months or USD 50]." }],
    },
    {
      heading: "10. Indemnification",
      blocks: [{ kind: "paragraph", text: "You agree to indemnify and hold us harmless from any claims, losses, or expenses arising out of your use of the App, your content, or your violation of these Terms or applicable law." }],
    },
    {
      heading: "11. Termination",
      blocks: [{ kind: "paragraph", text: "These Terms remain in effect while you use the App. We may suspend or terminate the license if you breach these Terms. You may stop using the App at any time by uninstalling it. Sections that by their nature should survive termination will survive." }],
    },
    {
      heading: "12. Governing law and disputes",
      blocks: [{ kind: "paragraph", text: "These Terms are governed by the laws of [JURISDICTION], without regard to its conflict-of-laws rules. Any dispute will be resolved in the courts located in [VENUE], unless applicable law requires otherwise." }],
    },
    {
      heading: "13. Changes to these terms",
      blocks: [{ kind: "paragraph", text: "We may update these Terms from time to time. When we do, we will revise the effective date above. Your continued use of the App after changes take effect constitutes acceptance of the revised Terms." }],
    },
    {
      heading: "14. Contact",
      blocks: [{ kind: "paragraph", text: "Questions about these Terms can be sent to Anuboost-Long at kimlongly57@gmail.com." }],
    },
  ],
};
