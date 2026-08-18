import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SavedRoute } from "../types";
import { DefinitionRows, type DefinitionRow } from "./DefinitionRows";
import { RequestBodyPanel } from "./RequestBodyPanel";

export type RequestTab = "params" | "headers" | "body" | "responses";

interface RequestDetailsProps {
  route: SavedRoute;
  tab: RequestTab;
}

function parameterRows(route: SavedRoute, requiredLabel: string): DefinitionRow[] {
  return (route.parameters ?? []).map((parameter) => ({
    key: `${parameter.location} ${parameter.name}`,
    label: parameter.name,
    meta: [
      parameter.location,
      parameter.schemaType,
      parameter.required ? requiredLabel : null,
      parameter.example
    ].filter((value): value is string => Boolean(value)),
    detail: parameter.description
  }));
}

function headerRows(route: SavedRoute, requiredLabel: string): DefinitionRow[] {
  return route.headers.map((header) => ({
    key: header.name,
    label: header.name,
    meta: [header.value, header.required ? requiredLabel : null].filter(
      (value): value is string => Boolean(value)
    ),
    detail: header.description
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

export function RequestDetails({ route, tab }: Readonly<RequestDetailsProps>) {
  const { t } = useTranslation();
  const requiredLabel = t(translation.ApiStudio.Required);

  const emptyNote = (message: string) => (
    <p className="py-6 text-center text-xs text-muted">{message}</p>
  );

  switch (tab) {
    case "params": {
      const rows = parameterRows(route, requiredLabel);
      return rows.length > 0 ? (
        <DefinitionRows rows={rows} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoParams))
      );
    }
    case "headers": {
      const rows = headerRows(route, requiredLabel);
      return rows.length > 0 ? (
        <DefinitionRows rows={rows} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoHeaders))
      );
    }
    case "body":
      return route.requestBody ? (
        <RequestBodyPanel body={route.requestBody} />
      ) : (
        emptyNote(t(translation.ApiStudio.NoBody))
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
