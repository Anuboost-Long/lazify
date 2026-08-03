import { run } from "./run";

/** Mounting, unmounting, and the one Finder attribute a volume icon needs. */

/**
 * Marks a directory as carrying its own icon, by hand.
 *
 * `SetFile -a C` is the documented way and ships with Xcode's command line
 * tools, which is exactly the dependency this feature is trying not to have. The
 * flag itself is one bit — `kHasCustomIcon`, 0x0400 — in the Finder flags at
 * offset 8 of the 32-byte `com.apple.FinderInfo` attribute, and `xattr` is in
 * every macOS.
 */
export async function setCustomIconFlag(target: string): Promise<boolean> {
  const finderInfo = `${"00".repeat(8)}0400${"00".repeat(22)}`;
  const { code } = await run("xattr", ["-wx", "com.apple.FinderInfo", finderInfo, target]);

  return code === 0;
}

/** Where `hdiutil attach` says it put the volume, or null if it did not say. */
export function mountPointFrom(attachOutput: string): string | null {
  for (const line of attachOutput.split("\n")) {
    const at = line.indexOf("/Volumes/");
    if (at !== -1) return line.slice(at).trim();
  }

  return null;
}

/**
 * Unmounts, allowing for the moment after Finder has finished where the volume
 * is still considered busy. `-force` last rather than first: it can drop writes
 * that a polite detach would have flushed.
 */
export async function detachVolume(mountPoint: string): Promise<void> {
  const { code } = await run("hdiutil", ["detach", mountPoint, "-quiet"]);
  if (code === 0) return;

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await run("hdiutil", ["detach", mountPoint, "-quiet", "-force"]);
}
