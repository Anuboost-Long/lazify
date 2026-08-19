import vm from "node:vm";

import { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./global-name";
import { postmanFacade } from "./postman-facade";
import { POSTMAN_GLOBAL } from "./postman-map";

const TIMEOUT_MS = 2_000;

const SAFE_GLOBALS = {
  JSON,
  Math,
  Date,
  URL,
  URLSearchParams,
  TextEncoder,
  TextDecoder,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  atob,
  btoa
};

function messageOf(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);

  return text.includes("Script execution timed out")
    ? `The script did not finish within ${TIMEOUT_MS / 1000} seconds.`
    : text;
}

export function runInSandbox(
  source: string,
  api: Record<string, unknown>,
  globalName = DEFAULT_SCRIPT_GLOBAL
): string | null {
  const named = isUsableGlobal(globalName) ? globalName : DEFAULT_SCRIPT_GLOBAL;
  const native = api[DEFAULT_SCRIPT_GLOBAL] as Record<string, unknown>;
  const context = vm.createContext(
    {
      ...SAFE_GLOBALS,
      ...api,
      [named]: native,
      ...(named === POSTMAN_GLOBAL ? { [POSTMAN_GLOBAL]: postmanFacade(native) } : {})
    },
    { name: "api-studio-script" }
  );

  try {
    new vm.Script(`"use strict";\n${source}`, { filename: "script.js" }).runInContext(context, {
      timeout: TIMEOUT_MS,
      displayErrors: true
    });

    return null;
  } catch (error) {
    return messageOf(error);
  }
}
