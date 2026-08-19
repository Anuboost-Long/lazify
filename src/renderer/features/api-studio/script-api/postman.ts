import {
  POSTMAN_GLOBAL,
  POSTMAN_NAMESPACES,
  POSTMAN_ROOT,
  type PostmanMember
} from "@main/api-studio/scripting/postman-map";

import { nativeNode, ROOT, type ApiNode } from "./catalog";

function nodeOf(member: PostmanMember, namespaceNative?: string): ApiNode {
  const borrowed = namespaceNative
    ? nativeNode([namespaceNative, member.native])?.members
    : undefined;

  return {
    name: member.postman,
    kind: member.kind,
    signature: member.signature,
    detail: member.detail,
    phases: member.phases,
    ...(member.kind === "namespace" && borrowed ? { members: borrowed } : {})
  };
}

const POSTMAN_ROOT_NODES: ApiNode[] = [
  ...POSTMAN_NAMESPACES.map((namespace) => ({
    name: namespace.postman,
    kind: "namespace" as const,
    signature: null,
    detail: namespace.detail,
    phases: namespace.phases,
    members: namespace.members.map((member) => nodeOf(member, namespace.native))
  })),
  ...POSTMAN_ROOT.map((member) => nodeOf(member))
];

export function isPostmanDialect(globalName: string): boolean {
  return globalName === POSTMAN_GLOBAL;
}

export function catalogFor(typedRoot: string, globalName: string): ApiNode[] {
  return typedRoot === POSTMAN_GLOBAL && isPostmanDialect(globalName) ? POSTMAN_ROOT_NODES : ROOT;
}

export function rootsFor(globalName: string): ApiNode[] {
  return isPostmanDialect(globalName) ? POSTMAN_ROOT_NODES : ROOT;
}
