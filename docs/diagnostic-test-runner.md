# Cross-Platform Diagnostic Test Runner

Status: proposed

## 1. Objective

Add a built-in diagnostic test runner to Lazify for testing local web and Expo
applications through repeatable user flows.

A user should be able to select a project such as Infinity Admin or Infinity
Mobile, run its diagnostic flows, watch each step execute, and receive a report
containing failures and supporting evidence.

Lazify must own the flow format, execution state machine, diagnostic collection,
artifacts, and report format. The feature must not depend on Maestro, Playwright,
or another test platform as its execution engine.

Maestro may inspire the user experience, but Lazify flows must remain usable
without Maestro, a hosted service, or an external account.

---

## 2. Core Experience

```text
Select project
      ↓
Select target and flow
      ↓
Start or connect to the application
      ↓
Run steps on web, Android, or iOS
      ↓
Collect test, runtime, network, and terminal evidence
      ↓
Review and export the diagnostic report
```

The main concepts are:

- **Flow:** A version-controlled description of user actions and assertions.
- **Target:** The web application, Android application, or iOS application under
  test.
- **Run:** One execution of a flow against a target.
- **Step result:** The outcome, duration, and evidence for one step.
- **Artifact:** A screenshot, log excerpt, network failure, or other file
  produced by a run.
- **Diagnostic report:** A human-readable summary of a completed run.

---

## 3. Product Principles

### 3.1 Own the public contract

Flow files must use a Lazify-owned schema. Platform-specific details belong in
drivers and must not leak into the common flow format unless a capability is
inherently platform-specific.

### 3.2 Keep flows with the project

Store flows in the selected project so they can be reviewed, committed, and run
by other team members. The initial convention should be:

```text
.lazify/diagnostics/
  flows/
  config.json
```

### 3.3 Prefer stable selectors

Flows should locate elements by stable identifiers and accessibility metadata.
Visible text is useful but can change with copy edits or translations.
Coordinate-based interaction should be the last resort.

Selector priority:

1. `id`
2. `label`
3. `role` with a name
4. `text`
5. Coordinates

Web applications should expose stable element identifiers. Expo applications
should expose stable React Native `testID` and accessibility properties.

### 3.4 Keep tests deterministic

The initial runner should execute explicit flows. Automatic feature discovery,
AI-generated actions, and unrestricted exploration are outside the first scope.

### 3.5 Reports need evidence

A failed flow must identify the failed step and include enough evidence to
investigate it. A terminal line containing the word `error` is not sufficient
on its own to classify a feature as failed.

---

## 4. Flow Format

The format should be declarative, readable, and versionable.

Example web flow:

```yaml
name: Create user
target: web
start:
 script: dev
 url: http://localhost:3000
steps:
 - open:
    path: /login
 - input:
    id: email
    valueFrom: TEST_EMAIL
 - input:
    id: password
    valueFrom: TEST_PASSWORD
 - tap:
    text: Sign in
 - expectVisible:
    text: Dashboard
 - tap:
    text: Users
 - expectNoRuntimeErrors
 - screenshot:
    name: users-page
```

Example Expo flow:

```yaml
name: Mobile login
target: mobile
appId:
 android: com.infinity.mobile
 ios: com.infinity.mobile
steps:
 - launchApp:
    clearState: true
 - input:
    id: email
    valueFrom: TEST_EMAIL
 - input:
    id: password
    valueFrom: TEST_PASSWORD
 - tap:
    text: Sign in
 - expectVisible:
    text: Home
 - screenshot:
    name: signed-in
```

Secrets must be referenced by name and resolved at runtime. They must never be
written into flow files, logs, screenshots, or reports.

### 4.1 Initial common steps

- `launchApp`
- `stopApp`
- `open`
- `tap`
- `input`
- `clearInput`
- `scroll`
- `back`
- `waitFor`
- `expectVisible`
- `expectNotVisible`
- `expectUrl`
- `expectNoRuntimeErrors`
- `screenshot`

Conditional logic, loops, JavaScript evaluation, and reusable subflows should
wait until real flows demonstrate the need for them.

---

## 5. Architecture

