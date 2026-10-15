import type { CustomRequest } from "../../custom-collections";
import type { SavedExample } from "../../request-store";
import type { ApiParameter, SavedRoute } from "../../types";
import { escapeHtml, renderMarkup } from "../markup";
import type { DocRouteEntry, DocTheme } from "../types";
import { curlForRequest } from "./curl";
import { redactBody } from "./redact";

const MAX_BODY_CHARS = 4000;

export interface RouteView {
  entry: DocRouteEntry;
  request: CustomRequest;
  anchor: string;
}

function field(title: string, body: string): string {
  return body.trim()
    ? `<div class="field"><h4>${escapeHtml(title)}</h4>${body}</div>`
    : "";
}

function prose(entry: DocRouteEntry, sectionId: string): string {
  return renderMarkup(entry.sections[sectionId] ?? "");
}

function formatted(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function codeBlock(text: string): string {
  const body = formatted(text.trim());
  const shown = body.length > MAX_BODY_CHARS ? `${body.slice(0, MAX_BODY_CHARS)}\n…` : body;

  return `<pre class="doc-code"><code>${escapeHtml(shown)}</code></pre>`;
}

function statusClass(status: string): string {
  if (status.startsWith("2")) return "ok";
  if (status.startsWith("3")) return "warn";

  return "bad";
}

function detectedAuth(route: SavedRoute): string {
  if (route.security.length === 0) return "";

  const said = route.security.map((scheme) => {
    const carrier = `${scheme.parameterName} ${scheme.location}`;

    return scheme.kind === "bearer"
      ? `Bearer token in the ${carrier}.`
      : `${scheme.schemeName} (${scheme.kind}) in the ${carrier}.`;
  });

  return `<p>${escapeHtml(said.join(" "))}</p>`;
}

function parameterRows(parameters: ApiParameter[]): string {
  return parameters
    .map(
      (parameter) => `<tr>
      <td class="name">${escapeHtml(parameter.name)}</td>
      <td><span class="tag">${escapeHtml(parameter.location)}</span></td>
      <td>${escapeHtml(parameter.schemaType ?? "—")}</td>
      <td>${parameter.required ? '<span class="tag required">required</span>' : ""}</td>
      <td>${escapeHtml(parameter.description ?? "")}</td>
    </tr>`
    )
    .join("");
}

function parametersTable(route: SavedRoute): string {
  const parameters = route.parameters ?? [];

  if (parameters.length === 0) return "";

  return `<table>
    <thead><tr><th>Name</th><th>In</th><th>Type</th><th></th><th>Description</th></tr></thead>
    <tbody>${parameterRows(parameters)}</tbody>
  </table>`;
}

function headersTable(route: SavedRoute): string {
  if (route.headers.length === 0) return "";

  return `<table>
    <thead><tr><th>Header</th><th>Value</th><th></th><th>Description</th></tr></thead>
    <tbody>${route.headers
      .map(
        (header) => `<tr>
        <td class="name">${escapeHtml(header.name)}</td>
        <td class="name">${escapeHtml(header.value ?? "—")}</td>
        <td>${header.required ? '<span class="tag required">required</span>' : ""}</td>
        <td>${escapeHtml(header.description ?? "")}</td>
      </tr>`
      )
      .join("")}</tbody>
  </table>`;
}

function requestBodyBlock(route: SavedRoute): string {
  const body = route.requestBody;

  if (!body) return "";

  const said = body.description ? `<p>${escapeHtml(body.description)}</p>` : "";
  const variants = body.variants
    .map((variant) => {
      const sample = variant.defaultBody ?? variant.example;

      return `<p><span class="tag">${escapeHtml(variant.mediaType)}</span>${
        variant.schemaType ? ` <span class="tag">${escapeHtml(variant.schemaType)}</span>` : ""
      }${body.required ? ' <span class="tag required">required</span>' : ""}</p>${
        sample ? codeBlock(sample) : ""
      }`;
    })
    .join("");

  return `${said}${variants}`;
}

function responsesTable(route: SavedRoute): string {
  const responses = route.responses ?? [];

  if (responses.length === 0) return "";

  return `<table>
    <thead><tr><th>Status</th><th>Media type</th><th>Description</th></tr></thead>
    <tbody>${responses
      .map(
        (response) => `<tr>
        <td class="name status ${statusClass(response.status)}">${escapeHtml(response.status)}</td>
        <td>${escapeHtml(response.mediaTypes.join(", ") || "—")}</td>
        <td>${escapeHtml(response.description ?? "")}</td>
      </tr>`
      )
      .join("")}</tbody>
  </table>`;
}

function exampleBlock(example: SavedExample): string {
  const status = `${example.status} ${example.statusText}`.trim();
  const named = example.name.trim() && example.name.trim() !== status;
  const heading = `<p>${
    named ? `<span class="tag">${escapeHtml(example.name)}</span> ` : ""
  }<span class="status ${statusClass(String(example.status))}">${escapeHtml(status)}</span>${
    example.mediaType ? ` <span class="tag">${escapeHtml(example.mediaType)}</span>` : ""
  }</p>`;

  return `${heading}${example.body ? codeBlock(redactBody(example.body)) : ""}`;
}

export function routeSectionHtml(view: RouteView, theme: DocTheme, baseUrl: string): string {
  const { entry, request } = view;
  const route = request.route;
  const examples = theme.examples ? request.examples : [];

  return `<article class="route" id="${escapeHtml(view.anchor)}">
    <div class="route-head">
      <span class="verb ${escapeHtml(route.method)}">${escapeHtml(route.method)}</span>
      <h3>${escapeHtml(entry.title || request.name)}</h3>
    </div>
    <div class="path-bar"><span class="path mono">${escapeHtml(route.path)}</span></div>
    ${prose(entry, "purpose") || '<p class="empty">No description yet.</p>'}
    ${field("Who can call it", prose(entry, "auth") || detectedAuth(route))}
    ${field("Behaviour", prose(entry, "behavior"))}
    ${field("Parameters", `${parametersTable(route)}${prose(entry, "parameters")}`)}
    ${field("Headers", headersTable(route))}
    ${field("Request body", `${requestBodyBlock(route)}${prose(entry, "request_body")}`)}
    ${theme.curl ? field("Example request", codeBlock(curlForRequest(request, baseUrl))) : ""}
    ${field("Response", `${prose(entry, "responses")}${responsesTable(route)}`)}
    ${field("Failure cases", prose(entry, "errors"))}
    ${field(
      "Example response",
      examples.map((example) => exampleBlock(example)).join("")
    )}
    ${field("Notes", prose(entry, "notes"))}
  </article>`;
}
