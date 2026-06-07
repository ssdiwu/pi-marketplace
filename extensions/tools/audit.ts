// ---------------------------------------------------------------------------
// marketplace_audit — Security audit (metadata + source scan)
// ---------------------------------------------------------------------------

import { Type, Static } from "@earendil-works/pi-ai";
import { fullAudit } from "../security.js";
import { formatAuditReport } from "../format.js";
import { renderCollapsibleMarkdown, formatRiskBadge } from "../render.js";

const Params = Type.Object({
  name: Type.String({ description: "Package name to audit (e.g., 'pi-mcp-adapter')" }),
  deepScan: Type.Optional(Type.Boolean({
    description: "Download and scan source code for dangerous patterns (default: true)",
  })),
});

type ParamsType = Static<typeof Params>;

export const marketplace_audit = {
  name: "marketplace_audit",
  label: "Security Audit",
  description:
    "Perform a security audit on a pi package before installing. Checks metadata (resource types, dependencies, size) and optionally scans source code for dangerous patterns (rm -rf, eval, exec, etc.).",
  promptSnippet:
    "Security audit a pi package before installation — metadata check + source code scanning",
  promptGuidelines: [
    "Use marketplace_audit before recommending or installing any pi package, especially extensions.",
    "Always audit third-party packages — they can execute arbitrary code.",
    "The audit checks: destructive operations (rm -rf), code execution (eval, spawn), env access (process.env), network calls.",
    "Set deepScan=false for a quick metadata-only check (no download needed).",
    "Present the audit report to the user and let them decide whether to install.",
  ],
  parameters: Params,

  async execute(_id: string, params: ParamsType) {
    try {
      const report = await fullAudit(params.name, params.deepScan ?? true);
      const output = formatAuditReport(report);

      return {
        content: [{ type: "text" as const, text: output }],
        details: {
          packageName: report.packageName,
          overallRisk: report.overallRisk,
          findingCount: report.findings.length,
          deepScanned: report.deepScanned,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Audit failed for "${params.name}": ${msg}` }],
        details: {
          packageName: params.name,
          overallRisk: "info" as const,
          findingCount: 0,
          deepScanned: false,
          error: msg,
        },
      };
    }
  },

  renderResult(result: any, options: any, theme: any) {
    const name = (result.details?.packageName as string | undefined) ?? "?";
    const risk = (result.details?.overallRisk as string | undefined) ?? "info";
    const count = (result.details?.findingCount as number | undefined) ?? 0;
    const summary = `🔒 ${name}: ${formatRiskBadge(risk)} (${count} finding${count === 1 ? "" : "s"})`;
    return renderCollapsibleMarkdown(result, options, theme, summary);
  },
};
