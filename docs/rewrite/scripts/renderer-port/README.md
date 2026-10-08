# Renderer port tools (ticket 015)

Run from the repository root, with the Electron repo at `../lazify`.

1. `node docs/rewrite/scripts/renderer-port/preload_signatures.mjs /tmp/preload.json`
   reads every member of Electron's `src/preload/api/*.ts`.
2. `PRELOAD_JSON=/tmp/preload.json python3 docs/rewrite/scripts/renderer-port/gen_api.py`
   writes `src/platform/lazify-api.ts`, resolving each type to the Electron
   file that declares it. It copies files that only hold types into
   `src/shared/lib/`, writes types-only stand-ins for types declared inside
   Node modules (`extract_types.py`), and appends a missing type to an
   existing file.
3. `fixup.py` repeats that for imports inside the copied files until
   `tsc` finds no missing module.

`src/platform/lazify.ts` (the bridge object) is maintained by hand: ported
groups map to `src/platform/` functions, and the generated stubs cover the
rest.
