# API Studio

Status: in progress — interface shell started 2026-08-18; route reader, OpenAPI
and ASP.NET adapters, and the scan UI landed 2026-08-18. Renamed from Route
Studio to API Studio on 2026-08-18.
Owner: Ly kimlong

API Studio discovers HTTP routes in a synced project and turns them into an
editable request collection. It should feel like a project-aware Postman
workspace: routes come from the source tree, requests can be tested in place,
and the collection can be exported without making developers describe an API a
second time.

---

## 1. Product goal

A user chooses a synced project and asks Lazify to scan it. API Studio then:

1. detects supported frameworks and existing API descriptions;
2. finds routes, methods, parameters, request bodies, and source locations;
3. normalizes the findings into one framework-independent route model;
4. presents the routes as a browsable request collection;
5. lets the user add environment values and send requests locally; and
6. exports a Postman Collection v2.1 document.

This is not a generic form for manually adding API calls. Its defining feature
is that the collection remains connected to the project that produced it.

## 2. Product principles

- **Prefer authoritative descriptions.** Import an existing OpenAPI document
  before inferring the same information from source code.
- **Never execute project code during discovery.** Static inspection is safer
  and must remain the default. Runtime adapters may be considered later as an
  explicit opt-in.
- **Show confidence and origin.** Every discovered field should retain whether
  it came from OpenAPI, a framework scanner, or a user edit.
- **Preserve user work on rescan.** Notes, examples, environment values, and
  overrides must survive when a route is found again.
- **Degrade visibly.** Unsupported or ambiguous routes are listed with a reason;
  they are not silently omitted.
- **Keep the scanner extensible.** Framework support belongs in adapters, not in
  the request editor or renderer.

## 3. Discovery order

The scanner uses the highest-confidence source available:

| Priority | Source | Examples |
| --- | --- | --- |
| 1 | OpenAPI document | `openapi.yaml`, `swagger.json`, configured URL |
| 2 | Framework-aware static adapter | Next.js, Express, Fastify, NestJS, ASP.NET |
| 3 | Generic static patterns | conventional HTTP method calls and route files |
| 4 | User-defined request | routes that cannot be inferred safely |

OpenAPI and Swagger solve the description half of this problem. API Studio
adds the missing project scanner, source links, merge behavior, request runner,
and collection export around that standard.

## 4. Target architecture

```text
synced project
     │
     ▼
project inventory ── stack detection ── OpenAPI locator
     │                                  │
     └──────────────┬───────────────────┘
                    ▼
             scanner registry
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
    Next.js      Express       ASP.NET ...
       └────────────┼─────────────┘
                    ▼
             normalized routes
                    │
          stable-id merge with saved data
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
    request workspace    Postman export
```

The existing source collector and project stack detection should be reused.
API Studio adds a scanner registry above them rather than creating a second
filesystem walker.

## 5. Normalized model

Framework adapters return the same transport-neutral shape:

```ts
interface ApiRoute {
  id: string;
  projectPath: string;
  method: HttpMethod;
  path: string;
  summary: string | null;
  source: {
    kind: "openapi" | "scanner" | "manual";
    filePath: string | null;
    line: number | null;
    adapter: string;
    confidence: "exact" | "inferred" | "ambiguous";
  };
  parameters: ApiParameter[];
  headers: ApiHeader[];
  requestBody: ApiBody | null;
  responses: ApiResponseDefinition[];
}
```

The stable identity should be derived from project, method, normalized path,
and a source anchor. Saved user data is stored separately and overlaid by that
identity. A rescan replaces scanner-owned fields while preserving user-owned
fields.

## 6a. Framework rule sets

A framework is described, not programmed. Everything that differs between
frameworks is declared in one file under `src/main/api-studio/rules/`, and the
engines under `engine/` apply those declarations:

```text
rules/<framework>.ts   detection, source files, path syntax, annotations, calls
      ↓
reading/               annotation, declaration, and call readers (per syntax)
      ↓
engine/annotation-routes.ts   classes + annotations  → route drafts
engine/call-routes.ts         router calls + groups  → route drafts
      ↓
scanners/framework-scanner.ts one scanner built from any rule set
```

A rule set states: how the framework is detected (dependency, stack, project
file); which files can hold routes and which are read first; the path
placeholder syntax and its constraints; which annotations mark a container, a
method, auth, and each parameter binding; which calls declare a route, a group
prefix, or a guard. Adding a framework means adding one such file to
`rules/index.ts` — no new parsing code, which is the property the NestJS and
Express rule sets exist to prove.

