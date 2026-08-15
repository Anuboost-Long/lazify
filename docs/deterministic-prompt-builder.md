# Deterministic Agent Prompt Builder

Status: built — 2026-08-14. Every Definition of Done item (§31) is covered.
Owner: Ly kimlong

Decisions taken against this spec:

- **Tasks are stored** (added after phase 1): name, description, requirements,
  notes, preset, status, priority and deadline, per project, with `task_agent_runs`
  keeping the exact prompt each agent was handed (§19).
- **SQLite via `node:sqlite`**, Electron's own, rather than better-sqlite3 — real
  SQLite with no native module to rebuild per platform.
- **One `context_entries` table** with a `scope` column, instead of the separate
  `project_context` and `global_context` tables (§7, §10). This is what §28 asks
  for: workspace, agent or repository scopes need no new table.
- **Two additions the spec does not name**: `pack`, which groups entries so they
  plug in and out as a set, and `applies_to`, which aims an entry at particular
  presets so a rule can belong to a kind of task rather than to everything.
- **Built-ins are read-only and duplicable**, so the shipped defaults can never
  be lost; shipped context entries can be switched off but not deleted.
- **Priority renders as the instruction, not the label** (§5). Priority only ever
  means what to do first, and an agent handed "high" has been told nothing, so
  high renders as "Start with this before other outstanding work." and low as
  "This can wait behind other outstanding work." Normal is the default and
  renders to nothing, which takes its heading with it (§13's renderer rule).
- **All eleven preset kinds of §3 ship**, though only the four §20–§23 gives
  templates for use that exact wording.

Open: the base context set below is a first draft, to be refined together.

## Objective

Add a built-in **Prompt Builder** that converts a normal task description into structured, agent-ready instructions **without calling AI**.

Example user task:

```text
Add dark mode to settings page and save the selected theme.
```

Lazify should be able to transform it into something similar to:

```text
You are working on the Lazify project.

Task:
Add dark mode to the settings page.

Requirements:
- Add light and dark theme support.
- Add the theme control to the existing settings page.
- Persist the user's selected theme.
- Restore the saved theme when the application starts.

Project Rules:
- Follow the existing project architecture.
- Reuse existing components where possible.
- Do not introduce unnecessary dependencies.
- Preserve existing functionality.

Completion Criteria:
- Theme can be switched from settings.
- Selected theme persists after restart.
- Existing functionality continues to work.
```

This transformation must work **without an LLM/API call**.

---

# 1. Core Concept

The Prompt Builder should combine:

```text
Task Description
        +
Task Metadata
        +
Prompt Preset
        +
Project Context
        +
Stored Rules / Memory
        ↓
Agent-Ready Prompt
```

The output should be deterministic.

Given the same inputs, Lazify should produce the same prompt.

---

# 2. Do Not Depend on AI

The Prompt Builder must NOT require:

- OpenAI
- Claude
- Gemini
- Local LLM
- Embeddings
- Vector databases
- Internet connection

It should use normal application logic and stored templates.

AI agents only receive the **final generated prompt**.

---

# 3. Prompt Presets

Create reusable prompt presets.

Examples:

```text
General Development
Bug Fix
New Feature
Refactor
Research
UI / UX
Database
API
Testing
Documentation
Code Review
```

A task can optionally select a preset.

Example:

```text
Task:
Fix login redirect bug

Preset:
Bug Fix
```

The Bug Fix preset may contain:

```text
Investigate the reported issue.

Requirements:
- Identify the root cause before modifying code.
- Preserve unrelated behavior.
- Prefer the smallest safe change.
- Check related logic for regressions.
- Verify the fix after implementation.
```

Then Lazify appends the user's actual task description.

---

# 4. Preset Storage

Store presets locally.

Suggested SQLite structure:

```text
prompt_presets
--------------------------------
id
name
description
template
is_builtin
created_at
updated_at
deleted_at
```

Built-in presets should ship with Lazify.

Users should also be able to create custom presets.

---

# 5. Template Variables

Prompt presets should support template variables.

Example:

```text
You are working on the project:

{{project_name}}

Task:
{{task_name}}

Description:
{{task_description}}

Priority:
{{priority}}

Deadline:
{{deadline}}

Project Context:
{{project_context}}

Project Rules:
{{project_rules}}
```

The Prompt Builder replaces these placeholders using stored data.

---

# 6. Project Context Memory

Each Lazify project should have persistent **Project Context**.

This is NOT AI memory.

It is normal structured data stored locally.

Example:

```text
Project: Infinity Portal

Framework:
Next.js

Language:
TypeScript

Package Manager:
Yarn

Backend:
.NET API

Database:
Supabase

Important Directories:
src/app
src/components
src/services

Development Rules:
- Use existing components where possible.
- Do not introduce unnecessary dependencies.
- Follow the existing API service pattern.
- Maintain TypeScript typing.
```

Agents should receive this information automatically when executing tasks for this project.

---

# 7. Project Context Storage

Suggested structure:

```text
project_context
--------------------------------
id
project_id
context_key
context_value
category
is_active
created_at
updated_at
```

Example records:

```text
framework       Next.js
language        TypeScript
package_manager Yarn
backend         .NET 8
database        Supabase
```

This makes context editable and reusable.

---

# 8. Project Rules

Allow projects to store persistent instructions.

Examples:

```text
Do not install dependencies unless necessary.

Use Yarn instead of npm.

Follow the existing folder structure.

Do not modify production environment files.

Reuse existing components before creating new ones.

Do not change API contracts without explicit instruction.
```

These rules should automatically be included in generated prompts.

---

# 9. Context Categories

Project memory should optionally support categories.

For example:

```text
Technology
Architecture
Commands
Coding Rules
Environment
Database
API
Testing
Deployment
Agent Instructions
```

This allows Lazify to selectively build context later.

---

# 10. Global Context

Support optional global developer rules that apply across every project.

Example:

```text
Prefer simple implementations.

Avoid unnecessary dependencies.

Inspect existing implementation before changing architecture.

Do not delete existing functionality unless explicitly requested.

After modifying code, verify that the project still builds.
```

Storage could use:

```text
global_context
--------------------------------
id
context_key
context_value
category
is_active
```

Prompt generation becomes:

```text
Global Rules
      +
Project Rules
      +
Preset
      +
Task
```

---

# 11. Context Priority

Use the following priority order:

```text
Global Context
      ↓
Project Context
      ↓
Preset
      ↓
Task-Specific Instructions
```

Task-specific instructions should have the highest relevance.

Do not allow generic preset text to override explicit task instructions.

---

# 12. Prompt Builder Service

Do not place prompt construction logic inside UI components.

Create a reusable service.

Conceptually:

```text
PromptBuilderService

buildPrompt(taskId)
buildPrompt(task, project)
previewPrompt(taskId)
```

Architecture:

```text
Task
 │
 ├── Task Repository
 │
 ▼
Prompt Builder
 │
 ├── Prompt Preset Repository
 ├── Project Context Repository
 ├── Global Context Repository
 └── Template Renderer
 │
 ▼
Final Agent Prompt
```

---

# 13. Template Renderer

Create a small deterministic template renderer.

It should support variables such as:

```text
{{task_name}}
{{task_description}}
{{task_prompt}}
{{project_name}}
{{priority}}
{{deadline}}
{{project_context}}
{{project_rules}}
{{global_rules}}
```

Do not introduce a heavy templating framework unless Lazify already uses one.

Simple placeholder substitution is sufficient.

---

# 14. Description → Agent Instruction Conversion

The Prompt Builder should provide a basic rule-based transformation for descriptions.

It should NOT attempt to "understand" the text with AI.

For example:

Input:

```text
add task filtering by status and project
```

Output:

```text
Task:
Add task filtering by status and project.

Implementation Requirements:
- Add filtering by task status.
- Add filtering by project.
- Integrate the filters with the existing task list.
- Preserve the existing task-list behavior when no filters are selected.
```

This can be achieved using templates and structured fields rather than language generation.

---

# 15. Structured Task Requirements

To improve deterministic prompts, allow tasks to optionally contain structured requirements.

Example:

```text
Description:
Add dark mode

Requirements:
- Setting toggle
- Save preference
- Restore preference on startup
```

Then Prompt Builder converts them directly into:

```text
Requirements:
- Add a theme setting toggle.
- Persist the selected preference.
- Restore the saved preference when the application starts.
```

This is much more reliable than attempting to rewrite arbitrary text.

---

# 16. Task Notes

Allow additional reusable task notes.

For example:

```text
Do not change the existing settings layout.

Theme support already exists partially in AppThemeService.
```

These should appear under:

```text
Additional Context:
```

in the generated prompt.

---

# 17. Prompt Preview

Before sending a task to an agent, provide:

```text
Generate Agent Prompt
```

or:

```text
Preview Prompt
```

Example UI:

```text
Task
────────────────────────

Add dark mode

Preset
[ New Feature ▼ ]

Agent Prompt
────────────────────────

You are working on...
...

[Copy] [Edit] [Run with Agent]
```

The user should be able to inspect the exact prompt sent to the agent.

---

# 18. Generated Prompt Editing

Generated prompts should be editable before execution.

However, editing the generated prompt should NOT automatically overwrite:

```text
Task Description
Project Context
Preset
Global Rules
```

Treat the generated text as an execution-specific prompt.

---

# 19. Store Generated Prompt

Optionally store the exact generated prompt used for an agent run.

Suggested structure:

```text
task_agent_runs
--------------------------------
id
task_id
agent_id
generated_prompt
started_at
completed_at
status
```

This provides history showing exactly what instructions were given to an agent.

---

# 20. Prompt Preset Example — New Feature

```text
You are implementing a new feature in {{project_name}}.

Task:
{{task_name}}

Description:
{{task_description}}

Requirements:
{{task_requirements}}

Project Context:
{{project_context}}

Project Rules:
{{project_rules}}

Implementation Instructions:
- Inspect the existing implementation before making changes.
- Follow the project's existing architecture.
- Reuse existing components and services where appropriate.
- Avoid unnecessary dependencies.
- Keep the implementation modular.
- Preserve existing functionality.

When finished:
- Verify the feature works.
- Check for obvious regressions.
- Report which files were changed.
- Summarize the implementation.
```

---

# 21. Prompt Preset Example — Bug Fix

```text
You are fixing a bug in {{project_name}}.

Issue:
{{task_name}}

Description:
{{task_description}}

Project Context:
{{project_context}}

Project Rules:
{{project_rules}}

Instructions:
- Reproduce or understand the issue first.
- Identify the underlying cause.
- Do not apply unrelated changes.
- Prefer the smallest safe fix.
- Preserve existing behavior outside the affected area.
- Check related code for regressions.

When finished:
- Explain the root cause.
- Explain the fix.
- List changed files.
- Describe how the fix was verified.
```

---

# 22. Prompt Preset Example — Refactor

```text
Refactor the following area of {{project_name}}.

Task:
{{task_name}}

Description:
{{task_description}}

Project Context:
{{project_context}}

Project Rules:
{{project_rules}}

Requirements:
- Preserve existing external behavior.
- Improve maintainability.
- Avoid unnecessary abstraction.
- Follow existing project conventions.
- Do not introduce dependencies unless required.

When finished:
- List changed files.
- Explain what was improved.
- Mention any behavior that changed.
```

---

# 23. Prompt Preset Example — Research

```text
Investigate the following topic for {{project_name}}.

Task:
{{task_name}}

Description:
{{task_description}}

Relevant Project Context:
{{project_context}}

Instructions:
- Inspect the existing project before recommending changes.
- Compare reasonable implementation options.
- Explain important tradeoffs.
- Prefer solutions compatible with the current architecture.
- Do not modify code unless explicitly requested.

Return:
- Findings
- Recommended approach
- Alternatives
- Risks or limitations
```

---

# 24. Default Prompt Generation

When no preset is selected, use a generic development template.

Example:

```text
You are working on {{project_name}}.

Task:
{{task_name}}

Description:
{{task_description}}

Additional Requirements:
{{task_requirements}}

Project Context:
{{project_context}}

Project Rules:
{{project_rules}}

Complete the requested task while following the existing project architecture and conventions.

Before making changes:
- Inspect relevant existing code.
- Understand how the current implementation works.

While implementing:
- Reuse existing functionality where appropriate.
- Avoid unnecessary dependencies.
- Keep changes focused on the requested task.
- Preserve unrelated functionality.

When finished:
- Verify the implementation.
- List changed files.
- Summarize what was done.
```

---

# 25. Automatic Preset Selection

Do NOT use AI to determine preset type.

The user can select it manually.

Optionally implement simple keyword rules:

```text
fix
bug
broken
error
```

→ Bug Fix

```text
add
create
implement
support
```

→ New Feature

```text
refactor
cleanup
reorganize
```

→ Refactor

```text
investigate
research
compare
find out
```

→ Research

However, manual selection should always override automatic selection.

---

# 26. Memory Editor

Provide a project area such as:

```text
Project
 ├── Overview
 ├── Tasks
 ├── Agents
 └── Context
```

The **Context** page allows the user to manage stored project knowledge.

Example:

```text
Project Context

Technology
─────────────────
Framework        Next.js
Language         TypeScript
Package Manager  Yarn

Rules
─────────────────
✓ Use existing components
✓ Avoid unnecessary dependencies
✓ Run yarn lint after changes

Agent Instructions
─────────────────
✓ Inspect existing implementation first
✓ Report changed files after completion
```

---

# 27. Context Enable / Disable

Every stored context entry should be individually enabled or disabled.

Example:

```text
[✓] Use Yarn
[✓] Avoid unnecessary dependencies
[ ] Run full test suite
[✓] Preserve API compatibility
```

Disabled context must not be injected into prompts.

---

# 28. Context Scoping

Support at least:

```text
Global
Project
Task
```

Future support may include:

```text
Workspace
Repository
Agent
Technology
```

Design the data model so these scopes can be added later.

---

# 29. Final Prompt Assembly

Prompt generation should conceptually perform:

```text
buildPrompt(task):

    globalContext =
        loadGlobalContext()

    projectContext =
        loadProjectContext(task.projectId)

    preset =
        loadPreset(task.presetId)

    taskData =
        loadTask(task.id)

    return renderTemplate(
        preset.template,
        globalContext,
        projectContext,
        taskData
    )
```

No network request should occur.

---

# 30. Important Design Principle

Treat **description** and **prompt** as two different concepts.

```text
Description
```

is written primarily for the human.

Example:

```text
Need filtering on task screen so I can quickly see bugs.
```

The generated:

```text
Agent Prompt
```

is structured for execution.

Example:

```text
Implement task filtering on the existing task screen.

Requirements:
- Add filtering by task label.
- Support selecting the Bug label.
- Update the displayed task list immediately.
- Preserve existing sorting and project filtering.

Follow the existing task architecture and reuse existing components.
```

Do not require users to write perfect prompts when creating tasks.

That is the responsibility of the Prompt Builder.

---

# 31. Definition of Done

This feature is complete when the user can:

- [ ] Write a simple human-readable task description.
- [ ] Select a prompt preset.
- [ ] Store persistent project context.
- [ ] Store persistent global development rules.
- [ ] Create custom prompt presets.
- [ ] Generate an agent-ready prompt without AI.
- [ ] Preview the generated prompt.
- [ ] Edit the generated prompt before execution.
- [ ] Send the generated prompt to any configured agent.
- [ ] Store the exact prompt used for an agent run.
- [ ] Restart Lazify without losing presets or context.
- [ ] Manage context without editing application source code.
- [ ] Enable or disable individual context entries.

The entire prompt-generation process must continue to work offline and must not depend on any AI provider.