export interface FileContentState {
  status: "idle" | "loading" | "loaded" | "error";
  content: string;
  mimeType?: string;
  byteLength?: number;
}

export interface ProjectTreeContextMenuState<TNode> {
  node: TNode;
  x: number;
  y: number;
}