The reverse also holds: a rule set is the only place a convention is stated, so
the answer to "why did it decide this route needs a bearer token" is a line in
`rules/<framework>.ts`, not a regex buried in a scanner. Values that belong to
detection policy rather than a framework — which security kinds are secret, how
a variable is named — live in `rules/environment-policy.ts` for the same
reason.

## 6. Scanner contract

Each adapter answers three questions and performs one scan:

```ts
interface RouteScanner {
  id: string;
  supports(project: ProjectInventory): ScannerSupport;
  scan(project: ProjectInventory): Promise<RouteScanResult>;
}
```

`ScannerSupport` carries a confidence score and evidence, such as a package
dependency or framework file convention. `RouteScanResult` carries routes,
warnings, files inspected, duration, and unsupported constructs. An adapter must
not hide dynamic routes it cannot resolve; it should return a warning linked to
the source location.

### Initial adapters

- **OpenAPI 3.x:** local JSON/YAML documents first; remote descriptions later.
- **Next.js:** App Router route handlers and Pages Router API files.
- **Express:** direct `app.METHOD`, router methods, and mounted routers when the
  mount path is statically resolvable.
- **NestJS and Express:** declared as rule sets over the shared engines.
- **Fastify:** covered by the Express call rules; its own rule set follows.
- **ASP.NET:** controller attributes and minimal APIs after the TypeScript path
  is stable.

Dynamic metaprogramming, computed paths, and runtime-generated routers will not
always be statically knowable. The UI must surface these as review items.

## 7. Request execution and security

Requests originate in Electron's main process, not the renderer, so local APIs
do not depend on browser CORS behavior. The IPC boundary accepts a structured
request and returns a bounded response with timing, status, headers, and body.

Before sending, API Studio must:

- interpolate environment variables without writing secrets into the collection;
- redact secret header and variable values from logs;
- cap response size and request duration;
- require explicit confirmation before sending to a non-local host when the
  collection came from a local project; and
- never execute scripts imported from Postman collections in the first release.

## 8. Interface

The desktop page is a restrained two-column console inside the existing Tools
shell:

- a toolbar chooses the synced project and starts discovery;
- the left collection pane groups and filters discovered routes;
- the request workspace exposes method, URL, params, headers, and body;
- the response region shows status, duration, headers, and formatted content;
- source links open the exact discovered file and line when available; and
- export remains secondary to scanning and sending.

The first UI milestone intentionally shows an empty, scanner-pending state. It
does not use sample routes that could be mistaken for project data.

## 9. Delivery phases

### Phase 1 — page and domain boundary

- Add API Studio to the Tools catalog and routing.
- Build project selection and the collection/request/response workspace.
- Define normalized route and scan-result types.
- Keep scan, import, send, and export controls disabled until their IPC path is
  implemented.

### Phase 2 — OpenAPI import

- [x] Locate and parse local OpenAPI 3.x JSON/YAML files.
- [x] Normalize operations into `ApiRoute` records.
- [x] Display routes, parameters, request bodies, and declared responses.
- [x] Add actionable parse and version errors.

The scan runs in the main process behind `lazify:scan-project-routes` and lives
in `src/main/api-studio/`: one bounded project walk builds the inventory, the
scanner registry runs every adapter that claims support, and results are merged
by route identity. The renderer reads the same model from
`@main/api-studio/types`.

### Phase 2b — saved collections

- [x] Write each scan to `.lazify/api-studio-routes.json` in the project folder.
- [x] Load that file when a project is opened, so a scan is only needed to refresh.
- [x] Show when the open collection was scanned.
- [x] Update the collection in place on rescan rather than replacing its contents.
- [x] Split the collection into an index and compressed per-folder detail files.

The collection lives beside the code it describes, never in Lazify's own
storage:

```text
<project>/.lazify/api-studio/
  routes.json              index: one line-per-route summary, readable
  routes/<folder>.json.gz  parameters, bodies and responses, per resource
```

`routes.json` carries what the collection lists and searches on, and what the
environment is derived from — method, path, summary, source location, required
headers, security. Shared values are stated once at the top: `servers` and a
`securitySchemes` table the routes reference by name. The bulk of a route —
parameters, request body, declared responses — is compressed per resource
folder and read only when a route in that folder is opened. On a 571-route
project that is a 236 KB index beside 30 KB of compressed detail, against 622
KB when it was one file.

