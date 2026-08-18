import { ArrowRight, Eye, KeyRound } from "lucide-react";
import type { Scene } from "./scenes";

export function SceneDetails({ id }: Readonly<{ id: Scene["id"] }>) {
  switch (id) {
    case "context":
      return (
        <span className="showcase-note showcase-note-context">
          Selected code <ArrowRight size={13} /> Agent
        </span>
      );
    case "scripts":
      return (
        <>
          <span className="showcase-note showcase-note-scripts">
            package.json → Run
          </span>
          <span className="showcase-chip showcase-chip-scripts">
            18 scripts found
          </span>
        </>
      );
    case "health":
      return (
        <>
          <span className="showcase-chip showcase-chip-health">9 outdated</span>
          <span className="showcase-chip showcase-chip-security">
            8 vulnerabilities
          </span>
          <span className="showcase-focus-ring" />
        </>
      );
    case "environment":
      return (
        <>
          <span className="showcase-note showcase-note-environment">
            <KeyRound size={13} /> Values stay masked
          </span>
          <span className="showcase-chip showcase-chip-environment">
            18 active
          </span>
        </>
      );
    case "browser":
      return (
        <span className="showcase-note showcase-note-browser">
          <Eye size={13} /> Preview + repository
        </span>
      );
    case "agents":
      return (
        <>
          <span className="showcase-chip showcase-chip-claude">Claude</span>
          <span className="showcase-chip showcase-chip-codex">Codex</span>
          <span className="showcase-agent-line" />
        </>
      );
    case "monitor":
      return (
        <div className="showcase-monitor-key">
          <span>01 Dev</span>
          <span>02 Claude</span>
          <span>03 Codex</span>
        </div>
      );
    case "templates":
      return null;
  }
}
