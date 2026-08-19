# API Studio

Status: in progress — interface shell started 2026-08-18; route reader, OpenAPI
and ASP.NET adapters, and the scan UI landed 2026-08-18; the request runner,
schema-filled bodies, JSON/form body modes, and saved requests landed
2026-08-19. Renamed from Route Studio to API Studio on 2026-08-18.
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

## 3b. A repository is not always one project

`backend/` beside `frontend/`, `apps/*` under a workspace field, a service per
folder: the scan reads each as the project it is. Every directory carrying a
manifest — `package.json`, `composer.json`, `requirements.txt`, `pyproject.toml`,
a `.csproj` — is a workspace, the root included, and every file belongs to the
nearest workspace above it and to that one only.

The partition is what makes it work rather than a convenience. Reading a whole
repository at once fails twice over: a root `package.json` full of Electron never
mentions the NestJS underneath it, so nothing is detected at all; and once
something is, the root and the workspace both claim the same files and every
route is found twice. Build output is left out of the partition entirely, so a
`.electron-build/backend` copy is not the same API discovered a second time.

Each service's address is read where that service states it, because a port is
written down wherever a team keeps it: a launch profile, the workspace's own
`.env`, the compose service whose build context points at it, or the line in its
entry point that starts the server — in that order, nearest the project first.
The compose file is read from the repository even when the service is not, since
that is where it lives. `backend/.env` holding `PORT=4500` is why
`backendBaseUrl` arrives filled in rather than empty, and why the `3001` fallback
further down its `main.ts` does not overrule it.

A route then carries the workspace that declares it, which two things depend on:
the collection groups by service before it groups by resource, and the base URL
is named after the service that serves it — `backendBaseUrl`, not `baseUrl`,
because two services in one repository listen on two ports. A repository that is
one project keeps the plain `baseUrl` and an empty workspace, so nothing about it
changes.

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

Each body variant carries `mediaType`, `schemaType`, the document's `example`,
and `defaultBody` — the schema-derived starting body described under Phase 4.

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
- the response region shows status, duration, headers, and formatted content,
  dragged to whatever height the work needs and folded away when it is not;
- source links open the exact discovered file and line in the workspace; and
- export remains secondary to scanning and sending.

The first UI milestone intentionally shows an empty, scanner-pending state. It
does not use sample routes that could be mistaken for project data.

## 9. Delivery phases

Phases 1 through 4 shipped their controls as they were built, rather than
showing every eventual control disabled from the start.

### Phase 1 — page and domain boundary

- Add API Studio to the Tools catalog and routing.
- Build project selection and the collection/request/response workspace.
- Define normalized route and scan-result types.
- Add each control when its IPC path exists, rather than showing it disabled.

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
- [x] Add and remove values by hand for what discovery could not see.
- [x] Interpolate them into an outgoing request.

Auth is declared per rule set as a list of schemes rather than one, and it is
read at two levels. Per route: ASP.NET takes `[Authorize]` as a bearer token and
`[ApiKey]`, `[RequireApiKey]`, `[ApiKeyAuth]` as an API key, using the header the
attribute names when it names one — `[ApiKey("X-Client-Key")]` asks the
environment for `xClientKey`, not a guess — and a route carrying both gets both.

Per project matters more, because that is how a real API usually does it: the key
is registered once and every route inherits it. `scanners/project-security.ts`
reads the project's own security definitions the way the OpenAPI adapter reads
`securitySchemes` — each `AddSecurityDefinition("<id>", …)` parsed as one scheme
with its own `Name`, `In`, and `Type` — rather than hunting for a header name
near a keyword. That distinction is the whole point: a project routinely
declares two schemes, and picking a name out of the wrong one produces a
variable nobody recognises.

Which of them guards everything is then a separate question, answered in this
order: the scheme ids an `AddSecurityRequirement` names; failing that, every
declared API key when the pipeline registers a guard
(`options.Filters.Add<ApiKeyAuthFilter>()`, `UseMiddleware<ApiKeyMiddleware>()`,
a service filter); failing that, a guard with no definitions at all, whose header
is read from the filter itself (`const HeaderName = "X-Tenant-Key"`,
`Headers["…"]`, `Headers.TryGetValue("…")`).

