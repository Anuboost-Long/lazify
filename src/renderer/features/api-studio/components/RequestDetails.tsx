import { useTranslation } from "react-i18next";

import { fieldKey } from "@main/api-studio/runner";
import { translation } from "@renderer/i18n/translation";
import type { BodyEditor, ScriptEditor } from "../hooks/use-request-draft";
import type { SuggestionSource } from "../script-api";
import type { SavedRoute } from "../types";
import { DefinitionRows, type DefinitionRow } from "./DefinitionRows";
import { RequestBodyPanel } from "./RequestBodyPanel";
import { RequestFieldRows, type RequestField } from "./RequestFieldRows";
import { ScriptsPanel } from "./ScriptsPanel";

export type RequestTab = "params" | "headers" | "body" | "scripts" | "responses";

interface RequestDetailsProps {
  route: SavedRoute;
  tab: RequestTab;
  fields: Record<string, string>;
  body: BodyEditor;
  scripts: ScriptEditor;
  scriptGlobal: string;
  known: SuggestionSource;
  onScriptGlobalChange: (name: string) => void;
  onFieldChange: (key: string, value: string) => void;
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

function responseRows(route: SavedRoute): DefinitionRow[] {
  return (route.responses ?? []).map((response) => ({
    key: response.status,
    label: response.status,
    meta: response.mediaTypes,
    detail: response.description
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
  onScriptGlobalChange,
  onFieldChange
}: Readonly<RequestDetailsProps>) {
  const { t } = useTranslation();
  const requiredLabel = t(translation.ApiStudio.Required);

  const emptyNote = (message: string) => (
    <p className="py-6 text-center text-xs text-muted">{message}</p>
  );

  switch (tab) {
    case "params": {
      const parameters = parameterFields(route, requiredLabel);
      return parameters.length > 0 ? (
        <RequestFieldRows fields={parameters} values={fields} onChange={onFieldChange} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoParams))
      );
    }
    case "headers": {
      const headers = headerFields(route, requiredLabel);
      return headers.length > 0 ? (
        <RequestFieldRows fields={headers} values={fields} onChange={onFieldChange} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoHeaders))
      );
    }
    case "body":
      return <RequestBodyPanel body={route.requestBody ?? null} editor={body} />;
    case "scripts":
      return (
        <ScriptsPanel
          scripts={scripts}
          globalName={scriptGlobal}
          known={known}
          onGlobalNameChange={onScriptGlobalChange}
        />
      );
    case "responses": {
      const rows = responseRows(route);
      return rows.length > 0 ? (
        <DefinitionRows rows={rows} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoResponses))
      );
    }
  }
}
