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
   * The Windows installer has to be built on Windows for node-pty's native
   * module, so it lands with the first tagged CI run rather than with the mac
   * builds. Flip this to true once that release is published — the download
   * card reads it and needs no other edit.
   */
  windowsReleased: false,
} as const;
