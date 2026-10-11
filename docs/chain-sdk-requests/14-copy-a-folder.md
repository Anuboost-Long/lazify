# Capability Request 14 — Copy a folder across volumes

Source: the Lazify rewrite to Chain, ticket 025 (project creation),
2026-10-11.

**Not part of this request:**
- Copying between a grant and somewhere outside every grant. Both ends
  are inside read-write grants, as with `move()`.
- Progress events, cancellation or merging into an existing folder.
- `desktop.files`. Its no-real-paths rule stays as it is.

## Why this needs a change in Chain

Lazify creates a project in a staging folder first, then places it in
the folder the user chose. Electron Lazify stages under `os.tmpdir()`
and moves the finished tree with `fs.rename`, falling back to a copy
when the two are on different volumes (`src/main/scaffolding/prepared-projects.ts`,
`materializePreparedProject`):

```ts
try {
  await fs.rename(project.projectPath, project.destinationPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
  const copyRoot = await fs.mkdtemp(path.join(path.dirname(project.destinationPath), ".lazify-copy-"));
  const copyPath = path.join(copyRoot, path.basename(project.destinationPath));
  try {
    await fs.cp(project.projectPath, copyPath, { recursive: true });
    await fs.rename(copyPath, project.destinationPath);
  } finally {
    await fs.rm(copyRoot, { recursive: true, force: true });
  }
}
```

On Chain the staging folder is `appFolder("temp")`. The `folders`
contract says "Moving across volumes is not supported and rejects with
`NATIVE_FAILURE`", and lists "**No copy.** Nothing asked for it yet.
Lazify's template copy can read and write each file." under non-goals.

Reading and writing each file isn't enough here. The tree being placed
has already had `npm install` run in it, so it holds:
- symlinks (`node_modules/.bin/*`), which `folders` can't create;
- executable files (those symlinks' targets, native binaries in
  packages), whose mode `writeBytes` doesn't carry over;
- tens of thousands of files, where one bridge call per file is slow.

So a workspace on an external drive, a second internal volume or a
network share would get a broken project, or none.

## What Lazify needs

- Copy a folder (or a file) inside a read-write grant to a path that
  doesn't exist yet, inside a read-write grant, including across
  volumes.
- Symlinks copied as symlinks, never followed. File modes kept.
- On failure, nothing left at the target (or the app is told what was
  left, so it can delete it).
- The same errors as `move()`: `INVALID_ARGUMENT` when the target
  exists, `NOT_GRANTED` outside grants.

Lazify will then do what Electron did: try `move()`, and on a
cross-volume failure copy into a hidden folder beside the target, move
that into place and delete the staging tree. A way to tell a
cross-volume failure from other `NATIVE_FAILURE`s would help, but a
`move()` that copies when it has to would answer the whole request.

## Platforms

- macOS: `copyfile(3)` with `COPYFILE_ALL | COPYFILE_RECURSIVE |
  COPYFILE_NOFOLLOW` keeps links and modes; `fs.cp` in Node does the
  same. Verified need on macOS only.
- Windows: not verified. Symlinks there need a privilege or developer
  mode; `node_modules/.bin` holds `.cmd` shims instead, so plain file
  copies would do.
