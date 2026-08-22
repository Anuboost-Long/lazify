import { BrowserWindow } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { escapeHtml } from "../markup";
import type { DocTheme } from "../types";
import { marginInches } from "./theme";

function footerTemplate(title: string): string {
  return `<div style="width:100%;font-size:8px;color:#5b6b7c;padding:0 12mm;display:flex;justify-content:space-between;">
    <span>${escapeHtml(title)}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
}

export async function writeDocPdf(
  html: string,
  theme: DocTheme,
  title: string,
  filePath: string
): Promise<string> {
  const source = path.join(os.tmpdir(), `lazify-api-doc-${Date.now()}.html`);
  const margin = marginInches(theme.margin);

  await fs.writeFile(source, html, "utf8");

  const window = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true }
  });

  try {
    await window.loadFile(source);

    const pdf = await window.webContents.printToPDF({
      pageSize: theme.pageSize,
      printBackground: true,
      margins: { top: margin, bottom: margin, left: margin, right: margin },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footerTemplate(title)
    });

    await fs.writeFile(filePath, pdf);

    return filePath;
  } finally {
    window.destroy();
    await fs.rm(source, { force: true });
  }
}
