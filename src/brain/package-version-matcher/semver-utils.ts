/** Strip all leading range prefix characters and trailing pre-release/build metadata. */
export function stripRangePrefix(v: string): string {
  return v.trim().replace(/^[~^>=<!]+\s*/, "").split(/[-+]/)[0].trim();
}

/** Parse a bare version string (no prefix) into [major, minor, patch]. */
function parseParts(v: string): [number, number, number] {
  const parts = stripRangePrefix(v).split(".").map((n) => parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Compares two version strings (prefix-tolerant).
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parseParts(a);
  const [bMaj, bMin, bPat] = parseParts(b);
  return aMaj - bMaj || aMin - bMin || aPat - bPat;
}

/** True when `version` (bare semver) satisfies a single non-OR range clause. */
function satisfiesSingle(version: string, range: string): boolean {
  const r = range.trim();
  if (!r || r === "*" || r === "latest") return true;

  // Handle compound range like ">=16.8.0 <17" (space-separated, no ||)
  if (r.includes(" ") && !r.includes("||")) {
    return r.split(/\s+/).every((part) => satisfiesSingle(version, part));
  }

  const [vMaj, vMin, vPat] = parseParts(version);
  const rClean = stripRangePrefix(r);
  const [rMaj, rMin, rPat] = parseParts(rClean);

  if (r.startsWith(">=")) return compareVersions(version, rClean) >= 0;
  if (r.startsWith(">"))  return compareVersions(version, rClean) > 0;
  if (r.startsWith("<=")) return compareVersions(version, rClean) <= 0;
  if (r.startsWith("<"))  return compareVersions(version, rClean) < 0;

  if (r.startsWith("^")) {
    if (rMaj !== 0) return vMaj === rMaj && compareVersions(version, rClean) >= 0;
    if (rMin !== 0) return vMaj === 0 && vMin === rMin && vPat >= rPat;
    return vMaj === 0 && vMin === 0 && vPat >= rPat;
  }

  if (r.startsWith("~")) {
    return vMaj === rMaj && vMin === rMin && vPat >= rPat;
  }

  // Exact or partial: "18" → major only; "18.2" → major.minor; "18.2.0" → exact
  const segments = rClean.split(".");
  if (segments.length === 1) return vMaj === rMaj;
  if (segments.length === 2) return vMaj === rMaj && vMin === rMin;
  return vMaj === rMaj && vMin === rMin && vPat === rPat;
}

/**
 * Returns true when `version` satisfies the npm-style `range`.
 * Supports `||` OR composition and all common prefix operators.
 */
export function satisfies(version: string, range: string): boolean {
  const clean = stripRangePrefix(version);
  return range
    .split("||")
    .map((part) => part.trim())
    .some((part) => satisfiesSingle(clean, part));
}

/** True if a version string looks like a pre-release (has `-alpha`, `-beta`, `-rc`, etc.) */
export function isPreRelease(version: string): boolean {
  return /[-]/.test(version.trim().replace(/^[~^>=<!]+\s*/, ""));
}