```text
DiagnosticRunCoordinator
  ├── FlowParser
  ├── FlowValidator
  ├── DiagnosticDriver
  │   ├── WebDiagnosticDriver
  │   ├── AndroidDiagnosticDriver
  │   └── IosDiagnosticDriver
  ├── DiagnosticCollector
  │   ├── TerminalCollector
  │   ├── BrowserCollector
  │   └── DeviceLogCollector
  ├── ArtifactStore
  └── DiagnosticReportGenerator
```

The coordinator owns run lifecycle and cancellation. Drivers perform user
actions. Collectors observe errors without controlling the target.

The core driver contract should cover capabilities rather than operating-system
commands:

```ts
interface DiagnosticDriver {
	connect(target: DiagnosticTarget): Promise<void>;
	launch(options: LaunchOptions): Promise<void>;
	tap(selector: ElementSelector): Promise<void>;
	input(selector: ElementSelector, value: string): Promise<void>;
	isVisible(selector: ElementSelector): Promise<boolean>;
	screenshot(filePath: string): Promise<void>;
	close(): Promise<void>;
}
```

Drivers should declare their supported capabilities so validation can reject an
unsupported flow before starting a run.

---

## 6. Platform Drivers

### 6.1 Web

The web driver should control Chromium through the Chrome DevTools Protocol.

Initial responsibilities:

- Open the configured localhost URL.
- Inspect the DOM and accessibility tree.
- Find and interact with elements.
- Capture console exceptions and unhandled errors.
- Capture failed requests and HTTP 4xx/5xx responses.
- Detect navigation failures and page crashes.
- Take screenshots.

The diagnostic browser session should be isolated from Lazify's normal browser
session so cookies, local storage, extensions, and navigation do not contaminate
test results.

### 6.2 Android

The Android driver should use platform tools available through the Android SDK:

- ADB device and emulator discovery
- Application installation and launching
- UI hierarchy inspection
- Tap, text, scroll, and back input
- Screenshot capture
- Logcat collection
- Application data reset when requested

The runner must report a clear prerequisite error when ADB, an emulator, the
application package, or the requested application identifier is unavailable.

### 6.3 iOS

The iOS driver should use Xcode command-line tools and a Lazify-owned XCUITest
runner:

- `xcrun simctl` for simulator discovery and lifecycle
- XCUITest for element inspection and interaction
- Simulator screenshots and logs
- Application installation, launching, termination, and data reset

iOS diagnostics require macOS and Xcode. Lazify must show the platform as
unavailable rather than offering a run that cannot start.

### 6.4 Expo projects

Lazify should detect Expo from the project manifest and configuration, then read
the Android package and iOS bundle identifier when present.

Reliable diagnostics should target an installed development or test build. Expo
Go support may be explored later, but it must not be the foundation of the
runner because application identity and native configuration differ from a
standalone build.

The runner should support starting Metro through Lazify's existing script and
terminal infrastructure, or attaching to a server that is already running.

---

## 7. Run Lifecycle

Every run should move through explicit states:

```text
queued
  → validating
  → preparing
  → waiting-for-target
  → running
  → collecting
  → passed | failed | cancelled | infrastructure-error
```

A failed assertion is a test failure. A missing SDK, unavailable device, invalid
flow, or server that never becomes ready is an infrastructure error. Reports
must keep these outcomes distinct.

Before execution, Lazify should validate:

- Flow syntax and supported steps
- Required project scripts and configuration
- Required environment variable names
- Platform tools
- Target device or browser availability
- Application identifier or URL

Run cancellation must stop diagnostic processes without stopping unrelated
project terminals.

---

## 8. Diagnostic Collection

Each evidence item should include:

- Source
- Timestamp
- Flow and step identifier
- Severity
- Summary
- Raw details when safe
- Related artifact paths

Sources may include:

- Flow assertion
- Web console
- Web network request
- Project terminal
- Metro
- Android Logcat
- iOS simulator log
- Driver or infrastructure

Terminal output should be captured during the diagnostic run rather than read
only after completion. Lazify's current PTY backlog is bounded and its session
entry is removed when the process exits, so the diagnostic collector needs its
own run-scoped persisted stream.

ANSI control sequences and duplicate lines should be removed from reports.
Credentials, tokens, cookies, authorization headers, and configured secret
values must be redacted before evidence is persisted.

