export type DocSectionScope = "collection" | "route";

export type DocAuthor = "user" | "agent" | "detected";

export interface DocSectionSpec {
  id: string;
  scope: DocSectionScope;
  title: string;
  hint: string;
  rule: string;
  required: boolean;
}

export interface DocFolderEntry {
  id: string;
  name: string;
  description: string;
}

export interface DocRouteEntry {
  requestId: string;
  title: string;
  folderId: string;
  folder: string;
  sections: Record<string, string>;
  writtenBy: DocAuthor;
  updatedAt: string;
}

export type DocPageSize = "A4" | "Letter";

export type DocMargin = "narrow" | "normal" | "wide";

export interface DocTheme {
  accent: string;
  /** A data URI for the image the cover carries. Empty when there is none. */
  logo: string;
  pageSize: DocPageSize;
  margin: DocMargin;
  cover: boolean;
  contents: boolean;
  curl: boolean;
  examples: boolean;
  darkCode: boolean;
}

export interface CollectionDoc {
  collectionId: string;
  title: string;
  subtitle: string;
  version: string;
  baseUrl: string;
  presetId: string;
  sections: Record<string, string>;
  folders: DocFolderEntry[];
  routes: DocRouteEntry[];
  theme: DocTheme;
  updatedAt: string;
}

export interface DocGap {
  requestId: string | null;
  folderId?: string;
  sectionId: string;
  where: string;
  question: string;
}

export type DocFormat = "html" | "pdf";

export interface DocExport {
  filePath: string;
  format: DocFormat;
  routes: number;
}

export interface DocPreset {
  id: string;
  name: string;
  description: string;
  template: string;
}

export interface DocBrief {
  presetId: string;
  instructions: string;
  job: string;
  gaps: DocGap[];
}

export interface DocBriefFiles {
  directory: string;
  instructionsPath: string;
  jobPath: string;
  answerPath: string;
}

export interface DocImportResult {
  doc: CollectionDoc;
  filled: number;
  /** Which fields the answers landed in, so the editor can point at them. */
  filledKeys: string[];
  ignored: string[];
}

export interface DocState {
  doc: CollectionDoc;
  gaps: DocGap[];
}
