import fs from "node:fs";
import path from "node:path";

export interface EditorDefinition {
  id: string;
  label: string;
  /** Everything after the program: how this editor takes a folder and a file. */
  args: string;
  /** Command names to look for on PATH. */
  programs: string[];
  /** Where the editor ships its own launcher, for a machine with no PATH entry. */
  paths: Partial<Record<NodeJS.Platform, string[]>>;
}

export interface DetectedEditor {
  id: string;
  label: string;
  /** The full template, program included, ready for the command runner. */
  command: string;
}

const VSCODE_ARGS = "{folder} -g {file}:{line}";
const JETBRAINS_ARGS = "{folder} --line {line} {file}";
const PATH_ARGS = "{folder} {file}:{line}";

export const editorCatalog: EditorDefinition[] = [
  {
    id: "vscode",
    label: "Visual Studio Code",
    args: VSCODE_ARGS,
    programs: ["code"],
    paths: {
      darwin: ["/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"],
      win32: [
        "C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd",
        "C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd"
      ],
      linux: ["/usr/bin/code", "/snap/bin/code", "/usr/share/code/bin/code"]
    }
  },
  {
    id: "cursor",
    label: "Cursor",
    args: VSCODE_ARGS,
    programs: ["cursor"],
    paths: {
      darwin: ["/Applications/Cursor.app/Contents/Resources/app/bin/cursor"],
      linux: ["/usr/bin/cursor", "/snap/bin/cursor"]
    }
  },
  {
    id: "windsurf",
    label: "Windsurf",
    args: VSCODE_ARGS,
    programs: ["windsurf"],
    paths: { darwin: ["/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf"] }
  },
  {
    id: "vscodium",
    label: "VSCodium",
    args: VSCODE_ARGS,
    programs: ["codium"],
    paths: { darwin: ["/Applications/VSCodium.app/Contents/Resources/app/bin/codium"] }
  },
  {
    id: "zed",
    label: "Zed",
    args: PATH_ARGS,
    programs: ["zed"],
    paths: { darwin: ["/Applications/Zed.app/Contents/MacOS/cli"] }
  },
  {
    id: "sublime",
    label: "Sublime Text",
    args: PATH_ARGS,
    programs: ["subl"],
    paths: { darwin: ["/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl"] }
  },
  {
    id: "webstorm",
    label: "WebStorm",
    args: JETBRAINS_ARGS,
    programs: ["webstorm"],
    paths: { darwin: ["/Applications/WebStorm.app/Contents/MacOS/webstorm"] }
  },
  {
    id: "intellij",
    label: "IntelliJ IDEA",
    args: JETBRAINS_ARGS,
    programs: ["idea"],
    paths: { darwin: ["/Applications/IntelliJ IDEA.app/Contents/MacOS/idea"] }
  },
  {
    id: "rider",
    label: "Rider",
    args: JETBRAINS_ARGS,
    programs: ["rider"],
    paths: { darwin: ["/Applications/Rider.app/Contents/MacOS/rider"] }
  },
  {
    id: "pycharm",
    label: "PyCharm",
    args: JETBRAINS_ARGS,
    programs: ["pycharm"],
    paths: { darwin: ["/Applications/PyCharm.app/Contents/MacOS/pycharm"] }
  },
  {
    id: "phpstorm",
    label: "PhpStorm",
    args: JETBRAINS_ARGS,
    programs: ["phpstorm"],
    paths: { darwin: ["/Applications/PhpStorm.app/Contents/MacOS/phpstorm"] }
  }
];

export interface EditorProbe {
  platform: NodeJS.Platform;
  pathDirectories: string[];
  exists: (candidate: string) => boolean;
}

function systemProbe(): EditorProbe {
  return {
    platform: process.platform,
    pathDirectories: (process.env.PATH ?? "").split(path.delimiter).filter(Boolean),
    exists: (candidate) => {
      try {
        return fs.statSync(candidate).isFile();
      } catch {
        return false;
      }
    }
  };
}

function quoted(program: string) {
  return program.includes(" ") ? `"${program}"` : program;
}

/** The launcher this machine actually has, PATH first, shipped location second. */
function programFor(editor: EditorDefinition, probe: EditorProbe): string | null {
  const onWindows = probe.platform === "win32";
  const suffixes = onWindows ? [".cmd", ".exe", ""] : [""];
  const join = onWindows ? path.win32.join : path.posix.join;

  for (const name of editor.programs) {
    for (const directory of probe.pathDirectories) {
      for (const suffix of suffixes) {
        const candidate = join(directory, `${name}${suffix}`);
        if (probe.exists(candidate)) return candidate;
      }
    }
  }

  return (editor.paths[probe.platform] ?? []).find((candidate) => probe.exists(candidate)) ?? null;
}

export function detectEditors(probe: EditorProbe = systemProbe()): DetectedEditor[] {
  return editorCatalog.flatMap((editor) => {
    const program = programFor(editor, probe);

    if (!program) return [];

    return [{ id: editor.id, label: editor.label, command: `${quoted(program)} ${editor.args}` }];
  });
}
