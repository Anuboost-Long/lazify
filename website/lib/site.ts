/**
 * Every outward-facing link in one place. Releases and the installer live in
 * the public dist repo — never the source repo, which is private and answers
 * 404 to anyone who follows a link to it.
 */
export const site = {
  name: "Lazify",
  distRepo: "https://github.com/Anuboost-Long/lazify-dist",
  releases: "https://github.com/Anuboost-Long/lazify-dist/releases",
  latestRelease: "https://github.com/Anuboost-Long/lazify-dist/releases/latest",
  installScript:
    "https://github.com/Anuboost-Long/lazify-dist/blob/main/install.sh",
  installCommand:
    "curl -fsSL https://raw.githubusercontent.com/Anuboost-Long/lazify-dist/main/install.sh | bash",
  quarantineCommand: "xattr -dr com.apple.quarantine /Applications/Lazify.app",

  /**
   * Lazify ships a thin build per architecture rather than a universal binary,
   * so the download is a choice the visitor has to make. The installer makes it
   * for them, which is why it is the recommended route.
   *
   * The names carry no version — see `mac.artifactName` in the builder config —
   * so these URLs keep working as releases go out.
   */
  macDownloads: [
    {
      label: "Apple Silicon",
      hint: "M1 and later",
      href: "https://github.com/Anuboost-Long/lazify-dist/releases/latest/download/Lazify-arm64.dmg",
    },
    {
      label: "Intel",
      hint: "x86_64 Macs",
      href: "https://github.com/Anuboost-Long/lazify-dist/releases/latest/download/Lazify-x64.dmg",
    },
  ],

  /**
   * Windows takes the same shape as macOS: a build per architecture, one
   * button each, rather than one installer pretending to cover both. The list
   * is empty until the first tagged CI run publishes them — the card reads its
   * length and shows "Build in progress" meanwhile, so shipping is a matter of
   * adding entries here and nothing else.
   *
   * x64 first. arm64 follows once node-pty is confirmed to cross-compile on
   * the Windows runner — see electron-builder.win.yml.
   */
  windowsDownloads: [] as ReadonlyArray<{
    label: string;
    hint: string;
    href: string;
  }>,
} as const;
