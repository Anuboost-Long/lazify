/**
 * The script an agent runs to ask the app what it just broke.
 *
 * It is source text rather than a file in the tree because it has to end up
 * next to the session that uses it, run under the agent's own `node`, and
 * disappear with it. CommonJS and no imports beyond node's own: it is parsed by
 * whichever runtime the agent's CLI was installed under, not by ours.
 *
 * Every failure here is silent and exits 0. The app being closed, the server
 * being gone, analysis timing out — none of that is the agent's problem, and a
 * hook that errors would derail work that is otherwise fine.
 */

export const LINT_CLIENT_SOURCE = String.raw`
const http = require("node:http");

const URL_BASE = process.env.LAZIFY_LINT_URL;
const TOKEN = process.env.LAZIFY_LINT_TOKEN || "";
const PROJECT = process.env.LAZIFY_LINT_PROJECT || process.cwd();
const TIMEOUT_MS = 120000;
const POLL_MS = 250;

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

function call(method, path, body) {
  return new Promise((resolve) => {
    const request = http.request(
      URL_BASE + path,
      { method: method, headers: { "content-type": "application/json", "x-lazify-token": TOKEN }, timeout: 30000 },
      (response) => {
        let raw = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => (raw += chunk));
        response.on("end", () => {
          try {
            resolve(response.statusCode === 200 ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        });
        response.on("error", () => resolve(null));
      },
    );

    request.on("timeout", () => request.destroy());
    request.on("error", () => resolve(null));
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ask(paths) {
  const deadline = Date.now() + TIMEOUT_MS;
  let answer = await call("POST", "/lint", { paths: paths, projectPath: PROJECT });

  while (answer && answer.job && Date.now() < deadline) {
    const job = answer.job;

    await wait(POLL_MS);
    answer = await call("GET", "/lint/" + encodeURIComponent(job));
    if (answer && answer.pending) answer = { job: job };
  }

  return (answer && answer.report) || "";
}

async function main() {
  if (!URL_BASE) return quit();

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