Two rules keep the result honest. A scheme whose header is `Authorization` is a
bearer token however it was typed — ASP.NET projects habitually declare JWT as
`SecuritySchemeType.ApiKey`, and taking that literally asks for a variable called
`authorization` beside the `bearerToken` the same routes already need. And bearer
schemes are never applied project-wide: `[Authorize]` reports those per route,
which is both more accurate and the reason a scheme merely declared for Swagger's
benefit is not a requirement.

`[AllowAnonymous]` is the way out, and it is honoured the way the framework
honours it: on a route, or on a controller for every action under it, unless the
action declares a scheme of its own. A route marked anonymous requires nothing,
whatever the project requires of the rest.

None of this is ASP.NET's. `scanners/project-security.ts` is one engine over
four declared lists — how a scheme is defined, how it is required, what registers
a guard, where a guard reads its parameter — and each rule set fills them with
its own ecosystem's idioms. NestJS states them as `DocumentBuilder().addApiKey({
type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'api-key')` with
`addGlobalSecurity`, or an `APP_GUARD` provider; Express as a swagger-jsdoc
`securitySchemes` block with a top-level `security`, or `app.use(apiKeyGuard)`
with `req.headers['x-client-key']`. The engine reads all three the same way and
knows none of them apart. A framework with no rule set yet — Laravel, FastAPI,
Django — needs one file, not a second engine; what it does not yet have is route
discovery, which is what a rule set is mostly for.

The cost is bounded on purpose. A file is only joined and searched when one of
its lines holds a hint the rule set named, and at most 200 such files are read
per scan, so the pass is proportional to how much a project talks about security
rather than how large it is. On a synthetic 381-file, 570-route ASP.NET project
the whole scan — walk, routes, models, bodies, security — runs in about 65 ms.

Detection ends where a convention does — a guard registered under a name none of
these patterns match is invisible, and no scanner can be sure it has them all.

That is what user-declared variables are for. Any value can be added by hand —
its name, whether it travels as a header, a query parameter, or a cookie, and
whether it is secret — and it is then sent with every request in the collection.
The definitions live beside the presets in the project so a team shares them;
the values follow the same split as everything else, with secrets on the machine
alone. Removing one takes its values out of every environment in the same write,
so a secret cannot be left behind in the project file once it stops being
classified as one. Only user-added variables can be removed: the rest are what
the routes ask for, and a rescan would bring them back.

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

- [x] Add environment variables with secret values.
- [x] Send requests through a bounded main-process IPC handler.
- [x] Format JSON/text responses and expose status and timing.
- [x] Open a declared body pre-filled from its schema, as JSON or form fields.
- [x] Name body fields the way the project serializes them.
- [x] Attach files to a multipart body.
- [ ] Store request history per project without storing secrets.

The runner is two halves that never mix. `runner/build-request.ts` is pure and
shared with the renderer: it turns an open route, the active environment, and
what the user typed into one concrete request — path placeholders filled and
encoded, query and cookie parameters attached, declared headers taken from the
field or the environment behind it, and the security scheme applied where its
rule says it travels (`Bearer` in `Authorization`, an API key in its own header,
query, or cookie). `{{variable}}` written into any field or into the body is
interpolated from the same environment, so a token is referenced rather than
pasted. Because the renderer builds the draft it also displays it: the URL bar
shows exactly what will be sent.

The body has two modes and one source. A route's declared body arrives from the
scanner already filled in: every adapter writes a `defaultBody` on each body
variant — a JSON document built from the declared schema with one placeholder
per declared type (`"string"`, `0`, `true`, `[…]`, a nested object), where an
explicit `default`, `example`, or first `enum` value always wins over the
placeholder, and `readOnly` properties are left out because they belong to the
response. OpenAPI builds it by walking the resolved schema; the framework
scanners build it from the model index the query expander already uses, so an
ASP.NET action that binds `CreateUserRequest` opens with that class's
properties, inherited ones included, at their C# types' defaults (`Guid` as a
zero uuid, `DateTime` as an ISO instant, `List<T>` as a one-item array). A
declared `example` still outranks it. Both walkers stop at depth 8 and refuse to
re-enter a `$ref` or model they are already inside, so a self-referential schema
cannot loop.

Field names follow how the project serializes, not how its source declares. A
rule set names the patterns that state the policy — `JsonNamingPolicy.
SnakeCaseLower`, a Newtonsoft `SnakeCaseNamingStrategy`, `PropertyNamingPolicy =
null` — and the scanner reads the first one its sources state, falling back to
what the framework does when nothing is said (camelCase for ASP.NET Core, and
PascalCase once `AddNewtonsoftJson` appears without a strategy). A property that
carries `[JsonPropertyName("full_name")]` beats every policy, because it names
the wire itself. Enums are values, not objects: the model index reads their
members, numbers them the way C# does — continuing from the last explicit value
— and uses the member at zero, as its name when the project registers a string
enum converter and as its number when it does not.

The interface opens that body as **JSON** or as **Form**, the mode chosen from
the declared media type. JSON is a text editor with a Format action that
re-indents at two spaces and a warning when the text will not parse; Form is
name/value rows, seeded from the same declared body when it is a flat object.
The two keep separate state, so switching modes never destroys what was typed in
the other. `runner/encode-body.ts` turns whichever is active into bytes:
`application/x-www-form-urlencoded` by default, `multipart/form-data` when the
route declares it — with a boundary that is extended until no field value
contains it, and a `Content-Type` that names it. Uploading a file is not part of
this release; form fields are text.

A form is a set of fields, not one model. An action that binds a DTO, a couple
of loose values and a file sends all of them in one body, so `[FromForm]` is its
own binding target: the model is expanded from the model index, the loose values
carry their own placeholders, and the two are merged. A file parameter is part
of that body wherever it appears — `IFormFile` used to sit in the ignored types
beside `CancellationToken`, which is how a form route came back with no body at
all. What the fields are called follows the binder, not the serializer: form
binding matches property names, so a project that renames JSON to snake_case
still posts `PolicyNo`. Nor does a form nest — recognising `[FromForm]` and
showing the model as a document would offer a shape the binder never accepts —
so the model is flattened to the names it is posted under: `Insured.Name`,
`Travellers[0].Age`, one field each. A file in the body is also what decides the media type,
multipart when one is there and url-encoded when it is not, which is what opens
the body in Form rather than JSON.

A form field can be a file. What crosses the boundary is its path, never its
bytes: the renderer asks main for a picker, keeps what comes back, and
`runner/build-request.ts` states the body as parts rather than encoding one —
text parts carry their value, a file part carries where to find it.
`runner/multipart-body.ts` turns that into bytes at the moment the request goes
out, reading each file where files can be read. The boundary is chosen against
the bytes themselves, so a sequence occurring inside an image cannot end the
body early, and because the boundary belongs to the bytes it is the sender that
names it in `Content-Type`, not the builder.

Three things follow from paths rather than bytes: a saved request still works
after a restart, a 20 MB upload does not travel through IPC to be sent, and a
file that has moved is reported by name instead of half a body being sent.
Attachments are capped at 25 MB, and attaching a file settles what the body is —
a file cannot be url-encoded, so the media type becomes multipart whatever the
route declared.

`runner/send-request.ts` runs only in main, behind `lazify:send-api-request`.
It bounds what a request can cost — 30 seconds, 2 MB of response body, read as
a stream and cut at the cap with `truncated` set rather than buffered whole —
and it logs nothing at all, because the draft it receives carries the tokens the
environment holds and a log line is the one place they could escape. A failing
status is a response, not an error; a request that never reached a server comes
back as the cause (`ECONNREFUSED`, a DNS failure, the timeout) so the message
names what to fix.

Anything that is not `localhost`, a loopback address, or a `.localhost` host
asks first: the collection was scanned from a folder on this machine, so a
request leaving it is a decision, not a default.

### Phase 4b — saved requests

- [x] Keep the body, field values, and last response a user set per route.
- [x] Survive a rescan, so discovery never overwrites the values behind it.
- [x] Offer one action back to the schema default.
- [x] Let the user choose whether they live on the machine or in the project.

Two files sit beside each other and answer different questions. The collection
under `.lazify/api-studio/` says what the project declares, and a rescan rewrites
it. A saved-requests file says what this user actually sends: body mode, body
text, form entries, every filled field, and the last response, keyed by route id.
A rescan refreshes the first and never touches the second, so finding new routes
costs nothing that was typed against the old ones. Route ids are stable across
rescans, which is what makes that hold.

Where the second file lives is the user's call, because the trade is theirs to
make. The first time a request is saved in a project, API Studio asks:

| Choice | File | What it means |
| --- | --- | --- |
| On this machine | `api-studio-requests.json` in the app's storage, mode `0600` | Private. A password typed into a body never reaches the repository. |
| In the project | `.lazify/api-studio/requests.json` | The team gets the same requests by cloning — including anything sensitive typed into one. |

The choice is remembered per project and shown in the request header, where it
can be changed at any time; changing it moves what is already saved rather than
stranding it. A checked-in `requests.json` decides for itself: if the file is
there, that is where the project's requests live, whatever this machine chose
before, so cloning a repository that shares them works without a setting. Until
a user answers, saving keeps to the machine — the private default is the safe one
to assume. A stored response is capped at 32 KB, and **Reset** in the body tab
drops a route's saved request and returns the body to what the schema declares.

### Phase 4e — examples

- [x] Keep a response as an example of what a route returns, and show it again.
- [x] Collect what nobody kept, five minutes after it arrived.
- [x] Read a body pretty or raw, whatever its media type claimed.

What a user did not choose to keep does not accumulate. The response a route
happens to have returned is held so that walking to another route and back, or
rescanning, does not lose it — not so that it lives forever. Five minutes after
it landed it is collected: the entry is cleared and its body file deleted. The
sweep runs when a project's requests are read, and on a timer for a session left
open, so a machine that scans a 571-route project does not quietly accumulate
571 response bodies. Examples are exempt by definition — saving one is the act
that says this response is worth keeping.

**Save response** keeps the response in the saved request beside the body and
the field values, named for what it was — `200 OK`, `404 Not Found`, numbered
when a route has several of the same. Examples sit in a row under the response
header with **Live** at its head, so switching between what a route returned
just now and what it is supposed to return is one click. A route keeps its ten
most recent, each with a body file of its own.

Both bodies — the one sent and the one that came back — are rendered on
`CodeSurface`, the same surface the editor panes use, so the code theme a user
picked in settings applies here too and a request reads like the code it came
from. Both are pinned to JSON highlighting rather than guessing a language from
a name that does not exist, and both wrap: the surface learned a `wrap` mode
that folds long lines and drops the line gutter with them, because a wrapped
line covers several rows and no fixed-height gutter can follow it.

What makes a large response slow is not the bytes but the rows: a 275 KB
document is ten thousand lines, and every line is elements the browser must lay
out. So a body longer than a thousand lines is rendered to that first thousand,
with a bar saying how much is being held back and taking one click to give up
the rest. What a person reads first arrives immediately; the cost of the whole
document is paid only when it is asked for.

Reading a large body has to stay cheap, so three more things happen once rather
than per render: the pretty form is derived from the body it belongs to, the
highlighter keeps the last few documents it painted — bounded by the source it
holds, since highlighting produces several times its input — and a document past
250 KB is rendered plain, because past that the colour costs more than it is
worth. Switching between Pretty and Raw is then a swap between two readings that
already exist.

A body is shown **Pretty** wherever it parses — whatever its media type claimed,
which covers the servers that answer JSON as `text/plain` — with **Raw** one
click away for the payload as it arrived. Pretty is disabled, and Raw stands
alone, only when the body genuinely will not parse; a one-shot Format button
would have been greyed out in every ordinary case, which is the wrong control
for the job. A body is read when something is about to show it, by the file name the index
already carries, and cached under that name. Reading every body a route ever
kept the moment it opens was the first attempt and it was the wrong shape: it
raced the route's own details, which arrive later and re-seed the request, so
the bodies were fetched and then discarded a moment afterwards. Reading one file
for the response on screen has no such ordering to get right.

Two rules make it hold. An empty body is not the same as no body, so the store
keeps what is on disk unless handed something to replace it. And seeding a route
a second time is not opening a new one — the details arriving must leave the
response, the examples and the selection exactly where the reader left them.

A response body is a file, not a field. The index says what a route sends and
what came back — status, timing, headers, size — and each body sits beside it as
one file, read when that route is opened. Opening a project therefore reads
kilobytes rather than every response ever kept, and the debounced save rewrites
the index alone.

That is also what makes shrinking a response unnecessary. Bodies were first kept
inside the index, so a large one had to be cut down to fit, and a body cut at a
character stops being JSON: it lost its formatting on every reload and left
Pretty greyed out for good. With bodies in files there is nothing to cut. The
runner already caps a response at 2 MB when it is read from the wire, which is
the only limit that remains, and `truncated` now means only what it says: the
server sent more than the runner would read.

### Phase 4d — a console that gets out of the way

- [x] Drag the seam between request and response, and remember where it sits.
- [x] Fold the response away, and have an arriving one bring it back.

`SplitPane` learned a direction rather than gaining a twin: the same divider,
clamping, keyboard steps, and per-key persistence now work down the page as well
as across it, so the collection split and the response split are one component
with one set of behaviours. The response folds to its own header, which is also
the control that brings it back — and a request that returns while it is folded
opens it, because a response nobody can see is not a response.

### Phase 4c — back to the source

- [x] Open the file a route was discovered in, from the request it produced.

The source line under a request is a link. It opens the project in the workspace
at `?file=…&line=…`, and the tree reveals what it was asked for: ancestors
expanded, the file selected and opened, the editor focused on the line the
scanner recorded. It is the same reveal the git pane and symbol lookup already
use, so a route, a changed file, and a symbol all arrive at the tree the same
way.

### Phase 4f — scripts that run with a request

- [x] A pre-request script that can rewrite the request or stop it.
- [x] A post-response script that can keep values and check the result.
- [x] Both saved with the request, wherever that project keeps its requests.
- [x] One catalog behind the suggestions and the in-app reference.
- [x] A project-chosen name for the script global.

One **Scripts** tab sits beside Body, holding both: **Pre-request** runs just
before the request leaves this machine, **Post-response** runs when the response
arrives, and a switch inside the tab shifts between them. Each is plain
JavaScript with one global — `lz` by default — and each is stored on the route's
saved request, so it travels with the collection a team checks in.

```js
lz.request.headers.set("Authorization", `Bearer ${lz.env.get("token")}`)
lz.stop("no token yet")

