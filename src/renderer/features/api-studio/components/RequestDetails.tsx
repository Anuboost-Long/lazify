import { useTranslation } from "react-i18next";

import { parameterNameForSecurity } from "@main/api-studio/environment";
import { addedFields, fieldKey } from "@main/api-studio/runner/build-request";
import { translation } from "@renderer/i18n/translation";
import type { BodyEditor, ScriptEditor } from "../hooks/use-request-draft";
import type { SuggestionSource } from "../script-api";
import type { SavedRoute } from "../types";
import { RequestBodyPanel } from "./RequestBodyPanel";
import { RequestFieldRows, type RequestField } from "./RequestFieldRows";
import { ScriptsPanel } from "./ScriptsPanel";

export type RequestTab = "params" | "headers" | "body" | "scripts";

interface RequestDetailsProps {
  route: SavedRoute;
  tab: RequestTab;
  fields: Record<string, string>;
  body: BodyEditor;
  scripts: ScriptEditor;
  scriptGlobal: string;
  known: SuggestionSource;
  readOnly?: boolean;
  onAddField?: (location: "query" | "header") => string | null;
  onRepeatField?: (key: string) => string | null;
  onRenameField?: (key: string, name: string) => void;
  onRemoveField?: (key: string) => void;
  onScriptGlobalChange: (name: string) => void;
  onFieldChange: (key: string, value: string) => void;
}

function addedRows(
  route: SavedRoute,
  fields: Record<string, string>,
  location: "query" | "header"
): RequestField[] {
  return addedFields({ route, fields }, location).map((field) => ({
    key: field.key,
    label: field.name,
    meta: field.key.includes("#") ? [] : [location],
    detail: null,
    placeholder: "",
    added: true,
    repeat: field.key.includes("#")
  }));
}

/** A field given more than once shows a row per value, the way it is sent. */
function withRepeats(rows: RequestField[], fields: Record<string, string>): RequestField[] {
  return rows.flatMap((row) => {
    const repeats = Object.keys(fields)
      .filter((key) => key.startsWith(`${row.key}#`))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .map((key) => ({ ...row, key, meta: [], detail: null, repeat: true }));

    return [row, ...repeats];
  });
}

function parameterFields(route: SavedRoute, requiredLabel: string): RequestField[] {
  return (route.parameters ?? []).map((parameter) => ({
    key: fieldKey(parameter.location, parameter.name),
    label: parameter.name,
    meta: [
      parameter.location,
      parameter.schemaType,
      parameter.required ? requiredLabel : null
    ].filter((value): value is string => Boolean(value)),
    detail: parameter.description,
    placeholder: parameter.example ?? ""
  }));
}

function headerFields(route: SavedRoute, requiredLabel: string): RequestField[] {
  return route.headers.map((header) => ({
    key: fieldKey("header", header.name),
    label: header.name,
    meta: [header.required ? requiredLabel : null].filter((value): value is string =>
      Boolean(value)
    ),
    detail: header.description,
    placeholder: header.value ?? ""
  }));
}

/**
 * A route's auth requirements, shown and edited the same way as any other
 * field — the user decides what fills them, in by typing a literal value or
 * linking to an environment variable with `{{Name}}`, instead of the app
 * silently guessing which variable to use.
 */
function securityFields(
  route: SavedRoute,
  requiredLabel: string,
  location: "header" | "query" | "cookie"
): RequestField[] {
  // More than one scheme (bearer, oauth2, an inherited project-wide policy…)
  // routinely rides the same header, so more than one security entry can name
  // the same parameter — one field to fill in, not one per scheme. Names
  // differing only in case are the same header, same as elsewhere in this app.
  const seen = new Set<string>();
  const names = route.security
    .filter((security) => security.location === location)
    .map((security) => parameterNameForSecurity(security))
    .filter((name): name is string => name.length > 0)
    .filter((name) => {
      const lower = name.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

  return names.map((name) => ({
    key: fieldKey(location, name),
    label: name,
    meta: [requiredLabel, "auth"],
    detail: null,
    placeholder: `{{${name}}}`
  }));
}

export function RequestDetails({
  route,
  tab,
  fields,
  body,
  scripts,
  scriptGlobal,
  known,
  readOnly = false,
  onAddField,
  onRepeatField,
  onRenameField,
  onRemoveField,
  onScriptGlobalChange,
  onFieldChange
}: Readonly<RequestDetailsProps>) {
  const { t } = useTranslation();
  const requiredLabel = t(translation.ApiStudio.Required);

  switch (tab) {
    case "params": {
      const declared = withRepeats(parameterFields(route, requiredLabel), fields);
      const declaredKeys = new Set(declared.map((field) => field.key.toLowerCase()));
      const auth = [
        ...securityFields(route, requiredLabel, "query"),
        ...securityFields(route, requiredLabel, "cookie")
      ].filter((field) => !declaredKeys.has(field.key.toLowerCase()));

      return (
        <RequestFieldRows
          fields={[...declared, ...auth, ...addedRows(route, fields, "query")]}
          values={fields}
          readOnly={readOnly}
          variableNames={known.variableNames}
          onChange={onFieldChange}
          onRename={onRenameField}
          onRemove={onRemoveField}
          onRepeat={onRepeatField}
          onAdd={onAddField ? () => onAddField("query") : undefined}
        />
      );
    }
    case "headers": {
      const declared = withRepeats(headerFields(route, requiredLabel), fields);
      const declaredKeys = new Set(declared.map((field) => field.key.toLowerCase()));
      const auth = securityFields(route, requiredLabel, "header").filter(
        (field) => !declaredKeys.has(field.key.toLowerCase())
      );

      return (
        <RequestFieldRows
          fields={[...declared, ...auth, ...addedRows(route, fields, "header")]}
          values={fields}
          readOnly={readOnly}
          variableNames={known.variableNames}
          onChange={onFieldChange}
          onRename={onRenameField}
          onRemove={onRemoveField}
          onRepeat={onRepeatField}
          onAdd={onAddField ? () => onAddField("header") : undefined}
        />
      );
    }
    case "body":
      return <RequestBodyPanel body={route.requestBody ?? null} editor={body} readOnly={readOnly} />;
    case "scripts":
      return (
        <ScriptsPanel
          scripts={scripts}
          globalName={scriptGlobal}
          known={known}
          readOnly={readOnly}
          onGlobalNameChange={onScriptGlobalChange}
        />
      );
  }
}
