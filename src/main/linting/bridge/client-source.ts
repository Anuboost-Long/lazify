/**
 * The script an agent runs to ask the app what it just broke.
 *
 * It is source text rather than a file in the tree because it has to end up
 * next to the session that uses it, run under the agent's own `node`, and
 * disappear with it. CommonJS and no imports beyond node's own: it is parsed by
 * whichever runtime the agent's CLI was installed under, not by ours.
 *
 * Every failure here is silent and exits 0. The app being closed, the socket
 * being gone, analysis timing out — none of that is the agent's problem, and a
 * hook that errors would derail work that is otherwise fine.
 */

export const LINT_CLIENT_SOURCE = String.raw`
const net = require("node:net");

const SOCKET = process.env.LAZIFY_LINT_SOCKET;
const PROJECT = process.env.LAZIFY_LINT_PROJECT || process.cwd();
const TIMEOUT_MS = 120000;

const quit = () => process.exit(0);

function pathsFromHook(payload) {
  const input = (payload && payload.tool_input) || {};
  const found = [input.file_path, input.notebook_path].filter(Boolean);

  if (Array.isArray(input.edits)) {
    input.edits.forEach((edit) => edit && edit.file_path && found.push(edit.file_path));
  }

  return found;
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");

    let raw = "";
    const done = () => resolve(raw);

    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", done);
    process.stdin.on("error", done);
    setTimeout(done, 2000);
  });
}

function ask(paths) {
  return new Promise((resolve) => {
    const socket = net.createConnection(SOCKET);
    let raw = "";

    const give = (report) => {
      socket.destroy();
      resolve(report);
    };

    socket.setTimeout(TIMEOUT_MS, () => give(""));
    socket.on("error", () => give(""));
    socket.on("connect", () =>
      socket.write(JSON.stringify({ paths: paths, projectPath: PROJECT }) + "\n"),
    );
    socket.on("data", (chunk) => {
      raw += chunk;

      const newline = raw.indexOf("\n");

      if (newline === -1) return;

      try {
        give(JSON.parse(raw.slice(0, newline)).report || "");
      } catch {
        give("");
      }
    });
    socket.on("close", () => resolve(""));
  });
}

async function main() {
  if (!SOCKET) return quit();

  const argv = process.argv.slice(2);
  const stdin = argv.length > 0 ? "" : await readStdin();
  let hook = null;

  if (stdin.trim()) {
    try {
      hook = JSON.parse(stdin);
    } catch {
      hook = null;
    }
  }

  const paths = argv.length > 0 ? argv : pathsFromHook(hook);

  if (paths.length === 0) return quit();

  const report = await ask(paths);

  if (!report) return quit();

  // A hook feeds the model through its own envelope; a person at a prompt just
  // wants to read it.
  if (hook) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: report,
        },
      }),
    );
  } else {
    process.stdout.write(report + "\n");
  }

  quit();
}

main().catch(quit);
`;
