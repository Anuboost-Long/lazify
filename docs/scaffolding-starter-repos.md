# Starter-Repo Scaffolding

Status: in progress — Phases 1–5 done, revised 2026-08-03
Owner: Ly kimlong

> Current init flow: project-structure review was removed on 2026-08-03.
> Continue now opens Console and runs project creation as one operation. Picker
> sections below describe the superseded review design, not active init behavior.

Replace Lazify's hand-maintained scaffold constants with real, runnable starter
repositories that Lazify clones. The starters are maintained as ordinary apps;
Lazify becomes a clone-and-personalize client that knows nothing about any
specific framework.

A stack with no starter repo is not a gap in the design. It is created by its own
framework CLI, with dependencies the user picks at create time. Both routes end in
a real directory on disk without synthesizing a file tree inside Lazify.

---

## 1. Problem

Today a new project is produced by two sources that must agree with each other:

1. The framework CLI (`create-next-app`, `create-expo-app`) runs first —
   `src/main/scaffolding/workflow-engine.ts:90-135`.
2. Lazify then overlays a tree synthesized from TypeScript string constants —
   `src/renderer/shared/ui/project-tree/constants/scaffold/*.ts` (~1,600 lines),
   `constants/template-blueprints.ts`, and the path→content mapping in
   `tree-utils.ts` (`getDefaultFileContent`, `buildBaselineTree`).

Source 2 encodes assumptions about source 1's output. Those assumptions expire
whenever the framework changes, and nothing detects it. Two failures found in a
single session:

- The Next template still scaffolded `app/[locale]/…` locale-segment routing,
  a convention we no longer want.
- `srcDir` was a user-toggleable flag while the blueprint always wrote root-level
  `app/`, so `--src-dir` produced **two competing `app/` folders**. The generated
  project could not build.

