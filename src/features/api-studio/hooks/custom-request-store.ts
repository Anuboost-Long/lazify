import type { CustomCollectionApi } from "./use-custom-collection";
import type { SavedRequestStore } from "./use-saved-requests";

export function customRequestStore(
  custom: CustomCollectionApi,
  projectPath: string
): SavedRequestStore {
  return {
    loadedAt: custom.loadedAt,
    location: "app",
    asking: false,
    saved: (requestId) => {
      const kept = custom.requestById(requestId);

      if (!kept?.draft) return undefined;

      return { ...kept.draft, response: null, examples: kept.examples };
    },
    readBody: (bodyFile) => globalThis.lazify.readApiCollectionBody(projectPath, bodyFile),
    persist: (requestId, request) =>
      custom.saveDraft(
        requestId,
        {
          mode: request.mode,
          json: request.json,
          entries: request.entries,
          fields: request.fields,
          scripts: request.scripts,
          savedAt: request.savedAt
        },
        request.examples
      ),
    forget: (requestId) => custom.saveDraft(requestId, null),
    forgetExample: (requestId, exampleId) => custom.removeExample(requestId, exampleId),
    choose: () => undefined,
    ask: () => undefined,
    dismiss: () => undefined
  };
}
