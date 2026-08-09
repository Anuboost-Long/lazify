import { translation } from "@renderer/i18n/translation";
import type { LegalDocument } from "./types";

/**
 * Open-source attribution for Lazify. This lists the primary components the App
 * is built on; it is not a substitute for shipping the full text of each
 * license. Generate a complete third-party notice file (for example with a tool
 * like `license-checker`) as part of your release process and keep this list in
 * sync with your actual dependency tree.
 */
export const openSourceLicenses: LegalDocument = {
  slug: "open-source-licenses",
  icon: "code",
  titleKey: translation.Settings.OpenSourceLicenses,
  effectiveDate: "24 July 2026",
  summary:
    "Lazify is built with open-source software. We are grateful to the maintainers and communities behind these projects. The components below are used under their respective licenses; the full license texts are included with the application.",
  sections: [
    {
      heading: "Notice",
      blocks: [
        {
          kind: "paragraph",
          text: 'This page lists the principal open-source components distributed with Lazify. Each remains the property of its respective authors and is used under its own license. Copies of the applicable license texts are provided in the "THIRD-PARTY-NOTICES" file included with the application. Where a license requires reproduction of its text or a copyright notice, that requirement is satisfied by that file.',
        },
      ],
    },
    {
      heading: "Runtime and framework",
      blocks: [
        {
          kind: "list",
          items: [
            "Electron — MIT License",
            "React and React DOM — MIT License",
            "React Router — MIT License",
            "Jotai — MIT License",
            "i18next and react-i18next — MIT License",
            "clsx — MIT License",
          ],
        },
      ],
    },
    {
      heading: "Editor, terminal, and syntax",
      blocks: [
        {
          kind: "list",
          items: [
            "xterm.js (@xterm/xterm, @xterm/addon-fit) — MIT License",
            "node-pty — MIT License",
            "Shiki — MIT License",
            "Iconoir (iconoir-react) — MIT License",
          ],
        },
      ],
    },
    {
      heading: "Build tooling",
      blocks: [
        {
          kind: "list",
          items: [
            "Vite and @vitejs/plugin-react — MIT License",
            "Tailwind CSS — MIT License",
            "TypeScript — Apache License 2.0",
            "electron-builder — MIT License",
          ],
        },
      ],
    },
    {
      heading: "Complete list",
      blocks: [
        {
          kind: "paragraph",
          text: "The components above are a summary. The App also depends, directly or transitively, on additional open-source packages. A complete, machine-generated list of every dependency and its license is maintained in the THIRD-PARTY-NOTICES file distributed with the application. If you would like a copy or have questions about attribution, contact kimlongly57@gmail.com.",
        },
      ],
    },
  ],
};
