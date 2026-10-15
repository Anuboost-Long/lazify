import type { ProjectInventory } from "../../types";

const DOCUMENT_NAME_PATTERN = /^(openapi|swagger)([.\-_][\w-]+)?\.(json|ya?ml)$/i;
const SNIFF_EXTENSION_PATTERN = /\.(json|ya?ml)$/i;
const SNIFF_DIRECTORIES = new Set(["", "api", "apis", "doc", "docs", "openapi", "spec", "specs", "schema", "schemas"]);
const SNIFF_LIMIT = 24;
const SNIFF_HEAD_LENGTH = 4000;
const SNIFF_MARKER_PATTERN = /["']?(openapi|swagger)["']?\s*:\s*["']?\d/;

const NON_SPEC_FILE_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "jsconfig.json",
  "composer.json",
  "composer.lock",
  "manifest.json",
  "app.json",
  "angular.json",
  "nest-cli.json",
  "pnpm-lock.yaml",
  "docker-compose.yaml",
  "docker-compose.yml"
]);

function baseName(relativePath: string) {
  return relativePath.slice(relativePath.lastIndexOf("/") + 1);
}

function directoryName(relativePath: string) {
  const separatorIndex = relativePath.lastIndexOf("/");
  return separatorIndex === -1 ? "" : relativePath.slice(0, separatorIndex);
}

function isSniffCandidate(relativePath: string) {
  return (
    SNIFF_EXTENSION_PATTERN.test(relativePath) &&
    SNIFF_DIRECTORIES.has(directoryName(relativePath).toLowerCase()) &&
    !NON_SPEC_FILE_NAMES.has(baseName(relativePath).toLowerCase())
  );
}

async function sniffDocuments(project: ProjectInventory, candidates: string[]) {
  const found: string[] = [];

  for (const relativePath of candidates.slice(0, SNIFF_LIMIT)) {
    const content = await project.readFile(relativePath).catch(() => null);
    if (content && SNIFF_MARKER_PATTERN.test(content.slice(0, SNIFF_HEAD_LENGTH))) {
      found.push(relativePath);
    }
  }

  return found;
}

export async function locateOpenApiDocuments(project: ProjectInventory): Promise<string[]> {
  const named = project.files.filter((relativePath) => DOCUMENT_NAME_PATTERN.test(baseName(relativePath)));

  if (named.length > 0) return named;

  return sniffDocuments(project, project.files.filter(isSniffCandidate));
}
