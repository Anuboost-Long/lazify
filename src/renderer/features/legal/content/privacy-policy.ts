import { translation } from "@renderer/i18n/translation";
import type { LegalDocument } from "./types";

/**
 * Privacy policy for Lazify, a local-first desktop developer tool. The network
 * section lists every service the main process contacts; add to it whenever a
 * new outbound request ships. Kept in step with website/lib/legal-documents.ts.
 * Not yet reviewed by legal counsel, and it is not legal advice.
 */
export const privacyPolicy: LegalDocument = {
  slug: "privacy-policy",
  icon: "check-circle",
  titleKey: translation.Settings.PrivacyPolicy,
  effectiveDate: "24 September 2026",
  summary:
    "This Privacy Policy explains what information Lazify handles, where it stays, when it leaves your device, and the rights you have over it. Lazify is a local-first desktop application: it has no accounts, no analytics, and no servers of its own, so most of your data never leaves your computer.",
  sections: [
    {
      heading: "1. Who we are",
      blocks: [
        {
          kind: "paragraph",
          text: 'Lazify (the "App") and its website (the "Site") are provided by Anuboost-Long, an individual developer based in Cambodia ("we", "us", or "our"). For the purposes of data protection law, we are the controller of the limited personal information described in this policy that we receive directly. You can reach us at kimlongly57@gmail.com.',
        },
        {
          kind: "paragraph",
          text: "This policy does not cover third-party services you choose to use with the App, such as AI providers, package registries, or git hosts. Those services have their own privacy policies.",
        },
      ],
    },
    {
      heading: "2. The short version",
      blocks: [
        {
          kind: "list",
          items: [
            "We do not require an account, and we do not collect your name, email address, or any other identifier through the App.",
            "The App contains no analytics, advertising, tracking, or telemetry.",
            "Your projects, settings, and logs stay on your device. We never receive a copy of them unless you send one to us yourself.",
            "When you use an AI agent or another online feature, your data goes directly from your device to that service, not through us.",
            "We do not sell or share personal information, and we do not use it for advertising.",
          ],
        },
      ],
    },
    {
      heading: "3. Information stored on your device",
      blocks: [
        {
          kind: "paragraph",
          text: "The App works with the following information. All of it is stored locally on your device, under your control, and is not transmitted to us:",
        },
        {
          kind: "list",
          items: [
            "Project and file data: the source files, directories, git metadata, environment variables, and terminal output in the projects you open.",
            "Application settings: your preferences such as theme, language, layout, saved templates, and saved API requests.",
            "Built-in browser data: the history, cookies, and site data of pages you open in the App's browser, kept in the App's own browser storage.",
            "Sign-in information of other tools: to show your remaining AI usage limits, the App reads the sign-in that the Claude Code and Codex command-line tools have already stored on your device. The App does not copy, store, or upload these credentials.",
            "Diagnostic information: error logs and crash reports written to a folder on your device (~/Library/Logs/Lazify on macOS, %APPDATA%\\Lazify\\logs on Windows). The log is capped in size and older entries are overwritten automatically. It is never uploaded.",
          ],
        },
      ],
    },
    {
      heading: "4. Information that leaves your device",
      blocks: [
        {
          kind: "paragraph",
          text: "Some features only work by contacting an online service. In each case the data goes directly from your device to that service and is handled under its own terms and privacy policy, which we do not control:",
        },
        {
          kind: "list",
          items: [
            "AI agents: when you use an agent, the prompts, code, and context you provide are sent to the provider behind it (Anthropic for Claude, OpenAI for Codex, Google for Gemini, GitHub for Copilot, Anysphere for Cursor, or the provider of any custom agent you add). The App starts these providers' own command-line tools on your device and does not route their traffic through any server of ours. Review their policies before submitting sensitive code or information.",
            "Usage limits: to show how much of your Claude and Codex limits remain, the App asks Anthropic and OpenAI directly, using the sign-in described in Section 3.",
            "Updates: the App checks GitHub for new versions and downloads them from GitHub.",
            "Templates, packages, and extensions: the App fetches the project template catalog from GitHub, looks up package versions on the npm registry, and downloads editor extensions from Open VSX when you install one.",
            "Built-in browser: pages you visit receive the information any browser sends, such as your IP address. To block ads and trackers, the App downloads Ghostery's published filter lists.",
            "Services you direct the App to use: package registries, git remotes, APIs you call from the App, and any other service you connect to receive whatever data you tell the App to send them.",
          ],
        },
        {
          kind: "paragraph",
          text: "Like any network request, each of these reveals your IP address and basic technical information (such as the App version and operating system) to the service that receives it.",
        },
      ],
    },
    {
      heading: "5. Information we receive directly",
      blocks: [
        {
          kind: "paragraph",
          text: "We only receive personal information from you in these situations:",
        },
        {
          kind: "list",
          items: [
            "When you contact us: your email address, the content of your message, and anything you choose to attach, such as a log file or screenshot. We use it only to respond to you.",
            "When you donate: KHQR payments are processed by your bank and the Bakong network, not by us. We receive the details your bank shares with the recipient, typically your name as registered with the bank, the amount, and the date. We use them only to keep records of donations received.",
            "When you visit the Site: the Site uses no cookies, analytics, or tracking. The service that hosts it keeps standard server logs (such as IP address, browser type, and pages requested) to deliver the Site and protect it from abuse.",
          ],
        },
      ],
    },
    {
      heading: "6. How we use information and our legal bases",
      blocks: [
        {
          kind: "paragraph",
          text: "We use information only for the purposes described in this policy. Where data protection laws such as the EU or UK General Data Protection Regulation (GDPR) apply, we rely on these legal bases:",
        },
        {
          kind: "list",
          items: [
            "To provide the App and its features at your request: performance of our agreement with you.",
            "To respond to your messages, keep records of donations, and keep the App and Site secure: our legitimate interests, which do not override your rights.",
            "To meet legal, tax, or accounting obligations: compliance with a legal obligation.",
            "Where we ask for your consent for anything else, you may withdraw it at any time.",
          ],
        },
        {
          kind: "paragraph",
          text: "We do not use your information for advertising, profiling, or automated decision-making that has legal or similarly significant effects on you, and we do not use your projects or AI content to train any model.",
        },
      ],
    },
    {
      heading: "7. Sharing and selling",
      blocks: [
        {
          kind: "paragraph",
          text: "We do not sell personal information, and we do not share it for cross-context behavioural advertising, as those terms are defined in the California Consumer Privacy Act (CCPA). We have not done so in the past 12 months. Because there is nothing to opt out of, the App and Site treat Global Privacy Control and Do Not Track signals the same as any other visit: no tracking takes place either way.",
        },
        {
          kind: "paragraph",
          text: "We disclose the limited information we hold only when required by law, to protect our rights or the safety of others, or as part of a transfer of the App to a new owner who agrees to honour this policy.",
        },
      ],
    },
    {
      heading: "8. International transfers",
      blocks: [
        {
          kind: "paragraph",
          text: "We are based in Cambodia, and the services described in Section 4 may process data in the United States or other countries. When you use them, your data travels directly from your device to those services under their own safeguards, such as standard contractual clauses. Any information you send to us directly may be stored with our email provider outside your country. Where the law requires it, we take reasonable steps to make sure information transferred abroad stays protected.",
        },
      ],
    },
    {
      heading: "9. How long we keep information",
      blocks: [
        {
          kind: "list",
          items: [
            "Information on your device stays until you delete it. Uninstalling the App and deleting its data folder (~/Library/Application Support/Lazify on macOS, %APPDATA%\\Lazify on Windows) removes it.",
            "Messages you send us are kept for as long as needed to deal with your request and any follow-up, then deleted.",
            "Donation records are kept for as long as tax and accounting laws require.",
            "Information held by third-party services is kept according to their own policies.",
          ],
        },
      ],
    },
    {
      heading: "10. Security",
      blocks: [
        {
          kind: "paragraph",
          text: "We take reasonable measures to protect the App and the limited information we hold, but no software is perfectly secure. Because your data primarily lives on your own device, keeping your operating system, credentials, and the App up to date is an important part of protecting it. If a data breach affecting information we hold is likely to cause you serious harm, we will notify you and the relevant regulator as the law requires, including under the GDPR.",
        },
      ],
    },
    {
      heading: "11. Your rights",
      blocks: [
        {
          kind: "paragraph",
          text: "Wherever you live, you can ask us what personal information we hold about you, ask us to correct or delete it, and complain if you think we have mishandled it. Depending on where you live, you may also have these specific rights:",
        },
        {
          kind: "list",
          items: [
            "EU, EEA, and UK: the rights of access, rectification, erasure, restriction of processing, data portability, and objection, the right to withdraw consent at any time, and the right to lodge a complaint with your local data protection authority.",
            "California and other US states with privacy laws: the rights to know what personal information we collect, use, and disclose, to access it, to correct it, and to delete it, and the right not to be discriminated against for exercising these rights. You may use an authorised agent to make a request on your behalf.",
            "Elsewhere, including Cambodia: any rights granted by your local law.",
          ],
        },
        {
          kind: "paragraph",
          text: "To exercise any of these rights, email kimlongly57@gmail.com. We may need to confirm your identity first. We will respond within 30 days, or sooner if your local law requires it, and we will not charge you for a reasonable request. Most of the information the App handles is on your own device, so you can also access, change, or delete it directly at any time.",
        },
      ],
    },
    {
      heading: "12. Children's privacy",
      blocks: [
        {
          kind: "paragraph",
          text: "The App and Site are intended for developers and are not directed to children under the age of 13, or the higher minimum age that applies where you live. We do not knowingly collect personal information from children. If you believe a child has sent us personal information, contact us and we will delete it.",
        },
      ],
    },
    {
      heading: "13. Changes to this policy",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update this policy from time to time. When we do, we will revise the effective date above. If a change materially affects how your information is handled, we will give notice in the App or on the Site before it takes effect.",
        },
      ],
    },
    {
      heading: "14. Contact",
      blocks: [
        {
          kind: "paragraph",
          text: "Questions, requests, or complaints about this policy can be sent to Anuboost-Long at kimlongly57@gmail.com. If you are not satisfied with our response, you can contact your local data protection authority, such as your supervisory authority in the EU or UK.",
        },
      ],
    },
  ],
};
