/**
 * File name -> language id. The ids are TextMate grammar ids (the same ones
 * VS Code uses), so anything in the bundled grammar set is reachable by
 * naming it here, and a user grammar can claim extensions of its own.
 */

export const PLAIN_LANGUAGE = "plaintext";

/** Files whose whole name decides the language, before any extension check. */
const FILENAMES: Record<string, string> = {
  dockerfile: "docker",
  containerfile: "docker",
  makefile: "make",
  gnumakefile: "make",
  cmakelists: "cmake",
  "cmakelists.txt": "cmake",
  gemfile: "ruby",
  rakefile: "ruby",
  podfile: "ruby",
  brewfile: "ruby",
  procfile: "yaml",
  ".gitignore": "ignore",
  ".dockerignore": "ignore",
  ".npmignore": "ignore",
  ".eslintignore": "ignore",
  ".prettierignore": "ignore",
  ".gitattributes": "ini",
  ".gitconfig": "ini",
  ".editorconfig": "ini",
  ".env": "dotenv",
  ".babelrc": "json",
  ".prettierrc": "json",
  ".eslintrc": "json",
  ".npmrc": "ini",
  ".nvmrc": "plaintext",
  ".bashrc": "shellscript",
  ".zshrc": "shellscript",
  ".bash_profile": "shellscript",
  ".zprofile": "shellscript",
  "global.json": "json",
  "nuget.config": "xml",
  "packages.config": "xml",
  "web.config": "xml",
  "app.config": "xml",
  "directory.build.props": "xml",
  "directory.build.targets": "xml",
  "directory.packages.props": "xml",
  "omnisharp.json": "json"
};

/**
 * Extension -> grammar id. Kept explicit rather than derived, because the
 * mapping is a product decision (`.ts` is TypeScript, not Turtle) and the
 * bundled grammar metadata does not carry file types.
 */
const EXTENSIONS: Record<string, string> = {
  // JavaScript family
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",

  // Data and config
  json: "json",
  jsonc: "jsonc",
  json5: "json5",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  env: "dotenv",
  properties: "ini",
  xml: "xml",
  plist: "xml",
  csv: "csv",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto",

  // Markup and styles
  html: "html",
  htm: "html",
  xhtml: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  styl: "stylus",
  svg: "xml",
  md: "markdown",
  markdown: "markdown",
  mdx: "mdx",
  rst: "rst",
  tex: "latex",
  adoc: "asciidoc",

  // Systems
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  rs: "rust",
  go: "go",
  zig: "zig",
  nim: "nim",
  d: "d",
  odin: "odin",
  v: "v",

  // Managed / JVM / .NET
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  groovy: "groovy",
  gradle: "groovy",
  cs: "csharp",
  csx: "csharp",
  cake: "csharp",
  razor: "razor",
  cshtml: "razor",
  vbhtml: "razor",
  fs: "fsharp",
  fsx: "fsharp",
  fsi: "fsharp",
  vb: "vb",
  // MSBuild and the rest of the .NET project metadata are all XML dialects.
  csproj: "xml",
  fsproj: "xml",
  vbproj: "xml",
  props: "xml",
  targets: "xml",
  nuspec: "xml",
  ruleset: "xml",
  resx: "xml",
  config: "xml",
  xaml: "xml",
  axaml: "xml",
  sln: "ini",
  slnx: "xml",
  aspx: "html",
  ascx: "html",
  asmx: "html",

  // Scripting
  py: "python",
  pyi: "python",
  rb: "ruby",
  erb: "erb",
  php: "php",
  pl: "perl",
  pm: "perl",
  lua: "lua",
  r: "r",
  jl: "julia",
  dart: "dart",
  swift: "swift",
  m: "objective-c",
  mm: "objective-cpp",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  clj: "clojure",
  cljs: "clojure",
  edn: "clojure",
  hs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  elm: "elm",
  cr: "crystal",
  hx: "haxe",

  // Shell and ops
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  fish: "fish",
  ps1: "powershell",
  psm1: "powershell",
  bat: "bat",
  cmd: "bat",
  nu: "nushell",
  tf: "terraform",
  tfvars: "terraform",
  hcl: "hcl",
  nix: "nix",
  dockerfile: "docker",

  // Query and misc
  sql: "sql",
  prisma: "prisma",
  sol: "solidity",
  wat: "wasm",
  wgsl: "wgsl",
  glsl: "glsl",
  vert: "glsl",
  frag: "glsl",
  diff: "diff",
  patch: "diff",
  log: "log",
  txt: "plaintext"
};

/**
 * Overrides layered on top of the built-in tables. User grammars register
 * their `fileTypes` here, and `extensions.json` wins over everything so a
 * user can retarget an extension without shipping a grammar.
 */
let grammarExtensions: Record<string, string> = {};
let userExtensions: Record<string, string> = {};

export function setGrammarExtensions(map: Record<string, string>) {
  grammarExtensions = map;
}

export function setUserExtensions(map: Record<string, string>) {
  userExtensions = {};

  // Tolerate both `.ts` and `ts` as keys, since users will write either.
  for (const [key, value] of Object.entries(map)) {
    userExtensions[key.replace(/^\./, "").toLowerCase()] = value;
  }
}

/** Maps a file name to the grammar id used to colour it. */
export function languageIdOf(fileName: string | null | undefined): string {
  if (!fileName) return PLAIN_LANGUAGE;

  const base = fileName.slice(fileName.lastIndexOf("/") + 1).toLowerCase();
  const named = FILENAMES[base];
  if (named) return named;

  if (!base.includes(".")) return PLAIN_LANGUAGE;

  // Walk from the longest compound extension down, so `.tmLanguage.json` and
  // `.d.ts` land on something before the bare final segment is tried.
  const segments = base.split(".").slice(1);

  for (let index = 0; index < segments.length; index += 1) {
    const candidate = segments.slice(index).join(".");
    const match =
      userExtensions[candidate] ?? grammarExtensions[candidate] ?? EXTENSIONS[candidate];

    if (match) return match;
  }

  return PLAIN_LANGUAGE;
}