lz.env.set("token", lz.response.json().accessToken)
lz.test("returns 200", () => lz.expect(lz.response.status).toBe(200))
```

Nobody should have to guess the vocabulary, so one catalog in
`renderer/features/api-studio/script-api.ts` describes every member the API has:
its name, signature, one line of prose, and which of the two phases can reach it.
That single description drives three things at once — the suggestion list under
the editor, the reference behind **How scripts work**, and the phase filtering
that keeps `lz.response` out of a pre-request script and `lz.stop` out of a
post-response one. A member cannot be added to the language without also being
documented and suggested, because they are read from the same array.

The list floats at the caret, where the eye already is. A textarea will not say
where its caret sits, so `caret-box.ts` lays the text up to the caret out again
in a hidden twin of the field — same font, padding, and wrapping, copied off the
live element — and reads the marker's own position from that. The popup is
placed inside the editor's frame and flips above the line when there is not room
below it, so it is never clipped. Arrow keys move, Enter or Tab inserts (with
the caret left inside the parentheses of anything that takes arguments), Escape
hides it until the next keystroke. `CodeSurface` gained two optional props to
make this possible, `inputRef` and `onKeyDown`; the caret-move listeners the
list also needs are attached by the hook itself, which is what lets it ignore
the keys the list has already consumed rather than resetting the highlight under
the user's fingers.

Suggestions also read the last response. A script's whole reason for existing is
usually a field inside the body that just came back, and that body is in hand —
so `lz.response.json().` offers the keys the server actually sent, walks into
them, and looks inside the first item of an array. A name the script gave the
parsed body is followed too: after `const jsonData = lz.response.json()`,
`jsonData.data.` answers exactly as the full expression would. Each field is
described by what came back in it, so the list doubles as a look at the payload.
Matchers, in turn, are offered only after an `expect(` actually closes — walking
back to the matching parenthesis to read the callee — because `json().` offering
`toBe` was worse than offering nothing.

Where nothing can be resolved the script answers for itself. A response is not
always in hand — the first time a script is written there has been no send — and
`jsonData.` would then have offered nothing at all, which reads as a broken
feature rather than an honest silence. So every name the script itself uses is
offered as a fallback, harvested from the source with comments and string
literals blanked first, because prose and text are not names. Resolved
suggestions always win; the fallback only fills what would otherwise be empty.

`console.log` is bound too, to the same collector `lz.log` writes to. It is the
first thing anyone types, and a sandbox that throws `console is not defined` at
that moment teaches the wrong lesson about what scripts are.

The standard library is offered too. Scripts are ordinary JavaScript in a vm
context, so `parseInt`, `JSON.stringify`, `Object.keys`, `Math.floor`, `btoa`
and the methods any value carries are all really there — the catalog was
checked against the sandbox rather than written from memory, which is how
`structuredClone` was found to be the one absentee. Where a dotted expression
resolves to nothing, the fallback offers the script's own names first and then
what any value answers to, so `jsonData.data.toS` still completes to
`toString`. Where the API is known, none of it intrudes: `lz.` lists the API and
nothing else.

Three more things the editor knows are offered where they belong. Inside the
argument of `lz.env.get` and its siblings, the environment's own variable names;
inside `lz.request.headers.set`, the headers this route declares plus the ones
its security scheme needs; inside `lz.response.headers.get`, the headers that
actually came back. None of them is a guess — each is read from the same scan or
the same response the rest of the panel is built from.

The declared shape closes the last gap. `normalizeResponses` was recording only
a status, a description, and the media types it saw, while the request side had
been building a JSON template from the schema since Phase 2. It now runs the
same `templateFromSchema` over the response's own schema, so a route carries
what it says it returns. Suggestions prefer a real response and fall back to
that declaration, which means `lz.response.json().` answers correctly the first
time a script is written, before anything has been sent.

#### The Postman dialect

A pasted Postman script is recognised on sight — `looksPostman` matches the
calls one is actually made of — and the panel offers to switch rather than
letting it fail at send time. Accepting sets the project's script global to
`pm`, and one table in `postman-map.ts` then does two jobs: the sandbox builds a
facade from it that binds Postman's names onto our objects, and the renderer
builds a catalog from it so the suggestions and the reference show those names
too. They cannot drift, because there is one table.

The facade forwards rather than copies. `pm.response.code` reads our `status`
through a getter and `pm.request.url = …` writes back through a setter, so a
script that rewrites the request still rewrites the real one; `pm.response.text()`
is a call over a value, which the table marks and the facade wraps. `lz` stays
bound whatever the project chose, so switching dialects never breaks a script
already written, and the name can be set back — or to anything else — in
**How scripts work**.

What it does not carry is Postman's chai: `pm.expect(x).to.be.a("string")` is not
implemented, and checks stay `expect(value).toBe(…)`. The switch offer says so
in as many words, because a compatibility layer that is quiet about its edges is
worse than none.

The global's name is the project's to choose. `.lazify/api-studio/scripts.json`
holds it, so a team writes the same scripts rather than each developer's own
dialect, and the sandbox binds the API under that name — while always keeping
`lz` bound as well, so renaming never breaks a script that is already written.
A name that is not a usable identifier, or one JavaScript already spends, is
refused at both ends.

The order is settled by where the draft is built. The renderer assembles the
request — path values, query, headers, the encoded body, every `{{variable}}`
already resolved — and hands that draft to main. A pre-request script therefore
receives a finished request and changes it through `lz.request`, not by setting
the variables it was built from. The one exception is a placeholder the
environment could not fill: `{{name}}` survives interpolation when nothing
resolves it, so after the script runs its `lz.env.set` calls are applied to
whatever is left. That is what makes "mint a token, then send with it" work in a
single script.

A pre-request script that throws, or that calls `lz.stop`, is a request that does
not go out. Both are reported as a failed send, because that is what happened,
and the environment still keeps whatever the script set before it gave up.

Values a script sets come back with the outcome as `changedValues` and are
merged into the active environment, which is how a captured token outlives the
request that fetched it. Checks and logs do not: they belong to the run that
produced them and go when the route is left, the way a console does.

A captured value is machine-local unless the project already declared it.
Secrecy used to be decided only by the discovered variable list, which was the
right rule while every value came from a form the user could see — but a script
can invent a name nothing declared, and `lz.env.set("token", …)` would then have
been filed as shareable and written into the project's environment file. Any
name an environment holds that no variable declares is now treated as secret, so
it lands in this machine's storage and never in the repository.

Scripts run in a `node:vm` context in main with a two-second ceiling and nothing
of the process in scope — no `require`, no `process`, no `fetch`, no timers,
only `JSON`, `Math`, `Date`, `URL`, the text codecs, and `lz`. That is a guard
against a script that runs away or reaches for the filesystem by habit, not a
security boundary against one written to escape: a script is the user's own
code, kept in the user's own project, and is trusted the way that project's
source is trusted.

### Phase 4g — a host a project trusts

- [x] Approve a remote host once instead of on every request.

The gate before a request leaves this machine was right to exist and wrong to
repeat itself: switching to Staging meant confirming the same host for every
route in the collection. The confirmation now offers a third answer beside send
and cancel — allow this host from now on — and the send guard consults that list
before it asks.

The unit is the **host**, not the route or the URL, because the host is what the
warning is actually about, and because forty routes on one staging server is the
case that made it annoying. A port is part of that identity, so
`staging.example.com:8443` is trusted separately from `staging.example.com`.

The list is machine-local, kept in the app's own storage keyed by project, on
the same reasoning as environment secrets: a decision about what this computer
may talk to is not something to commit on a teammate's behalf.

### Phase 5 — collection interoperability

- [x] Export Postman Collection v2.1.
- [ ] Import a document the project does not carry (the Import OpenAPI button).
- [ ] Import supported request data without running collection scripts.
- [ ] Add stable rescan reconciliation and conflict review.

**Export collection** writes a Postman v2.1 file wherever the user puts it, and
says everything in Postman's own vocabulary rather than exporting notes: a
discovered variable becomes a collection variable, a path placeholder becomes
`:id` with an entry in `url.variable`, a security scheme becomes the header it
actually sends (`Authorization: Bearer {{bearerToken}}`), an optional query
parameter arrives disabled rather than missing, and a saved example becomes a
saved response under its request. The body is whatever the user last typed,
falling back to what the schema declared. Secrets keep their names and lose
their values — an export is a file made to be shared.

Importing a document the project does not carry has no button yet, and that is
deliberate: a control that cannot be pressed teaches nothing and costs the same
attention as one that works. The scanner already finds and reads any OpenAPI
document a project does carry, so the gap is narrower than an empty button made
it look. The same went for adding a request by hand — both were removed rather
than left greyed out, and they come back the day they do something.

### Phase 6 — framework expansion

- [x] Add ASP.NET controller and minimal-API adapters.
- [x] Add NestJS and Express rule sets; Fastify rides on the Express call rules.
- [x] Add Laravel, FastAPI, and Flask rule sets.
- [ ] Add Django, whose routes come from `urlpatterns` and viewset routers.
- Publish adapter fixtures and accuracy tests for every supported construct.

Six frameworks across four languages now share the same two engines, which is
the property the rule sets exist to prove. What the languages actually differ on
became declarations rather than code:

| Stated in the rule set | Because |
| --- | --- |
| `separator` | PHP writes `Route::get`, everyone else writes `router.get` |
| `blockGroups` | Laravel opens a prefix as a closure, not a variable |
| `groups.pathArgument` | FastAPI names its prefix (`APIRouter(prefix=…)`) |
| `mounts[].overrides` | Flask's `register_blueprint` replaces a blueprint's prefix; FastAPI's `include_router` adds to it |
| `methodsArgument` | Flask puts the verbs in an argument: `methods=["GET", "POST"]` |
| `resources` | One `Route::apiResource` is five routes |
| `handlerDeclaration` | Python declares handlers with `def`, not an arrow |
| `constraintFirst` | Flask writes `<int:user_id>`, ASP.NET writes `{id:int}` |

Bodies come from the same model index in every language: C# classes, TypeScript
interfaces, PHP typed properties, and Pydantic models are all read into the same
shape, and a backed enum states what goes on the wire (`"free"`) rather than its
member name. Detection reads whichever manifest the language uses —
`package.json`, `composer.json`, `requirements.txt`, `pyproject.toml`.

Django is the deliberate gap: its routes live in `urlpatterns` lists and DRF
viewset routers, where one registration implies a set of methods that only the
view class states. That needs a third engine, not a rule set.

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
