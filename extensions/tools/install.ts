// ---------------------------------------------------------------------------
// marketplace_install — Audit → Confirm → Install
// ---------------------------------------------------------------------------

import { Type, Static } from "@earendil-works/pi-ai";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { exec } from "node:child_process";
import { fullAudit } from "../security.js";
import { formatAuditReport } from "../format.js";

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
      // Step 1: Run audit
      const report = await fullAudit(params.name, params.deepScan ?? true);
      const auditOutput = formatAuditReport(report);

      // Step 2: Present audit and ask for confirmation
      const isHighRisk = report.overallRisk === "critical" || report.overallRisk === "high";

      let confirmMessage: string;
      if (isHighRisk) {
        confirmMessage = [
          `⚠️ **${report.overallRisk.toUpperCase()} RISK** detected in ${params.name}!`,
          "",
          `Found ${report.findings.length} issue(s) (${report.findings.filter(f => f.severity === "critical" || f.severity === "high").length} high/critical).`,
          "",
          `**Summary**: ${report.summary}`,
          "",
          `Are you sure you want to install \`${params.name}\`?`,
        ].join("\n");
      } else {
        confirmMessage = [
          `✅ Audit passed for **${params.name}** (risk level: ${report.overallRisk})`,
          "",
          `${report.findings.length} finding(s) found. ${report.summary}`,
          "",
          `Install \`${params.name}\` now?`,
        ].join("\n");
      }

      const confirmed = await ctx.ui.confirm(
        isHighRisk ? `⚠️ High Risk — Install ${params.name}?` : `Install ${params.name}?`,
        confirmMessage,
      );

      if (!confirmed) {
        return {
          content: [{
            type: "text" as const,
            text: [`❌ Installation cancelled by user.`, "", `Audit report for reference:`, auditOutput].join("\n"),
          }],
          details: { packageName: params.name, installed: false, riskLevel: report.overallRisk },
        };
      }

      // Step 3: Execute pi install via child_process
      const installResult = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
        exec(`pi install npm:${params.name}`, { timeout: 60_000 }, (err, stdout, stderr) => {
          if (err && !err.killed) reject(err);
          else resolve({ stdout: stdout ?? "", stderr: stderr ?? "", code: err?.code ?? null });
        });
      });

      return {
        content: [{
          type: "text" as const,
          text: [
            `✅ **${params.name}** installed successfully!`,
            installResult.stdout.trim(),
            `Run \`/reload\` if pi is already running to load the new package.`,
            "",
            "---",
            "Audit Report:",
            auditOutput,
          ].join("\n"),
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
};