The index carries a version, the project path it was scanned from, the scan
time, and the routes with their warnings and review items. It is rejected on
read when the version or the project path does not match, so a moved or shared
checkout rescans instead of showing routes whose ids were derived from another
path. Route ids are stable across rescans, which is what lets a saved
collection keep pointing at the same routes.

A rescan merges into the existing document by route id: scanner-owned fields
are refreshed, anything else already stored on a route is carried forward, new
routes are added and dated to that scan through `firstSeenAt`, and routes the
project no longer declares are dropped. `createdAt` records when the collection
was first built, which is how the interface tells a first scan (where every
route is new) from a rescan that genuinely found something. The write goes to a
temporary file and is renamed into place, so an interrupted rescan cannot
truncate a collection that already exists.

### Phase 2c — environment values

- [x] Record the security scheme each route declares (OpenAPI `securitySchemes`
      and `security`, ASP.NET `[Authorize]` / `[AllowAnonymous]` /
      `RequireAuthorization`).
- [x] Derive the variables a collection needs: a base URL, one per auth scheme,
      one per required header.
- [x] Edit those values in the interface and show, per route, which are missing.
- [x] Keep several environments per project and switch between them from the toolbar.
- [ ] Interpolate them into an outgoing request (waits on the runner).

A project holds a set of environments — Local, Staging, whatever a team needs —
with one active at a time. The split follows what each part is: names, order,
the active choice, and every value that is not a secret live in
`.lazify/api-studio/environments.json` beside the collection, so a team shares
the same presets by cloning the repository. Secret values are keyed by project
and environment in the app's own storage at mode `0600`, so switching to
Staging swaps the base URL everyone shares and the token only you hold.

Variable definitions are derived from the routes rather than stored — the scan
already records servers, security, and required headers, so the set is a pure
function of the collection and cannot drift from it. Values are the opposite:
secret ones alone are written to `api-studio-environments.json` in the app's
user data, keyed by project and environment at mode `0600`, so a token never
enters the project folder or the saved collection. A value discovered from the project itself — the base URL
in `launchSettings.json` or an OpenAPI `servers` entry — travels with the
collection as a default, and what the user types stays on their machine.

### Phase 3 — TypeScript scanners

- Add Next.js App/Pages Router adapters.
- Add Express direct and mounted-router discovery.
- Record exact source locations, evidence, warnings, and scan metrics.
- Merge scan results without deleting user overrides.

### Phase 4 — request runner

- Add environment variables with secret values.
- Send requests through a bounded main-process IPC handler.
- Format JSON/text responses and expose status and timing.
- Store request history per project without storing secrets.

### Phase 5 — collection interoperability

- Export Postman Collection v2.1.
- Import supported request data without running collection scripts.
- Add stable rescan reconciliation and conflict review.

### Phase 6 — framework expansion

- Add Fastify and NestJS adapters.
- [x] Add ASP.NET controller and minimal-API adapters.
- Publish adapter fixtures and accuracy tests for every supported construct.

The ASP.NET adapter moved ahead of the TypeScript ones because that is what the
first real project needed. It reads controller and action attributes, legacy
`RoutePrefix` controllers, minimal-API `Map*` calls including nested
`MapGroup` prefixes, parameter binding attributes, and `launchSettings.json`
for server URLs. Controller routes are recorded as `exact`; minimal-API routes
as `inferred`, because a handler lambda's non-attributed parameters cannot be
told apart from injected services. Conventionally routed MVC controllers and
computed paths are reported as review items rather than guessed.

## 10. Verification

The ASP.NET adapter is measured against `Portal_MobileApp_API`, a 1,622-file
controller-based project: every one of its 571 declared verb attributes is
discovered, in roughly 180 ms. That count is the accuracy check to re-run after
touching the adapter — compare discovered routes against
`grep -rhE '^\s*\[Http(Get|Post|Put|Patch|Delete|Head|Options)' --include='*.cs'`.

Every adapter needs fixture projects covering supported and intentionally
unsupported patterns. Tests compare normalized routes, source locations, and
warnings against snapshots. Integration tests cover rescan merging, secret
redaction, request limits, and Postman schema validation.

The first release is successful when a user can open a synced Next.js or Express
project, discover its statically declared routes, send a local request, rescan
without losing edits, and export a valid Postman v2.1 collection.
