// ---------------------------------------------------------------------------
// pi-marketplace — Extension entry point
// ---------------------------------------------------------------------------
//
// Search, audit, and install pi packages from npm with security review.
//
// Tools:
//   marketplace_search  — Search pi packages (npm registry + pi.dev enrichment)
//   marketplace_detail  — Package details + pi manifest
//   marketplace_audit   — Security audit (metadata + source scan)
//   marketplace_install — Audit → confirm → install
// ---------------------------------------------------------------------------

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { marketplace_search } from "./tools/search.js";
import { marketplace_detail } from "./tools/detail.js";
import { marketplace_audit } from "./tools/audit.js";
import { marketplace_install } from "./tools/install.js";

export default function extension(pi: ExtensionAPI) {
  // Register tools (type assertions to accommodate union return shapes)
  pi.registerTool(marketplace_search as never);
  pi.registerTool(marketplace_detail as never);
  pi.registerTool(marketplace_audit as never);
  pi.registerTool(marketplace_install as never);

  // Notify on load
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("🛒 pi-marketplace loaded — search/audit/install pi packages", "info");
  });
}
