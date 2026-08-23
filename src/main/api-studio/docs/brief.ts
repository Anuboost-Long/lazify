import fs from "node:fs";
import path from "node:path";

import { renderTemplate } from "../../prompts/template-renderer";
import type { CustomCollection } from "../custom-collections";
import { gapKey } from "./gap-key";
import { buildDocJob } from "./job";
import { docGaps } from "./outline";
import { DEFAULT_DOC_PRESET_ID, docPreset } from "./presets";
import { COLLECTION_SECTIONS, FOLDER_SECTION, ROUTE_SECTIONS, sectionTitle } from "./sections";
import type { CollectionDoc, DocBrief, DocBriefFiles, DocImportResult } from "./types";

const BRIEF_ROOT = path.join(".lazify", "api-studio", "docs");
const BRIEF_FILE = "doc-brief.md";
const JOB_FILE = "doc-job.json";
const ANSWER_FILE = "doc-draft.json";

export const HOUSE_RULES = [
  "Read the source for a route before describing it; the scan is a skeleton, not the truth.",
  "Never invent a parameter, field, status code, header or limit that is not in the code.",
  "Say what the caller gets, not how the handler is written.",
  "One voice across every route: present tense, second person for the caller, no marketing.",
  "Keep each section to its own job — no section repeats what another already says.",
  "Where something cannot be verified, say so plainly instead of filling the gap.",
  "Answer every open question you are given; if the code cannot answer one, say what is missing."
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "collection";
}

export function briefFiles(projectPath: string, collection: CustomCollection): DocBriefFiles {
  const directory = path.join(path.resolve(projectPath), BRIEF_ROOT, slug(collection.name));

  return {
    directory,
    instructionsPath: path.join(directory, BRIEF_FILE),
    jobPath: path.join(directory, JOB_FILE),
    answerPath: path.join(directory, ANSWER_FILE)
  };
}

function relative(projectPath: string, filePath: string): string {
  return path.relative(path.resolve(projectPath), filePath).split(path.sep).join("/");
}

function sectionRules(): string {
  return [...COLLECTION_SECTIONS, FOLDER_SECTION, ...ROUTE_SECTIONS]
    .map(
      (section) =>
        `- ${section === FOLDER_SECTION ? "Folder" : section.scope === "collection" ? "Collection" : "Route"} · ${section.title} (${section.id})${
          section.required ? " — required" : ""
        }: ${section.hint} ${section.rule}`
    )
    .join("\n");
}

export function buildDocBrief(
  projectPath: string,
  collection: CustomCollection,
  doc: CollectionDoc
): DocBrief {
  const preset = docPreset(doc.presetId || DEFAULT_DOC_PRESET_ID);
  const files = briefFiles(projectPath, collection);
  const job = buildDocJob(collection, doc);
  const gaps = docGaps(collection, doc);

  const instructions = renderTemplate(preset.template, {
    project_name: path.basename(path.resolve(projectPath)),
    collection_name: doc.title || collection.name,
    job_file: relative(projectPath, files.jobPath),
    answer_file: relative(projectPath, files.answerPath),
    house_rules: HOUSE_RULES.map((rule) => `- ${rule}`).join("\n"),
    section_rules: sectionRules(),
    open_questions: gaps
      .map(
        (gap) =>
          `- ${gap.where} · ${sectionTitle(gap.requestId ? "route" : "collection", gap.sectionId)}: ${
            gap.question
          }`
      )
      .join("\n"),
    route_list: job.routes
      .map((route) => `- ${route.method} ${route.path} — requestId ${route.requestId}`)
      .join("\n")
  });

  return {
    presetId: preset.id,
    instructions,
    job: `${JSON.stringify(job, null, 2)}\n`,
    gaps
  };
}

export function writeDocBrief(
  projectPath: string,
  collection: CustomCollection,
  doc: CollectionDoc
): DocBriefFiles {
  const files = briefFiles(projectPath, collection);
  const brief = buildDocBrief(projectPath, collection, doc);

  fs.mkdirSync(files.directory, { recursive: true });
  fs.writeFileSync(files.instructionsPath, brief.instructions, "utf8");
  fs.writeFileSync(files.jobPath, brief.job, "utf8");

  return files;
}

interface AgentDraft {
  collection?: Record<string, unknown>;
  folders?: Array<{ id?: string; description?: unknown }>;
  routes?: Array<{ requestId?: string; sections?: Record<string, unknown> }>;
}

function writable(
  sections: Record<string, unknown> | undefined,
  known: Set<string>,
  ignored: Set<string>
): Record<string, string> {
  const kept: Record<string, string> = {};

  for (const [id, value] of Object.entries(sections ?? {})) {
    if (typeof value !== "string" || !value.trim()) continue;

    if (known.has(id)) kept[id] = value.trim();
    else ignored.add(id);
  }

  return kept;
}

/** Answers for what is already written are left for the user to take deliberately. */
function unheld(
  incoming: Record<string, string> | undefined,
  written: Record<string, string> | null
): Record<string, string> | undefined {
  if (!incoming || !written) return incoming;

  return Object.fromEntries(
    Object.entries(incoming).filter(([id]) => !written[id]?.trim())
  );
}

export function mergeAgentDraft(
  doc: CollectionDoc,
  draft: AgentDraft,
  onlyEmpty = false
): DocImportResult {
  const ignored = new Set<string>();
  const collectionIds = new Set(COLLECTION_SECTIONS.map((section) => section.id));
  const routeIds = new Set(ROUTE_SECTIONS.map((section) => section.id));
  const written = writable(draft.collection, collectionIds, ignored);
  const describedFolders = new Map(
    (draft.folders ?? [])
      .filter((folder) => folder?.id && typeof folder.description === "string")
      .map((folder) => [folder.id as string, (folder.description as string).trim()])
  );
  const byId = new Map(
    (draft.routes ?? [])
      .filter((route) => route?.requestId)
      .map((route) => [route.requestId as string, writable(route.sections, routeIds, ignored)])
  );
  const kept = unheld(written, onlyEmpty ? doc.sections : null) ?? {};
  const filledKeys = Object.keys(kept).map((sectionId) =>
    gapKey({ requestId: null, sectionId, where: "", question: "" })
  );
  let filled = Object.keys(kept).length;

  const folders = doc.folders.map((folder) => {
    const description = describedFolders.get(folder.id);

    if (!description || (onlyEmpty && folder.description.trim())) return folder;

    filled += 1;
    filledKeys.push(
      gapKey({ requestId: null, folderId: folder.id, sectionId: "folder_description", where: "", question: "" })
    );

    return { ...folder, description };
  });

  const routes = doc.routes.map((route) => {
    const incoming = unheld(byId.get(route.requestId), onlyEmpty ? route.sections : null);

    if (!incoming || Object.keys(incoming).length === 0) return route;

    filled += Object.keys(incoming).length;
    filledKeys.push(
      ...Object.keys(incoming).map((sectionId) =>
        gapKey({ requestId: route.requestId, sectionId, where: "", question: "" })
      )
    );

    return {
      ...route,
      sections: { ...route.sections, ...incoming },
      writtenBy: "agent" as const,
      updatedAt: new Date().toISOString()
    };
  });

  return {
    doc: {
      ...doc,
      sections: { ...doc.sections, ...kept },
      folders,
      routes,
      updatedAt: new Date().toISOString()
    },
    filled,
    filledKeys,
    ignored: [...ignored]
  };
}

export function readAgentDraft(filePath: string): AgentDraft {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as AgentDraft;
}
