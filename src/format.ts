// ---------------------------------------------------------------------------
// Result formatting — search results, detail cards, audit reports
// ---------------------------------------------------------------------------

import type { NpmSearchResult, PackageDetail, PackageType } from "./api.js";
import type { AuditReport } from "./security.js";

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

export function formatSearchResults(
  packages: Array<NpmSearchResult & {
    types?: PackageType[];
    piDevUrl?: string;
    piDevAuthor?: string;
    piDevDownloads?: string;
    piDevTimeAgo?: string;
  }>,
): string {
  if (packages.length === 0) return "No pi packages found. Try different keywords.";

  const lines: string[] = [];
  lines.push(`Found ${packages.length} pi package(s):\n`);

  for (const pkg of packages) {
    const types = pkg.types?.length ? `[${pkg.types.join(", ")}]` : "";
    const desc = truncate(pkg.description || "(no description)", 70);
    const downloads = pkg.piDevDownloads || withMonthlySuffix(formatDownloads(pkg.downloads.monthly));
    const meta = [downloads ? `⬇️ ${downloads}` : "", pkg.piDevAuthor ? `👤 ${pkg.piDevAuthor}` : "", pkg.piDevTimeAgo ? `🕒 ${pkg.piDevTimeAgo}` : ""]
      .filter(Boolean)
      .join("  ");

    lines.push(`📦 **${pkg.name}** ${types}`.trim());
    lines.push(`   v${pkg.version}  ${desc}`);
    if (meta) lines.push(`   ${meta}`);
    lines.push(`   Install: \`pi install npm:${pkg.name}\``);
    if (pkg.piDevUrl) lines.push(`   Gallery: ${pkg.piDevUrl}`);
    else lines.push(`   Gallery: https://pi.dev/packages/${encodeURIComponent(pkg.name)}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Package Detail
// ---------------------------------------------------------------------------

export function formatPackageDetail(detail: PackageDetail): string {
  const types = inferTypesString(detail.piManifest);
  const depCount = Object.keys(detail.dependencies ?? {}).length;
  const peerDepCount = Object.keys(detail.peerDependencies ?? {}).length;

  const lines: string[] = [
    `## 📦 ${detail.name}`,
    "",
    `**Version**: ${detail.version}`,
    `**Type**: ${types || "unknown"}`,
    `**License**: ${typeof detail.license === "string" ? detail.license : JSON.stringify(detail.license)}`,
    `**Author**: ${formatAuthor(detail.author)}`,
    `**Publisher**: ${detail.publisher.username}${detail.publisher.email ? ` (${detail.publisher.email.split("@")[1] ?? ""})` : ""}`,
    `**Published**: ${formatDate(detail.date)}`,
    "",
    `### Description`,
    detail.description || "(no description)",
    "",
    `### Pi Manifest`,
    formatPiManifest(detail.piManifest),
    "",
    `### Dependencies`,
    `${depCount} dependencies${peerDepCount ? `, ${peerDepCount} peer dependencies` : ""}`,
    formatDeps(detail.dependencies),
    "",
    `### Size`,
    `${detail.dist.fileCount} files, ${formatSize(detail.dist.unpackedSize)}`,
    "",
    `### Links`,
    `- npm: ${detail.links.npm ?? `https://www.npmjs.com/package/${detail.name}`}`,
    `- Gallery: https://pi.dev/packages/${encodeURIComponent(detail.name)}`,
    ...(detail.links.repository ? [`- Repository: ${detail.links.repository}`] : []),
    ...(detail.links.homepage ? [`- Homepage: ${detail.links.homepage}`] : []),
    "",
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Audit Report
// ---------------------------------------------------------------------------

export function formatAuditReport(report: AuditReport): string {
  const riskEmoji = report.overallRisk === "critical" ? "🔴" :
                     report.overallRisk === "high" ? "🟠" :
                     report.overallRisk === "medium" ? "🟡" :
                     report.overallRisk === "low" ? "🟢" : "⚪";

  const lines: string[] = [
    `## 🔍 Security Audit: ${report.packageName}`,
    "",
    `**Overall Risk**: ${riskEmoji} ${report.overallRisk.toUpperCase()}`,
    `**Version**: ${report.version}`,
    `**Scanned At**: ${new Date().toISOString()}`,
    "",
  ];

  // Metadata section
  lines.push("### 📋 Metadata Check", "");
  lines.push(`| Item | Value |`);
  lines.push(`|------|-------|`);
  lines.push(`| Resource Types | ${report.metadata.types.join(", ") || "none"} |`);
  lines.push(`| Dependencies | ${report.metadata.dependencyCount} |`);
  lines.push(`| Peer Dependencies | ${report.metadata.peerDependencyCount} |`);
  lines.push(`| Files | ${report.metadata.fileCount} |`);
  lines.push(`| Unpacked Size | ${formatSize(report.metadata.unpackedSize)} |`);
  lines.push(`| npm Insecure Flag | ${report.metadata.isInsecure ? "⚠️ YES" : "✅ No"} |`);
  lines.push(`| Published | ${formatDate(report.metadata.publishedAt)} |`);
  lines.push("");

  // Findings
  if (report.findings.length > 0) {
    lines.push("### 🚨 Findings", "");
    for (const f of report.findings) {
      const emoji = f.severity === "critical" ? "🔴" :
                    f.severity === "high" ? "🟠" :
                    f.severity === "medium" ? "🟡" : "🟢";
      lines.push(`${emoji} **[${f.severity.toUpperCase()}]** \`${f.pattern}\` in \`${f.file}\`:${f.line ?? "?"}`);
      if (f.context) lines.push(`   Context: \`${truncate(f.context, 80)}\``);
      lines.push("");
    }
    lines.push(`**Total**: ${report.findings.length} finding(s) (${report.findings.filter(f => f.severity === "critical" || f.severity === "high").length} high/critical)`);
    lines.push("");
  } else {
    lines.push("### ✅ Source Scan", "");
    lines.push("No dangerous patterns found in source code.", "");
  }

  // Summary
  lines.push("### 📝 Summary", "");
  lines.push(report.summary);

  // Disclaimer
  lines.push("", "---");
  lines.push("*⚠️ This is a static keyword-based scan. It cannot detect obfuscated or dynamically constructed code. Always review extension source code before installing.*");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(value: string, maxLen: number): string {
  return value.length > maxLen ? value.slice(0, maxLen - 1) + "…" : value;
}

function formatDownloads(monthly: number): string {
  if (monthly >= 1000_000) return `${(monthly / 1000_000).toFixed(1)}M`;
  if (monthly >= 1000) return `${(monthly / 1000).toFixed(1)}K`;
  return monthly > 0 ? String(monthly) : "";
}

function withMonthlySuffix(value: string): string {
  return value ? `${value}/mo` : "";
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "unknown";

  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return "today";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatAuthor(author: string | Record<string, unknown> | undefined): string {
  if (!author) return "unknown";
  if (typeof author === "string") return author;
  return (author.name as string) ?? author.toString();
}

function inferTypesString(manifest: import("./api.js").PiManifest): string {
  const types: string[] = [];
  if (manifest.extensions?.length) types.push("extension");
  if (manifest.skills?.length) types.push("skill");
  if (manifest.prompts?.length) types.push("prompt");
  if (manifest.themes?.length) types.push("theme");
  return types.join(", ") || "(not declared)";
}

function formatPiManifest(manifest: import("./api.js").PiManifest): string {
  const parts: string[] = [];
  if (manifest.extensions?.length) parts.push(`extensions: [${manifest.extensions.join(", ")}]`);
  if (manifest.skills?.length) parts.push(`skills: [${manifest.skills.join(", ")}]`);
  if (manifest.prompts?.length) parts.push(`prompts: [${manifest.prompts.join(", ")}]`);
  if (manifest.themes?.length) parts.push(`themes: [${manifest.themes.join(", ")}]`);
  return parts.length > 0 ? parts.join("\n") : "(none declared)";
}

function formatDeps(deps?: Record<string, string>): string {
  if (!deps || Object.keys(deps).length === 0) return "(none)";
  const entries = Object.entries(deps).slice(0, 10);
  const lines = entries.map(([name, ver]) => `- ${name}: ${ver}`);
  if (Object.keys(deps).length > 10) lines.push(`... and ${Object.keys(deps).length - 10} more`);
  return "\n" + lines.join("\n");
}
