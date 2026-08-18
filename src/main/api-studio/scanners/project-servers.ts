import type { ProjectInventory } from "../types";

const SERVER_SOURCES = [
  {
    file: /Properties\/launchSettings\.json$/,
    read: (content: string) => {
      const profiles = JSON.parse(content).profiles as Record<string, { applicationUrl?: string }>;

      return Object.values(profiles ?? {}).flatMap((profile) =>
        (profile.applicationUrl ?? "").split(";")
      );
    }
  },
  {
    file: /^\.env(\.local|\.example)?$/,
    read: (content: string) =>
      content
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*(?:BASE_URL|API_URL|APP_URL|PORT)\s*=\s*(.+)$/))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => match[1].trim().replace(/^["']|["']$/g, ""))
        .map((value) => (/^\d+$/.test(value) ? `http://localhost:${value}` : value))
  }
];

/** Where a project states the address its own API answers on. */
export async function readProjectServers(project: ProjectInventory): Promise<string[]> {
  const found: string[] = [];

  for (const source of SERVER_SOURCES) {
    const filePath = project.files.find((file) => source.file.test(file));
    if (!filePath) continue;

    const content = await project.readFile(filePath).catch(() => null);
    if (!content) continue;

    try {
      found.push(...source.read(content));
    } catch {
      continue;
    }
  }

  return Array.from(
    new Set(found.map((url) => url.trim()).filter((url) => url.startsWith("http")))
  );
}
