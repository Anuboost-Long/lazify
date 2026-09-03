export const EXAMPLE_FLOW_FILE = "home.yaml";

export const EXAMPLE_FLOW_TEXT = `name: Home page loads
target: web
start:
 url: http://localhost:3000
steps:
 - open:
    path: /
 - expectNoRuntimeErrors
 - screenshot:
    name: home
`;
