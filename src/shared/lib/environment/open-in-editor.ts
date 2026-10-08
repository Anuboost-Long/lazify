export interface OpenInEditorRequest {
  /** The project the file belongs to, opened as the editor's window. */
  projectPath: string;
  filePath: string;
  line: number | null;
  /** `code {folder} -g {file}:{line}`. Empty means whatever the OS opens it with. */
  command: string;
}

export interface EditorInvocation {
  program: string;
  args: string[];
}

export type OpenInEditorResult = { ok: true } | { ok: false; error: string };
