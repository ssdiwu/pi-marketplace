// ---------------------------------------------------------------------------
// marketplace_install — Audit → Confirm → Install
// ---------------------------------------------------------------------------

import { Type, Static } from "@earendil-works/pi-ai";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { fullAudit } from "../security.js";
import { formatAuditReport } from "../format.js";
import { renderCollapsibleMarkdown, formatRiskBadge } from "../render.js";

const Params = Type.Object({
  name: Type.String({ description: "Package name to install (e.g., 'pi-mcp-adapter')" }),
  deepScan: Type.Optional(Type.Boolean({
    description: "Run source code scan before installing (default: true)",
  })),
});

type ParamsType = Static<typeof Params>;

export const marketplace_install = {
  name: "marketplace_install",
  label: "Install Package",
  description:
    "Security audit a pi package, present findings to user for confirmation, then install via `pi install`. Never installs without user approval.",
  promptSnippet:
    "Audit and install a pi package with security review and user confirmation",
  promptGuidelines: [
    "Use marketplace_install when the user explicitly asks to install a pi package.",
    "This tool ALWAYS runs an audit first, then asks for confirmation before installing.",
    "Never skip the audit step — even if the user says 'just install it'.",
    "If the user cancels confirmation, report that installation was cancelled.",
  ],
  parameters: Params,

  async execute(_id: string, params: ParamsType, _signal: unknown, _onUpdate: unknown, ctx: ExtensionContext) {
    if (!ctx) {
      return {
        content: [{ type: "text" as const, text: "Install requires UI context (not available in non-interactive mode)." }],
        details: { packageName: params.name, installed: false, riskLevel: "info" as const },
      };
    }

    try {
      const report = await fullAudit(params.name, params.deepScan ?? true);
      const auditOutput = formatAuditReport(report);
      const isHighRisk = report.overallRisk === "critical" || report.overallRisk === "high";

      const confirmMessage = isHighRisk
        ? [
            `⚠️ **${report.overallRisk.toUpperCase()} RISK** detected in ${params.name}!`,
            "",
            `Found ${report.findings.length} issue(s) (${report.findings.filter((f) => f.severity === "critical" || f.severity === "high").length} high/critical).`,
            "",
            `**Summary**: ${report.summary}`,
            "",
            `Are you sure you want to install \`${params.name}\`?`,
          ].join("\n")
        : [
            `✅ Audit passed for **${params.name}** (risk level: ${report.overallRisk})`,
            "",
            `${report.findings.length} finding(s) found. ${report.summary}`,
            "",
            `Install \`${params.name}\` now?`,
          ].join("\n");

      const confirmed = await ctx.ui.confirm(
        isHighRisk ? `⚠️ High Risk — Install ${params.name}?` : `Install ${params.name}?`,
        confirmMessage,
      );

      if (!confirmed) {
        return {
          content: [{
            type: "text" as const,
            text: ["❌ Installation cancelled by user.", "", "Audit report for reference:", auditOutput].join("\n"),
          }],
          details: { packageName: params.name, installed: false, riskLevel: report.overallRisk },
        };
      }

      const installResult = await runPiInstall(params.name);

      return {
        content: [{
          type: "text" as const,
          text: [
            `✅ **${params.name}** installed successfully!`,
            installResult.stdout.trim(),
            installResult.stderr.trim(),
            "Run `/reload` if pi is already running to load the new package.",
            "",
            "---",
            "Audit Report:",
            auditOutput,
          ].filter(Boolean).join("\n"),
        }],
        details: { packageName: params.name, installed: true, riskLevel: report.overallRisk },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Installation failed: ${msg}` }],
        details: { packageName: params.name, installed: false, riskLevel: "info", error: msg },
      };
    }
  },

  renderResult(result: any, options: any, theme: any) {
    const name = (result.details?.packageName as string | undefined) ?? "?";
    const installed = result.details?.installed as boolean | undefined;
    const risk = (result.details?.riskLevel as string | undefined) ?? "info";
    const summary = installed
      ? `📥 Installed ${name} (Audit: ${formatRiskBadge(risk)})`
      : `📥 Install ${installed === false ? "cancelled" : "attempted"}: ${name}`;
    return renderCollapsibleMarkdown(result, options, theme, summary);
  },
};

async function runPiInstall(name: string): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    execFile("pi", ["install", `npm:${name}`], { timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) {
        const reason = err.killed
          ? `pi install timed out or was killed${err.signal ? ` (signal: ${err.signal})` : ""}`
          : err.message;
        reject(new Error(`${reason}${stderr ? `\n${stderr}` : ""}`));
        return;
      }
      resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
    });
  });
}