Both bugs lived in files that are invisible to the type checker, the linter, and
the test suite, because the code is inside escaped template literals
(`` \`/\${locale}\` ``). Nothing runs the output.

### The underlying split

Sorting the Next template by whether a file imports from the framework:

| Framework-free (stable for years) | Framework-shaped (rots) |
| --- | --- |
| `i18n/i18n.ts` | `app/layout.tsx` |
| `i18n/lang/*.json` | `app/**/page.tsx` |
| `store/app-store.ts` | `components/navigation/nav-link.tsx` (`next/link`, `usePathname`) |
| `lib/utils.ts` | `components/shared/i18n-provider.tsx` (`"use client"`) |
| `types/navigation.ts` | `globals.css`, `next.config`, `package.json`, folder placement |

Every incident to date has come from the right-hand column. The design principle
that follows:

> **Never encode a file that imports from the framework. Either the framework CLI
> owns it, or a real repo that gets built by CI owns it.**

## 2. Decision

Every stack is one **catalog entry**. An entry names the framework CLI command
that can always create the project, and may also name a **starter repository**
holding a working, CI-verified application. Lazify clones a pinned starter when
there is one and runs the CLI when there is not.

Maintenance becomes ordinary app work in a normal repo — types, lint, and a CI
build that goes red the week a framework changes — instead of archaeology in
string constants. Adding a stack becomes an object in a catalog with no code
behind it; the four templates that exist today are the cost of the old approach,
not a limit of the new one.

### 2.1 Two tiers

| | Tier 1 — preset project | Tier 2 — bare setup |
| --- | --- | --- |
| Produced by | starter repo, cloned at a pinned tag | framework CLI (`createCommands`) |
| Applies when | entry has `starter` and a copy is reachable | no `starter`, or none reachable |
| Conventions arrive as | real files, verified green by CI | dependencies the user ticks |
| Result | a real directory on disk | a real directory on disk |

Both tiers hand the same thing to the same picker (§5). Tier 2 is not a damaged
version of tier 1 to be escaped from — it is how a stack nobody has written a
starter for still gets house dependencies and a working project on the same day
someone asks for it.

**Degrade explicitly, never silently.** Someone who picks a stack expecting the
preset and receives a bare CLI project because their network dropped will spend an
hour hunting for files that were never written. So an unreachable starter *offers*
the bare route and waits for a click. A clone that fails because the tag is gone
offers nothing automatically: a starter that should be there and is not is a
different problem from a flaky network, and §4.4 says report each as what it is.

### Rejected alternatives

| Option | Why not |
| --- | --- |
| Keep constants, probe the tree instead of assuming paths | Fixes the `src-dir` class of bug but not the root cause. The code is still untested strings. Worth doing only if the migration stalls. |
| CLI + agent-generated overlay | Genuinely near-zero maintenance and adapts to new framework versions, but nondeterministic, slower, and there is no known-good baseline to diff against. **Keep as a complement** for framework-shaped files once starters are in place. |
| Vendor upstream community starters (T3 etc.) | Does not carry our house conventions (react-i18next + Jotai + `src/i18n/lang`), and hands version control to a third party. |
| Ship the catalog inside the app | Simplest thing that works, but adding or fixing a stack then needs an app release. The registry repo (§4.0) keeps a bundled copy for offline and first run, so this is a fallback rather than the source of truth. |
| List the starter's files through the GitHub API for browsing | Two sources that must agree — exactly the failure in §1 — plus network at picker time and rate limits. The clone we are going to make anyway is the only listing that cannot drift from the result. |

## 3. Target architecture

```
              ┌────────────────────────────────────────┐
              │ CATALOG — one object per stack         │
              │ id, name, icon, language, packageMgr,  │
              │ createCommands, recommendedPackages,   │
              │ starter? { repo, ref }                 │
              └───────────────────┬────────────────────┘
     bundled seed → cache → registry repo (§4.0)
                                  │
                ┌─────────────────┴──────────────────┐
                │  has `starter`, and is it reachable? │
                └───┬──────────────────────────┬─────┘
                  yes                          no
                    │                          │
      ┌─────────────▼─────────────┐  ┌─────────▼──────────────┐
      │ git clone --branch <ref>  │  │ run createCommands     │
      │ drop .git, substitute     │  │ npm create vue@latest  │
      └─────────────┬─────────────┘  └─────────┬──────────────┘
                    │                          │
                    └─────────────┬────────────┘
                                  ▼
              ┌────────────────────────────────────────┐
              │ PROJECT TREE, READ FROM DISK           │
              │ browse · remove files · tick optional  │
              │ folders · pick extra packages          │
              └───────────────────┬────────────────────┘
                                  ▼
                        install → git init
```

### 3.1 The catalog entry

One object per stack. This is the whole surface for adding a stack — there is no
code path behind it to extend:

```jsonc
{
  "id": "next",                       // stable key; names get renamed, ids do not
  "name": "Next.js App",
  "icon": "nextjs",                   // a name from the bundled UiIcon set, not a URL
  "language": "TypeScript",
  "packageManager": "npm",            // next-scaffold ships package-lock, expo ships yarn.lock
  "createCommands": ["npx create-next-app@latest {{projectName}} --ts --app"],
  "recommendedPackages": ["react-i18next", "jotai", "clsx"],
  "starter": {                        // optional — its absence is what makes a stack tier 2
    "repo": "anuboost-lazify/next-scaffold",
    "ref": "v1.0.0"
  }
}
```

Rules that keep this from rotting into the thing being deleted:

- **`createCommands` is required on every entry, including entries that have a
  starter.** That is what makes tier 2 a universal fallback rather than a
  per-stack accident.
- **`{{projectName}}` is the only placeholder** the commands may use.
- **`icon` names something already bundled.** A remote URL will not render and
  must not be fetched.
- **No file content, ever.** Conventions travel as `recommendedPackages` — a
  dependency list does not rot the way a file importing from the framework does
  (§1).

### 3.2 Starter repositories

One repo per stack, each a working application:

| Repo | Replaces |
| --- | --- |
| `anuboost-lazify/next-scaffold` | `templates/next.json` + `scaffold/next-default.ts` |
| `anuboost-lazify/expo-scaffold` | `templates/expo.json` + `scaffold/expo-default.ts` |
| _vite-react — not yet created_ | `templates/vite-react.json` |
| _react-native-bare — not yet created_ | `templates/react-native-bare.json` |

Each repo contains, at its root, a `starter.json` that declares what Lazify needs
to know. **This is the key move**: the starter describes itself, so Lazify never
learns framework specifics and never needs a release to accommodate a new stack.

`starter.json` is **optional**, with defaults that make an undeclared repo behave
sensibly — no substitutions, no optional folders, nothing required. Neither
existing repo has one yet, and both must still scaffold.

```jsonc
{
  "schemaVersion": 1,
  "id": "next-default",
  "label": "Next.js App",
  "description": "App Router, react-i18next, Jotai, src/ layout.",
  "projectType": "next",
  "preferredPackageManager": "npm",
  "substitutions": [
    { "file": "package.json", "jsonPath": "name", "value": "{{projectName}}" },
    { "file": "src/app/layout.tsx", "token": "__APP_TITLE__", "value": "{{projectName}}" }
  ],
  "optionalFolders": [
    { "path": "src/hooks", "label": "hooks" },
    { "path": "src/utils", "label": "utils" },
    { "path": "src/api", "label": "api" }
  ],
  "required": ["package.json", "package-lock.json", "next.config.ts", "src/app/layout.tsx"],
  "excludeFromCopy": [".github", "starter.json", "README.starter.md"]
}
```

Keep `substitutions` to a literal two or three entries. The moment it grows
conditionals we have rebuilt the thing being deleted.

`required` is the **inverse** of a manifest, and deliberately so. It is a short
glob list of what the picker may not remove — the files without which the app
cannot build. Everything else is removable by default, which means a file added
to the starter next month appears in the picker on its own, with no descriptor
change and nothing to drift. Enumerating the removable files instead would
rebuild the blueprint in JSON.

**Repo hygiene:** commit the lockfile (reproducible installs), never commit
`node_modules`, `.next`, `.expo`, or build output. The clone must stay small —
target under 1 MB.

### 3.3 What lives where

| | Home | Why there |
| --- | --- | --- |
| Registry pin (`repo` + `ref` + `sha256` of the catalog itself) | Lazify | Cannot live in the thing it pins — see below |
| Catalog entries: names, icons, commands, recommended packages, starter pins | Registry repo (+ bundled seed) | Add a stack without an app release |
| Starter self-description: substitutions, optional folders, `required` | The starter repo | Ships and versions with the files it describes |
| The file tree | The cloned starter, or the CLI's output | Read from disk; never synthesized |

**The pin invariant.** A pin exists so a bad push on Monday cannot break every
project created on Tuesday (§4.2), so it always sits one level above what it
pins: Lazify pins the registry, and the registry pins each starter's tag. A repo
that declared its own pin would verify nothing, because the same push rewrites
both. The catalog is fetched as a file and so is also hash-verified; a starter is
cloned, and its tag is the whole pin.

`TemplateDefinition` in `src/main/scaffolding/harmonizer.ts:20-30` becomes the catalog entry
type and gains an optional `starter?: StarterSource`. The existing
`createCommands` / `createOptions` fields stay valid throughout — they are now the
tier 2 path rather than a migration leftover.

## 4. Distribution

This is where the method matters most — it decides first-run latency, offline
behaviour, and whether a bad push can break project creation.

### 4.0 The catalog

The catalog lives in its own public repo and reaches Lazify by the same ladder
the starters use:

```
bundled seed (in app)  ──▶  picker renders instantly, offline, on first run
        │
        └──▶ cached copy, if newer  ──▶  background refresh; never blocks the UI
```

Reading a small JSON file at startup costs nothing measurable — that was never the
problem with the current design. What it costs is a release to change a template,
and drift (§1). But the reverse **is** a real cost: a picker that must reach the
network before it can list anything has made cold start depend on wifi. Hence
seed-first, refresh-behind. The bundled copy is a genuine fallback, not a stale
duplicate to reconcile.

Adding Vue becomes a pull request to the registry. The entry names
`npm create vue@latest` and a few recommended packages, has no `starter`, and is
therefore tier 2 — a complete answer with nothing written in Lazify.

The registry itself is pinned and verified exactly like a starter (§4.2), because
a catalog that could be repointed silently could repoint every stack at once.
Adopting a newer catalog is a deliberate bump, never automatic.

### 4.1 Fetch: clone the tag directly

**Revised 2026-08-02.** An earlier draft of this section specified a codeload
tarball, cached and verified by `sha256`. That is replaced by a plain clone:

```
git clone --depth 1 --branch <ref> https://github.com/<owner>/<repo>.git <projectPath>
```

The clone lands in the project directory, its `.git` is removed so the user's
first commit is their own work, and the declared substitutions run. `git` is
already a hard requirement everywhere else in the app.

What the tarball bought was offline capability and byte-level verification. The
first is not a real requirement (§4.4), and the second is discussed in §4.2. What
it cost was a download step, a hash to keep in sync with every starter release, a
two-level cache, and a staging copy to protect that cache. All of it is gone.

### 4.2 Pin to a tag

Lazify clones an immutable tag, never a branch. A push to a starter on Monday
must not change what every project created on Tuesday gets.

There is no `sha256`. A clone does not produce a file to hash, so verification
would have had to move to a content hash of the tree — real machinery, kept in
sync by hand at every release, to defend against an attacker who can already
force-push to the starter repo. The tag pin carries the reproducibility; branch
protection on the starter repo is the right place for the rest.

Adopting a new starter version stays a deliberate act: bump `ref` in the catalog
entry. **No silent auto-upgrade.**

### 4.3 No cache, no staging

The clone goes straight into the project directory. Nothing is shared between
projects, so there is no cached copy to poison and no staging copy needed to
protect one — the staging step in §5 exists only to guard a shared cache, and
without the cache it has no reason to exist.

The cost is one clone per project instead of one per starter version. A shallow
clone of a sub-1 MB repo is not what makes project creation slow; `npm install`
is, and that runs either way.

> Note: `src/main/scaffolding/imported-template-store.ts:18` resolved its directory from
> `process.cwd()`, unwritable in a packaged app. Fixed to `app.getPath("userData")`
> in Phase 1.

### 4.4 Internet is required

There is no offline path and no starter tarball bundled in the app. Creating a
project already runs `npm install`, so a developer without a connection cannot
finish one regardless of where the files came from — an offline scaffold would
hand them a directory that cannot be installed.

So a failed clone is reported as what it is. `provisionStarter` classifies the
failure and the UI says the one useful thing:

| Reason | What the user sees |
| --- | --- |
| `offline` | No internet connection — connect and try again |
| `unreachable` | The starter or that version is not available |
| `git-missing` | git is not installed or not on PATH |
| `clone-failed` | The underlying git error, verbatim |

### 4.5 Private repos

Public starters keep this simple — no tokens, no auth surface, no rate limiting
concerns on codeload. If a starter must be private, the fetcher needs a token
path and the bundled seed becomes mandatory rather than an optimization. Prefer
public; keep business code out of the starters.

### 4.6 User-added entries

A user may add their own catalog entry, saved in app storage and merged over the
catalog by `id`. **v1 covers CLI-only entries** — name, icon, language, command,
packages — which is the whole Vue case. Pointing an entry at an arbitrary repo
comes after the curated starters work end to end, because it is what drags in
everything below.

`imported-template-store.ts` is the natural home. Note §10: it currently resolves
its directory from `process.cwd()`, which is unwritable in a packaged app. That
fix is part of this work, not a separate errand.

Two properties of a user entry deserve care, because it carries **a shell command
Lazify will run** and, later, **a repo it will download and unpack**:

- Typed by the user, it is just their own command on their own machine — no
  ceremony. Arriving from anywhere else (export, paste, sync), it is arbitrary
  code delivered as configuration: show the exact command and repo, and confirm
  once before the first run.
- A user entry may not silently take over a curated `id`. Otherwise a pasted
  "Next.js App" runs something else and looks identical in the picker.

When `repo` does open up, do not demand a tag from users — someone pointing at
their own repo wants `main`. Say plainly that a branch means no reproducibility.
A user-supplied starter also needs the hardening that four curated repos let us
postpone: refuse symlinks that escape the target. Substitution paths are already
confined to the project directory (`resolveInsideProject`).

## 5. Post-fetch pipeline

Runs in `src/main/scaffolding/workflow-engine.ts` as a third branch alongside the existing
`imported` branch at line 82. The two tiers differ only in step 1 — they converge
at step 2 and share every step after it.

1. **Produce a tree.**
   - *Tier 1:* `provisionStarter` clones the tag into the project directory,
     removes `.git`, `starter.json`, and the descriptor's `excludeFromCopy`
     entries, and applies the declared substitutions.
   - *Tier 2:* run `createCommands` into the project directory.
2. ~~Copy to staging.~~ Removed with the cache (§4.3) — there is nothing shared
   left to protect.
3. **Browse.** The picker reads the project tree *from disk* — real paths, real
   file contents. Remove anything outside `required`; tick optional folders, each
   created with a `.gitkeep`; choose extra packages from `recommendedPackages`
   plus package search.
4. **Substitute** the two or three declared tokens.
5. **Install** using the entry's package manager, including anything ticked in
   step 3.
6. **`git init`** + initial commit, so the user's first diff is their own work.

Because step 3 reads from disk in both tiers, the picker never learns which tier
produced the tree — one implementation, and §6's synthesized tree dies for the CLI
path too, not just the starter path.

Progress events reuse the existing `emitProgress` steps; `create-project` becomes
"Fetching starter" (or "Running create command") → "Unpacking" → "Installing".

### 5.1 Removal is not free

A starter is verified green by CI **as a whole**. The moment files are removed,
that guarantee no longer covers what the user is about to get. Three levels, and
we ship the first two:

1. **`required` globs** — the picker will not remove them (§3.2).
2. **Import check** — if a kept file imports a removed one, say so before creating.
   `module-resolver.ts` and `reference-finder.ts` already resolve exactly this.
3. Build the result and check — too slow for create time; skip.

## 6. What this deletes

| Path | Action |
| --- | --- |
| `src/renderer/shared/ui/project-tree/constants/scaffold/next-default.ts` | delete (~670 lines) |
| `…/constants/scaffold/expo-default.ts` | delete (~845 lines) |
| `…/constants/scaffold/shared.ts` | delete (~47 lines) |
| `…/constants/template-blueprints.ts` | delete |
| `…/tree-utils.ts` → `getDefaultFileContent`, `buildBaselineTree`, `createFolderNode` | delete; the tree comes from disk |
| `templates/packages/*.json` | delete — the starter's own `package.json` **is** the dependency list |
| `src/main/scaffolding/template-package-manifest.ts` | keep only the version-mismatch reporting; drop manifest loading |

The project-tree UI stops synthesizing a tree and reads the real one. The
synced-project adapter (`…/adapters/synced-project/`) already does exactly this
and is the model to follow.

Net: roughly 1,600 lines of untested string constants removed, replaced by a
fetcher of a few hundred lines that is the same for every stack, forever.

## 7. CI in each starter repo

This is the maintenance signal that does not exist today.

- **On every push:** install, lint, and build (`next build` / `expo export`).
- **Scaffold smoke test:** simulate Lazify's pipeline — copy the tree, apply the
  substitutions with a dummy project name, install, build. This is what would
  have caught the double-`app` folder immediately.
- **Weekly scheduled run:** the same job on an unchanged repo, so upstream drift
  surfaces without anyone pushing.
- **Release:** the tag is what Lazify clones; it only moves when green.
- **Renovate/Dependabot:** dependency bumps arrive as PRs gated by that CI.

Maintenance becomes: read a red build, fix the app, tag, bump one line in
`templates/*.json`.

## 8. Migration plan

Ordered so nothing is big-bang and the current path keeps working throughout.

**Phase 0 — finish the starter repos** *(partly done)*
`next-scaffold` and `expo-scaffold` exist and carry house conventions
(`src/i18n/lang/{en,kh}.json`, `store/app-store.ts`, `src/` layout). Still
missing, and blocking everything downstream:

- `starter.json` in each repo — absent in both.
- **A tag.** Neither repo has one; §4.2 forbids pinning a branch.
- CI (§7) — no `.github` in either.
- `expo-scaffold` is 1.47 MB, over the §3.2 target, and it is two files doing it:
  `assets/images/icon.png` (799 KB) and `logo-glow.png` (331 KB). That cost is now
  paid on every clone.

**Phase 1 — catalog reader** *(done 2026-08-02)*
`src/main/scaffolding/catalog.ts` reads the bundled seed, then the cache, then the registry
repo (§4.0). Seed-first, background refresh, dormant until `REGISTRY_PIN` is set.
`TemplateDefinition` in `harmonizer.ts` is now the catalog entry type.

**Phase 2 — provisioner** *(done 2026-08-02)*
`src/main/scaffolding/starter-provisioner.ts`: clone the tag, drop `.git` and the starter's
own scaffolding, apply the declared substitutions, and classify failures so the
UI can name them. `src/main/scaffolding/starter-descriptor.ts` reads the optional
`starter.json`. No UI changes; covered by `yarn test`, including a real clone of
a tagged fixture repo over git's `insteadOf`, so no network is needed.

**Phase 3 — wire the workflow** *(done 2026-08-02, except the pin)*
`createProjectFromStarter` in `workflow-engine.ts` runs when an entry has a
`starter`: clone, install with the starter's own package manager, `git init` plus
an initial commit. It deliberately skips `reconcileProjectStructure` and the
package manifest — overlaying a synthesized tree on a real app is the §1 bug.
A failed clone deletes the project directory only when this run created it, and
returns a `reason` that `StarterFailureNotice` turns into one readable sentence.

**Still open:** no entry points at a starter yet. `templates/next.json` gains
`"starter": { "repo": "anuboost-lazify/next-scaffold", "ref": "v1.0.0" }` the day
Phase 0 tags that repo — pointing it at a tag that does not exist would break
project creation for the `next` stack.

**Phase 4 — tree from disk, both tiers** *(done 2026-08-02)*
`createProject` is split into `prepareProject` (produce the tree and stop) and
`finalizeProject` (apply the picker's choices, install, `git init`), with
`discardPreparedProject` to back out. `prepared-projects.ts` holds which
directory each run created, in main — the renderer is never the source of that,
because a wrong answer deletes someone's existing folder. `required` is enforced
in `applyPickerChoices`, not only in the UI, and picker paths are confined to the
project directory before anything is removed.

`reconcileProjectStructure` no longer runs for stack projects: the structure the
user chose is applied to the real tree instead of a synthesized one being
overlaid on it.

Renderer: `continueInitWorkflow` prepares the project and reads the tree back
with the existing `importProjectIndexFromDirectory`; the structure step passes it
to `ProjectTreeEditorPanel` as `initialTree` with `useScaffoldBaseline` false;
the create button calls `finalizeProject` with `collectRemovedPaths` (what the
user took out) and the optional folders they ticked; both back-out paths call
`discardPreparedProject`. The module sheet is offered only when the starter
declares `optionalFolders`, so nothing invents folders a starter did not ask for.

`createProject` survives as a one-shot wrapper over the two halves, still used by
the imported-template path.

**Phase 5 — delete the synthesized tree** *(done 2026-08-02)*
Removed: `scaffold/{next-default,expo-default,shared}.ts`, `template-blueprints.ts`,
`structure-options.ts`, `tree-utils.ts`'s `getDefaultFileContent` /
`buildBaselineTree` / `createFolderNode`, the `useScaffoldBaseline` prop and its
plumbing, the orphaned `TemplateBlueprint` / `StructureOption` types, and the
unreferenced `ProjectViewPanel`. The module sheet now takes its options from the
starter's `optionalFolders` instead of a static list. ~2,000 lines.

**Not deleted: `templates/packages/*.json` and manifest loading.** §6 listed
these on the grounds that "the starter's own package.json *is* the dependency
list". That holds for tier 1 and not for tier 2, which §2.1 makes a permanent
first-class path — the CLI tier has no starter, so the manifest is the only thing
that puts the house packages (jotai, react-i18next, i18next, clsx, axios) into a
Vite or bare-RN project, and it also feeds the package picker's suggestions over
`lazify:template-package-manifest`. Deleting it now would be a silent
regression with nothing behind it.

The intended replacement is `recommendedPackages` on the catalog entry (§3.1),
which is typed but not yet consumed. Retiring the manifest means: move each
`templates/packages/*.json` dependency list onto its entry, point
`finalizeProject` and the picker at it, and decide whether version ranges survive
the move — the manifest pins ranges and reports mismatches, `recommendedPackages`
is a plain list. That is its own change, not a deletion.

**Phase 6 — user entries**
CLI-only entries saved in app storage (§4.6). Arbitrary user repos come after,
with the symlink hardening they require (§4.6).

## 9. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Network required to create any project | Accepted: `npm install` needs it anyway. Reported as a named `offline` failure with a UI notice (§4.4) |
| Four repos to keep alive | CI per repo makes staleness visible instead of silent; this is the cost we are choosing over invisible rot |
| A force-pushed tag changes what a pin produces | Branch and tag protection on the starter repos; no hash is kept to detect it (§4.2) |
| Users wanting a stack we have no starter for | Tier 2 is a permanent, first-class path (§2.1), not a migration leftover |
| Registry repo becomes a single point of failure for every stack | Bundled seed renders the picker with no network at all (§4.0); the registry is pinned and verified like a starter |
| A user removes a file the app needs and blames the scaffold | `required` globs, then the import check (§5.1) |
| A failed clone leaves a half-written project directory | Removed before reporting, but only when the run created it — a pre-existing directory is never deleted |
| A user entry shadows a curated one, or arrives by paste | Curated ids cannot be silently overridden; imported entries show their command and confirm once (§4.6) |

**Open:** whether starters are public (simplest, recommended) or private;
whether the "check for template updates" action ships in v1 or later.

**Decided 2026-08-02:** catalog in a registry repo with a bundled seed; one picker
for both tiers; curated starters before arbitrary user repos; "add" in the picker
means ticking optional folders, not authoring files.

## 10. Related cleanups spotted

- `src/main/scaffolding/imported-template-store.ts:18` uses `process.cwd()` — wrong directory
  in a packaged app. Fix to `app.getPath("userData")` alongside the cache work.
- `src/brain/template-engine/` is fully implemented and entirely unused; Phase 0
  is its first real consumer.
