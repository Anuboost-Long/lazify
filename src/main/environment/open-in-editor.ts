import { shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";

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

const FOLDER_SETTLE_MS = 400;

/** Splits a command the way a shell would, without handing one a string to run. */
function argumentsOf(command: string): string[] {
  return Array.from(command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)).map(
    (match) => match[1] ?? match[2] ?? match[3]
  );
}

function filled(argument: string, request: OpenInEditorRequest) {
  return argument
    .replace(/\{folder\}/g, request.projectPath)
    .replace(/\{file\}/g, request.filePath)
    .replace(/\{line\}/g, String(request.line ?? 1));
}

/**
 * An editor opened on a lone file is a window with no project behind it: no
 * search, no go-to-definition, nothing the rest of the code would tell it. So
 * the folder is opened first and the file second, unless the command already
 * says where the folder goes.
 */
export function editorInvocations(request: OpenInEditorRequest): EditorInvocation[] {
  const template = request.command.trim();
  if (!template) return [];

  const [program, ...rest] = argumentsOf(template);
  const args = rest.map((argument) => filled(argument, request));

  if (rest.some((argument) => argument.includes("{folder}"))) {
    return [{ program, args }];
  }

  const withFile = args.some((argument) => argument.includes(request.filePath))
    ? args
    : [...args, request.filePath];

  return [
    { program, args: [request.projectPath] },
    { program, args: withFile }
  ];
}

function run(invocation: EditorInvocation): Promise<OpenInEditorResult> {
  return new Promise((resolve) => {
    try {
      const child = spawn(invocation.program, invocation.args, {
        detached: true,
        stdio: "ignore"
      });

      child.unref();
      child.once("error", (error) => resolve({ ok: false, error: error.message }));
      setTimeout(() => resolve({ ok: true }), 150);
    } catch (error) {
      resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function openInEditor(request: OpenInEditorRequest): Promise<OpenInEditorResult> {
  if (!request.filePath || !fs.existsSync(request.filePath)) {
    return { ok: false, error: "That file is no longer on disk." };
  }

  const invocations = editorInvocations(request);

  if (invocations.length === 0) {
    const failure = await shell.openPath(request.filePath);

    return failure ? { ok: false, error: failure } : { ok: true };
  }

  for (const [at, invocation] of invocations.entries()) {
    if (at > 0) await wait(FOLDER_SETTLE_MS);

    const result = await run(invocation);
    if (!result.ok) return result;
  }

  return { ok: true };
}