---

## 9. Reports and Storage

The initial report should be available inside Lazify and exportable as HTML or
PDF.

Report contents:

- Project name and path
- Branch and commit when available
- Target platform, device, and application identifier or URL
- Start time, end time, and duration
- Overall result
- Passed, failed, and skipped flow totals
- Step-by-step results
- Runtime, network, and terminal findings
- Screenshots and other artifacts
- Infrastructure errors

Example summary:

```text
Infinity Admin — Diagnostic Run

Login                    Passed
User management          Failed
  Step                    Tap "Save user"
  Network                 POST /api/users returned 500
  Browser                 Unhandled promise rejection
  Terminal                Database connection timeout
  Evidence                user-management-failure.png
Permissions              Passed
```

Diagnostic reports and weekly support reports are separate concepts. A later
feature may let a user select diagnostic findings and include them in a weekly
support report.

Initial run metadata may use Lazify's existing local SQLite infrastructure.
Large artifacts should remain as files and be referenced by the database rather
than stored as database blobs.

Retention must be configurable so screenshots and logs do not grow without
limit.

---

## 10. User Interface

The initial interface should prioritize running and investigating flows:

```text
Diagnostic Tests
  ├── Flows
  │   ├── Admin login
  │   ├── Create user
  │   └── Update permissions
  └── Runs
      ├── 03 Sep 2026 — 8 passed, 1 failed
      └── 02 Sep 2026 — 9 passed
```

An active run should show:

- Current flow and step
- Target platform and device
- Elapsed time
- Live screenshot or latest captured frame
- Live diagnostic events
- Cancel action

A visual flow builder should come after the schema and runner are stable. The
first version may use a structured editor with validation and step templates.

---

## 11. Delivery Phases

### Phase 1: Web foundation

- Define and validate the Lazify flow schema.
- Implement the run state machine and cancellation.
- Start or attach to a local web application.
- Run basic Chromium actions and assertions.
- Capture console, network, terminal, and screenshot evidence.
- Store run history and generate an HTML report.

### Phase 2: Android and Expo

- Detect Expo configuration and Android application identifiers.
- Detect Android devices and emulators.
- Install, launch, reset, and control an Android application.
- Capture Logcat and screenshots.
- Run the common flow steps against Android.

### Phase 3: iOS and Expo

- Build the Lazify-owned XCUITest runner.
- Detect and control iOS simulators.
- Install, launch, reset, and control an iOS application.
- Capture simulator logs and screenshots.
- Run the common flow steps against iOS.

### Phase 4: Authoring and reporting

- Add the visual flow builder.
- Add reusable subflows only if required by real projects.
- Add PDF export and retention settings.
- Allow selected findings to be included in weekly support reports.

---

## 12. MVP Definition of Done

The first implementation is complete when a user can:

1. Select a local web project.
2. Create or load a valid Lazify diagnostic flow.
3. Start or attach to the project's localhost server.
4. Run open, tap, input, visibility assertion, URL assertion, and screenshot
   steps in an isolated Chromium session.
5. See live step status and cancel the run.
6. Receive a clear test failure or infrastructure error.
7. Review browser console errors, failed HTTP requests, correlated terminal
   output, and screenshots.
8. Reopen the completed run from local history.
9. Export a redacted HTML diagnostic report.

Android and iOS support are planned extensions and are not required for the web
MVP.

---

## 13. Risks and Open Decisions

- The iOS driver is the largest platform-specific investment and requires a
  maintained Swift/XCUITest helper.
- Native accessibility trees do not behave identically across Android and iOS;
  the common selector contract will need platform conformance tests.
- Projects without stable identifiers will produce fragile flows.
- Authentication setup, seeded test data, and destructive actions need an
  explicit strategy before flows can safely run against shared environments.
- The initial YAML parser and schema-validation implementation remain to be
  selected. Using a replaceable parsing library does not change ownership of
  the Lazify flow contract.
- The location and retention policy for run artifacts remain to be decided.
- Physical-device support should be evaluated separately from emulator and
  simulator support.

The first implementation should prove the flow contract and diagnostic evidence
model on web before mobile platform complexity is introduced.
