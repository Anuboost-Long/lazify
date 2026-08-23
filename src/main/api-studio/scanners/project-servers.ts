import { parseYamlDocument } from "../yaml";
import type { ProjectInventory } from "../types";

/**
 * Where a project states the address its own API answers on.
 *
 * A port is written down in whichever place a team happens to keep it — the
 * launch profile, an `.env`, the compose file that runs it, the line in the
 * entry point that starts the server — so all of them are read, nearest the
 * project first. What ends up in the environment is the first one found.
 */

const ENV_FILE = /(^|\/)\.env(\.[\w-]+)?$/;
const ENTRY_FILE = /(^|\/)(main|index|app|server)\.(ts|js|mjs|py)$/;
const COMPOSE_FILE = /(^|\/)docker-compose(\.[\w-]+)?\.ya?ml$/;
const LAUNCH_SETTINGS = /Properties\/launchSettings\.json$/;

const asUrl = (value: string) =>
  /^\d+$/.test(value) ? `http://localhost:${value}` : value.replace(/\/+$/, "");

function fromLaunchSettings(content: string) {
  const profiles = JSON.parse(content).profiles as Record<string, { applicationUrl?: string }>;

  return Object.values(profiles ?? {}).flatMap((profile) =>
    (profile.applicationUrl ?? "").split(";")
  );
}

function fromEnvFile(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:BASE_URL|API_URL|APP_URL|PORT|APP_PORT|SERVER_PORT)\s*=\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => asUrl(match[1].trim().replace(/^["']|["']$/g, "")));
}

/** `app.listen(4500)`, `process.env.PORT || 4500`, `uvicorn.run(port=8000)`. */
function fromEntryFile(content: string) {
  const patterns = [
    /\.listen\s*\(\s*(\d{2,5})/,
    /PORT\s*(?:\|\||\?\?)\s*(\d{2,5})/,
    /PORT\s*,\s*(\d{2,5})/,
    /port\s*=\s*(\d{2,5})/
  ];

  return patterns
    .map((pattern) => content.match(pattern)?.[1])
    .filter((port): port is string => Boolean(port))
    .map(asUrl);
}

interface ComposeService {
  build?: string | { context?: string };
  ports?: string[];
}

/** The service whose build context is this project, and the port it publishes. */
function fromCompose(content: string, workspace: string) {
  const services = (parseYamlDocument(content) as { services?: Record<string, ComposeService> })
    ?.services;

  if (!services) return [];

  const wanted = workspace.replace(/^\.\//, "");

  return Object.values(services).flatMap((service) => {
    const context = (typeof service.build === "string" ? service.build : service.build?.context)
      ?.replace(/^\.\//, "")
      .replace(/\/+$/, "");

    if (wanted && context !== wanted) return [];

    const published = (service.ports ?? [])
      .map((mapping) => String(mapping).split(":")[0].replace(/"/g, "").trim())
      .filter((port) => /^\d{2,5}$/.test(port));

    return published.map(asUrl);
  });
}

async function read(project: ProjectInventory, files: string[], pattern: RegExp) {
  const filePath = files.find((file) => pattern.test(file));
  if (!filePath) return null;

  return { filePath, content: await project.readFile(filePath).catch(() => null) };
}

export async function readProjectServers(
  project: ProjectInventory,
  workspace = ""
): Promise<string[]> {
  const found: string[] = [];
  const own = project.files;
  const repository = project.repositoryFiles ?? project.files;

  const sources: Array<[string[], RegExp, (content: string) => string[]]> = [
    [own, LAUNCH_SETTINGS, fromLaunchSettings],
    [own, ENV_FILE, fromEnvFile],
    [repository, COMPOSE_FILE, (content) => fromCompose(content, workspace)],
    [own, ENTRY_FILE, fromEntryFile]
  ];

  for (const [files, pattern, parse] of sources) {
    const source = await read(project, files, pattern);
    if (!source?.content) continue;

    try {
      found.push(...parse(source.content));
    } catch {
      continue;
    }
  }

  return Array.from(
    new Set(found.map((url) => url.trim()).filter((url) => url.startsWith("http")))
  );
}
