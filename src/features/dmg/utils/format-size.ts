/** Bytes as something readable. Disk images are megabytes; two units is plenty. */
export function formatSize(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const megabytes = bytes / (1024 * 1024);

  return megabytes >= 1024
    ? `${(megabytes / 1024).toFixed(2)} GB`
    : `${megabytes.toFixed(1)} MB`;
}
